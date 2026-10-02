const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');

fs.mkdirSync(config.UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

/** Dosya adini güvenli hale getirir (dizin atlama ve garip karakterler için). */
function safeName(originalName) {
  const base = path.basename(originalName || 'dosya');
  const ext = path.extname(base).toLowerCase().slice(0, 10);
  const stem = path
    .basename(base, path.extname(base))
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 60) || 'dosya';
  return `${Date.now()}-${stem}${ext}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, safeName(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    const err = new Error('Sadece resim dosyası yükleyebilirsiniz');
    err.status = 400;
    cb(err);
  },
});

/** Tek resim alani ('image') için hazır middleware. */
const singleImage = upload.single('image');

module.exports = { upload, singleImage, safeName, ALLOWED_MIME };
