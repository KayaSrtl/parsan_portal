const express = require('express');
const { get, all, run } = require('../db');
const { authenticateToken, ROLES } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');

const router = express.Router();

router.use(authenticateToken);

/** Misafir (saha operatörü) denetim modülüne erişemez. */
router.use((req, res, next) => {
  if (req.user?.role === ROLES.GUEST || req.user?.isGuest) {
    return res.status(403).json({ error: 'Misafir erişimi bu işlem için kapalıdır' });
  }
  next();
});

// Tüm denetimleri getir (en yeniler üstte)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const audits = await all('SELECT * FROM audits ORDER BY id DESC');
    res.json(audits);
  })
);

// Yeni denetim ekle
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      tezgah_no,
      auditor_name,
      date,
      seiri_score,
      seiton_score,
      seiso_score,
      seiketsu_score,
      shitsuke_score,
      total_score,
      answers,
    } = req.body || {};

    if (!tezgah_no?.trim()) {
      return res.status(400).json({ error: 'Denetlenen alan seçimi zorunludur' });
    }

    const { lastID } = await run(
      `INSERT INTO audits (
        tezgah_no, auditor_name, date, seiri_score, seiton_score,
        seiso_score, seiketsu_score, shitsuke_score, total_score,
        answers, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tezgah_no.trim(),
        auditor_name || req.user.name || '',
        date || new Date().toISOString(),
        seiri_score ?? 0,
        seiton_score ?? 0,
        seiso_score ?? 0,
        seiketsu_score ?? 0,
        shitsuke_score ?? 0,
        total_score ?? 0,
        JSON.stringify(answers || {}),
        req.user.id,
      ]
    );

    const newAudit = await get('SELECT * FROM audits WHERE id = ?', [lastID]);
    res.status(201).json(newAudit);
  })
);

// Denetim sil (Sadece super_admin)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }
    const { changes } = await run('DELETE FROM audits WHERE id = ?', [Number(req.params.id)]);
    if (!changes) return res.status(404).json({ error: 'Denetim bulunamadı' });
    res.json({ success: true });
  })
);

module.exports = router;
