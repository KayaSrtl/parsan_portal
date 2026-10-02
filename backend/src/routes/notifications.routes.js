const express = require('express');
const { get, all, run } = require('../db');
const { authenticateToken, isManager } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');

const router = express.Router();

router.use(authenticateToken);

// Kullanıcının bildirimlerini getir (veritabanı + dinamik sistem bildirimleri)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const currentUserId = req.user.id;
    const currentUserName = req.user.name;

    // 1. Veritabanındaki kayıtlı bildirimler
    const dbNotifications = await all(
      'SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY id DESC LIMIT 40',
      [currentUserId]
    );

    // 2. Dinamik Bildirimler (Kullanıcıya atanmış açık aksiyonlar)
    const myActions = await all(
      "SELECT * FROM actions WHERE LOWER(TRIM(assignee_name)) = LOWER(TRIM(?)) AND status != 'Tamamlandı' ORDER BY id DESC LIMIT 5",
      [currentUserName]
    );

    const dynamicNotifications = [];

    // Eğer kullanıcıya atanmış açık görevler varsa dinamik bildirim ekle
    myActions.forEach((act) => {
      // Eğer DB'de bu aksiyon için zaten özel bildirim yoksa ekle
      const alreadyHas = dbNotifications.some((n) => n.link === `action:${act.id}`);
      if (!alreadyHas) {
        dynamicNotifications.push({
          id: `dyn-act-${act.id}`,
          user_id: currentUserId,
          sender_name: 'Aksiyon Sistemi',
          title: 'Üzerinizdeki Açık Görev',
          message: `"${act.action_content.substring(0, 50)}${act.action_content.length > 50 ? '...' : ''}" görevi devam ediyor. Hedef: ${act.target_date || 'Belirtilmedi'}`,
          type: 'action',
          link: `?app=aksiyon_modulu`,
          read: 0,
          created_at: act.created_at || new Date().toISOString(),
        });
      }
    });

    // Yönetici ise açık kırmızı problemler bildirimi
    if (isManager(req.user)) {
      const redIssues = await all(
        "SELECT COUNT(*) as count FROM issues WHERE mevcut_durum = 'Kırmızı'"
      );
      const redCount = redIssues[0]?.count || 0;
      if (redCount > 0) {
        dynamicNotifications.unshift({
          id: 'dyn-red-issues',
          user_id: currentUserId,
          sender_name: '5S Saha Takip',
          title: `${redCount} Adet Acil (Kırmızı) Problem`,
          message: 'Sahada çözüm bekleyen acil kırmızı hata kartları bulunmaktadır.',
          type: 'warning',
          link: `?app=hata_kartlari&tab=open_issues`,
          read: 0,
          created_at: new Date().toISOString(),
        });
      }
    }

    const allNotes = [...dynamicNotifications, ...dbNotifications];
    res.json(allNotes);
  })
);

// Tek bildirimi okundu yap
router.put(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (String(id).startsWith('dyn-')) {
      return res.json({ success: true, message: 'Dinamik bildirim kapatıldı' });
    }
    await run('UPDATE notifications SET read = 1 WHERE id = ?', [id]);
    res.json({ success: true });
  })
);

// Tümünü okundu yap
router.put(
  '/read-all',
  asyncHandler(async (req, res) => {
    await run('UPDATE notifications SET read = 1 WHERE user_id = ? OR user_id IS NULL', [
      req.user.id,
    ]);
    res.json({ success: true });
  })
);

// Yeni bildirim/mesaj gönder (Yöneticiler veya sistem için)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { target_user_id, title, message, type = 'info', link = '' } = req.body || {};

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Başlık ve mesaj zorunludur' });
    }

    const result = await run(
      `INSERT INTO notifications (user_id, sender_name, title, message, type, link, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        target_user_id || null, // null ise herkese broadcast
        req.user.name || 'Sistem',
        title,
        message,
        type,
        link,
        new Date().toISOString(),
      ]
    );

    const created = await get('SELECT * FROM notifications WHERE id = ?', [result.lastID]);
    res.status(201).json(created);
  })
);

module.exports = router;
