const express = require('express');
const { get, all, run } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Tüm denetimleri getir (en yeniler üstte)
router.get('/', async (req, res, next) => {
  try {
    const audits = await all('SELECT * FROM audits ORDER BY id DESC');
    res.json(audits);
  } catch (err) {
    next(err);
  }
});

// Yeni denetim ekle
router.post('/', async (req, res, next) => {
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
    answers
  } = req.body;

  try {
    const { lastID } = await run(
      `INSERT INTO audits (
        tezgah_no, auditor_name, date, seiri_score, seiton_score, 
        seiso_score, seiketsu_score, shitsuke_score, total_score, 
        answers, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tezgah_no,
        auditor_name,
        date || new Date().toISOString(),
        seiri_score,
        seiton_score,
        seiso_score,
        seiketsu_score,
        shitsuke_score,
        total_score,
        JSON.stringify(answers || {}),
        req.user.id
      ]
    );

    const newAudit = await get('SELECT * FROM audits WHERE id = ?', [lastID]);
    res.json(newAudit);
  } catch (err) {
    next(err);
  }
});

// Denetim sil (Sadece super_admin)
router.delete('/:id', async (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Bu iYlem iA in yetkiniz yok.' });
  }

  try {
    const { changes } = await run('DELETE FROM audits WHERE id = ?', [req.params.id]);
    if (changes === 0) return res.status(404).json({ error: 'Denetim bulunamad' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
