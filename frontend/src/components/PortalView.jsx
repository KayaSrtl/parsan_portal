import { AlertTriangle, CheckSquare, ClipboardList, Wrench, Flame, Activity } from 'lucide-react';

const MODULES = [
  {
    id: 'hata_kartlari',
    title: 'Hata Kartları',
    subtitle: '5S & Arıza Bildirimleri',
    description: 'Sahadaki 5S uygunsuzlukları, kırmızı kartlar ve arıza bildirimlerini yönetin.',
    Icon: AlertTriangle,
    accentColor: 'from-red-500 to-amber-500',
    borderGlow: 'hover:border-red-500 hover:shadow-[0_0_30px_rgba(239,68,68,0.35)]',
    badge: 'KIRMIZI ETİKET',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40',
  },
  {
    id: 'aksiyon_modulu',
    title: 'Aksiyon Modülü',
    subtitle: 'Görev & Atama Takibi',
    description: 'Saha iyileştirme aksiyonlarını, sorumlu atamalarını ve terminleri yönetin.',
    Icon: CheckSquare,
    accentColor: 'from-amber-500 to-orange-500',
    borderGlow: 'hover:border-amber-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.35)]',
    badge: 'AKTİF TAKİP',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    id: 'bes_s_denetim',
    title: '5S Denetim',
    subtitle: 'Radar Grafik & Checklist',
    description: 'Bölüm bazlı 5S denetim soru listesi, anlık skor hesaplama ve radar grafiği.',
    Icon: ClipboardList,
    accentColor: 'from-orange-500 to-emerald-500',
    borderGlow: 'hover:border-orange-500 hover:shadow-[0_0_30px_rgba(249,115,22,0.35)]',
    badge: 'RADAR RAPOR',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  {
    id: 'otonom_bakim',
    title: 'Otonom Bakım',
    subtitle: 'Operatör Kontrolleri',
    description: 'Tezgah operatör bakım checklistleri, yağlama ve temizlik standartları.',
    Icon: Wrench,
    accentColor: 'from-blue-500 to-indigo-500',
    borderGlow: 'hover:border-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.35)]',
    badge: 'TKY SİSTEMİ',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
];

export default function PortalView({ onSelectApp }) {
  const baseUrl = import.meta.env.BASE_URL;

  return (
    <div className="relative min-h-[calc(100vh-120px)] max-w-7xl mx-auto px-4 py-6 animate-fade-in">

      {/* =========================================================================
          MERKEZ İÇERİK ALANI
          ========================================================================= */}
      <div className="relative z-10 max-w-5xl mx-auto">
        
        {/* HERO BAŞLIK & ENDÜSTRİYEL KOR BANDI */}
        <div className="text-center mb-8 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-amber-500/40 text-amber-400 text-xs md:text-sm font-black tracking-wider uppercase mb-4 shadow-[0_0_20px_rgba(245,158,11,0.25)] animate-pulse">
            <Flame className="w-4 h-4 text-red-500 animate-bounce" />
            Sıcak Dövme Pres Hatları & Ağır Çelik Sanayii
            <Flame className="w-4 h-4 text-orange-500 animate-bounce" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-3">
            <span className="forge-text-gradient">PARSAN</span>{' '}
            <span className="molten-text-gradient">İŞLETME PORTALI</span>
          </h1>

          <p className="text-gray-300 dark:text-gray-300 text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
            Dövme pres hatları, kalıphane, ısıl işlem ve talaşlı imalat süreçlerinde 
            <span className="text-amber-400 font-bold"> 5S Standartları </span> ve operasyonel mükemmellik.
          </p>
        </div>

        {/* =========================================================================
            MOBİL / ORTA BOY EKRANLAR İÇİN DÖVME ARAÇLARI SALINAN ŞERİT (SHOWCASE STRIP)
            ========================================================================= */}
        <div className="xl:hidden mb-8 overflow-x-auto pb-3 pt-1 scrollbar-thin">
          <div className="flex items-center justify-start sm:justify-center gap-4 min-w-max px-2">
            
            {/* Ateşli Örs */}
            <div className="flex items-center gap-3 bg-slate-900/90 border border-amber-500/40 rounded-2xl p-2.5 shadow-md">
              <img
                src={`${baseUrl}content/ors.png`}
                alt="Örs"
                className="w-12 h-12 object-contain animate-float-slow animate-forge-glow"
              />
              <div className="text-left pr-2">
                <div className="text-[10px] text-amber-400 font-bold uppercase">Dövme Örsü</div>
                <div className="text-xs font-black text-white">Sıcak Dövme</div>
              </div>
            </div>

            {/* Sıcak Parça */}
            <div className="flex items-center gap-3 bg-slate-900/90 border border-red-500/40 rounded-2xl p-2.5 shadow-md">
              <img
                src={`${baseUrl}content/sicak_parca.png`}
                alt="Sıcak Kütük"
                className="w-12 h-12 object-contain animate-heat-pulse"
              />
              <div className="text-left pr-2">
                <div className="text-[10px] text-red-400 font-bold uppercase">Akkor Çelik</div>
                <div className="text-xs font-black text-white">Sıcak Kütük</div>
              </div>
            </div>

            {/* Çekiç */}
            <div className="flex items-center gap-3 bg-slate-900/90 border border-orange-500/40 rounded-2xl p-2.5 shadow-md">
              <img
                src={`${baseUrl}content/hammer.png`}
                alt="Şahmerdan"
                className="w-12 h-12 object-contain animate-float-reverse"
              />
              <div className="text-left pr-2">
                <div className="text-[10px] text-orange-400 font-bold uppercase">Şahmerdan</div>
                <div className="text-xs font-black text-white">Dövme Çekici</div>
              </div>
            </div>

            {/* Krank Mili */}
            <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700 rounded-2xl p-2.5 shadow-md">
              <img
                src={`${baseUrl}content/crankshaft.png`}
                alt="Krank"
                className="w-12 h-12 object-contain animate-float-slow"
              />
              <div className="text-left pr-2">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Ağır Sanayi</div>
                <div className="text-xs font-black text-white">Krank Milleri</div>
              </div>
            </div>

          </div>
        </div>

        {/* =========================================================================
            CANLI DÖVME HATTI VİTRİN KARTI (LIVE FORGING BANNER with images.jpg & hammer.png)
            ========================================================================= */}
        <div className="relative mb-10 rounded-2xl overflow-hidden border-2 border-amber-500/40 bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-950 shadow-[0_10px_40px_rgba(245,158,11,0.2)]">
          {/* Molten Glow Üst Çizgi */}
          <div className="molten-gradient h-1.5 w-full" />

          <div className="p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 w-full md:w-auto">
              {/* Canlı dövme operasyonu resmi */}
              <div className="relative flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-[0_0_20px_rgba(249,115,22,0.4)] group">
                <img
                  src={`${baseUrl}content/images.jpg`}
                  alt="Parsan Dövme Hattı Operasyonu"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-115 filter contrast-125"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-center pb-1">
                  <span className="text-[9px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    CANLI
                  </span>
                </div>
              </div>

              {/* Başlık ve açıklamalar */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                    AĞIR SANAYİ DÖVME
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-green-400 font-bold">
                    <Activity className="w-3.5 h-3.5 animate-pulse" /> Hatlar Aktif
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-black text-white">
                  Şahmerdan & Sıcak Şekillendirme Presleri
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm mt-1 max-w-lg">
                  Krank milleri, ön dingil, direksiyon mafsalı ve havacılık dövme parçaları 5S standartlarında üretilmektedir.
                </p>
              </div>
            </div>

            {/* Sağ taraf: Havada salınan Dövme Çekici & İstatistik */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
              <div className="relative group cursor-pointer">
                <img
                  src={`${baseUrl}content/hammer.png`}
                  alt="Dövme Çekici"
                  className="w-20 h-20 object-contain animate-float-reverse drop-shadow-[0_10px_20px_rgba(245,158,11,0.6)] transform -rotate-12 transition-transform group-hover:rotate-0"
                />
              </div>
              <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2.5 rounded-xl text-center shadow-inner">
                <div className="text-sm font-black text-amber-400 tracking-wider">AĞIR SANAYİ</div>
                <div className="text-[10px] uppercase font-bold text-gray-400">Dövme ve Şekillendirme</div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            MODÜL SEÇİM KARTLARI (THE 4 INDUSTRIAL MODULE CARDS)
            ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {MODULES.map(({ id, title, subtitle, description, Icon, accentColor, borderGlow, badge, badgeColor }) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelectApp(id)}
              className={`group relative cursor-pointer flex flex-col justify-between text-left p-6 rounded-2xl border-2 border-slate-700/80 bg-slate-900/90 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${borderGlow} overflow-hidden`}
            >
              {/* Kart Arkasındaki Dinamik Gradient Parıltısı */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${accentColor} opacity-5 group-hover:opacity-20 rounded-bl-full transition-opacity duration-300 blur-xl`} />

              {/* Üst Kısım: İkon ve Rozet */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3.5 rounded-xl bg-gradient-to-br ${accentColor} text-white shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColor}`}>
                    {badge}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white group-hover:text-amber-400 transition-colors mb-1">
                  {title}
                </h3>
                <div className="text-xs font-bold text-amber-500/90 mb-3">
                  {subtitle}
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {description}
                </p>
              </div>

              {/* Alt Kısım: Giriş Oku & Eylem */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-gray-400 group-hover:text-amber-400 transition-colors">
                <span>Modülü Aç</span>
                <span className="transform transition-transform duration-300 group-hover:translate-x-1 font-black text-sm">
                  →
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* ALT BİLGİ DİPNOTU */}
        <div className="mt-12 text-center text-xs text-gray-500 dark:text-gray-500 flex items-center justify-center gap-2">
          <span>PARSAN Makina Parçaları Sanayii A.Ş.</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-amber-500/80 font-bold">
            <Flame className="w-3.5 h-3.5 text-orange-500" /> Dövme Fabrikası 5S İşletim Sistemi
          </span>
        </div>

      </div>
    </div>
  );
}
