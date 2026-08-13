import express from 'express';
import multer from 'multer';
import { MAX_UPLOAD_BYTES, PUBLIC_BASE_URL } from '../config.js';
import { generateUniqueReferenceCode, insertDesign, getDesignByCode } from '../designsRepo.js';
import { saveDesignFiles } from '../storage.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

const ACCEPTED_PREVIEW_MIME = new Set(['image/png']);
const ACCEPTED_PRODUCTION_MIME = new Set(['image/svg+xml', 'image/png']);

// Absolute (cross-origin-safe) URL for a stored file — the WordPress
// parent page loading the preview thumbnail is a different origin than
// this server, so a path relative to this server isn't enough.
function toPublicUrl(relativeStoragePath) {
  return `${PUBLIC_BASE_URL}/storage/${relativeStoragePath}`;
}

router.post(
  '/',
  upload.fields([
    { name: 'preview', maxCount: 1 },
    { name: 'production', maxCount: 1 },
  ]),
  (req, res) => {
    const previewFile = req.files?.preview?.[0];
    const productionFile = req.files?.production?.[0];

    if (!previewFile || !productionFile) {
      return res.status(400).json({
        error: 'Both a "preview" and a "production" file are required.',
      });
    }
    if (!ACCEPTED_PREVIEW_MIME.has(previewFile.mimetype)) {
      return res.status(400).json({ error: `Unsupported preview file type: ${previewFile.mimetype}` });
    }
    if (!ACCEPTED_PRODUCTION_MIME.has(productionFile.mimetype)) {
      return res.status(400).json({ error: `Unsupported production file type: ${productionFile.mimetype}` });
    }

    const productType = (req.body.product_type || 'coaster').trim() || 'coaster';
    const referenceCode = generateUniqueReferenceCode();
    const { previewPath, productionPath } = saveDesignFiles(referenceCode, {
      previewFile,
      productionFile,
    });

    insertDesign({ referenceCode, productType, previewPath, productionPath });

    res.status(201).json({
      reference_code: referenceCode,
      product_type: productType,
      preview_image_url: toPublicUrl(previewPath),
      production_url: toPublicUrl(productionPath),
    });
  }
);

router.get('/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const design = getDesignByCode(code);
  if (!design) {
    return res.status(404).json({ error: `No design found for reference code ${code}` });
  }
  res.json({
    reference_code: design.reference_code,
    product_type: design.product_type,
    preview_path: design.preview_path,
    production_path: design.production_path,
    preview_url: toPublicUrl(design.preview_path),
    production_url: toPublicUrl(design.production_path),
    status: design.status,
    created_at: design.created_at,
  });
});

// Multer errors (e.g. file too large) land here instead of the generic
// error handler so we can give a precise status/message.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'One of the uploaded files is too large.' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;
