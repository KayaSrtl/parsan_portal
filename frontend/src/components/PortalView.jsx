import { memo, useState } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  ClipboardList,
  Wrench,
  ShieldAlert,
  Activity,
  ShieldCheck,
  Factory,
  Gauge,
  Lock,
  Layers,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isGuest } from '../lib/constants';

const MODULES = [
  {
    id: 'hata_karti_ac',
    title: 'Hata Kartı Açma Modülü',
    subtitle: 'Sadece Veri Girişi (Kırmızı / Sarı Kart)',
    description:
      'Sahadaki uygunsuzluklar için kırmızı veya sarı hata kartı açın. Termin otomatik 1 hafta tanımlanır ve ilgili bölüm yöneticisine aksiyon olarak düşer.',
    Icon: AlertTriangle,
    badge: 'VERİ GİRİŞİ • +1 HAFTA TERMİN',
    cardBg: 'bg-rose-50/70 dark:bg-slate-900/90 border-rose-200/90 dark:border-rose-500/30',
    badgeStyle: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
    iconBg: 'bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
    hoverBorder: 'hover:border-rose-400 dark:hover:border-rose-500/60',
    guestAllowed: true,
  },
  {
    id: 'otonom_bakim',
    title: 'Otonom Bakım (TPM)',
    subtitle: '3 Maddelik Operatör Kontrolü',
    description:
      '1) Hava basınç barası (3-5 bar, fotoğraflı), 2) Hava valfi kaçak kontrolü, 3) Atık yağ tankı boşaltımı (fotoğraflı) kayıt ekranı.',
    Icon: Wrench,
    badge: 'TPM • 3 MADDE KONTROL',
    cardBg: 'bg-sky-50/70 dark:bg-slate-900/90 border-sky-200/90 dark:border-sky-500/30',
    badgeStyle: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
    iconBg: 'bg-sky-100 text-sky-600 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
    hoverBorder: 'hover:border-sky-400 dark:hover:border-sky-500/60',
    guestAllowed: true,
  },
  {
    id: 'hata_kartlari',
    title: 'Hata Kartları Takip Bölümü',
    subtitle: 'Aktiflik, Gecikme & 5 Filtreli İzleme',
    description:
      'Hata kartlarının açık, kapalı, beklemede durumlarını ve gecikme günlerini; alan, bildiren bölüm, ilgili bölüm, mevcut durum ve kart türü bazlı filtrelerle takip edin.',
    Icon: Layers,
    badge: '5 FİLTRE • GECİKME TAKİBİ',
    cardBg: 'bg-violet-50/70 dark:bg-slate-900/90 border-violet-200/90 dark:border-violet-500/30',
    badgeStyle: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
    iconBg: 'bg-violet-100 text-violet-600 border border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
    hoverBorder: 'hover:border-violet-400 dark:hover:border-violet-500/60',
    guestAllowed: false,
  },
  {
    id: 'aksiyon_modulu',
    title: 'Aksiyon Modülü',
    subtitle: 'Otomatik Görev & Hedef Tanımlama',
    description:
      'Açılan hata kartlarının otomatik düştüğü aksiyon ekranı. İlk aksiyon olarak "Hedef Tanımlamak" gelir, 1 kereliğine hedef tarih girilir ve gelişme notları izlenir.',
    Icon: CheckSquare,
    badge: 'OTOMATİK AKSİYON',
    cardBg: 'bg-indigo-50/70 dark:bg-slate-900/90 border-indigo-200/90 dark:border-indigo-500/30',
    badgeStyle: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
    iconBg: 'bg-indigo-100 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
    hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-500/60',
    guestAllowed: false,
  },
  {
    id: 'isg_risk_bildirimi',
    title: 'İSG Risk Bildirimi',
    subtitle: '1) Risk Bildirimi & 2) Ramak Kala',
    description:
      'İki bölümlü İş Sağlığı ve Güvenliği modülü: Tehlikeli durumlar için Risk Bildirimi ve kıl payı atlatılan olaylar için Ramak Kala kayıtları.',
    Icon: ShieldAlert,
    badge: 'RİSK & RAMAK KALA',
    cardBg: 'bg-amber-50/70 dark:bg-slate-900/90 border-amber-200/90 dark:border-amber-500/30',
    badgeStyle: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    iconBg: 'bg-amber-100 text-amber-600 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-500/60',
    guestAllowed: false,
  },
  {
    id: 'bes_s_denetim',
    title: '5S Denetim Modülü',
    subtitle: 'Dönem Dashboard, Yıllık Trend & PDF',
    description:
      'Dönem (ay) filtreli denetim alan puanları dashboardu, tek alanın 1 yıl boyunca aylık istatistik grafiği ve PDF rapor çıktısı.',
    Icon: ClipboardList,
    badge: 'DASHBOARD & PDF',
    cardBg: 'bg-emerald-50/70 dark:bg-slate-900/90 border-emerald-200/90 dark:border-emerald-500/30',
    badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    iconBg: 'bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-500/60',
    guestAllowed: false,
  },
];

