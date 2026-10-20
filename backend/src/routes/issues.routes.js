const express = require('express');
const { get, all, run } = require('../db');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');
const { singleImage } = require('../middleware/upload');
const { parseArray } = require('../utils/json');
const config = require('../config');
const mailer = require('../services/mailer');
const {
  normalizeSubActions,
  deriveProgress,
  deriveStatus,
  initialSubActions,
  isMilestone,
} = require('../utils/actions');

const router = express.Router();

router.use(authenticateToken);

const isGuestUser = (user) => user?.role === ROLES.GUEST || Boolean(user?.isGuest);

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
  'hata_karti_turu',
];

const serialize = (row) => ({ ...row, revizyon_gecmisi: parseArray(row.revizyon_gecmisi) });

const CARD_TYPES = ['Kırmızı Hata Kartı', 'Sarı Hata Kartı'];

/** Eski kayıtlardan gelen durum değerlerini yeni modele (Açık/Beklemede/Kapalı) çevirir. */
const normalizeStatus = (raw) => {
  const value = String(raw ?? '').trim();
  if (value === 'Kapalı' || value === 'Yeşil') return 'Kapalı';
  if (value === 'Beklemede') return 'Beklemede';
  return 'Açık';
};

const normalizeCardType = (raw) =>
  CARD_TYPES.includes(String(raw ?? '').trim()) ? String(raw).trim() : CARD_TYPES[0];

router.get(
  '/',
  asyncHandler(async (req, res) => {
    // Misafir operatörler yalnızca kendi açtıkları kartları görebilir.
    if (isGuestUser(req.user)) {
      const own = await all(
        'SELECT * FROM issues WHERE user_id = ? ORDER BY bildirim_zamani DESC',
        [req.user.id]
      );
      return res.json(own.map(serialize));
    }
    const rows = await all('SELECT * FROM issues ORDER BY bildirim_zamani DESC');
    res.json(rows.map(serialize));
  })
);

router.post(
  '/',
  singleImage,
  asyncHandler(async (req, res) => {
    const data = req.body || {};

    if (!data.problem_tanimi?.trim()) {
      return res.status(400).json({ error: 'Problem tanımı zorunludur' });
    }
    if (!data.bildirilen_alan?.trim()) {
      return res.status(400).json({ error: 'Alan (tezgah) seçimi zorunludur' });
    }
    if (!data.ilgili_bolum?.trim()) {
      return res.status(400).json({ error: 'Aksiyonun düşeceği ilgili bölüm seçilmelidir' });
    }

    // Termin varsayılan olarak 1 hafta (7 gün)
    const defaultTargetDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const finalTargetDate = data.hedef_tarih
      ? new Date(data.hedef_tarih).toISOString()
      : defaultTargetDate;

    const cardType = normalizeCardType(data.hata_karti_turu);
    const status = normalizeStatus(data.mevcut_durum);
    const reporterName = (req.user.name || 'Saha Operatörü').trim();

    const { lastID } = await run(
      `INSERT INTO issues (
        user_id, bildirilen_alan, problem_tanimi, bildiren_kisi, bildiren_bolum, ilgili_bolum,
        bildirim_zamani, hedef_tarih, planlanan_aksiyon, mevcut_durum, gelisme_notlari,
        fotograf_url, revizyon_gecmisi, hata_karti_turu
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id || 0,
        data.bildirilen_alan.trim(),
        data.problem_tanimi.trim(),
        reporterName,
        data.bildiren_bolum || '',
        data.ilgili_bolum.trim(),
        new Date().toISOString(),
        finalTargetDate,
        data.planlanan_aksiyon || '',
        status,
        data.gelisme_notlari || '',
        req.file ? `/uploads/${req.file.filename}` : '',
        '[]',
        cardType,
      ]
    );

    // Açılan hata kartı ilgili bölüm yöneticisine otomatik aksiyon modülüne düşer.
    // İlk adım 'Hedef Tanımlamak' kilometre taşıdır; hedef tarih 1 kereliğine yönetici tarafından girilir.
    try {
      const assignee = `${data.ilgili_bolum.trim()} Yöneticisi`;
      const areaPrefix = data.bildirilen_alan ? `[${data.bildirilen_alan.toUpperCase()}] ` : '';
      const actionContent = `${areaPrefix}${cardType} #${lastID}: ${data.problem_tanimi.trim()}`;

      await run(
        `INSERT INTO actions
          (user_id, assignee_name, action_content, target_date, progress, status, created_at, sub_actions, issue_id, notes, target_date_locked)
         VALUES (?, ?, ?, '', 0, 'Açık', ?, ?, ?, ?, 0)`,
        [
          req.user.id || 0,
          assignee,
          actionContent,
          new Date().toISOString(),
          JSON.stringify(initialSubActions(false)),
          lastID,
          data.gelisme_notlari || '[]',
        ]
      );

      // Yöneticilere ve ilgili bölüm şefine anlık bildirim oluştur
      const notifTitle = `Yeni ${cardType} Açıldı (#${lastID})`;
      const notifMsg = `${reporterName} tarafından [${(data.bildirilen_alan || '').toUpperCase()}] alanında hata kartı açıldı. İlgili Bölüm: ${data.ilgili_bolum}. Aksiyon modülüne atandı.`;
      await run(
        `INSERT INTO notifications (user_id, sender_name, title, message, type, link, read, created_at)
         VALUES (NULL, ?, ?, ?, 'warning', '?app=hata_kartlari', 0, ?)`,
        [reporterName, notifTitle, notifMsg, new Date().toISOString()]
      );

      // İlgili bölümün yöneticisine ve sistem yöneticilerine e-posta gönder.
      mailer.notifyAsync({
        title: notifTitle,
        message: [
          `${reporterName} tarafından [${(data.bildirilen_alan || '').toUpperCase()}] alanında hata kartı açıldı.`,
          `İlgili Bölüm: ${data.ilgili_bolum}`,
          `Problem: ${data.problem_tanimi.trim()}`,
          `Hedef Tarih: ${String(finalTargetDate).split('T')[0]}`,
        ].join('\n'),
        link: '?app=hata_kartlari',
        type: 'warning',
        sender: reporterName,
        department: data.ilgili_bolum.trim(),
        includeManagers: true,
        extraEmails: config.NOTIFY_FALLBACK_EMAILS,
        excludeUserIds: [req.user.id],
      });
    } catch (actErr) {
      console.warn('[issues] Otomatik aksiyon oluşturma uyarısı:', actErr.message);
    }

    res.status(201).json({ id: lastID, message: 'Başarıyla eklendi ve ilgili aksiyon oluşturuldu' });
  })
);

