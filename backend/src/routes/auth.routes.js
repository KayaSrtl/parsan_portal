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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || null,
      },
    });
  })
);

router.post(
  '/guest-login',
  asyncHandler(async (req, res) => {
    const { name } = req.body || {};
    const trimmed = String(name || '').trim().slice(0, 80);
    if (!trimmed) {
      return res.status(400).json({ error: 'Operatör Adı ve Soyadı girilmesi zorunludur' });
    }

    // Misafir kimliği negatif ve benzersizdir; gerçek kullanıcı id'leriyle çakışmaz.
    const guestId = -Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      { id: guestId, role: 'misafir', name: trimmed, isGuest: true },
      config.JWT_SECRET,
      { expiresIn: config.TOKEN_TTL || '30d' }
    );

    res.json({
      token,
      user: { id: guestId, name: trimmed, email: '', role: 'misafir', isGuest: true },
    });
  })
);

/** Token geçerliliğini kontrol etmek için hafif uc nokta. */
router.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // Misafir oturumları users tablosunda yer almaz; token içeriği yeterlidir.
    if (req.user.role === 'misafir' || req.user.isGuest) {
      return res.json({
        id: req.user.id,
        name: req.user.name,
        email: '',
        role: 'misafir',
        isGuest: true,
      });
    }
    const user = await get(
      'SELECT id, name, email, role, department FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı', code: 'TOKEN_INVALID' });
    res.json(user);
  })
);

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
