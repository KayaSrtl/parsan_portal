/**
 * Veritabanının mevcut durumunu ekrana basar.
 * Kullanim: node scripts/inspect-db.js
 */
const { all, ready } = require('../src/db');

(async () => {
  await ready;

  console.log('\n--- KULLANICILAR ---');
  console.table(await all('SELECT id, name, email, role FROM users ORDER BY id'));

  console.log('\n--- HATA KARTLARI ---');
  console.table(
    await all(
      'SELECT id, user_id, bildiren_kisi, bildirilen_alan, mevcut_durum, hedef_tarih FROM issues ORDER BY id'
    )
  );

  console.log('\n--- AKSIYONLAR ---');
  console.table(
    await all('SELECT id, assignee_name, status, progress, target_date FROM actions ORDER BY id')
  );

  console.log('\n--- actions SEMASI ---');
  console.table(await all('PRAGMA table_info(actions)'));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
