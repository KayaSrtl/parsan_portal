import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

/**
 * Bir API ucundan liste çeker.
 *
 * - `enabled` false ise istek atılmaz (örneğin yetkisi olmayan kullanıcı).
 * - Bileşen kapandıktan veya yeni bir istek başladıktan sonra gelen yanıt
 *   yok sayılır; böylece eski yanıt yeni veriyi ezmez.
 * - Oturum hatasında ekrana hata basılmaz; AuthContext zaten çıkış yaptırır.
 */
export function useApiResource(path, { enabled = true, pollInterval = 15000 } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  // Her isteğe sıra numarası veriyoruz; sadece en sonuncusu state'i günceller.
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    const requestId = ++requestIdRef.current;
    try {
      const result = await apiFetch(path);
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      if (!err.isAuthError) setError(err.message);
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) setLoading(false);
    }
  }, [path, enabled]);

  useEffect(() => {
    fetchData();

    if (!pollInterval || !enabled) return;

    // Periyodik olarak arka planda yokla (sekme aktifken)
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchData();
      }
    }, pollInterval);

    // Kullanıcı sekmeye geri döndüğünde anında tazele
    const handleVisibility = () => {
      if (!document.hidden) fetchData();
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [fetchData, pollInterval, enabled]);

  return { data, loading, error, refresh: fetchData, setData };
}
