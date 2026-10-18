import { memo, useMemo } from 'react';

/**
 * PARSAN ENDÜSTRİYEL ARKA PLAN ATMOSFERİ
 *
 * SIFIR GPU YÜKÜ MİMARİSİ:
 * - Ağır `filter: blur()`, `filter: drop-shadow()` veya DOM'da havada salınan
 *   sürekli GPU rasterize eden görseller tamamen kaldırılmıştır.
 * - Renk geçişleri saf CSS radial-gradient ile tek seferde GPU dostu çizilir.
 * - Mikro kıvılcımlar sadece 6 adet olup hafif CSS `translate3d` ile çalışır.
 * - Endüstriyel teknik doku ile kurumsal ve prestijli bir zemin sunar.
 */
function ForgeAtmosphere({ density = 6 }) {
  // Mikro kıvılcım (ember) parçacıkları: Düşük yoğunluklu, narin ve hafif.
  const embers = useMemo(() => {
    const count = Math.min(density, 8);
    return Array.from({ length: count }).map((_, i) => {
      const seed = Math.sin((i + 1) * 23.456) * 10000;
      const rand = seed - Math.floor(seed);
      const color = i % 2 === 0 ? '#f59e0b' : '#ea580c';
      const size = 1.5 + Math.round(rand * 1.5);
      return {
        id: i,
        left: `${(i * 100) / count + rand * 6}%`,
        size: `${size}px`,
        delay: `${(rand * 5).toFixed(2)}s`,
        duration: `${(6 + rand * 5).toFixed(2)}s`,
        opacity: 0.35 + rand * 0.35,
        color,
      };
    });
  }, [density]);

  return (
    <div className="forge-atmosphere pointer-events-none fixed inset-0 overflow-hidden z-0 select-none">
      {/* 1. TEKNİK ENDÜSTRİYEL IZGARA (Subtle engineering grid) */}
      <div className="absolute inset-0 bg-industrial-grid opacity-70" />

      {/* 2. STATİK ENDÜSTRİYEL FIRIN & METAL AMBİYANSI (Sıfır Blur Filtresi - Saf Gradient) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 35% at 50% -5%, rgba(217, 119, 6, 0.08) 0%, rgba(180, 83, 9, 0.02) 50%, transparent 80%), radial-gradient(ellipse 50% 30% at 85% 105%, rgba(234, 88, 12, 0.05) 0%, transparent 70%)',
        }}
      />

      {/* 3. ÇOK HAFİF VE NARİN MİKRO-KIVILCIMLAR (Hardware Accelerated Transform) */}
      <div className="absolute inset-0">
        {embers.map((e) => (
          <span
            key={e.id}
            className="absolute rounded-full"
            style={{
              left: e.left,
              bottom: '-20px',
              width: e.size,
              height: e.size,
              backgroundColor: e.color,
              boxShadow: `0 0 4px ${e.color}`,
              animation: `emberRiseSoft ${e.duration} var(--ease-out-soft) infinite`,
              animationDelay: e.delay,
              opacity: e.opacity,
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(ForgeAtmosphere);
