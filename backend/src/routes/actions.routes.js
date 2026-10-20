const express = require('express');
const { get, all, run } = require('../db');
const {
  authenticateToken,
  requireRole,
  isManager,
  MANAGER_ROLES,
  ROLES,
} = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');
const { parseArray } = require('../utils/json');
const {
  normalizeSubActions,
  deriveProgress,
  deriveStatus,
  completeMilestone,
  initialSubActions,
} = require('../utils/actions');

const router = express.Router();

router.use(authenticateToken);

const STATUS_OPEN = 'Açık';
const STATUS_DONE = 'Tamamlandı';

/** Misafir (saha operatörü) aksiyon modülüne erişemez. */
const denyGuest = (req, res, next) => {
  if (req.user?.role === ROLES.GUEST || req.user?.isGuest) {
    return res.status(403).json({ error: 'Misafir erişimi bu işlem için kapalıdır' });
  }
  next();
};

const serialize = (row) => ({
  ...row,
  sub_actions: normalizeSubActions(row.sub_actions),
  notes: parseArray(row.notes),
  target_date_locked: Boolean(row.target_date_locked),
});

const SELECT_WITH_ISSUE = `
  SELECT a.*,
         i.gelisme_notlari AS issue_notes,
         i.hata_karti_turu,
         i.fotograf_url AS issue_photo,
         i.bildiren_kisi AS issue_reporter,
         i.bildirilen_alan AS issue_area,
         i.ilgili_bolum AS issue_department,
         i.mevcut_durum AS issue_status,
         i.hedef_tarih AS issue_target_date
  FROM actions a
  LEFT JOIN issues i ON a.issue_id = i.id
`;

router.get(
  '/',
  denyGuest,
  asyncHandler(async (req, res) => {
    const rows = await all(`${SELECT_WITH_ISSUE} ORDER BY a.id DESC`);
    res.json(rows.map(serialize));
  })
);

