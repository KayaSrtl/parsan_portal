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
    const rows = isManager(req.user)
      ? await all('SELECT * FROM actions ORDER BY id DESC')
      : await all('SELECT * FROM actions WHERE assignee_name = ? ORDER BY id DESC', [
          req.user.name,
        ]);

    res.json(rows.map(serialize));
  })
);

router.post(
  '/',
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res) => {
    const { assignee_name, action_content, target_date, progress, sub_actions } = req.body || {};

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
        (user_id, assignee_name, action_content, target_date, progress, status, created_at, sub_actions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        assignee_name.trim(),
        action_content.trim(),
        target_date || '',
        finalProgress,
        finalProgress === 100 ? STATUS_DONE : STATUS_OPEN,
        new Date().toISOString(),
        JSON.stringify(subs),
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
    // Sorumlu kişi kendi aksiyonunun ilerlemesini işaretleyebilir ama içeriği/atamayi değiştiremez.
    if (!manager && existing.assignee_name !== req.user.name) {
      return res.status(403).json({ error: 'Bu aksiyonu güncelleme yetkiniz yok' });
    }

    const subs =
      body.sub_actions !== undefined ? normalizeSubActions(body.sub_actions) : parseArray(existing.sub_actions);

    const assignee = manager && body.assignee_name ? body.assignee_name.trim() : existing.assignee_name;
    const content = manager && body.action_content ? body.action_content.trim() : existing.action_content;
    const targetDate = manager && body.target_date !== undefined ? body.target_date : existing.target_date;

    const finalProgress = deriveProgress(subs, body.progress ?? existing.progress);
    const status = finalProgress === 100 ? STATUS_DONE : STATUS_OPEN;

    await run(
      `UPDATE actions SET
        assignee_name = ?, action_content = ?, target_date = ?, progress = ?, status = ?, sub_actions = ?
       WHERE id = ?`,
      [assignee, content, targetDate, finalProgress, status, JSON.stringify(subs), actionId]
    );

    const updated = await get('SELECT * FROM actions WHERE id = ?', [actionId]);
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
