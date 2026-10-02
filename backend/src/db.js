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

  await run('CREATE INDEX IF NOT EXISTS idx_issues_user ON issues(user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_actions_assignee ON actions(assignee_name)');
  await run('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');
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
