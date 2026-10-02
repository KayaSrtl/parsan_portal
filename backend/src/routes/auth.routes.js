const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { get, run } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');

const router = express.Router();

const MIN_PASSWORD_LENGTH = 6;

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre zorunludur' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [String(email).trim()]);
    // Kullanıcı yok / şifre yanlis ayrımı yapmiyoruz (kullanıcı sayımını engellemek için).
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      config.JWT_SECRET,
      { expiresIn: config.TOKEN_TTL }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

/** Token geçerliliğini kontrol etmek için hafif uc nokta. */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await get('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı', code: 'TOKEN_INVALID' });
  res.json(user);
}));

router.post(
  '/change-password',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body || {};

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Mevcut ve yeni şifre zorunludur' });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ error: `Yeni şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır` });
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (!bcrypt.compareSync(oldPassword, user.password)) {
      return res.status(400).json({ error: 'Mevcut şifreniz hatalı' });
    }

    const hashed = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
    await run('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ message: 'Şifre başarıyla güncellendi' });
  })
);

module.exports = router;
