import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, '..');

export const PORT = process.env.PORT || 3001;

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
