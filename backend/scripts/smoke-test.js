/**
 * Çalışan sunucuya karşı yetki ve doğrulama kontrollerini sınar.
 *
 * Önce sunucuyu başlatın (npm start), sonra:
 *   node scripts/smoke-test.js
 *
 * Test kendi geçici kaydını oluşturup siler; mevcut verilere dokunmaz.
 */
const BASE = process.env.SMOKE_URL || 'http://localhost:5000/api';

const ADMIN = {
  email: process.env.SMOKE_ADMIN || 'kaya.sertel98@gmail.com',
  password: process.env.SMOKE_PASSWORD || 'parsan123',
};
const STANDARD = {
  email: process.env.SMOKE_USER || 'ahmet@gmail.com',
  password: process.env.SMOKE_PASSWORD || 'parsan123',
};

let passed = 0;
let failed = 0;

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const check = (label, actual, expected) => {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}  (beklenen: ${expected}, gelen: ${actual})`);
  }
};

const login = async ({ email, password }) =>
  readJson(
    await fetch(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  );

(async () => {
  const admin = await login(ADMIN);
  const standard = await login(STANDARD);

  if (!admin?.token || !standard?.token) {
    console.error('Giriş yapılamadı. Sunucu çalışıyor mu? Şifreler doğru mu?');
    process.exit(1);
  }

  const authHeader = (token) => ({ Authorization: `Bearer ${token}` });
  const jsonHeader = (token) => ({ ...authHeader(token), 'Content-Type': 'application/json' });

  const A = authHeader(admin.token);
  const S = authHeader(standard.token);
  const AJ = jsonHeader(admin.token);
  const SJ = jsonHeader(standard.token);

  const status = async (path, options = {}) => (await fetch(BASE + path, options)).status;

  console.log('\nKimlik doğrulama');
  check('token olmadan erişim reddedilir', await status('/issues'), 401);
  check(
    'bozuk token reddedilir',
    await status('/issues', { headers: { Authorization: 'Bearer bozuk' } }),
    401
  );
  check(
    'hatalı şifre reddedilir',
    await status('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: STANDARD.email, password: 'yanlis-sifre' }),
    }),
    401
  );

  console.log('\nStandart kullanıcı kısıtları');
  check('kullanıcı listesini göremez', await status('/users', { headers: S }), 403);
  check(
    'kullanıcı ekleyemez',
    await status('/users', {
      method: 'POST',
      headers: SJ,
      body: JSON.stringify({ name: 'X', email: 'x@x.x', password: '123456' }),
    }),
    403
  );
  check(
    'aksiyon oluşturamaz',
    await status('/actions', {
      method: 'POST',
      headers: SJ,
      body: JSON.stringify({ assignee_name: 'X', action_content: 'Y' }),
    }),
    403
  );

  console.log('\nDoğrulama kuralları');
  check(
    'geçersiz rol reddedilir',
    await status('/users', {
      method: 'POST',
      headers: AJ,
      body: JSON.stringify({ name: 'T', email: 'gecici@test.local', password: '123456', role: 'yok' }),
    }),
    400
  );
  check(
    'mükerrer e-posta reddedilir',
    await status('/users', {
      method: 'POST',
      headers: AJ,
      body: JSON.stringify({ name: 'T', email: STANDARD.email, password: '123456' }),
    }),
    409
  );
  check(
    'kısa şifre reddedilir',
    await status('/users', {
      method: 'POST',
      headers: AJ,
      body: JSON.stringify({ name: 'T', email: 'gecici2@test.local', password: '12' }),
    }),
    400
  );
  check(
    'kendi hesabını silemez',
    await status(`/users/${admin.user.id}`, { method: 'DELETE', headers: A }),
    400
  );
  check(
    'boş aksiyon içeriği reddedilir',
    await status('/actions', {
      method: 'POST',
      headers: AJ,
      body: JSON.stringify({ assignee_name: 'X', action_content: '   ' }),
    }),
    400
  );
  check('olmayan yol 404 döner', await status('/boyle-bir-yol-yok', { headers: A }), 404);

  console.log('\nVeri bütünlüğü (geçici kayıt üzerinde)');
  const createForm = new FormData();
  createForm.append('problem_tanimi', '[SMOKE TEST] gecici kayit');
  createForm.append('bildirilen_alan', 'MP4000');
  createForm.append('mevcut_durum', 'Kırmızı');

  const created = await readJson(
    await fetch(`${BASE}/issues`, { method: 'POST', headers: A, body: createForm })
  );

  if (!created?.id) {
    console.log('  ✗ geçici kayıt oluşturulamadı, bu bölüm atlandı');
    failed++;
  } else {
    const all = await readJson(await fetch(`${BASE}/issues`, { headers: A }));
    const before = all.find((i) => i.id === created.id);
    check('yeni kayıtta "Kaydı Açan" dolu', Boolean(before?.bildiren_kisi), true);

    // Sadece tek alan gönderiyoruz: diğerleri NULL'a düşmemeli.
    const partial = new FormData();
    partial.append('mevcut_durum', 'Sarı');
    const updated = await readJson(
      await fetch(`${BASE}/issues/${created.id}`, { method: 'PUT', headers: A, body: partial })
    );

    check('kısmi güncelleme "Kaydı Açan"ı korur', updated.issue.bildiren_kisi, before.bildiren_kisi);
    check('kısmi güncelleme alanı korur', updated.issue.bildirilen_alan, 'MP4000');
    check('durum güncellendi', updated.issue.mevcut_durum, 'Sarı');
    check('revizyon geçmişi kaydedildi', updated.issue.revizyon_gecmisi.length, 1);

    check(
      'geçici kayıt silindi',
      await status(`/issues/${created.id}`, { method: 'DELETE', headers: A }),
      200
    );
  }

  console.log(`\nSonuç: ${passed} geçti, ${failed} kaldı\n`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error('Test çalıştırılamadı:', err.message);
  process.exit(1);
});
