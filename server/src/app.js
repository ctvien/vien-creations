import express from 'express';
import cors from 'cors';
import { STORAGE_DIR } from './config.js';
import designsRouter from './routes/designs.js';

export const app = express();

app.use(cors());
app.use('/storage', express.static(STORAGE_DIR));
app.use('/api/designs', designsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Fallback error handler for anything that escapes route-level handling.
// Express only recognizes this as an error handler with all 4 params
// present, so `_next` stays even though it's unused.
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
