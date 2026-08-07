import { COASTER_SIZE_MM, MM_PER_INCH, EXPORT_DPI, CANVAS_SIZE_PX } from '../constants';

const PNG_MULTIPLIER = (COASTER_SIZE_MM / MM_PER_INCH) * EXPORT_DPI / CANVAS_SIZE_PX;

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  URL.revokeObjectURL(url);
}

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

// High-res PNG for a customer-facing preview. Keeps the wood/slate
// background so it still reads as "coaster with my design on it", but drops
// the dashed safe-zone guide since that's an editor aid, not part of the
// product.
export function exportPreviewPNG(canvas, { safeZoneRect }, referenceCode) {
  const dataUrl = withHiddenObjects(canvas, [safeZoneRect], () =>
    canvas.toDataURL({
      format: 'png',
      multiplier: PNG_MULTIPLIER,
    })
  );
  downloadDataUrl(dataUrl, `vien-coaster-preview-${referenceCode}.png`);
  return dataUrl;
}

// Vector export intended for the laser cutter/engraver. Only the design
// elements (text, images) should go to production — not the on-screen wood
// background mockup or the safe-zone guide — so both are hidden first.
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
export function exportProductionSVG(canvas, { backgroundRect, safeZoneRect }, referenceCode) {
  const svg = withRemovedObjects(canvas, [backgroundRect, safeZoneRect], () =>
    canvas.toSVG({
      width: `${COASTER_SIZE_MM}mm`,
      height: `${COASTER_SIZE_MM}mm`,
      viewBox: { x: 0, y: 0, width: CANVAS_SIZE_PX, height: CANVAS_SIZE_PX },
    })
  );
  downloadBlob(svg, `vien-coaster-production-${referenceCode}.svg`, 'image/svg+xml');
  return svg;
}
