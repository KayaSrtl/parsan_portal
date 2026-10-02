import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Kısa bildirim yönetimi. Zamanlayıcı bileşen kapanırken temizlenir,
 * üst üste gelen bildirimler birbirini iptal etmez.
 */
export function useToast(duration = 4000) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const showToast = useCallback(
    (text, isError = false) => {
      clearTimeout(timerRef.current);
      setToast({ text, isError });
      timerRef.current = setTimeout(() => setToast(null), duration);
    },
    [duration]
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { toast, showToast, hideToast };
}
