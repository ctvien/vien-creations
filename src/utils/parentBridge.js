// Phase 3: the configurator runs inside an iframe on the WooCommerce
// product page. Since the iframe can't reach into the parent DOM directly,
// this is the postMessage handshake between the two:
//   - on save success, we tell the parent a design is ready to attach to
//     the "add to cart" form (vien_design_complete)
//   - the parent can tell us which product/template to load on embed
//     (vien_init) — optional; defaults to PRODUCT_TYPE if it never arrives

const DESIGN_COMPLETE_TYPE = 'vien_design_complete';
const INIT_TYPE = 'vien_init';

// Restrict which origin postMessage targets in production by setting
// VITE_PARENT_ORIGIN at build time to the WordPress site's origin (e.g.
// https://vien-creations.com). Left as '*' by default since the parent
// origin isn't known in local/standalone dev — tighten this before going
// live, since '*' lets any page that iframes this app receive the message.
const TARGET_ORIGIN = import.meta.env.VITE_PARENT_ORIGIN || '*';

export function notifyParentDesignComplete({ referenceCode, previewImageUrl, productType }) {
  if (window.parent === window) return; // not embedded — nothing to notify
  window.parent.postMessage(
    {
      type: DESIGN_COMPLETE_TYPE,
      reference_code: referenceCode,
      preview_image_url: previewImageUrl,
      product_type: productType,
    },
    TARGET_ORIGIN
  );
}

// Subscribes to an init message from the parent page telling us which
// product to load. Returns an unsubscribe function. Ignores anything that
// isn't a well-formed vien_init message so we don't react to unrelated
// postMessage traffic on the page (analytics scripts, browser extensions).
export function onParentInit(callback) {
  function handleMessage(event) {
    const data = event.data;
    if (!data || data.type !== INIT_TYPE || typeof data.product_type !== 'string') return;
    callback(data.product_type);
  }
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}
