/**
 * Örnek kullanıcıları olusturur veya gunceller (mevcut kullanıcıları SILMEZ).
 * Kullanim: node scripts/seed-users.js [şifre]
 */
const bcrypt = require('bcryptjs');
const { get, run, ready } = require('../src/db');

const password = process.argv[2] || process.env.SEED_PASSWORD || 'parsan123';

const USERS = [
  { name: 'Kaya Sertel', email: 'kaya.sertel98@gmail.com', role: 'super_admin' },
  { name: 'D. Saatçioğlu', email: 'dsaatcioglu@parsan.com', role: 'admin' },
  { name: 'Ahmet', email: 'ahmet@gmail.com', role: 'standart' },
];

(async () => {
  await ready;
  const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

  for (const user of USERS) {
    const existing = await get('SELECT id FROM users WHERE email = ?', [user.email]);
    if (existing) {
      await run('UPDATE users SET name = ?, password = ?, role = ? WHERE id = ?', [
        user.name,
        hash,
        user.role,
        existing.id,
      ]);
      console.log(`güncellendi: ${user.email}`);
    } else {
      await run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [
        user.name,
        user.email,
        hash,
        user.role,
      ]);
      console.log(`eklendi: ${user.email}`);
    }
  }

  console.log(`\nTamamlandi. Şifre: ${password}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
