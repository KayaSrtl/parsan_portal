const express = require('express');
const { get, all, run } = require('../db');
const { authenticateToken, requireRole, isManager, MANAGER_ROLES } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');
const { parseArray } = require('../utils/json');

const router = express.Router();

router.use(authenticateToken);

const STATUS_OPEN = 'Açık';
const STATUS_DONE = 'Tamamlandı';

const clamp = (n) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));

const normalizeSubActions = (value) =>
  parseArray(value)
    .filter((s) => s && typeof s === 'object')
    .map((s) => ({
      title: String(s.title ?? ''),
      weight: clamp(s.weight),
      completed: Boolean(s.completed),
    }));

/** Ilerleme, alt basliklar varsa onlardan hesaplanır; yoksa gönderilen değer kullanılır. */
function deriveProgress(subActions, fallback) {
  if (!subActions.length) return clamp(fallback);
  return clamp(subActions.reduce((sum, s) => sum + (s.completed ? s.weight : 0), 0));
}

const serialize = (row) => ({ ...row, sub_actions: parseArray(row.sub_actions) });

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = isManager(req.user)
      ? `SELECT a.*, i.gelisme_notlari AS issue_notes, i.hata_karti_turu, i.fotograf_url AS issue_photo, i.bildiren_kisi AS issue_reporter
         FROM actions a
         LEFT JOIN issues i ON a.issue_id = i.id
         ORDER BY a.id DESC`
      : `SELECT a.*, i.gelisme_notlari AS issue_notes, i.hata_karti_turu, i.fotograf_url AS issue_photo, i.bildiren_kisi AS issue_reporter
         FROM actions a
         LEFT JOIN issues i ON a.issue_id = i.id
         WHERE a.assignee_name = ? OR a.assignee_name LIKE ?
         ORDER BY a.id DESC`;

    const params = isManager(req.user) ? [] : [req.user.name, `%${req.user.name}%`];
    const rows = await all(query, params);

    res.json(rows.map(serialize));
  })
);

router.post(
  '/',
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res) => {
    const { assignee_name, action_content, target_date, progress, sub_actions, issue_id } = req.body || {};

    if (!action_content?.trim()) {
      return res.status(400).json({ error: 'Aksiyon içeriği zorunludur' });
    }
    if (!assignee_name?.trim()) {
      return res.status(400).json({ error: 'Sorumlu kişi zorunludur' });
    }

    const subs = normalizeSubActions(sub_actions);
    const finalProgress = deriveProgress(subs, progress);

    const { lastID } = await run(
      `INSERT INTO actions
        (user_id, assignee_name, action_content, target_date, progress, status, created_at, sub_actions, issue_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        assignee_name.trim(),
        action_content.trim(),
        target_date || '',
        finalProgress,
        finalProgress === 100 ? STATUS_DONE : STATUS_OPEN,
        new Date().toISOString(),
        JSON.stringify(subs),
        issue_id || null,
      ]
    );

    res.status(201).json({ id: lastID, message: 'Aksiyon oluşturuldu' });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const actionId = Number(req.params.id);
    const body = req.body || {};

    const existing = await get('SELECT * FROM actions WHERE id = ?', [actionId]);
    if (!existing) return res.status(404).json({ error: 'Aksiyon bulunamadı' });

    const manager = isManager(req.user);
    // Sorumlu kişi kendi aksiyonunun ilerlemesini ve 1 kerelik hedef tarihini girebilir.
    const isAssignee = existing.assignee_name && (
      existing.assignee_name === req.user.name ||
      existing.assignee_name.includes(req.user.name) ||
      req.user.name.includes(existing.assignee_name)
    );

    if (!manager && !isAssignee) {
      return res.status(403).json({ error: 'Bu aksiyonu güncelleme yetkiniz yok' });
    }

    const subs =
      body.sub_actions !== undefined ? normalizeSubActions(body.sub_actions) : parseArray(existing.sub_actions);

    const assignee = manager && body.assignee_name ? body.assignee_name.trim() : existing.assignee_name;
    const content = manager && body.action_content ? body.action_content.trim() : existing.action_content;

    // Hedef tarih: Yönetici değiştirebilir veya hedef tarih henüz yoksa sorumlu kişi 1 kereliğine tanımlayabilir
    const canSetTargetDate = manager || !existing.target_date || existing.target_date.trim() === '';
    const targetDate =
      canSetTargetDate && body.target_date !== undefined ? body.target_date : existing.target_date;

    const finalProgress = deriveProgress(subs, body.progress ?? existing.progress);
    const status = finalProgress === 100 ? STATUS_DONE : STATUS_OPEN;

    await run(
      `UPDATE actions SET
        assignee_name = ?, action_content = ?, target_date = ?, progress = ?, status = ?, sub_actions = ?
       WHERE id = ?`,
      [assignee, content, targetDate, finalProgress, status, JSON.stringify(subs), actionId]
    );

    // Eğer bağlı bir hata kartı varsa ve yeni bir gelişme notu gönderildiyse hata kartına işle
    if (existing.issue_id && body.new_note?.trim()) {
      try {
        const linkedIssue = await get('SELECT gelisme_notlari FROM issues WHERE id = ?', [existing.issue_id]);
        if (linkedIssue) {
          const notes = parseArray(linkedIssue.gelisme_notlari);
          notes.push({
            text: `[Aksiyon Notu] ${body.new_note.trim()}`,
            sender: req.user.name || 'Aksiyon Sorumlusu',
            timestamp: new Date().toISOString(),
          });
          await run('UPDATE issues SET gelisme_notlari = ? WHERE id = ?', [
            JSON.stringify(notes),
            existing.issue_id,
          ]);
        }
      } catch (noteErr) {
        console.warn('[actions] Not senkronizasyon uyarısı:', noteErr.message);
      }
    }

    const updated = await get(
      `SELECT a.*, i.gelisme_notlari AS issue_notes, i.hata_karti_turu, i.fotograf_url AS issue_photo, i.bildiren_kisi AS issue_reporter
       FROM actions a
       LEFT JOIN issues i ON a.issue_id = i.id
       WHERE a.id = ?`,
      [actionId]
    );
    res.json({ message: 'Aksiyon güncellendi', action: serialize(updated) });
  })
);

router.delete(
  '/:id',
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res) => {
    const { changes } = await run('DELETE FROM actions WHERE id = ?', [Number(req.params.id)]);
    if (!changes) return res.status(404).json({ error: 'Aksiyon bulunamadı' });
    res.json({ message: 'Aksiyon silindi' });
  })
);

module.exports = router;
