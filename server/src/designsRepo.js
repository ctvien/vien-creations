import { db } from './db.js';
import {
  REFERENCE_CODE_ALPHABET,
  REFERENCE_CODE_LENGTH,
  REFERENCE_CODE_MAX_ATTEMPTS,
} from './config.js';

const codeExistsStmt = db.prepare('SELECT 1 FROM designs WHERE reference_code = ?');
const insertStmt = db.prepare(`
  INSERT INTO designs (reference_code, product_type, preview_path, production_path, status, created_at)
  VALUES (@referenceCode, @productType, @previewPath, @productionPath, @status, @createdAt)
`);
const getByCodeStmt = db.prepare('SELECT * FROM designs WHERE reference_code = ?');

function randomCode() {
  let code = '';
  for (let i = 0; i < REFERENCE_CODE_LENGTH; i++) {
    code += REFERENCE_CODE_ALPHABET[Math.floor(Math.random() * REFERENCE_CODE_ALPHABET.length)];
  }
  return code;
}

// 6-char alphanumeric has a small but real collision chance once there are
// enough rows, so check against the table and regenerate rather than
// assuming uniqueness.
export function generateUniqueReferenceCode() {
  for (let attempt = 0; attempt < REFERENCE_CODE_MAX_ATTEMPTS; attempt++) {
    const code = randomCode();
    if (!codeExistsStmt.get(code)) return code;
  }
  throw new Error('Could not generate a unique reference code after multiple attempts');
}

export function insertDesign({ referenceCode, productType, previewPath, productionPath }) {
  insertStmt.run({
    referenceCode,
    productType,
    previewPath,
    productionPath,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
  });
}

export function getDesignByCode(code) {
  return getByCodeStmt.get(code);
}
