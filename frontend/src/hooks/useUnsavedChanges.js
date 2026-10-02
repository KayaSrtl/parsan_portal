import { useEffect, useRef } from 'react';
import { registerPendingSave } from '../lib/pendingSave';

/**
 * Kaydedilmemiş değişiklikleri korur:
 *  - sekme kapatılmak istendiğinde tarayıcı uyarısı gösterir,
 *  - uygulama içi sayfa geçişlerinde otomatik kaydetmeyi tetikler.
 *
 * `save` her render'da yeniden oluşturulabilir. Güncel sürümü bir ref'te
 * tutuyoruz ki kayıt/temizlik döngüsü her render'da yeniden kurulmasın ve
 * bayat bir closure çağrılmasın.
 */
export function useUnsavedChanges(isDirty, save) {
  const saveRef = useRef(save);
  const dirtyRef = useRef(isDirty);

  useEffect(() => {
    saveRef.current = save;
    dirtyRef.current = isDirty;
  });

  useEffect(
    () =>
      registerPendingSave(async () => {
        if (dirtyRef.current) await saveRef.current?.();
      }),
    []
  );

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
