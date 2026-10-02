const express = require('express');
const { get, all, run } = require('../db');
const { authenticateToken, requireRole, isManager, ROLES } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');
const { singleImage } = require('../middleware/upload');
const { parseArray } = require('../utils/json');

const router = express.Router();

router.use(authenticateToken);

// Istemciden guncellenmesine izin verilen alanlar. Beyaz liste kullanmak,
// gonderilmeyen bir alanin veritabanında NULL'a donusmesini engeller.
const EDITABLE_FIELDS = [
  'bildirilen_alan',
  'problem_tanimi',
  'bildiren_bolum',
  'ilgili_bolum',
  'hedef_tarih',
  'planlanan_aksiyon',
  'mevcut_durum',
  'gelisme_notlari',
];

const serialize = (row) => ({ ...row, revizyon_gecmisi: parseArray(row.revizyon_gecmisi) });

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = isManager(req.user)
      ? await all('SELECT * FROM issues ORDER BY bildirim_zamani DESC')
      : await all('SELECT * FROM issues WHERE user_id = ? ORDER BY bildirim_zamani DESC', [
          req.user.id,
        ]);

    res.json(rows.map(serialize));
  })
);

router.post(
  '/',
  singleImage,
  asyncHandler(async (req, res) => {
    const data = req.body || {};

    if (!data.problem_tanimi?.trim()) {
      return res.status(400).json({ error: 'Problem tanimi zorunludur' });
    }

    const { lastID } = await run(
      `INSERT INTO issues (
        user_id, bildirilen_alan, problem_tanimi, bildiren_kisi, bildiren_bolum, ilgili_bolum,
        bildirim_zamani, hedef_tarih, planlanan_aksiyon, mevcut_durum, gelisme_notlari,
        fotograf_url, revizyon_gecmisi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        data.bildirilen_alan || '',
        data.problem_tanimi.trim(),
        req.user.name,
        data.bildiren_bolum || '',
        data.ilgili_bolum || '',
        new Date().toISOString(),
        data.hedef_tarih || '',
        data.planlanan_aksiyon || '',
        data.mevcut_durum || 'Kırmızı',
        data.gelisme_notlari || '',
        req.file ? `/uploads/${req.file.filename}` : '',
        '[]',
      ]
    );

    res.status(201).json({ id: lastID, message: 'Başarıyla eklendi' });
  })
);

router.put(
  '/:id',
  singleImage,
  asyncHandler(async (req, res) => {
    const issueId = Number(req.params.id);
    const body = req.body || {};

    const oldIssue = await get('SELECT * FROM issues WHERE id = ?', [issueId]);
    if (!oldIssue) return res.status(404).json({ error: 'Kayıt bulunamadı' });

    // Standart kullanıcı yalnizca kendi kaydini duzenleyebilir.
    if (!isManager(req.user) && oldIssue.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Bu kaydı düzenleme yetkiniz yok' });
    }

    const revisions = parseArray(oldIssue.revizyon_gecmisi);
    revisions.push({
      tarih: new Date().toISOString(),
      degistiren_kisi: req.user.name,
      eski_durum: oldIssue.mevcut_durum,
      eski_gelisme: oldIssue.gelisme_notlari,
      eski_problem: oldIssue.problem_tanimi,
      eski_aksiyon: oldIssue.planlanan_aksiyon,
      eski_hedef: oldIssue.hedef_tarih,
      eski_bolum: oldIssue.bildiren_bolum,
      eski_alan: oldIssue.bildirilen_alan,
      eski_ilgili: oldIssue.ilgili_bolum,
    });

    // Sadece gercekten gönderilen alanları guncelle.
    const updates = [];
    const params = [];
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(body[field]);
      }
    }

    if (req.file) {
      updates.push('fotograf_url = ?');
      params.push(`/uploads/${req.file.filename}`);
    }

    updates.push('revizyon_gecmisi = ?');
    params.push(JSON.stringify(revisions));
    params.push(issueId);

    await run(`UPDATE issues SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await get('SELECT * FROM issues WHERE id = ?', [issueId]);
    res.json({ message: 'Başarıyla güncellendi', issue: serialize(updated) });
  })
);

router.delete(
  '/:id',
  requireRole(ROLES.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const { changes } = await run('DELETE FROM issues WHERE id = ?', [Number(req.params.id)]);
    if (!changes) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    res.json({ message: 'Kayıt başarıyla silindi' });
  })
);

module.exports = router;