router.put(
  '/:id',
  singleImage,
  asyncHandler(async (req, res) => {
    // Misafir operatörler hata kartı açabilir ancak mevcut kartı düzenleyemez.
    if (isGuestUser(req.user)) {
      return res.status(403).json({ error: 'Misafir erişimi bu işlem için kapalıdır' });
    }

    const issueId = Number(req.params.id);
    const body = req.body || {};

    const oldIssue = await get('SELECT * FROM issues WHERE id = ?', [issueId]);
    if (!oldIssue) return res.status(404).json({ error: 'Kayıt bulunamadı' });

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
        let value = body[field];
        if (field === 'mevcut_durum') value = normalizeStatus(value);
        if (field === 'hata_karti_turu') value = normalizeCardType(value);
        updates.push(`${field} = ?`);
        params.push(value);
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

    // Hata kartı kapatıldığında/açıldığında bağlı aksiyonun durumunu senkronize et.
    const newStatus =
      body.mevcut_durum !== undefined ? normalizeStatus(body.mevcut_durum) : undefined;
    if (newStatus !== undefined && newStatus !== oldIssue.mevcut_durum) {
      try {
        const linkedActions = await all('SELECT * FROM actions WHERE issue_id = ?', [issueId]);
        for (const act of linkedActions) {
          const subs = normalizeSubActions(act.sub_actions);
          if (newStatus === 'Kapalı') {
            const closedSubs = subs.map((s) => ({ ...s, completed: true }));
            await run(
              "UPDATE actions SET status = 'Tamamlandı', progress = 100, sub_actions = ? WHERE id = ?",
              [JSON.stringify(closedSubs), act.id]
            );
          } else {
            const reopened = subs.map((s) => (isMilestone(s) ? s : { ...s, completed: false }));
            const progress = deriveProgress(reopened);
            await run('UPDATE actions SET status = ?, progress = ?, sub_actions = ? WHERE id = ?', [
              deriveStatus(reopened, progress),
              progress,
              JSON.stringify(reopened),
              act.id,
            ]);
          }
        }
      } catch (syncErr) {
        console.warn('[issues] Aksiyon durum senkronizasyon uyarısı:', syncErr.message);
      }

      // Durum değişikliğini ilgili bölüme, kartı açan kişiye ve yöneticilere duyur.
      const statusTitle =
        newStatus === 'Kapalı'
          ? `Hata Kartı Kapatıldı (#${issueId})`
          : `Hata Kartı Durumu Güncellendi (#${issueId})`;
      const statusMessage = [
        `[${(oldIssue.bildirilen_alan || '').toUpperCase()}] alanındaki kartın durumu "${oldIssue.mevcut_durum}" → "${newStatus}" olarak değiştirildi.`,
        `İlgili Bölüm: ${oldIssue.ilgili_bolum || '-'}`,
        `Problem: ${oldIssue.problem_tanimi || '-'}`,
        `Güncelleyen: ${req.user.name || 'Sistem'}`,
      ].join('\n');

      mailer.notifyAsync({
        title: statusTitle,
        message: statusMessage,
        link: '?app=hata_kartlari',
        type: newStatus === 'Kapalı' ? 'success' : 'info',
        sender: req.user.name || 'Sistem',
        userIds: [oldIssue.user_id],
        department: oldIssue.ilgili_bolum || '',
        includeManagers: true,
        extraEmails: config.NOTIFY_FALLBACK_EMAILS,
        excludeUserIds: [req.user.id],
      });
    }

    const updated = await get('SELECT * FROM issues WHERE id = ?', [issueId]);
    res.json({ message: 'Başarıyla güncellendi', issue: serialize(updated) });
  })
);

router.delete(
  '/:id',
  requireRole(ROLES.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const issueId = Number(req.params.id);
    const { changes } = await run('DELETE FROM issues WHERE id = ?', [issueId]);
    if (!changes) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    // Bağlı aksiyonları da temizle (yetim görev kalmasın).
    await run('DELETE FROM actions WHERE issue_id = ?', [issueId]);
    res.json({ message: 'Kayıt başarıyla silindi' });
  })
);

module.exports = router;
