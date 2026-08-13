import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, '..');

export const PORT = process.env.PORT || 3001;

// Public origin this server is reachable at. Used to build absolute file
// URLs (e.g. preview_image_url) that get handed to a *different* origin —
// the WordPress parent page embedding the configurator in an iframe — so a
// path that's merely relative to this server isn't enough. Must be set via
// env in any real deployment; the localhost default only works for local
// dev where frontend and backend are on the same machine.
export const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

// Local filesystem storage. Fine for local dev / a single always-on host.
// NOTE: if this ever moves to a serverless/container host with an
// ephemeral filesystem (e.g. most default deploys of Vercel, Render's free
// tier, Heroku dynos, AWS Lambda), files written here disappear on
// restart/redeploy. At that point STORAGE_DIR needs to become a mounted
// persistent volume or this needs to swap to object storage (S3-compatible)
// — not a concern for this phase, just flagging it before it bites someone.
export const STORAGE_DIR = path.join(SERVER_ROOT, 'storage');
export const DB_PATH = path.join(SERVER_ROOT, 'data', 'designs.db');

export const REFERENCE_CODE_LENGTH = 6;
// No 0/O/1/I — avoids ambiguity when a customer reads the code back over
// the phone or off a receipt.
export const REFERENCE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const REFERENCE_CODE_MAX_ATTEMPTS = 10;

// Generous enough for a 300 DPI 90mm PNG (~1-3MB typically) plus an SVG
// with one embedded raster image, with headroom.
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
