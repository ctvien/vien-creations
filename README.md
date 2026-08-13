# Vien Creations — Coaster Designer

A personalization canvas for a single laser-engraved product: a 90×90mm
coaster. React + Vite + Fabric.js frontend, with a small Express/SQLite
backend that saves finished designs and hands back a reference code.

## Run it

Two servers, in two terminals.

**Backend** (`/server`):
```bash
cd server
npm install
npm run dev
```
Listens on `http://localhost:3001`. Creates `server/data/designs.db`
(SQLite) and `server/storage/{reference_code}/` on demand — nothing to set
up by hand.

**Frontend** (project root):
```bash
npm install
npm run dev
```
Open the printed `localhost` URL (usually `http://localhost:5173`). Vite
proxies `/api` and `/storage` requests to the backend in dev, so no CORS
config is needed locally.

## What's here

### Frontend
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
- **Save design** (`src/utils/exportCanvas.js`, `src/utils/api.js`): on
  confirm, generates a high-res (~300 DPI) preview PNG and a
  production-oriented SVG (design elements only, no mockup/guides — see
  code comments for the vector-export limitation around raster images),
  then uploads both to the backend. Shows a loading state while saving, a
  large on-screen reference code on success, and a retry-friendly error
  banner on failure — the design is never lost if the save fails.
- **Parent-page handoff** (`src/utils/parentBridge.js`): the app is meant
  to run inside an iframe on the WooCommerce product page. On a successful
  save it `postMessage`s `{ type: 'vien_design_complete', reference_code,
  preview_image_url, product_type }` to `window.parent`; it also listens
  for a `{ type: 'vien_init', product_type }` message from the parent to
  pick which product/template to load (defaults to `coaster` if none
  arrives — there's only one product so far anyway). No-ops if the app
  isn't actually embedded (`window.parent === window`). The target origin
  for the outgoing message defaults to `*`; set `VITE_PARENT_ORIGIN` at
  build time to the real WordPress origin before going live.

### Backend (`/server`)
- Express + `better-sqlite3`, files stored on local disk under
  `server/storage/{reference_code}/`. Own `package.json` so it can be
  deployed independently of the frontend later.
- `POST /api/designs` — multipart upload (`preview`, `production` files +
  `product_type` field). Generates a 6-character reference code (checked
  against the DB for collisions, regenerating if needed), saves the files,
  inserts a `designs` row, returns `{ reference_code, product_type,
  preview_image_url, production_url }`. The `_url` fields are absolute
  (built from `PUBLIC_BASE_URL`, defaults to `http://localhost:3001`) since
  they're meant to be loaded from a different origin — the WordPress page
  embedding this app in an iframe. Set `PUBLIC_BASE_URL` in any real
  deployment.
- `GET /api/designs/:code` — returns the stored record (paths + absolute
  URLs + metadata). Not used by the frontend yet — this is for the Phase 4
  review workflow.
- `designs` table: `reference_code` (PK), `product_type`, `preview_path`,
  `production_path`, `status` (defaults `pending_review`), `created_at`.
- **Storage is local disk**, fine for a single always-on dev/host box. If
  this ever moves to a host with an ephemeral filesystem (serverless,
  most container platforms' default deploys), saved files will disappear
  on restart/redeploy — see the comment in `server/src/config.js`. Not a
  concern yet, just flagged before it bites someone.

### Verifying a save independently
```bash
# from server/
node -e "console.log(require('better-sqlite3')('./data/designs.db').prepare('SELECT * FROM designs').all())"
curl http://localhost:3001/api/designs/<CODE>
```

## Notes

- Fonts load from Google Fonts (`index.html`); without network access they
  fall back to the generic sans-serif/serif/cursive stack, which is fine for
  local dev without internet.
- Still one product, no e-commerce/cart/checkout, no admin UI — those are
  later phases.
