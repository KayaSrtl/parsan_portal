const express = require('express');
const { get, all, run } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');
const { singleImage } = require('../middleware/upload');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await all('SELECT * FROM safety_reports ORDER BY id DESC');
    res.json(rows);
  })
);

router.post(
  '/',
  singleImage,
  asyncHandler(async (req, res) => {
    const data = req.body || {};

    if (!data.tanim?.trim()) {
      return res.status(400).json({ error: 'Olay veya tehlike tanımı zorunludur' });
    }
    if (!data.alan?.trim()) {
      return res.status(400).json({ error: 'Alan (tezgah/bölge) seçimi zorunludur' });
    }

    const type = data.type === 'Ramak Kala' ? 'Ramak Kala' : 'Risk Bildirimi';
    const riskLevel = data.risk_derecesi || 'Orta';
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : '';

    const { lastID } = await run(
      `INSERT INTO safety_reports
        (type, alan, bolum, risk_derecesi, tanim, onlem, bildiren_kisi, tarih, durum, fotograf_url, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type,
        data.alan.trim(),
        data.bolum || '',
        riskLevel,
        data.tanim.trim(),
        data.onlem ? data.onlem.trim() : '',
        req.user.name || 'Saha Operatörü',
        new Date().toISOString(),
        'İnceleniyor',
        photoUrl,
        req.user.id || 0,
      ]
    );

    const created = await get('SELECT * FROM safety_reports WHERE id = ?', [lastID]);
    res.status(201).json({ id: lastID, message: 'İSG bildirimi başarıyla oluşturuldu', report: created });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const reportId = Number(req.params.id);
    const { durum, onlem } = req.body || {};

    const existing = await get('SELECT * FROM safety_reports WHERE id = ?', [reportId]);
    if (!existing) return res.status(404).json({ error: 'Kayıt bulunamadı' });

    const updates = [];
    const params = [];

    if (durum !== undefined) {
      updates.push('durum = ?');
      params.push(durum);
    }
    if (onlem !== undefined) {
      updates.push('onlem = ?');
      params.push(onlem);
    }

    if (updates.length > 0) {
      params.push(reportId);
      await run(`UPDATE safety_reports SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updated = await get('SELECT * FROM safety_reports WHERE id = ?', [reportId]);
    res.json({ message: 'İSG bildirimi güncellendi', report: updated });
  })
);

router.delete(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const { changes } = await run('DELETE FROM safety_reports WHERE id = ?', [Number(req.params.id)]);
    if (!changes) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    res.json({ message: 'İSG bildirimi silindi' });
  })
);

module.exports = router;
