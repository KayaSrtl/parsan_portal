const fs = require('fs');
const path = require('path');
const express = require('express');
const { get, all, run } = require('../db');
const { authenticateToken, requireRole, isManager, ROLES, MANAGER_ROLES } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');
const { singlePdf } = require('../middleware/upload');
const config = require('../config');
const mailer = require('../services/mailer');

const router = express.Router();

router.use(authenticateToken);

const isGuestUser = (user) => user?.role === ROLES.GUEST || Boolean(user?.isGuest);

/** Tezgahın PDF'ini yönetebilen kişi: yönetici rolleri ve o tezgaha atanan yönetici. */
const canEditMachine = (machine, user) =>
  isManager(user) || (!isGuestUser(user) && machine.manager_id && machine.manager_id === user.id);

const docPath = (file) => path.join(config.DOCS_DIR, path.basename(String(file || '')));

const removeFile = (file) => {
  if (file) fs.promises.unlink(docPath(file)).catch(() => {});
};

/** Yüklenen dosyanın gerçekten PDF olduğunu içeriğinden doğrular (mime istemciden gelir). */
const looksLikePdf = async (file) => {
  const handle = await fs.promises.open(docPath(file), 'r');
  try {
    const buf = Buffer.alloc(5);
    await handle.read(buf, 0, 5, 0);
    return buf.toString('latin1') === '%PDF-';
  } finally {
    await handle.close();
  }
};

const PART_COLUMNS = `p.id, p.machine_id, p.part_name, p.part_code, p.note, p.pdf_name,
  p.is_active, p.uploaded_by, p.created_at`;

const loadMachines = async () => {
  const machines = await all(
    `SELECT m.id, m.name, m.manager_id, u.name AS manager_name, u.department AS manager_department,
            (SELECT COUNT(*) FROM machine_parts WHERE machine_id = m.id) AS parts_count
     FROM machines m LEFT JOIN users u ON u.id = m.manager_id
     ORDER BY m.name COLLATE NOCASE`
  );
  const activeParts = await all(
    `SELECT ${PART_COLUMNS} FROM machine_parts p WHERE p.is_active = 1 ORDER BY p.id DESC`
  );
  const activeByMachine = new Map();
  for (const part of activeParts) {
    if (!activeByMachine.has(part.machine_id)) activeByMachine.set(part.machine_id, part);
  }
  return machines.map((m) => ({ ...m, active_part: activeByMachine.get(m.id) || null }));
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await loadMachines());
  })
);

// Bir tezgahın tüm parça (PDF) geçmişi
router.get(
  '/:id/parts',
  asyncHandler(async (req, res) => {
    const machine = await get('SELECT id FROM machines WHERE id = ?', [Number(req.params.id)]);
    if (!machine) return res.status(404).json({ error: 'Tezgah bulunamadı' });
    res.json(
      await all(
        `SELECT ${PART_COLUMNS} FROM machine_parts p WHERE p.machine_id = ? ORDER BY p.id DESC`,
        [machine.id]
      )
    );
  })
);

// PDF'i oturum doğrulamasıyla servis eder (herkese açık dosya yolu yoktur).
router.get(
  '/parts/:partId/file',
  asyncHandler(async (req, res) => {
    const part = await get('SELECT pdf_file, pdf_name FROM machine_parts WHERE id = ?', [
      Number(req.params.partId),
    ]);
    if (!part || !fs.existsSync(docPath(part.pdf_file))) {
      return res.status(404).json({ error: 'PDF dosyası bulunamadı' });
    }
    const downloadName = encodeURIComponent(part.pdf_name || 'parca.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${downloadName}`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(docPath(part.pdf_file));
  })
);

router.post(
  '/',
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || '').trim().slice(0, 40);
    if (!name) return res.status(400).json({ error: 'Tezgah adı zorunludur' });

    const existing = await get('SELECT id FROM machines WHERE LOWER(name) = LOWER(?)', [name]);
    if (existing) return res.status(409).json({ error: 'Bu tezgah zaten tanımlı' });

    const { lastID } = await run('INSERT INTO machines (name, created_at) VALUES (?, ?)', [
      name,
      new Date().toISOString(),
    ]);
    res.status(201).json({ id: lastID, message: 'Tezgah eklendi' });
  })
);

