const express = require('express');
const bcrypt = require('bcryptjs');
const { get, all, run } = require('../db');
const {
  authenticateToken,
  requireRole,
  ROLES,
  ALL_ROLES,
  MANAGER_ROLES,
} = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');

const router = express.Router();

router.use(authenticateToken);

/** Yönetici ve super admin kullanıcı listesini gorebilir (atama yapmak için). */
router.get(
  '/',
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res) => {
    res.json(
      await all('SELECT id, name, email, role, department FROM users ORDER BY name COLLATE NOCASE')
    );
  })
);

// Kullanıcı olusturma/degistirme/silme sadece super admin yetkisindedir.
router.use(requireRole(ROLES.SUPER_ADMIN));

const validate = ({ name, email, role }, { requireAll = true } = {}) => {
  if (requireAll && (!name?.trim() || !email?.trim())) return 'Ad ve e-posta zorunludur';
  if (role && !ALL_ROLES.includes(role)) return 'Geçersiz rol';
  return null;
};

/** Boş/geçersiz bölüm değerlerini NULL'a indirger. */
const normalizeDepartment = (value) => {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed : null;
};

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, email, password, role = ROLES.STANDARD, department } = req.body || {};

    const invalid = validate({ name, email, role });
    if (invalid) return res.status(400).json({ error: invalid });
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
    }

    const existing = await get('SELECT id FROM users WHERE email = ?', [email.trim()]);
    if (existing) return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' });

    const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    const { lastID } = await run(
      'INSERT INTO users (name, email, password, role, department) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim(), passwordHash, role, normalizeDepartment(department)]
    );

    res.status(201).json({
      id: lastID,
      name: name.trim(),
      email: email.trim(),
      role,
      department: normalizeDepartment(department),
    });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { name, email, password, role, department } = req.body || {};
    const userId = Number(req.params.id);

    const invalid = validate({ name, email, role });
    if (invalid) return res.status(400).json({ error: invalid });

    const target = await get('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!target) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    // Son super admin'in yetkisini dusurup sistemi kilitlemeyi engelle.
    if (target.role === ROLES.SUPER_ADMIN && role && role !== ROLES.SUPER_ADMIN) {
      const { count } = await get('SELECT COUNT(*) AS count FROM users WHERE role = ?', [
        ROLES.SUPER_ADMIN,
      ]);
      if (count <= 1) {
        return res.status(400).json({ error: 'Sistemdeki son super admin yetkisi düşürülemez' });
      }
    }

    const duplicate = await get('SELECT id FROM users WHERE email = ? AND id != ?', [
      email.trim(),
      userId,
    ]);
    if (duplicate) return res.status(409).json({ error: 'Bu e-posta başka bir kullanıcıda kayıtlı' });

    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
      }
      const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
      await run(
        'UPDATE users SET name = ?, email = ?, password = ?, role = ?, department = ? WHERE id = ?',
        [name.trim(), email.trim(), passwordHash, role, normalizeDepartment(department), userId]
      );
    } else {
      await run('UPDATE users SET name = ?, email = ?, role = ?, department = ? WHERE id = ?', [
        name.trim(),
        email.trim(),
        role,
        normalizeDepartment(department),
        userId,
      ]);
    }

    res.json({ message: 'Kullanıcı başarıyla güncellendi' });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
    }

    const target = await get('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!target) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (target.role === ROLES.SUPER_ADMIN) {
      const { count } = await get('SELECT COUNT(*) AS count FROM users WHERE role = ?', [
        ROLES.SUPER_ADMIN,
      ]);
      if (count <= 1) {
        return res.status(400).json({ error: 'Sistemdeki son super admin silinemez' });
      }
    }

    await run('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'Kullanıcı silindi' });
  })
);

module.exports = router;