router.post(
  '/',
  denyGuest,
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res) => {
    const { assignee_name, action_content, target_date, sub_actions, issue_id, notes } =
      req.body || {};

    if (!action_content?.trim()) {
      return res.status(400).json({ error: 'Aksiyon içeriği zorunludur' });
    }
    if (!assignee_name?.trim()) {
      return res.status(400).json({ error: 'Sorumlu kişi veya bölüm zorunludur' });
    }

    const hasInitialTarget = Boolean(target_date && String(target_date).trim());
    let subs = normalizeSubActions(sub_actions);
    if (subs.length === 0) {
      subs = initialSubActions(hasInitialTarget);
    } else if (hasInitialTarget) {
      subs = completeMilestone(subs);
    }

    const finalProgress = deriveProgress(subs);
    const status = deriveStatus(subs, finalProgress);

    const { lastID } = await run(
      `INSERT INTO actions
        (user_id, assignee_name, action_content, target_date, progress, status, created_at, sub_actions, issue_id, notes, target_date_locked)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        assignee_name.trim(),
        action_content.trim(),
        hasInitialTarget ? String(target_date).trim() : '',
        finalProgress,
        status,
        new Date().toISOString(),
        JSON.stringify(subs),
        issue_id || null,
        JSON.stringify(parseArray(notes)),
        hasInitialTarget ? 1 : 0,
      ]
    );

    const created = await get(`${SELECT_WITH_ISSUE} WHERE a.id = ?`, [lastID]);
    res.status(201).json({ id: lastID, message: 'Aksiyon oluşturuldu', action: serialize(created) });
  })
);

router.put(
  '/:id',
  denyGuest,
  asyncHandler(async (req, res) => {
    const actionId = Number(req.params.id);
    const body = req.body || {};

    const existing = await get('SELECT * FROM actions WHERE id = ?', [actionId]);
    if (!existing) return res.status(404).json({ error: 'Aksiyon bulunamadı' });

    const manager = isManager(req.user);
    const isSuper = req.user.role === ROLES.SUPER_ADMIN;

    let subs =
      body.sub_actions !== undefined
        ? normalizeSubActions(body.sub_actions)
        : normalizeSubActions(existing.sub_actions);

    const assignee = manager && body.assignee_name ? body.assignee_name.trim() : existing.assignee_name;
    const content = manager && body.action_content ? body.action_content.trim() : existing.action_content;

    // 1 Kerelik Hedef Tarih Kuralı:
    // Hedef tarih henüz girilmemişse (veya kilitlenmemişse) 1 kereliğine girilebilir.
    // Girildiği anda 'Hedef Tanımlamak' kilometre taşı tamamlanır ve tarih kilitlenir.
    // NOT: Aksiyonun kendisi bu yüzden "Tamamlandı" olmaz; gerçek iş adımları beklenir.
    const alreadyLocked = Boolean(existing.target_date_locked) && Boolean(existing.target_date?.trim());
    const incomingDate =
      body.target_date !== undefined ? String(body.target_date).trim() : existing.target_date || '';
    let targetDate = existing.target_date || '';
    let targetDateLocked = existing.target_date_locked ? 1 : 0;
    let justDefinedTargetDate = false;

    if (!alreadyLocked && incomingDate) {
      targetDate = incomingDate;
      targetDateLocked = 1;
      justDefinedTargetDate = incomingDate !== (existing.target_date || '');
      subs = completeMilestone(subs);
    } else if (isSuper && incomingDate) {
      targetDate = incomingDate;
      targetDateLocked = 1;
      subs = completeMilestone(subs);
    }

    const finalProgress = deriveProgress(subs);
    const status = deriveStatus(subs, finalProgress);

    // Gelişme Notları Senkronizasyonu (Hem aksiyon hem bağlı hata kartı)
    const actionNotes = parseArray(existing.notes);
    const newNoteText = body.new_note?.trim();

    if (justDefinedTargetDate) {
      const autoNote = {
        text: `Hedef tarih 1 kereliğine "${targetDate.split('T')[0]}" olarak tanımlandı.`,
        sender: req.user.name || 'Bölüm Yöneticisi',
        timestamp: new Date().toISOString(),
      };
      actionNotes.push(autoNote);

      if (existing.issue_id) {
        try {
          const linkedIssue = await get('SELECT gelisme_notlari FROM issues WHERE id = ?', [
            existing.issue_id,
          ]);
          if (linkedIssue) {
            const iNotes = parseArray(linkedIssue.gelisme_notlari);
            iNotes.push(autoNote);
            await run('UPDATE issues SET gelisme_notlari = ? WHERE id = ?', [
              JSON.stringify(iNotes),
              existing.issue_id,
            ]);
          }
        } catch (err) {
          console.warn('[actions] Hedef tarih notu senkronizasyon uyarısı:', err.message);
        }
      }
    }

    if (newNoteText) {
      const noteEntry = {
        text: newNoteText,
        sender: req.user.name || 'Aksiyon Sorumlusu',
        timestamp: new Date().toISOString(),
      };
      actionNotes.push(noteEntry);

      if (existing.issue_id) {
        try {
          const linkedIssue = await get('SELECT gelisme_notlari FROM issues WHERE id = ?', [
            existing.issue_id,
          ]);
          if (linkedIssue) {
            const iNotes = parseArray(linkedIssue.gelisme_notlari);
            iNotes.push({ ...noteEntry, text: `[Aksiyon] ${newNoteText}` });
            await run('UPDATE issues SET gelisme_notlari = ? WHERE id = ?', [
              JSON.stringify(iNotes),
              existing.issue_id,
            ]);
          }
        } catch (noteErr) {
          console.warn('[actions] Not senkronizasyon uyarısı:', noteErr.message);
        }
      }
    }

    await run(
      `UPDATE actions SET
        assignee_name = ?, action_content = ?, target_date = ?, progress = ?, status = ?, sub_actions = ?, notes = ?, target_date_locked = ?
       WHERE id = ?`,
      [
        assignee,
        content,
        targetDate,
        finalProgress,
        status,
        JSON.stringify(subs),
        JSON.stringify(actionNotes),
        targetDateLocked,
        actionId,
      ]
    );

    const updated = await get(`${SELECT_WITH_ISSUE} WHERE a.id = ?`, [actionId]);
    res.json({ message: 'Aksiyon güncellendi', action: serialize(updated) });
  })
);

router.delete(
  '/:id',
  denyGuest,
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res) => {
    const { changes } = await run('DELETE FROM actions WHERE id = ?', [Number(req.params.id)]);
    if (!changes) return res.status(404).json({ error: 'Aksiyon bulunamadı' });
    res.json({ message: 'Aksiyon silindi' });
  })
);

module.exports = router;
