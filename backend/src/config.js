const path = require('path');

// .env dosyası varsa yükle (Node 20.12+ dahili yükleyici, ek bağımlılık gerekmez).
try {
  process.loadEnvFile(path.resolve(__dirname, '..', '.env'));
} catch {
  // .env yoksa sorun değil, asagidaki varsayılanlar kullanılır.
}

const ROOT = path.resolve(__dirname, '..');

const isProduction = process.env.NODE_ENV === 'production';

// Eski kurulumlarin bozulmaması için fallback biraktik; üretimde JWT_SECRET zorunlu.
const FALLBACK_SECRET = 'gizli_anahtar_5s_parsan';
const JWT_SECRET = process.env.JWT_SECRET || FALLBACK_SECRET;

if (JWT_SECRET === FALLBACK_SECRET) {
  const message =
    'JWT_SECRET tanimli değil. backend/.env dosyasina rastgele bir değer ekleyin ' +
    '(örnek: JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex') + ').';
  if (isProduction) {
    throw new Error(message);
  }
  console.warn('[UYARI] ' + message);
}

const parseList = (value, fallback) =>
  value ? value.split(',').map((s) => s.trim()).filter(Boolean) : fallback;

module.exports = {
  isProduction,
  PORT: Number(process.env.PORT) || 5000,
  JWT_SECRET,
  TOKEN_TTL: process.env.TOKEN_TTL || '24h',
  DB_PATH: process.env.DB_PATH
    ? path.resolve(ROOT, process.env.DB_PATH)
    : path.join(ROOT, 'database.sqlite'),
  UPLOADS_DIR: path.join(ROOT, 'uploads'),
  MAX_UPLOAD_BYTES: Number(process.env.MAX_UPLOAD_BYTES) || 8 * 1024 * 1024, // 8 MB
  CORS_ORIGINS: parseList(process.env.CORS_ORIGINS, [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://engrare.github.io',
    'https://parsan.engrare.com',
  ]),
  // Ilk kurulumda örnek kullanıcıları oluştur. Üretimde kapalı olmali.
  SEED_USERS: process.env.SEED_USERS === 'true' || !isProduction,
  SEED_PASSWORD: process.env.SEED_PASSWORD || 'parsan123',
};
