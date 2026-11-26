const express = require('express');
const { all, run } = require('../db');
const { authenticateToken, requireRole, MANAGER_ROLES } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');

const router = express.Router();

router.use(authenticateToken);

// Tüm oturum açmış kullanıcılar (misafir dahil) bölüm listesini okuyabilir.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await all(
      'SELECT id, name, created_at FROM departments ORDER BY name COLLATE NOCASE'
    );
    res.json(rows);
  })
);

router.post(
  '/',
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || '').trim().slice(0, 60);
    if (!name) return res.status(400).json({ error: 'Bölüm adı zorunludur' });

    const normalized = name.toLocaleLowerCase('tr-TR');
    const existingRows = await all('SELECT id, name FROM departments');
    const existing = existingRows.find(
      (r) => String(r.name || '').toLocaleLowerCase('tr-TR') === normalized
    );
    if (existing) return res.status(409).json({ error: 'Bu bölüm zaten tanımlı' });

    const { lastID } = await run('INSERT INTO departments (name, created_at) VALUES (?, ?)', [
      name,
      new Date().toISOString(),
    ]);
    res.status(201).json({ id: lastID, name, message: 'Bölüm eklendi' });
  })
);

router.delete(
  '/:id',
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { changes } = await run('DELETE FROM departments WHERE id = ?', [id]);
    if (!changes) return res.status(404).json({ error: 'Bölüm bulunamadı' });
    res.json({ message: 'Bölüm silindi' });
  })
);

module.exports = router;