// Tezgaha yönetici ata (manager_id boş/null ise atama kaldırılır).
router.put(
  '/:id/manager',
  requireRole(...MANAGER_ROLES),
  asyncHandler(async (req, res) => {
    const machine = await get('SELECT * FROM machines WHERE id = ?', [Number(req.params.id)]);
    if (!machine) return res.status(404).json({ error: 'Tezgah bulunamadı' });

    const rawId = req.body?.manager_id;
    const managerId = rawId === null || rawId === '' || rawId === undefined ? null : Number(rawId);

    let manager = null;
    if (managerId !== null) {
      manager = await get('SELECT id, name FROM users WHERE id = ?', [managerId]);
      if (!manager) return res.status(400).json({ error: 'Seçilen kullanıcı bulunamadı' });
    }

    await run('UPDATE machines SET manager_id = ? WHERE id = ?', [managerId, machine.id]);

    if (manager && manager.id !== machine.manager_id) {
      mailer.notifyAsync({
        title: `${machine.name} Tezgahına Yönetici Atandı`,
        message: [
          `${machine.name} tezgahının yöneticisi olarak atandınız.`,
          'Tezgahta dövülen parçanın PDF\'ini Tezgah İzleme Modülü\'nden girebilirsiniz.',
          `Atayan: ${req.user.name || 'Sistem'}`,
        ].join('\n'),
        link: '?app=tezgah_izleme',
        type: 'action',
        sender: req.user.name || 'Sistem',
        userIds: [manager.id],
        excludeUserIds: [req.user.id],
      });
    }

    res.json({ message: manager ? 'Yönetici atandı' : 'Yönetici ataması kaldırıldı' });
  })
);

router.delete(
  '/:id',
  requireRole(ROLES.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parts = await all('SELECT pdf_file FROM machine_parts WHERE machine_id = ?', [id]);
    const { changes } = await run('DELETE FROM machines WHERE id = ?', [id]);
    if (!changes) return res.status(404).json({ error: 'Tezgah bulunamadı' });
    await run('DELETE FROM machine_parts WHERE machine_id = ?', [id]);
    parts.forEach((p) => removeFile(p.pdf_file));
    res.json({ message: 'Tezgah silindi' });
  })
);

// Tezgahta dövülen parçanın PDF'ini yükle; yeni kayıt "şu an dövülen" olur.
router.post(
  '/:id/parts',
  singlePdf,
  asyncHandler(async (req, res) => {
    const file = req.file;
    const discard = () => file && removeFile(file.filename);

    const machine = await get('SELECT * FROM machines WHERE id = ?', [Number(req.params.id)]);
    if (!machine) {
      discard();
      return res.status(404).json({ error: 'Tezgah bulunamadı' });
    }
    if (!canEditMachine(machine, req.user)) {
      discard();
      return res
        .status(403)
        .json({ error: 'Bu tezgaha PDF girişi yalnızca tezgah yöneticisi veya admin yapabilir' });
    }

    const partName = String(req.body?.part_name || '').trim().slice(0, 120);
    if (!partName) {
      discard();
      return res.status(400).json({ error: 'Dövülen parça adı zorunludur' });
    }
    if (!file) return res.status(400).json({ error: 'PDF dosyası seçilmelidir' });
    if (!(await looksLikePdf(file.filename))) {
      discard();
      return res.status(400).json({ error: 'Yüklenen dosya geçerli bir PDF değil' });
    }

    await run('UPDATE machine_parts SET is_active = 0 WHERE machine_id = ?', [machine.id]);
    const { lastID } = await run(
      `INSERT INTO machine_parts
        (machine_id, part_name, part_code, note, pdf_file, pdf_name, is_active, uploaded_by, uploaded_by_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        machine.id,
        partName,
        String(req.body?.part_code || '').trim().slice(0, 60),
        String(req.body?.note || '').trim().slice(0, 500),
        file.filename,
        Buffer.from(file.originalname || 'parca.pdf', 'latin1').toString('utf8'),
        req.user.name || '',
        req.user.id,
        new Date().toISOString(),
      ]
    );

    res.status(201).json({ id: lastID, message: 'Parça PDF\'i kaydedildi' });
  })
);

/** Parça kaydını ve tezgahını getirir; yetki yoksa yanıtı kendisi yazar. */
const loadPartForEdit = async (req, res) => {
  const part = await get('SELECT * FROM machine_parts WHERE id = ?', [Number(req.params.partId)]);
  if (!part) {
    res.status(404).json({ error: 'Parça kaydı bulunamadı' });
    return null;
  }
  const machine = await get('SELECT * FROM machines WHERE id = ?', [part.machine_id]);
  if (!machine || !canEditMachine(machine, req.user)) {
    res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    return null;
  }
  return part;
};

// Geçmişteki bir parçayı tekrar "şu an dövülen" yap.
router.put(
  '/parts/:partId/activate',
  asyncHandler(async (req, res) => {
    const part = await loadPartForEdit(req, res);
    if (!part) return;
    await run('UPDATE machine_parts SET is_active = 0 WHERE machine_id = ?', [part.machine_id]);
    await run('UPDATE machine_parts SET is_active = 1 WHERE id = ?', [part.id]);
    res.json({ message: 'Parça aktif olarak işaretlendi' });
  })
);

router.delete(
  '/parts/:partId',
  asyncHandler(async (req, res) => {
    const part = await loadPartForEdit(req, res);
    if (!part) return;
    await run('DELETE FROM machine_parts WHERE id = ?', [part.id]);
    removeFile(part.pdf_file);
    res.json({ message: 'Parça kaydı silindi' });
  })
);

module.exports = router;
