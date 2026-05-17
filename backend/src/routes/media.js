// backend/src/routes/media.js
// Handles image uploads for every module in the ERP
// Dependencies: multer, sharp (npm i sharp)

const router   = require('express').Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs').promises;
const crypto   = require('crypto');
const db       = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// ─── Constants ───────────────────────────────────────────────
const UPLOAD_DIR    = process.env.UPLOAD_DIR    || path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE) || 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME  = ['image/jpeg','image/png','image/webp','image/gif'];
const THUMB_SIZES   = [
  { name: 'sm',  size: 80  },
  { name: 'md',  size: 300 },
  { name: 'lg',  size: 800 },
];

const VALID_MODULES = [
  'product','raw_material','work_order','qc_record','loss_record',
  'sales_order','delivery_note','grn','supplier','customer',
  'employee','shortfall','import',
];

// ─── Multer (memory storage — process before saving) ─────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`File type ${file.mimetype} not allowed. Use JPEG, PNG, WebP or GIF.`));
  },
});

// ─── Helpers ─────────────────────────────────────────────────
const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const generateFilename = (original) => {
  const ext  = path.extname(original).toLowerCase() || '.jpg';
  const hash = crypto.randomBytes(12).toString('hex');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${date}_${hash}${ext}`;
};

const getPublicUrl = (filePath) => {
  const base = process.env.MEDIA_BASE_URL
    || `${process.env.API_BASE_URL || 'http://localhost:3001'}/uploads`;
  // filePath is relative to UPLOAD_DIR, e.g. "products/20250517_abc123.jpg"
  return `${base}/${filePath.replace(/\\/g, '/')}`;
};

// Try to use sharp if installed; gracefully degrade if not
let sharp;
try { sharp = require('sharp'); } catch (_) { sharp = null; }

const processImage = async (buffer, mime, destPath, opts = {}) => {
  if (!sharp) {
    // No sharp → save buffer as-is
    await fs.writeFile(destPath, buffer);
    return { width: null, height: null };
  }
  const img = sharp(buffer);
  const meta = await img.metadata();
  const out = img.rotate(); // auto-orient EXIF

  if (opts.maxWidth && meta.width > opts.maxWidth)
    out.resize(opts.maxWidth, null, { withoutEnlargement: true });

  if (mime === 'image/png') await out.png({ quality: 85 }).toFile(destPath);
  else if (mime === 'image/webp') await out.webp({ quality: 85 }).toFile(destPath);
  else await out.jpeg({ quality: 85, mozjpeg: true }).toFile(destPath);

  const resized = sharp ? await sharp(destPath).metadata() : {};
  return { width: resized.width || meta.width, height: resized.height || meta.height };
};

const makeThumbs = async (buffer, mime, module, baseName) => {
  if (!sharp) return [];
  const results = [];
  const thumbDir = path.join(UPLOAD_DIR, module, 'thumbs');
  await ensureDir(thumbDir);

  for (const { name, size } of THUMB_SIZES) {
    const thumbFile = `thumb_${name}_${baseName}`;
    const thumbAbs  = path.join(thumbDir, thumbFile);
    const thumbRel  = path.join(module, 'thumbs', thumbFile);

    try {
      const { width, height } = await sharp(buffer)
        .rotate()
        .resize(size, size, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 75 })
        .toFile(thumbAbs);
      results.push({ size: name, file_path: thumbRel,
                     file_url: getPublicUrl(thumbRel), width, height });
    } catch (_) {}
  }
  return results;
};

router.use(authenticate);

// ─── Serve uploaded files (development only) ─────────────────
// In production, serve through Nginx / CDN
const express = require('express');
router.use('/files', express.static(UPLOAD_DIR));

// ─── GET /api/media/:module/:recordId ─────────────────────────
// List all media for a record
router.get('/:module/:recordId', async (req, res) => {
  const { module, recordId } = req.params;
  if (!VALID_MODULES.includes(module))
    return res.status(400).json({ error: 'Invalid module' });

  try {
    const { rows } = await db.query(
      `SELECT m.*,
              json_agg(json_build_object(
                'size', t.size, 'url', t.file_url,
                'width', t.width, 'height', t.height
              ) ORDER BY t.size) FILTER (WHERE t.id IS NOT NULL) AS thumbnails
       FROM media m
       LEFT JOIN media_thumbnails t ON t.media_id = m.id
       WHERE m.module=$1 AND m.record_id=$2
       GROUP BY m.id
       ORDER BY m.is_primary DESC, m.created_at ASC`,
      [module, recordId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/media/:module/:recordId ────────────────────────
// Upload one or more images
router.post('/:module/:recordId', upload.array('images', 10), async (req, res) => {
  const { module, recordId } = req.params;
  if (!VALID_MODULES.includes(module))
    return res.status(400).json({ error: 'Invalid module' });
  if (!req.files?.length)
    return res.status(400).json({ error: 'No files uploaded' });

  const client = await db.getClient();
  const saved  = [];

  try {
    await client.query('BEGIN');

    // Check if this record already has a primary image
    const { rows: existing } = await client.query(
      'SELECT id FROM media WHERE module=$1 AND record_id=$2 AND is_primary=true',
      [module, recordId]
    );
    let hasPrimary = existing.length > 0;

    for (const file of req.files) {
      const filename    = generateFilename(file.originalname);
      const moduleDir   = path.join(UPLOAD_DIR, module);
      await ensureDir(moduleDir);
      const absPath     = path.join(moduleDir, filename);
      const relPath     = path.join(module, filename);

      // Process + save image
      const { width, height } = await processImage(
        file.buffer, file.mimetype, absPath, { maxWidth: 1920 }
      );

      // Generate thumbnails
      const thumbs = await makeThumbs(file.buffer, file.mimetype, module, filename);

      // First image uploaded becomes primary if no primary exists
      const isPrimary = !hasPrimary;
      if (isPrimary) hasPrimary = true;

      const { rows } = await client.query(
        `INSERT INTO media(module,record_id,filename,original_name,file_path,file_url,
           file_size,mime_type,media_type,width,height,is_primary,alt_text,caption,uploaded_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,'image',$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [module, recordId, filename, file.originalname, relPath,
         getPublicUrl(relPath), file.size, file.mimetype,
         width, height, isPrimary,
         req.body.alt_text || null,
         req.body.caption   || null,
         req.user.id]
      );
      const mediaId = rows[0].id;

      // Insert thumbnails
      for (const t of thumbs) {
        await client.query(
          `INSERT INTO media_thumbnails(media_id,size,file_path,file_url,width,height)
           VALUES($1,$2,$3,$4,$5,$6)`,
          [mediaId, t.size, t.file_path, t.file_url, t.width, t.height]
        );
      }

      saved.push({ ...rows[0], thumbnails: thumbs });
    }

    await client.query('COMMIT');
    res.status(201).json(saved);
  } catch (err) {
    await client.query('ROLLBACK');
    // Clean up partially saved files
    for (const f of req.files) {
      const p = path.join(UPLOAD_DIR, module, generateFilename(f.originalname));
      fs.unlink(p).catch(() => {});
    }
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// ─── PATCH /api/media/:id/primary ─────────────────────────────
// Set an image as the primary for its record
router.patch('/:id/primary', async (req, res) => {
  try {
    // Get the target image
    const { rows: target } = await db.query(
      'SELECT module,record_id FROM media WHERE id=$1', [req.params.id]);
    if (!target.length) return res.status(404).json({ error: 'Not found' });

    const { module, record_id } = target[0];

    // Unset existing primary, then set new one
    await db.query(
      'UPDATE media SET is_primary=false WHERE module=$1 AND record_id=$2',
      [module, record_id]
    );
    const { rows } = await db.query(
      'UPDATE media SET is_primary=true WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PATCH /api/media/:id ─────────────────────────────────────
// Update alt_text / caption
router.patch('/:id', async (req, res) => {
  try {
    const { alt_text, caption } = req.body;
    const { rows } = await db.query(
      'UPDATE media SET alt_text=COALESCE($1,alt_text),caption=COALESCE($2,caption) WHERE id=$3 RETURNING *',
      [alt_text, caption, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DELETE /api/media/:id ────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT file_path,module,record_id,is_primary FROM media WHERE id=$1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const m = rows[0];

    // Delete file from disk
    const absPath = path.join(UPLOAD_DIR, m.file_path);
    await fs.unlink(absPath).catch(() => {});

    // Delete thumbnails from disk
    const { rows: thumbs } = await db.query(
      'SELECT file_path FROM media_thumbnails WHERE media_id=$1', [req.params.id]);
    for (const t of thumbs)
      await fs.unlink(path.join(UPLOAD_DIR, t.file_path)).catch(() => {});

    // Delete DB records (cascade deletes thumbnails)
    await db.query('DELETE FROM media WHERE id=$1', [req.params.id]);

    // If deleted image was primary, promote next image
    if (m.is_primary) {
      const { rows: next } = await db.query(
        'SELECT id FROM media WHERE module=$1 AND record_id=$2 ORDER BY created_at LIMIT 1',
        [m.module, m.record_id]
      );
      if (next.length)
        await db.query('UPDATE media SET is_primary=true WHERE id=$1', [next[0].id]);
    }

    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Error handler for multer ─────────────────────────────────
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ error: `File too large (max ${MAX_FILE_SIZE/1024/1024}MB)` });
  if (err.message) return res.status(400).json({ error: err.message });
  next(err);
});

module.exports = router;