function PortalView({ onSelectApp }) {
  const { user } = useAuth();
  const guestUser = isGuest(user);
  const baseUrl = import.meta.env.BASE_URL;
  const [lockedNotice, setLockedNotice] = useState('');

  const handleCardClick = (module) => {
    if (guestUser && !module.guestAllowed) {
      setLockedNotice(
        `"${module.title}" modülü yetkili girişi gerektirir. Misafir (Saha Operatörü) girişi ile yalnızca Hata Kartı Açma ve Otonom Bakım modüllerine erişebilirsiniz.`
      );
      return;
    }
    setLockedNotice('');
    onSelectApp(module.id);
  };

  return (
    <div className="relative min-h-[calc(100vh-140px)] max-w-7xl mx-auto px-3 sm:px-4 py-4 md:py-6 animate-fade-in">
      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* =========================================================================
            1. MODERN PASTEL HERO BAŞLIK & SAHA DURUM PANELİ
            ========================================================================= */}
        <div className="bg-white/95 dark:bg-slate-900/90 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 md:p-8 shadow-md relative overflow-hidden backdrop-blur-xs">
          <div className="absolute top-0 left-0 right-0 forge-line-gradient h-1.5" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-emerald-700 dark:text-slate-300 text-xs font-bold mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-status-beacon" />
                <span>Canlı Saha Durumu: Pres Hatları & Talaşlı İmalat Operasyonel</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                <span className="forge-text-gradient">PARSAN</span>{' '}
                <span className="amber-text-gradient">İŞLETME PORTALI</span>
              </h1>

              <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base mt-2 max-w-2xl font-medium leading-relaxed">
                Sıcak dövme pres hatları, kalıphane ve talaşlı imalat süreçlerinde{' '}
                <span className="text-slate-800 dark:text-slate-200 font-bold">5S Standartları</span>,
                otonom bakım ve aksiyon yönetim platformu.
              </p>
            </div>

            {/* Hızlı Fabrika Durum İndikatörleri */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl">
              <div className="px-3 py-2 text-center border-r border-slate-200 dark:border-slate-800 last:border-none flex-1 sm:flex-initial">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                  <Factory className="w-3.5 h-3.5 text-amber-500" /> Tesis
                </div>
                <div className="text-sm font-black text-slate-800 dark:text-white">Dövme & Pres</div>
              </div>

              <div className="px-3 py-2 text-center border-r border-slate-200 dark:border-slate-800 last:border-none flex-1 sm:flex-initial">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                  <Gauge className="w-3.5 h-3.5 text-emerald-500" /> 5S Sistemi
                </div>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Aktif
                </div>
              </div>

              <div className="px-3 py-2 text-center flex-1 sm:flex-initial">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                  <Activity className="w-3.5 h-3.5 text-sky-500" /> Vardiya
                </div>
                <div className="text-sm font-black text-slate-800 dark:text-white">Kesintisiz</div>
              </div>
            </div>
          </div>
        </div>

        {/* Misafir Kısıtlı Erişim Bilgilendirmesi */}
        {lockedNotice && (
          <div className="bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>{lockedNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setLockedNotice('')}
              className="text-xs font-bold underline cursor-pointer"
            >
              Kapat
            </button>
          </div>
        )}

        {/* =========================================================================
            2. MODÜL SEÇİM KARTLARI (PASTEL MODERN GRID - 6 BÖLÜM)
            ========================================================================= */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              Saha ve Yönetim Modülleri
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-white/80 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              {guestUser
                ? `Misafir Operatör (${user?.name}) • Hata Kartı & Otonom Bakım Erişimi`
                : 'Tüm Modüller Erişilebilir'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((module) => {
              const {
                id,
                title,
                subtitle,
                description,
                Icon,
                badge,
                cardBg,
                badgeStyle,
                iconBg,
                hoverBorder,
                guestAllowed,
              } = module;
              const isLocked = guestUser && !guestAllowed;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleCardClick(module)}
                  className={`group relative cursor-pointer flex flex-col justify-between text-left p-6 rounded-3xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg overflow-hidden ${
                    isLocked
                      ? 'bg-slate-100/70 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800/60 opacity-60 hover:opacity-80'
                      : `${cardBg} ${hoverBorder} shadow-xs`
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`p-3 rounded-2xl ${iconBg} shadow-2xs transition-transform duration-200 group-hover:scale-105`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          <Lock className="w-3 h-3" /> Sınırlı Erişim
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${badgeStyle}`}
                        >
                          {badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-amber-400 transition-colors mb-1">
                      {title}
                    </h3>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                      {subtitle}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      {description}
                    </p>
                  </div>

                  <div className="mt-6 pt-3.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-amber-400 transition-colors">
                    <span>{isLocked ? 'Yetkili Girişi Gerekli' : 'Modülü Aç'}</span>
                    <span className="transform transition-transform duration-200 group-hover:translate-x-1 font-black text-sm">
                      {isLocked ? '🔒' : '→'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            3. PARSAN ÜRETİM GÜCÜ & OPERASYONEL VİTRİN (SIFIR GPU YÜKÜ)
            ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              Üretim Hatları ve Yetkinlikler
            </h2>
            <span className="text-xs text-slate-500 font-medium">Ağır Sanayi Sıcak Şekillendirme</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white/95 dark:bg-slate-900/90 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 md:p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6 overflow-hidden">
              <div className="relative flex-shrink-0 w-full sm:w-44 h-36 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-950">
                <img
                  src={`${baseUrl}content/images.jpg`}
                  alt="Parsan Dövme Pres Hattı"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 dark:bg-black/75 border border-emerald-200 dark:border-slate-700 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operasyonel
                </div>
              </div>

              <div className="flex-1 text-left">
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-2">
                  1000T - 8000T Pres Hatları
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                  Ağır Dövme Çelik ve Sıcak Şekillendirme
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                  İndüksiyon ısıtma ocakları, mekanik ve hidrolik presler, kontrollü soğutma ve ısıl işlem
                  süreçleri 5S ve IATF 16949 standartlarında yürütülmektedir.
                </p>
              </div>
            </div>

            <div className="bg-white/95 dark:bg-slate-900/90 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-slate-950 border border-amber-200/70 dark:border-slate-800 p-2 flex items-center justify-center flex-shrink-0">
                  <img
                    src={`${baseUrl}content/crankshaft.png`}
                    alt="Krank Mili"
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">Krank & Aks Milleri</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ağır vasıta & otomotiv güç aktarma dövmeleri
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-slate-950 border border-sky-200/70 dark:border-slate-800 p-2 flex items-center justify-center flex-shrink-0">
                  <img
                    src={`${baseUrl}content/airplane.png`}
                    alt="Havacılık Parçaları"
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">Havacılık & Savunma</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Titanyum ve yüksek mukavemetli alaşım dövme
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-slate-950 border border-rose-200/70 dark:border-slate-800 p-2 flex items-center justify-center flex-shrink-0">
                  <img
                    src={`${baseUrl}content/sicak_parca.png`}
                    alt="Akkor Dövme Çeliği"
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">Hassas Kalıp & Isıl İşlem</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Optimum mikroyapı ve dövme geometrisi
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. KURUMSAL FOOTER BİLGİSİ
            ========================================================================= */}
        <div className="pt-6 pb-2 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-2 border-t border-slate-200/80 dark:border-slate-800/80">
          <span className="font-semibold text-slate-700 dark:text-slate-400">
            PARSAN Makina Parçaları Sanayii A.Ş.
          </span>
          <span className="hidden sm:inline">•</span>
          <span>5S Saha ve Operasyon Yönetim Sistemi</span>
        </div>
      </div>
    </div>
  );
}

export default memo(PortalView);
