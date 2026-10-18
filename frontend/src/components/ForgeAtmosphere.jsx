import { memo, useMemo } from 'react';
import { Shield, Zap, Sparkles, Flame, Hammer } from 'lucide-react';

/**
 * PARSAN ULTRA-DÜŞÜK GPU ARKA PLAN ATMOSFERİ
 *
 * GPU 3D MOTORUNU MİNİMUMA İNDİRME MİMARİSİ:
 * 1. Doku Küçültme (Texture Downsampling): Görseller diskte 1742x980 ve 1200x1200'den
 *    doğrudan ekrandaki render boyutlarına (max 380px) optimize edildi. Böylece
 *    GPU VRAM bant genişliği %90 azaldı.
 * 2. Sıfır Filtre: `filter: drop-shadow()` ve `contrast()` kaldırıldı.
 *    Fragment shader'lar tamamen boşta kalır.
 * 3. Rotasyonsuz 1D Eksen Süzülmesi: `rotate()` kaldırıldı, sadece saf `translate3d(0, y, 0)`
 *    yapılarak afin köşe enterpolasyonu engellendi.
 * 4. Yavaş Frekans: 14-18 saniyelik sakin periyot ile kare başına piksel farkı minimuma çekildi.
 */
function ForgeAtmosphere({ density = 4, showFloatingProps = true }) {
  const baseUrl = import.meta.env.BASE_URL;

  // Ultra hafif mikro-kıvılcımlar (Gölgesiz, saf transform)
  const embers = useMemo(() => {
    const count = Math.min(density, 5);
    return Array.from({ length: count }).map((_, i) => {
      const seed = Math.sin((i + 1) * 23.456) * 10000;
      const rand = seed - Math.floor(seed);
      const color = i % 2 === 0 ? '#f59e0b' : '#ea580c';
      const size = 1.5 + Math.round(rand * 1.5);
      return {
        id: i,
        left: `${(i * 100) / count + rand * 6}%`,
        size: `${size}px`,
        delay: `${(rand * 6).toFixed(2)}s`,
        duration: `${(8 + rand * 6).toFixed(2)}s`,
        opacity: 0.3 + rand * 0.3,
        color,
      };
    });
  }, [density]);

  return (
    <div className="forge-atmosphere pointer-events-none fixed inset-0 overflow-hidden z-0 select-none">
      {/* 1. STATİK TEKNİK ENDÜSTRİYEL IZGARA */}
      <div className="absolute inset-0 bg-industrial-grid opacity-60" />

      {/* 2. STATİK ENDÜSTRİYEL FIRIN AMBİYANSI (Saf gradient, sıfır blur) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 35% at 50% -5%, rgba(217, 119, 6, 0.07) 0%, rgba(180, 83, 9, 0.02) 50%, transparent 80%), radial-gradient(ellipse 50% 30% at 85% 105%, rgba(234, 88, 12, 0.04) 0%, transparent 70%)',
        }}
      />

      {/* 3. MİKRO KIVILCIMLAR (Sıfır gölge / Sıfır filtre) */}
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
            className="absolute left-2 lg:left-6 xl:left-8 top-20 lg:top-28 opacity-20 lg:opacity-75 xl:opacity-85 2xl:opacity-95 transition-opacity"
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
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-2 px-3 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              <Flame className="w-3 h-3 text-amber-400" />
              Dövme Örsü
            </div>
          </div>

          {/* SOL ALT: KIZGIN SICAK PARÇA (sicak_parca.png) */}
          <div
            className="absolute left-3 lg:left-8 xl:left-10 bottom-10 lg:bottom-14 opacity-20 lg:opacity-75 xl:opacity-85 2xl:opacity-95 transition-opacity"
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
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-2 px-3 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] font-bold uppercase tracking-wider text-orange-300">
              <Sparkles className="w-3 h-3 text-orange-400" />
              Akkor Dövme Çeliği
            </div>
          </div>

          {/* SAĞ ÜST: HAVACILIK DÖVME JETİ (airplane.png) */}
          <div
            className="absolute right-2 lg:right-6 xl:right-10 top-16 lg:top-24 opacity-20 lg:opacity-75 xl:opacity-85 2xl:opacity-95 transition-opacity"
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
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              <Zap className="w-3 h-3 text-cyan-400" />
              Havacılık Sanayii
            </div>
          </div>

          {/* SAĞ ORTA: DÖVME ÇEKİCİ (hammer.png) */}
          <div
            className="absolute right-3 lg:right-10 xl:right-16 top-1/2 -translate-y-1/2 opacity-20 lg:opacity-70 xl:opacity-80 2xl:opacity-90 transition-opacity"
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
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              <Hammer className="w-3 h-3 text-amber-400" />
              Şahmerdan Pres
            </div>
          </div>

          {/* SAĞ ALT: HASSAS DÖVME KRANK MİLİ (crankshaft.png) */}
          <div
            className="absolute right-2 lg:right-8 xl:right-12 bottom-8 lg:bottom-12 opacity-20 lg:opacity-75 xl:opacity-85 2xl:opacity-95 transition-opacity"
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
            <div className="hidden lg:inline-flex items-center gap-1.5 mt-2 px-3 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] font-bold uppercase tracking-wider text-gray-200">
              <Shield className="w-3 h-3 text-amber-400" />
              Ağır Vasıta Krank
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ForgeAtmosphere);
