const multer = require('multer');
const config = require('../config');

/** Async route'lardaki reject'leri Express hata zincirine aktarir. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFound(req, res) {
  res.status(404).json({ error: 'Kaynak bulunamadı: ' + req.originalUrl });
}

// eslint-disable-next-line no-unused-vars -- Express hata middleware'i 4 parametre ister
function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res.status(400).json({
      error: tooLarge
        ? `Dosya cok büyük (en fazla ${Math.round(config.MAX_UPLOAD_BYTES / 1024 / 1024)} MB)`
        : 'Dosya yüklenemedi: ' + err.message,
    });
  }

  const status = err.status || 500;
  if (status >= 500) console.error('[hata]', err);

  res.status(status).json({
    error: status >= 500 ? 'Sunucu hatası' : err.message,
    ...(config.isProduction ? {} : { detail: err.message }),
  });
}

module.exports = { asyncHandler, notFound, errorHandler };
