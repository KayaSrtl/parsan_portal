const express = require('express');
const { get, all, run } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');
const { maintenanceImages } = require('../middleware/upload');

const router = express.Router();

router.use(authenticateToken);

const PRESSURE_MIN = 3;
const PRESSURE_MAX = 5;

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

    // 1. Madde: Hava basınç barası 3-5 bar aralığında olmalı ve fotoğrafı zorunlu.
    const pressure = Number(String(data.item1_val ?? '').replace(',', '.'));
    if (!Number.isFinite(pressure)) {
      return res.status(400).json({ error: 'Hava basınç değeri (bar) sayısal olmalıdır' });
    }
    const pressureOk = pressure >= PRESSURE_MIN && pressure <= PRESSURE_MAX;

    const item1File = req.files?.item1_foto?.[0];
    const item3File = req.files?.item3_foto?.[0];

    if (!item1File) {
      return res
        .status(400)
        .json({ error: '1. Madde (hava basınç barası) için fotoğraf yüklenmesi zorunludur' });
    }
    if (!item3File) {
      return res
        .status(400)
        .json({ error: '3. Madde (atık yağ tankı) için fotoğraf yüklenmesi zorunludur' });
    }

    const item2Status = data.item2_status === 'Hava Kaçağı Var' ? 'Hava Kaçağı Var' : 'Kaçak Yok';
    const item3Status = data.item3_status === 'Boşaltılmadı' ? 'Boşaltılmadı' : 'Boşaltıldı';

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
        (req.user.name || 'Saha Operatörü').trim(),
        new Date().toISOString(),
        String(pressure),
        pressureOk ? 'Uygun' : 'Uygun Değil',
        `/uploads/${item1File.filename}`,
        item2Status,
        data.item2_note || '',
        item3Status,
        `/uploads/${item3File.filename}`,
        req.user.id || 0,
      ]
    );

    const created = await get('SELECT * FROM maintenances WHERE id = ?', [lastID]);
    res.status(201).json({
      id: lastID,
      message: 'Otonom bakım kontrolü kaydedildi',
      maintenance: created,
    });
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
