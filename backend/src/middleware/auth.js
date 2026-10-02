const jwt = require('jsonwebtoken');
const config = require('../config');

const ROLES = {
  STANDARD: 'standart',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

const ALL_ROLES = Object.values(ROLES);
const MANAGER_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

/**
 * Bearer token doğrulama. Hatalar JSON olarak döner; böylece istemci tarafı
 * "oturum düştü" durumunu ayırt edip kullanıcıyı çıkışa yönlendirebilir.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Oturum bulunamadı', code: 'TOKEN_MISSING' });
  }

  jwt.verify(token, config.JWT_SECRET, (err, payload) => {
    if (err) {
      const expired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        error: expired ? 'Oturum süresi doldu, lütfen tekrar giriş yapın' : 'Geçersiz oturum',
        code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      });
    }
    req.user = payload;
    next();
  });
}

/** Belirtilen rollerden birine sahip olmayı zorunlu kılar. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }
    next();
  };
}

const isManager = (user) => MANAGER_ROLES.includes(user?.role);

module.exports = { authenticateToken, requireRole, isManager, ROLES, ALL_ROLES, MANAGER_ROLES };
