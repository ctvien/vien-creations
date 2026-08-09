import fs from 'node:fs';
import path from 'node:path';
import { STORAGE_DIR } from './config.js';

const EXTENSION_BY_MIME = {
  'image/png': '.png',
  'image/svg+xml': '.svg',
  'image/jpeg': '.jpg',
};

export function extensionForMimeType(mimeType) {
  return EXTENSION_BY_MIME[mimeType] || '';
}

// Saves the two uploaded files under storage/{referenceCode}/ and returns
// paths relative to STORAGE_DIR (what gets stored in the DB — keeps rows
// portable if STORAGE_DIR itself ever moves).
export function saveDesignFiles(referenceCode, { previewFile, productionFile }) {
  const dir = path.join(STORAGE_DIR, referenceCode);
  fs.mkdirSync(dir, { recursive: true });

  const previewName = `preview${extensionForMimeType(previewFile.mimetype) || '.png'}`;
  const productionName = `production${extensionForMimeType(productionFile.mimetype) || '.svg'}`;

  fs.writeFileSync(path.join(dir, previewName), previewFile.buffer);
  fs.writeFileSync(path.join(dir, productionName), productionFile.buffer);

  return {
    previewPath: path.join(referenceCode, previewName),
    productionPath: path.join(referenceCode, productionName),
  };
}
