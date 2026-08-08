import { COASTER_SIZE_MM, MM_PER_INCH, EXPORT_DPI, CANVAS_SIZE_PX } from '../constants';

const PNG_MULTIPLIER = (COASTER_SIZE_MM / MM_PER_INCH) * EXPORT_DPI / CANVAS_SIZE_PX;

// Runs `fn` with the given objects temporarily hidden from the canvas, then
// restores their previous visibility. Safe for raster export (toDataURL) —
// a hidden object simply isn't painted onto the pixels.
function withHiddenObjects(canvas, objects, fn) {
  const previous = objects.map((obj) => obj.visible);
  objects.forEach((obj) => obj.set('visible', false));
  canvas.requestRenderAll();
  try {
    return fn();
  } finally {
    objects.forEach((obj, i) => obj.set('visible', previous[i]));
    canvas.requestRenderAll();
  }
}

// Runs `fn` with the given objects fully removed from the canvas (not just
// hidden), then restores them at their original z-index. Required for SVG
// export: Fabric's toSVG() still serializes a `visible:false` object, just
// with a `visibility:hidden` CSS style — which plenty of laser/CAM software
// ignores when reading path geometry, so a merely-hidden guide shape could
// still get cut/engraved. Actually removing the node keeps it out of the
// file entirely.
function withRemovedObjects(canvas, objects, fn) {
  const indices = objects.map((obj) => canvas.getObjects().indexOf(obj));
  objects.forEach((obj) => canvas.remove(obj));
  try {
    return fn();
  } finally {
    objects.forEach((obj, i) => canvas.insertAt(indices[i], obj));
    canvas.requestRenderAll();
  }
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// High-res PNG for a customer-facing preview. Keeps the wood/slate
// background so it still reads as "coaster with my design on it", but drops
// the dashed safe-zone guide since that's an editor aid, not part of the
// product. Returns a Blob (upload to the backend) rather than triggering a
// browser download.
export function generatePreviewPNGBlob(canvas, { safeZoneRect }) {
  const dataUrl = withHiddenObjects(canvas, [safeZoneRect], () =>
    canvas.toDataURL({
      format: 'png',
      multiplier: PNG_MULTIPLIER,
    })
  );
  return dataUrlToBlob(dataUrl);
}

// Vector export intended for the laser cutter/engraver. Only the design
// elements (text, images) should go to production — not the on-screen wood
// background mockup or the safe-zone guide — so both are removed first.
//
// IMPORTANT LIMITATION: Fabric.js will happily emit an SVG for every object,
// but a rasterized/uploaded image can only ever appear in that SVG as an
// embedded <image> (base64 PNG/JPEG) — it does NOT get traced into vector
// paths. A laser workflow that requires true vector geometry for an image
// (e.g. line-art engraving from a bitmap) will need that image run through
// a separate vectorization/trace step (e.g. Illustrator "Image Trace",
// Inkscape "Trace Bitmap", or a dedicated raster-to-vector tool) before it
// can be cut/engraved as pure vector paths. Text elements DO export as true
// vector paths (via SVG <text> referencing the chosen web font, or as
// outlined paths if the target software converts them), so a text-only
// design is fully production-ready straight from this export.
export function generateProductionSVGBlob(canvas, { backgroundRect, safeZoneRect }) {
  const svg = withRemovedObjects(canvas, [backgroundRect, safeZoneRect], () =>
    canvas.toSVG({
      width: `${COASTER_SIZE_MM}mm`,
      height: `${COASTER_SIZE_MM}mm`,
      viewBox: { x: 0, y: 0, width: CANVAS_SIZE_PX, height: CANVAS_SIZE_PX },
    })
  );
  return new Blob([svg], { type: 'image/svg+xml' });
}
