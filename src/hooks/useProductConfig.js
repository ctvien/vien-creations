import { useEffect, useState } from 'react';
import { onParentInit } from '../utils/parentBridge';
import { DEFAULT_PRODUCT_CONFIG } from '../constants';

// How long to wait for the WordPress parent's vien_init message before
// giving up and using the default config — long enough for a same-page
// postMessage round-trip on a slow device, short enough that standalone
// dev (no parent at all) doesn't sit on a blank screen.
const INIT_TIMEOUT_MS = 600;

function capitalize(value) {
  return typeof value === 'string' && value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}

function normalize(data) {
  if (!data) return DEFAULT_PRODUCT_CONFIG;

  const widthMm = Number(data.width_mm);
  const heightMm = Number(data.height_mm);
  const safeZoneInsetMm = Number(data.safe_zone_inset_mm);

  return {
    productType: typeof data.product_type === 'string' && data.product_type
      ? data.product_type
      : DEFAULT_PRODUCT_CONFIG.productType,
    productLabel: typeof data.product_label === 'string' && data.product_label
      ? data.product_label
      : capitalize(data.product_type) || DEFAULT_PRODUCT_CONFIG.productLabel,
    widthMm: widthMm > 0 ? widthMm : DEFAULT_PRODUCT_CONFIG.widthMm,
    heightMm: heightMm > 0 ? heightMm : DEFAULT_PRODUCT_CONFIG.heightMm,
    safeZoneInsetMm: safeZoneInsetMm >= 0 ? safeZoneInsetMm : DEFAULT_PRODUCT_CONFIG.safeZoneInsetMm,
    backgroundImageUrl: typeof data.background_image_url === 'string' && data.background_image_url
      ? data.background_image_url
      : null,
  };
}

// Resolves which product this instance of the configurator should render.
// Returns null while still waiting — callers should hold off mounting the
// canvas until this settles, since physical size/safe-zone feed directly
// into how the canvas is built.
export function useProductConfig() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let resolved = false;

    const resolve = (data) => {
      if (resolved) return;
      resolved = true;
      setConfig(normalize(data));
    };

    const unsubscribe = onParentInit(resolve);
    const timeout = setTimeout(() => resolve(null), INIT_TIMEOUT_MS);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return config;
}
