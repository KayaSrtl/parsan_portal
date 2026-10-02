# PARSAN İşletme Portalı (5S)

Saha 5S hata kartlarını, aksiyonları ve kullanıcıları yöneten iç kullanım uygulaması.

- **Backend:** Node.js + Express 5 + SQLite3
- **Frontend:** React 19 + Vite + Tailwind CSS 4

---

## Hızlı Başlangıç

```bash
cd backend && npm install
cd ../frontend && npm install
```

Backend ortam dosyasını hazırlayın (ilk kurulumda bir kez):

```bash
cd backend && cp .env.example .env
```

`.env` içindeki `JWT_SECRET` alanını doldurun:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Her iki sunucuyu birlikte başlatmak için kök dizindeki dosyayı çalıştırın:

```bash
start_local.cmd
```

Ya da ayrı ayrı:

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm run dev
```

Arayüz: <http://localhost:5173> · API: <http://localhost:5000>

Geliştirme modunda Vite `/api` ve `/uploads` isteklerini backend'e yönlendirir, bu yüzden
`VITE_API_URL` boş bırakılabilir.

---

## Proje Yapısı

```
backend/
  server.js               Giriş noktası (sadece dinlemeyi başlatır)
  src/
    config.js             Ortam değişkenleri ve varsayılanlar
    db.js                 Şema, migrasyonlar, promise sarmalayıcıları
    app.js                Express uygulaması (CORS, route bağlama)
    middleware/
      auth.js             Token doğrulama + rol kontrolü
      upload.js           Multer (boyut sınırı, tip filtresi, güvenli dosya adı)
      errors.js           Merkezî JSON hata yönetimi
    routes/               auth / users / issues / actions / audits / notifications
    utils/json.js         Bozuk JSON'a dayanıklı ayrıştırma
  scripts/                Bakım komutları (aşağıya bakın)
  uploads/                Yüklenen fotoğraflar
  database.sqlite         Veritabanı

frontend/
  src/
    lib/
      api.js              Tüm API çağrılarının tek giriş noktası
      constants.js        Roller, bölümler, tezgahlar, durumlar
      pendingSave.js      Sayfa geçişinde otomatik kayıt kaydı
      datePicker.js       Tarayıcı uyumlu tarih seçici
    hooks/                useIssues, useActions, useUsers, useToast, ...
    contexts/             AuthContext, ThemeContext
    components/
      ui/                 ConfirmDialog, Toast
    utils/helpers.js      Tarih/durum/not yardımcıları
```

---

## Roller

| Rol | Hata kartları | Aksiyonlar | Kullanıcılar |
| --- | --- | --- | --- |
| `standart` | Sadece kendi kayıtlarını görür ve düzenler | Kendine atanan aksiyonların ilerlemesini işaretler | — |
| `admin` | Tümünü görür ve düzenler | Tanımlar, atar, siler | Listeyi görür |
| `super_admin` | Tümünü görür, düzenler ve **siler** | Tanımlar, atar, siler | Ekler, düzenler, siler |

Yetki kontrolleri hem arayüzde hem sunucuda yapılır; arayüzü atlayan istekler sunucuda reddedilir.

---

## Bakım Komutları

`backend/` dizininde:

| Komut | Açıklama |
| --- | --- |
| `npm start` | Sunucuyu başlatır |
| `npm run dev` | Dosya değişiminde yeniden başlatır |
| `npm run db:inspect` | Tabloların mevcut içeriğini yazdırır |
| `npm run db:seed` | Örnek kullanıcıları ekler/günceller (mevcutları **silmez**) |
| `npm run test:api` | Sunucu çalışırken yetki ve doğrulama kontrollerini sınar |

`frontend/` dizininde: `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`.

---

## Dağıtım (şirket sunucusu)

Backend tek başına çalışan bir Node.js servisidir (varsayılan port 5000). Arayüz derlenir ve
statik dosya olarak bir web sunucusundan (IIS, nginx vb.) yayınlanır.

1. `backend/.env.example` dosyasını `backend/.env` olarak kopyalayın; `NODE_ENV=production`,
   rastgele bir `JWT_SECRET` girin ve `CORS_ORIGINS` içine portalın adresini yazın.
2. `cd backend && npm ci && npm start`. Sürekli çalışması için bir servis yöneticisi
   (Windows servisi, pm2, NSSM vb.) önerilir.
3. `cd frontend && npm ci && npm run build`. Çıkan `frontend/dist` klasörünü web sunucusuyla yayınlayın.
4. Web sunucusunda `/api` ve `/uploads` isteklerini `http://localhost:5000` adresine yönlendirin
   (reverse proxy). Böylece arayüz ve API aynı adresten çalışır, `VITE_API_URL` boş kalır.
5. Veritabanı boşsa ilk açılışta bir kez `SEED_USERS=true` ve güçlü bir `SEED_PASSWORD` ile
   başlatın, giriş yapıp şifreleri değiştirin, ardından `SEED_USERS=false` yapın.

Yedeklenmesi gerekenler: `backend/database.sqlite` ve `backend/uploads/`.

> **Üretim notu:** `NODE_ENV=production` iken `JWT_SECRET` tanımlı değilse sunucu
> bilerek başlamaz. Anahtar sunucudaki `.env` dosyasında durur, koda yazılmaz.

---

## Bilinen Sınırlar

- Yüklenen fotoğraflar kayıt silindiğinde diskte kalır (temizleme işi yok).
- `Otonom Bakım` modülü henüz yer tutucudur.
- Aylık trend grafiğinde "Çözülen", kaydın **açıldığı** ay altında sayılır; çözülme
  tarihi ayrıca tutulmadığı için gerçek çözülme ayı bilinmiyor.
