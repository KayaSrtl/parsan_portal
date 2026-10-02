import { useCallback, useEffect, useRef, useState } from 'react';
import { checkServerHealth } from '../lib/api';

/**
 * Sunucu erişilebilirliğini açılışta kontrol eder. Sunucu kapalıysa
 * belirli aralıklarla tekrar dener; ayağa kalkınca uyarı kendiliğinden kalkar.
 *
 * status: 'checking' | 'online' | 'offline'
 */
export function useServerStatus({ retryMs = 10000 } = {}) {
  const [status, setStatus] = useState('checking');
  const mountedRef = useRef(true);

  const check = useCallback(async () => {
    const online = await checkServerHealth();
    if (mountedRef.current) setStatus(online ? 'online' : 'offline');
    return online;
  }, []);

  const retry = useCallback(() => {
    setStatus('checking');
    return check();
  }, [check]);

  useEffect(() => {
    mountedRef.current = true;
    // oxlint-disable-next-line react/set-state-in-effect -- dış sistemle (sunucu) senkronizasyon
    check();
    return () => {
      mountedRef.current = false;
    };
  }, [check]);

  // Sadece kapalıyken periyodik olarak yeniden dene.
  useEffect(() => {
    if (status !== 'offline') return undefined;
    const timer = setInterval(check, retryMs);
    return () => clearInterval(timer);
  }, [status, check, retryMs]);

  return { status, retry, check };
}
