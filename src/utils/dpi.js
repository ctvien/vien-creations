import { MM_PER_INCH, MIN_SAFE_DPI, SCREEN_PX_PER_MM } from '../constants';

// Effective print/engrave resolution of an image element at its current
// on-canvas size: how many of its native source pixels cover each inch of
// the physical space it now occupies.
export function getEffectiveDPI(fabricImage) {
  const naturalWidthPx = fabricImage.width; // native source pixels (fabric stores pre-scale width)
  const displayedWidthPx = naturalWidthPx * fabricImage.scaleX; // on-canvas px at screen scale
  const displayedWidthMm = displayedWidthPx / SCREEN_PX_PER_MM;
  const displayedWidthInches = displayedWidthMm / MM_PER_INCH;
  if (displayedWidthInches <= 0) return Infinity;
  return naturalWidthPx / displayedWidthInches;
}

export function isLowResolution(fabricImage) {
  return getEffectiveDPI(fabricImage) < MIN_SAFE_DPI;
}
