import { useEffect, useRef } from 'react';
import { registerUnsavedGuard } from '../lib/pendingSave';

/**
 * Kaydedilmemiş değişiklikleri korur:
 *  - uygulama içi sayfa geçişlerinde onay penceresi için unsaved guard kaydeder,
 *  - sekme/tarayıcı kapatılmak istendiğinde beforeunload uyarısı gösterir.
 *
 * ASLA sessiz otomatik kaydetme yapmaz.
 */
export function useUnsavedChanges(isDirty) {
  const dirtyRef = useRef(Boolean(isDirty));

  useEffect(() => {
    dirtyRef.current = Boolean(isDirty);
  }, [isDirty]);

  useEffect(() => registerUnsavedGuard(() => Boolean(dirtyRef.current)), []);

  useEffect(() => {
    if (!isDirty) return undefined;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
