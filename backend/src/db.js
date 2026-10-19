const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const config = require('./config');

const db = new sqlite3.Database(config.DB_PATH);

// --- Promise sarmalayıcıları -------------------------------------------------
// Callback yerine async/await kullanmak, route içindeki hatalarin (ornegin bozuk
// JSON) sunucuyu çökertmek yerine hata middleware'ine dusmesini sağlar.

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });

// --- Şema --------------------------------------------------------------------

async function createTables() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'standart'
  )`);

  await run(`CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    bildirilen_alan TEXT,
    problem_tanimi TEXT,
    bildiren_kisi TEXT,
    bildiren_bolum TEXT,
    ilgili_bolum TEXT,
    bildirim_zamani TEXT,
    hedef_tarih TEXT,
    planlanan_aksiyon TEXT,
    mevcut_durum TEXT,
    gelisme_notlari TEXT,
    fotograf_url TEXT,
    revizyon_gecmisi TEXT, -- JSON metni
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    assignee_name TEXT,
    action_content TEXT,
    target_date TEXT,
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Açık',
    created_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tezgah_no TEXT,
    auditor_name TEXT,
    date TEXT,
    seiri_score REAL,
    seiton_score REAL,
    seiso_score REAL,
    seiketsu_score REAL,
    shitsuke_score REAL,
    total_score REAL,
    answers TEXT,
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    sender_name TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    link TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS safety_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'Risk Bildirimi' | 'Ramak Kala'
    alan TEXT NOT NULL,
    bolum TEXT,
    risk_derecesi TEXT DEFAULT 'Orta', -- 'Düşük' | 'Orta' | 'Yüksek' | 'Kritik'
    tanim TEXT NOT NULL,
    onlem TEXT,
    bildiren_kisi TEXT NOT NULL,
    tarih TEXT NOT NULL,
    durum TEXT DEFAULT 'İnceleniyor', -- 'İnceleniyor' | 'Önlem Alındı' | 'Kapatıldı'
    fotograf_url TEXT,
    user_id INTEGER
  )`);

  await run(`CREATE TABLE IF NOT EXISTS maintenances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tezgah_no TEXT NOT NULL,
    vardiya TEXT NOT NULL,
    operator_name TEXT NOT NULL,
    tarih TEXT NOT NULL,
    item1_val TEXT,
    item1_status TEXT,
    item1_foto TEXT,
    item2_status TEXT,
    item2_note TEXT,
    item3_status TEXT,
    item3_foto TEXT,
    user_id INTEGER
  )`);

  await run('CREATE INDEX IF NOT EXISTS idx_issues_user ON issues(user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_actions_assignee ON actions(assignee_name)');
  await run('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_safety_type ON safety_reports(type)');
  await run('CREATE INDEX IF NOT EXISTS idx_maintenances_tezgah ON maintenances(tezgah_no)');
}

// --- Migrasyonlar ------------------------------------------------------------

async function addColumnIfMissing(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[db] ${table}.${column} sütunu eklendi`);
  }
}

async function migrate() {
  await addColumnIfMissing('actions', 'sub_actions', "TEXT DEFAULT '[]'");
  await addColumnIfMissing('actions', 'issue_id', 'INTEGER');
  await addColumnIfMissing('actions', 'notes', "TEXT DEFAULT '[]'");
  await addColumnIfMissing('actions', 'target_date_locked', 'INTEGER DEFAULT 0');
  await addColumnIfMissing('issues', 'hata_karti_turu', "TEXT DEFAULT 'Kırmızı Hata Kartı'");

  // Mevcut kayıtların durum/tür alanlarını yeni modele uyumlu hale getir
  try {
    await run(`UPDATE issues SET hata_karti_turu = 'Kırmızı Hata Kartı' WHERE hata_karti_turu IS NULL OR hata_karti_turu = ''`);
    await run(`UPDATE issues SET hata_karti_turu = 'Sarı Hata Kartı' WHERE mevcut_durum = 'Sarı'`);
    await run(`UPDATE issues SET mevcut_durum = 'Kapalı' WHERE mevcut_durum = 'Yeşil'`);
    await run(`UPDATE issues SET mevcut_durum = 'Açık' WHERE mevcut_durum IN ('Kırmızı', 'Sarı')`);
    await run(
      `UPDATE issues SET hedef_tarih = datetime(bildirim_zamani, '+7 days') WHERE (hedef_tarih IS NULL OR hedef_tarih = '') AND bildirim_zamani IS NOT NULL`
    );

    // Henüz aksiyona bağlanmamış açık hata kartları için otomatik aksiyon oluştur
    const unlinkedIssues = await all(
      `SELECT i.* FROM issues i LEFT JOIN actions a ON a.issue_id = i.id WHERE a.id IS NULL`
    );
    for (const iss of unlinkedIssues) {
      const assignee = iss.ilgili_bolum ? `${iss.ilgili_bolum} Yöneticisi` : 'İlgili Bölüm Sorumlusu';
      const areaPrefix = iss.bildirilen_alan ? `[${iss.bildirilen_alan.toUpperCase()}] ` : '';
      const cardType = iss.hata_karti_turu || 'Kırmızı Hata Kartı';
      const actionContent = `${areaPrefix}${cardType} #${iss.id}: ${iss.problem_tanimi || ''}`;
      const initialSubs = JSON.stringify([{ title: 'Hedef Tanımlamak', weight: 100, completed: false }]);
      await run(
        `INSERT INTO actions (user_id, assignee_name, action_content, target_date, progress, status, created_at, sub_actions, issue_id, notes, target_date_locked)
         VALUES (?, ?, ?, '', 0, 'Açık', ?, ?, ?, ?, 0)`,
        [
          iss.user_id || 0,
          assignee,
          actionContent,
          iss.bildirim_zamani || new Date().toISOString(),
          initialSubs,
          iss.id,
          iss.gelisme_notlari || '[]',
        ]
      );
    }
  } catch (err) {
    console.warn('[db] Migration veri dönüşüm uyarısı:', err.message);
  }
}

// --- Örnek veri --------------------------------------------------------------

async function seedUsers() {
  if (!config.SEED_USERS) return;

  const { count } = await get('SELECT COUNT(*) AS count FROM users');
  if (count > 0) return;

  const passwordHash = bcrypt.hashSync(config.SEED_PASSWORD, bcrypt.genSaltSync(10));
  const seed = [
    ['Kaya Sertel', 'kaya.sertel98@gmail.com', 'super_admin'],
    ['D. Saatçioğlu', 'dsaatcioglu@parsan.com', 'admin'],
    ['Ahmet', 'ahmet@gmail.com', 'standart'],
  ];

  for (const [name, email, role] of seed) {
    await run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [
      name,
      email,
      passwordHash,
      role,
    ]);
  }
  console.log('[db] Örnek kullanıcılar oluşturuldu (şifre: ' + config.SEED_PASSWORD + ')');
}

const ready = (async () => {
  await createTables();
  await migrate();
  await seedUsers();
})();

module.exports = { db, run, get, all, ready };
