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

## E-posta Bildirimleri (Resend)

Portal, uygulama içi bildirimlerin yanı sıra ilgili kişilere **Resend** üzerinden e-posta gönderir.
Gönderim "ateşle-unut" mantığıyla çalışır: e-posta servisi erişilemez olsa bile kullanıcı işlemi
başarıyla tamamlanır.

### Kurulum

1. [resend.com](https://resend.com) üzerinden bir API anahtarı oluşturun.
2. Resend panelinde gönderen alan adını (`engrare.com`) **doğrulayın** (DNS kayıtları).
3. Kök dizindeki `.env` dosyasına şu değerleri ekleyin:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESEND_FROM="PARSAN Portal <bildirim@engrare.com>"
EMAIL_NOTIFICATIONS=true
APP_URL=https://parsan.engrare.com
NOTIFY_FALLBACK_EMAILS=
```

4. `docker compose up -d --build api` ile API'yi yeniden oluşturun.
5. Portal → **Ayarlar → E-posta Bildirimleri** bölümünden **Test E-postası Gönder** ile doğrulayın.

`RESEND_API_KEY` boş bırakılırsa e-posta gönderimi kapalı kalır; uygulama içi bildirimler çalışmaya devam eder.

### Hangi olayda kime gider?

| Olay | Alıcılar |
| --- | --- |
| Yeni hata kartı | Kartın **ilgili bölümüne** atanmış kullanıcılar + tüm yöneticiler |
| Hata kartı durum değişikliği | Kartı açan kullanıcı + ilgili bölüm + yöneticiler |
| Yeni aksiyon ataması | Atanan kişi (ad eşleşmesi) + atanan bölüm |
| Aksiyon güncellemesi / tamamlanması | Aksiyon sorumlusu + (tamamlandıysa) yöneticiler |
| İSG bildirimi | İlgili bölüm + yöneticiler (Yüksek/Kritik riskler "acil" olarak işaretlenir) |
| Otonom bakım anormalliği | Yöneticiler (basınç aralığı dışı, hava kaçağı, boşaltılmamış yağ tankı) |
| Manuel bildirim/mesaj | Hedef kullanıcı; herkese duyuruda yöneticiler |

Alıcılar `users.department` alanına göre bulunur. Bölüm ataması **Ayarlar → Kullanıcı Yönetimi**
ekranından yapılır. Gönderim kayıtları `email_logs` tablosunda tutulur.

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

### Hızlı dağıtım (docker compose)

Kök dizindeki `deploy.sh` (Linux/macOS) veya `deploy.cmd` (Windows) betiği:

1. GitHub'dan en güncel kodu çeker (özel depo erişimi için `GITHUB_TOKEN`),
2. `docker compose` ile api + web + cloudflared servislerini derleyip ayağa kaldırır.

Betiğin başındaki `GITHUB_TOKEN` alanına GitHub erişim anahtarını (fine-grained PAT) yazın.
Anahtarı dosyaya gömmek istemezseniz ortam değişkeniyle de verebilirsiniz:

```bash
# Linux/macOS
chmod +x deploy.sh
./deploy.sh
# ya da anahtarı ortam değişkeni olarak verin:
GITHUB_TOKEN='github_pat_...' ./deploy.sh
```

```bat
REM Windows
deploy.cmd
```

> **Güvenlik:** Bu betikler gizli anahtar barındırdığı için `.gitignore` içindedir; git'e
> gönderilmez. Anahtarı kimseyle paylaşmayın ve sızma şüphesinde GitHub üzerinden
> derhal iptal edip (revoke) yenisini üretin.
>
> **Not:** `JWT_SECRET` bu betikten değil, kökteki `.env` dosyasından okunur (docker compose
> otomatik yükler).

### Manuel dağıtım

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
