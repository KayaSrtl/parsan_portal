import { memo } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isGuest } from '../lib/constants';

const MODULES = [
  {
    id: 'hata_kartlari',
    title: '5S Hata Kartları',
    subtitle: 'Veri Girişi & Takip Paneli',
    description: 'Sahadaki kırmızı ve sarı hata kartlarını açın; alan, bölüm, durum ve gecikme bazında filtreleyip takip edin.',
    Icon: AlertTriangle,
    badge: 'KIRMIZI / SARI',
    badgeStyle: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    iconBg: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    hoverBorder: 'hover:border-rose-500/60',
    guestAllowed: true,
  },
  {
    id: 'otonom_bakim',
    title: 'Otonom Bakım (TPM)',
    subtitle: 'Operatör Kontrolleri',
    description: 'Hava basınç barası (3-5 bar), hava valfi kaçak testi ve atık yağ tankı periyodik operatör kontrol adımları.',
    Icon: Wrench,
    badge: 'TPM SİSTEMİ',
    badgeStyle: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    iconBg: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
    hoverBorder: 'hover:border-sky-500/60',
    guestAllowed: true,
  },
  {
    id: 'isg_risk_bildirimi',
    title: 'İSG Risk Bildirimi',
    subtitle: 'Risk & Ramak Kala Takibi',
    description: 'Saha tehlike ve ramak kala bildirimleri, önleyici aksiyonlar, risk derecelendirmesi ve görsel kayıtlar.',
    Icon: ShieldAlert,
    badge: 'İSG GÜVENLİK',
    badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    iconBg: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    hoverBorder: 'hover:border-amber-500/60',
    guestAllowed: true,
  },
  {
    id: 'aksiyon_modulu',
    title: 'Aksiyon Modülü',
    subtitle: 'Görev & Termin Takibi',
    description: 'Açılan hata kartlarından otomatik düşen aksiyonlar, termin hedefleri ve sorumlu yönetici takibi.',
    Icon: CheckSquare,
    badge: 'AKTİF TAKİP',
    badgeStyle: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    iconBg: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
    hoverBorder: 'hover:border-indigo-500/60',
    guestAllowed: false,
  },
  {
    id: 'bes_s_denetim',
    title: '5S Denetim Modülü',
    subtitle: 'Dashboard & Radar Rapor',
    description: 'Dönem bazlı denetim puanları dashboardu, 1 yıllık alan trend analizleri ve PDF rapor dışa aktarma.',
    Icon: ClipboardList,
    badge: 'RADAR & DASHBOARD',
    badgeStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    iconBg: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    hoverBorder: 'hover:border-emerald-500/60',
    guestAllowed: false,
  },
];

