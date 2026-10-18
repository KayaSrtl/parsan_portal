const express = require('express');
const { get, all, run } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');
const { maintenanceImages } = require('../middleware/upload');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await all('SELECT * FROM maintenances ORDER BY id DESC');
    res.json(rows);
  })
);

router.post(
  '/',
  maintenanceImages,
  asyncHandler(async (req, res) => {
    const data = req.body || {};

    if (!data.tezgah_no?.trim()) {
      return res.status(400).json({ error: 'Tezgah seçimi zorunludur' });
    }

    const item1Foto = req.files?.item1_foto?.[0]
      ? `/uploads/${req.files.item1_foto[0].filename}`
      : data.item1_foto || '';
    const item3Foto = req.files?.item3_foto?.[0]
      ? `/uploads/${req.files.item3_foto[0].filename}`
      : data.item3_foto || '';

    const { lastID } = await run(
      `INSERT INTO maintenances (
        tezgah_no, vardiya, operator_name, tarih,
        item1_val, item1_status, item1_foto,
        item2_status, item2_note,
        item3_status, item3_foto,
        user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.tezgah_no.trim(),
        data.vardiya || '1. Vardiya (08:00 - 16:00)',
        req.user.name || 'Saha Operatörü',
        new Date().toISOString(),
        data.item1_val || '',
        data.item1_status || 'Uygun',
        item1Foto,
        data.item2_status || 'Kaçak Yok',
        data.item2_note || '',
        data.item3_status || 'Boşaltıldı',
        item3Foto,
        req.user.id || 0,
      ]
    );

    const created = await get('SELECT * FROM maintenances WHERE id = ?', [lastID]);
    res.status(201).json({ id: lastID, message: 'Otonom bakım kontrolü kaydedildi', maintenance: created });
  })
);

router.delete(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const { changes } = await run('DELETE FROM maintenances WHERE id = ?', [Number(req.params.id)]);
    if (!changes) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    res.json({ message: 'Bakım kaydı silindi' });
  })
);

module.exports = router;
