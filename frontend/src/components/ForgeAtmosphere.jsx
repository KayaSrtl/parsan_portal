import { useMemo } from 'react';
import { Flame, Sparkles, Shield, Zap } from 'lucide-react';

export default function ForgeAtmosphere({ density = 30, showFloatingProps = true }) {
  const baseUrl = import.meta.env.BASE_URL;

  // Rastgele kıvılcım (ember) parçacıkları oluştur
  const embers = useMemo(() => {
    return Array.from({ length: density }).map((_, i) => ({
      id: i,
      left: `${(i * 100) / density + (Math.sin(i * 1.5) * 6)}%`,
      size: `${Math.floor(2 + (i % 4) * 1.6)}px`,
      delay: `${(i * 0.32) % 6}s`,
      duration: `${3.5 + (i % 5) * 0.9}s`,
      opacity: 0.35 + (i % 5) * 0.14,
      color: i % 3 === 0 ? '#f59e0b' : i % 3 === 1 ? '#f97316' : '#ef4444',
      blur: i % 2 === 0 ? '1px' : '0px',
    }));
  }, [density]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none">
      {/* =========================================================================
          1. SICAK DÖVME OCAK VE FIRIN AURALARI (RADIAL BLAST FURNACE GLOWS)
          ========================================================================= */}
      <div 
        className="absolute -top-24 left-1/6 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-600/15 via-orange-500/8 to-transparent blur-3xl"
        style={{ animation: 'floatSlow 14s ease-in-out infinite' }}
      />
      <div 
        className="absolute -bottom-24 right-1/6 w-[700px] h-[650px] rounded-full bg-gradient-to-tl from-red-600/15 via-amber-500/8 to-transparent blur-3xl"
        style={{ animation: 'floatReverse 16s ease-in-out infinite' }}
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-orange-600/5 via-amber-500/3 to-transparent blur-3xl"
      />

      {/* =========================================================================
          2. YUKARI DOĞRU SÜREKLİ YÜKSELEN SICAK KIVILCIMLAR (RISING EMBERS)
          ========================================================================= */}
      <div className="absolute inset-0">
        {embers.map((e) => (
          <span
            key={e.id}
            className="absolute rounded-full"
            style={{
              left: e.left,
              bottom: '-25px',
              width: e.size,
              height: e.size,
              backgroundColor: e.color,
              boxShadow: `0 0 6px ${e.color}, 0 0 14px ${e.color}`,
              filter: `blur(${e.blur})`,
              animation: `emberRise ${e.duration} linear infinite`,
              animationDelay: e.delay,
              opacity: e.opacity,
            }}
          />
        ))}
      </div>

      {/* =========================================================================
          3. HER SAYFADA HAVADA SALINAN DÖVME FABRİKASI GÖRSELLERİ
          ========================================================================= */}
      {showFloatingProps && (
        <div className="absolute inset-0">
          
          {/* SOL TARAFTA: ATEŞLİ DÖVME ÖRSÜ (ors.png) */}
          <div 
            className="absolute left-2 lg:left-6 xl:left-10 top-24 lg:top-36 opacity-30 lg:opacity-75 xl:opacity-90 2xl:opacity-100 transition-opacity"
            style={{ maxWidth: '240px' }}
          >
            <div className="relative animate-float-slow animate-forge-glow">
              <div className="absolute inset-0 bg-red-600/30 blur-2xl rounded-full scale-110" />
              <img
                src={`${baseUrl}content/ors.png`}
                alt="Dövme Örsü"
                className="w-32 lg:w-48 xl:w-56 h-auto object-contain drop-shadow-[0_15px_30px_rgba(234,88,12,0.85)] filter contrast-125"
              />
            </div>
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-slate-900/85 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider text-amber-300 shadow-lg backdrop-blur-sm">
              <Flame className="w-3 h-3 text-red-500 animate-pulse" />
              Dövme Örsü
            </div>
          </div>

          {/* SOL ALT TARAFTA: KIZGIN SICAK PARÇA (sicak_parca.png) */}
          <div 
            className="absolute left-3 lg:left-8 xl:left-12 bottom-12 lg:bottom-16 opacity-30 lg:opacity-75 xl:opacity-90 2xl:opacity-100 transition-opacity"
            style={{ maxWidth: '220px' }}
          >
            <div className="relative animate-float-sway animate-heat-pulse">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/50 via-amber-500/40 to-yellow-400/30 blur-2xl rounded-xl scale-125" />
              <img
                src={`${baseUrl}content/sicak_parca.png`}
                alt="Akkor Kütük"
                className="w-28 lg:w-44 xl:w-52 h-auto object-contain drop-shadow-[0_10px_35px_rgba(249,115,22,0.95)]"
              />
            </div>
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-slate-900/85 border border-red-500/40 text-[10px] font-black uppercase tracking-wider text-orange-300 shadow-lg backdrop-blur-sm">
              <Sparkles className="w-3 h-3 text-yellow-400 animate-bounce" />
              Akkor Dövme Çeliği
            </div>
          </div>

          {/* SAĞ ÜST TARAFTA: HAVACILIK DÖVME JETİ (airplane.png) */}
          <div 
            className="absolute right-2 lg:right-6 xl:right-12 top-20 lg:top-28 opacity-25 lg:opacity-70 xl:opacity-85 2xl:opacity-95 transition-opacity"
            style={{ maxWidth: '220px' }}
          >
            <div className="relative animate-float-sway">
              <div className="absolute inset-0 bg-blue-500/15 blur-xl rounded-full scale-110" />
              <img
                src={`${baseUrl}content/airplane.png`}
                alt="Havacılık Dövme"
                className="w-32 lg:w-44 xl:w-52 h-auto object-contain drop-shadow-[0_15px_25px_rgba(59,130,246,0.45)]"
              />
            </div>
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-1 px-3 py-0.5 rounded-full bg-slate-900/85 border border-blue-500/40 text-[10px] font-black uppercase tracking-wider text-cyan-300 shadow-lg backdrop-blur-sm">
              <Zap className="w-3 h-3 text-cyan-400" />
              Havacılık Sanayii
            </div>
          </div>

          {/* SAĞ ORTA/ALT TARAFTA: DÖVME ÇEKİCİ (hammer.png) */}
          <div 
            className="absolute right-4 lg:right-12 xl:right-20 top-1/2 -translate-y-1/2 opacity-25 lg:opacity-65 xl:opacity-80 2xl:opacity-90 transition-opacity"
            style={{ maxWidth: '180px' }}
          >
            <div className="relative animate-float-reverse">
              <img
                src={`${baseUrl}content/hammer.png`}
                alt="Dövme Çekici"
                className="w-24 lg:w-32 xl:w-40 h-auto object-contain drop-shadow-[0_12px_24px_rgba(245,158,11,0.5)] transform -rotate-25"
              />
            </div>
          </div>

          {/* SAĞ EN ALT TARAFTA: HASSAS DÖVME KRANK MİLİ (crankshaft.png) */}
          <div 
            className="absolute right-2 lg:right-8 xl:right-14 bottom-8 lg:bottom-12 opacity-30 lg:opacity-75 xl:opacity-90 2xl:opacity-100 transition-opacity"
            style={{ maxWidth: '240px' }}
          >
            <div className="relative animate-float-slow">
              <div className="absolute inset-0 bg-slate-400/15 blur-xl rounded-full scale-110" />
              <img
                src={`${baseUrl}content/crankshaft.png`}
                alt="Krank Mili"
                className="w-32 lg:w-48 xl:w-56 h-auto object-contain drop-shadow-[0_15px_25px_rgba(15,23,42,0.9)] filter contrast-110"
              />
            </div>
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-slate-900/85 border border-slate-700 text-[10px] font-black uppercase tracking-wider text-gray-200 shadow-lg backdrop-blur-sm">
              <Shield className="w-3 h-3 text-amber-400" />
              Ağır Vasıta Krank
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