function PortalView({ onSelectApp }) {
  const { user } = useAuth();
  const guestUser = isGuest(user);
  const baseUrl = import.meta.env.BASE_URL;

  const handleCardClick = (module) => {
    if (guestUser && !module.guestAllowed) {
      alert(`"${module.title}" modülüne erişim yetkiniz bulunmamaktadır. Misafir operatör girişi ile Hata Kartı, Otonom Bakım ve İSG modüllerini kullanabilirsiniz.`);
      return;
    }
    onSelectApp(module.id);
  };

  return (
    <div className="relative min-h-[calc(100vh-140px)] max-w-7xl mx-auto px-3 sm:px-4 py-4 md:py-6 animate-fade-in">
      <div className="relative z-10 max-w-6xl mx-auto space-y-8">

        {/* =========================================================================
            1. ENDÜSTRİYEL HERO BAŞLIK & SAHA DURUM PANELİ
            ========================================================================= */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-xs">
          {/* Üst Zarif Fırın Çizgisi */}
          <div className="absolute top-0 left-0 right-0 forge-line-gradient h-1" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 text-xs font-semibold mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-status-beacon" />
                <span>Canlı Saha Durumu: Pres Hatları & Talaşlı İmalat Operasyonel</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
                <span className="forge-text-gradient">PARSAN</span>{' '}
                <span className="amber-text-gradient">İŞLETME PORTALI</span>
              </h1>

              <p className="text-gray-400 text-sm md:text-base mt-2 max-w-2xl font-medium leading-relaxed">
                Sıcak dövme pres hatları, kalıphane ve talaşlı imalat süreçlerinde 
                <span className="text-gray-200 font-semibold"> 5S Standartları</span>, operasyonel takip ve saha disiplini.
              </p>
            </div>

            {/* Hızlı Fabrika Durum İndikatörleri */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
              <div className="px-3 py-2 text-center border-r border-slate-800 last:border-none flex-1 sm:flex-initial">
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                  <Factory className="w-3.5 h-3.5 text-amber-400" /> Tesis
                </div>
                <div className="text-sm font-black text-white">Dövme & Pres</div>
              </div>

              <div className="px-3 py-2 text-center border-r border-slate-800 last:border-none flex-1 sm:flex-initial">
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" /> 5S Sistemi
                </div>
                <div className="text-sm font-black text-emerald-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Aktif
                </div>
              </div>

              <div className="px-3 py-2 text-center flex-1 sm:flex-initial">
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" /> Vardiya
                </div>
                <div className="text-sm font-black text-white">Kesintisiz</div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. MODÜL SEÇİM KARTLARI (PASTEL INDUSTRIAL GRID)
            ========================================================================= */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Saha ve Yönetim Modülleri
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              {guestUser ? 'Saha Operatör Yetkisi: Hata Kartı & Otonom Bakım' : 'Tüm Modüller Erişilebilir'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((module) => {
              const { id, title, subtitle, description, Icon, badge, badgeStyle, iconBg, hoverBorder, guestAllowed } = module;
              const isLocked = guestUser && !guestAllowed;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleCardClick(module)}
                  className={`group relative cursor-pointer flex flex-col justify-between text-left p-6 rounded-2xl border bg-slate-900/95 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl overflow-hidden ${
                    isLocked
                      ? 'border-slate-800/60 opacity-60 hover:opacity-75'
                      : `border-slate-800 ${hoverBorder}`
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${iconBg} shadow-sm transition-transform duration-200 group-hover:scale-105`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-gray-400">
                          <Lock className="w-2.5 h-2.5" /> Yetkili Girişi
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                          {badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors mb-1">
                      {title}
                    </h3>
                    <div className="text-xs font-semibold text-slate-400 mb-2.5">
                      {subtitle}
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      {description}
                    </p>
                  </div>

                  <div className="mt-6 pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-gray-400 group-hover:text-amber-400 transition-colors">
                    <span>{isLocked ? 'Erişim Kısıtlı' : 'Modüle Git'}</span>
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
            <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Üretim Hatları ve Yetkinlikler
            </h2>
            <span className="text-xs text-gray-500 font-medium">Ağır Sanayi Sıcak Şekillendirme</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Büyük Vitrin: Canlı Hat Operasyonu */}
            <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-lg flex flex-col sm:flex-row items-center gap-6 overflow-hidden">
              <div className="relative flex-shrink-0 w-full sm:w-44 h-36 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950">
                <img
                  src={`${baseUrl}content/images.jpg`}
                  alt="Parsan Dövme Pres Hattı"
                  className="w-full h-full object-cover filter contrast-110"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-slate-700 text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operasyonel
                </div>
              </div>

              <div className="flex-1 text-left">
                <div className="inline-block px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">
                  1000T - 8000T Pres Hatları
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
                  Ağır Dövme Çelik ve Sıcak Şekillendirme
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                  İndüksiyon ısıtma ocakları, mekanik ve hidrolik presler, kontrollü soğutma ve ısıl işlem 
                  süreçleri 5S ve IATF 16949 standartlarında yürütülmektedir.
                </p>
              </div>
            </div>

            {/* Yan Vitrin: Ürün ve Sanayi Grupları */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg flex flex-col justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 p-2 flex items-center justify-center flex-shrink-0">
                  <img
                    src={`${baseUrl}content/crankshaft.png`}
                    alt="Krank Mili"
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Krank & Aks Milleri</div>
                  <div className="text-[11px] text-gray-400">Ağır vasıta & otomotiv güç aktarma dövmeleri</div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 p-2 flex items-center justify-center flex-shrink-0">
                  <img
                    src={`${baseUrl}content/airplane.png`}
                    alt="Havacılık Parçaları"
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Havacılık & Savunma</div>
                  <div className="text-[11px] text-gray-400">Titanyum ve yüksek mukavemetli alaşım dövme</div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 p-2 flex items-center justify-center flex-shrink-0">
                  <img
                    src={`${baseUrl}content/sicak_parca.png`}
                    alt="Akkor Dövme Çeliği"
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Hassas Kalıp & Isıl İşlem</div>
                  <div className="text-[11px] text-gray-400">Optimum mikroyapı ve dövme geometrisi</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. KURUMSAL FOOTER BİLGİSİ
            ========================================================================= */}
        <div className="pt-6 pb-2 text-center text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-center gap-2 border-t border-slate-800/80">
          <span className="font-semibold text-gray-400">PARSAN Makina Parçaları Sanayii A.Ş.</span>
          <span className="hidden sm:inline">•</span>
          <span>5S Saha ve Operasyon Yönetim Sistemi</span>
        </div>

      </div>
    </div>
  );
}

export default memo(PortalView);
