# Vien Creations — Coaster Designer (Phase 1)

A standalone personalization canvas for a single laser-engraved product: a
90×90mm coaster. React + Vite + Fabric.js, no backend — everything runs
client-side and exports trigger a browser download.

## Run it

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL.

## What's here

- **Coaster canvas** at 90×90mm (rendered at 8px/mm), wood-tone mockup
  background, dashed engraving-safe zone inset 5mm from the edge.
- **Text**: add editable text, 6 engraving-friendly fonts (5 sans/serif +
  1 script, all medium/bold weight), font size control.
- **Images**: upload JPG/PNG, auto-converted to grayscale, with a warning
  when the image drops below ~150 DPI at its current on-canvas size.
- **Manipulation**: drag, resize, rotate, delete, layer order
  (forward/backward). Elements that extend past the safe zone trigger a
  non-blocking visual warning (the safe-zone outline turns red + a banner
  appears) rather than being clamped.
- **Canvas controls**: undo/redo, clear/start over, zoom in/out.
- **Export** (`src/utils/exportCanvas.js`): high-res (~300 DPI) PNG preview
  with the product mockup background, and a production-oriented SVG (design
  elements only, no mockup/guides). A 6-character reference code is
  generated on every export and shown on screen. See the code comments in
  that file for the vector-export limitation around raster images.

## Notes

- Fonts load from Google Fonts (`index.html`); without network access they
  fall back to the generic sans-serif/serif/cursive stack, which is fine for
  local dev without internet.
- This is Phase 1: one product, no e-commerce/cart/checkout, no backend.
