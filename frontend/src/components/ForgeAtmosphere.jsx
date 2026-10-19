import { memo, useMemo } from 'react';
import { Shield, Zap, Sparkles, Flame, Hammer } from 'lucide-react';

/**
 * PARSAN MODERN PASTEL & ULTRA-DÜŞÜK GPU ARKA PLAN ATMOSFERİ
 */
function ForgeAtmosphere({ density = 4, showFloatingProps = true }) {
  const baseUrl = import.meta.env.BASE_URL;

  const embers = useMemo(() => {
    const count = Math.min(density, 6);
    return Array.from({ length: count }).map((_, i) => {
      const seed = Math.sin((i + 1) * 23.456) * 10000;
      const rand = seed - Math.floor(seed);
      const color = i % 3 === 0 ? '#fb7185' : i % 3 === 1 ? '#38bdf8' : '#fbbf24';
      const size = 2 + Math.round(rand * 1.5);
      return {
        id: i,
        left: `${(i * 100) / count + rand * 6}%`,
        size: `${size}px`,
        delay: `${(rand * 6).toFixed(2)}s`,
        duration: `${(10 + rand * 6).toFixed(2)}s`,
        opacity: 0.25 + rand * 0.25,
        color,
      };
    });
  }, [density]);

  return (
    <div className="forge-atmosphere pointer-events-none fixed inset-0 overflow-hidden z-0 select-none print:hidden">
      {/* 1. STATİK TEKNİK ENDÜSTRİYEL IZGARA */}
      <div className="absolute inset-0 bg-industrial-grid opacity-70" />

      {/* 2. STATİK MODERN PASTEL AMBİYANS (Saf gradient, sıfır blur filtresi) */}
      <div
        className="absolute inset-0 dark:opacity-65"
        style={{
          background: [
            'radial-gradient(circle 650px at 14% 12%, rgba(251, 113, 133, 0.14) 0%, rgba(253, 186, 116, 0.10) 42%, transparent 76%)',
            'radial-gradient(circle 750px at 86% 86%, rgba(56, 189, 248, 0.14) 0%, rgba(129, 140, 248, 0.09) 40%, transparent 78%)',
            'radial-gradient(ellipse 850px 500px at 50% 48%, rgba(52, 211, 153, 0.08) 0%, rgba(251, 191, 36, 0.06) 45%, transparent 76%)',
            'radial-gradient(ellipse 100% 35% at 50% 100%, rgba(251, 146, 60, 0.11) 0%, rgba(244, 63, 94, 0.05) 55%, transparent 85%)',
          ].join(', '),
        }}
      />

      {/* 3. MİKRO PARÇACIKLAR (Sıfır gölge / Sıfır filtre) */}
      <div className="absolute inset-0">
        {embers.map((e) => (
          <span
            key={e.id}
            className="absolute rounded-full"
            style={{
              left: e.left,
              bottom: '-15px',
              width: e.size,
              height: e.size,
              backgroundColor: e.color,
              animation: `emberRiseSoft ${e.duration} var(--ease-out-soft) infinite`,
              animationDelay: e.delay,
              opacity: e.opacity,
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </div>

      {/* =========================================================================
          4. HAVADA SALINAN ENDÜSTRİYEL OBJELER (ULTRA-DÜŞÜK GPU YÜKÜ)
          ========================================================================= */}
      {showFloatingProps && (
        <div className="absolute inset-0">
          {/* SOL ÜST: DÖVME ÖRSÜ (ors.png) */}
          <div
            className="absolute left-2 lg:left-6 xl:left-8 top-20 lg:top-28 opacity-15 lg:opacity-75 xl:opacity-85 transition-opacity"
            style={{ maxWidth: '220px', contain: 'layout paint style' }}
          >
            <div className="relative animate-float-slow">
              <img
                src={`${baseUrl}content/ors.png`}
                alt="Dövme Örsü"
                loading="lazy"
                decoding="async"
                draggable={false}
                className="w-28 lg:w-44 xl:w-50 h-auto object-contain"
              />
            </div>
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-2 px-3 py-0.5 rounded-full bg-white/90 dark:bg-slate-800/90 border border-amber-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 shadow-xs">
              <Flame className="w-3 h-3 text-amber-500" />
              Dövme Örsü
            </div>
          </div>

          {/* SOL ALT: KIZGIN SICAK PARÇA (sicak_parca.png) */}
          <div
            className="absolute left-3 lg:left-8 xl:left-10 bottom-10 lg:bottom-14 opacity-15 lg:opacity-75 xl:opacity-85 transition-opacity"
            style={{ maxWidth: '200px', contain: 'layout paint style' }}
          >
            <div className="relative animate-float-sway">
              <img
                src={`${baseUrl}content/sicak_parca.png`}
                alt="Akkor Kütük"
                loading="lazy"
                decoding="async"
                draggable={false}
                className="w-24 lg:w-38 xl:w-46 h-auto object-contain"
              />
            </div>
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-2 px-3 py-0.5 rounded-full bg-white/90 dark:bg-slate-800/90 border border-rose-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 shadow-xs">
              <Sparkles className="w-3 h-3 text-rose-500" />
              Akkor Dövme Çeliği
            </div>
          </div>

          {/* SAĞ ÜST: HAVACILIK DÖVME JETİ (airplane.png) */}
          <div
            className="absolute right-2 lg:right-6 xl:right-10 top-16 lg:top-24 opacity-15 lg:opacity-75 xl:opacity-85 transition-opacity"
            style={{ maxWidth: '210px', contain: 'layout paint style' }}
          >
            <div className="relative animate-float-sway">
              <img
                src={`${baseUrl}content/airplane.png`}
                alt="Havacılık Dövme"
                loading="lazy"
                decoding="async"
                draggable={false}
                className="w-28 lg:w-42 xl:w-50 h-auto object-contain"
              />
            </div>
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full bg-white/90 dark:bg-slate-800/90 border border-sky-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 shadow-xs">
              <Zap className="w-3 h-3 text-sky-500" />
              Havacılık Sanayii
            </div>
          </div>

          {/* SAĞ ORTA: DÖVME ÇEKİCİ (hammer.png) */}
          <div
            className="absolute right-3 lg:right-10 xl:right-16 top-1/2 -translate-y-1/2 opacity-15 lg:opacity-70 xl:opacity-80 transition-opacity"
            style={{ maxWidth: '160px', contain: 'layout paint style' }}
          >
            <div className="relative animate-float-reverse">
              <img
                src={`${baseUrl}content/hammer.png`}
                alt="Dövme Çekici"
                loading="lazy"
                decoding="async"
                draggable={false}
                className="w-20 lg:w-30 xl:w-34 h-auto object-contain -rotate-12"
              />
            </div>
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-slate-800/90 border border-amber-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 shadow-xs">
              <Hammer className="w-3 h-3 text-amber-500" />
              Şahmerdan Pres
            </div>
          </div>

          {/* SAĞ ALT: HASSAS DÖVME KRANK MİLİ (crankshaft.png) */}
          <div
            className="absolute right-2 lg:right-8 xl:right-12 bottom-8 lg:bottom-12 opacity-15 lg:opacity-75 xl:opacity-85 transition-opacity"
            style={{ maxWidth: '220px', contain: 'layout paint style' }}
          >
            <div className="relative animate-float-slow">
              <img
                src={`${baseUrl}content/crankshaft.png`}
                alt="Krank Mili"
                loading="lazy"
                decoding="async"
                draggable={false}
                className="w-28 lg:w-44 xl:w-50 h-auto object-contain"
              />
            </div>
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-2 px-3 py-0.5 rounded-full bg-white/90 dark:bg-slate-800/90 border border-emerald-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 shadow-xs">
              <Shield className="w-3 h-3 text-emerald-500" />
              Ağır Vasıta Krank
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ForgeAtmosphere);
