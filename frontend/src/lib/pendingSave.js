/**
 * Kaydedilmemiş değişiklik koruyucusu (unsaved changes guard).
 * Sayfa geçişlerinde sessiz otomatik kaydetme yapılmaz; bunun yerine aktif
 * formların kaydedilmemiş değişikliği olup olmadığı sorgulanır ve kullanıcıya
 * onay penceresi gösterilir.
 */

const guards = new Set();

/**
 * Kaydedilmemiş değişiklik kontrol fonksiyonu kaydeder.
 * Dönen temizlik fonksiyonu çağrıldığında kayıt silinir.
 */
export function registerUnsavedGuard(checkFn) {
  if (typeof checkFn !== 'function') return () => {};
  guards.add(checkFn);
  return () => {
    guards.delete(checkFn);
  };
}

/** Kayıtlı koruyuculardan herhangi biri kaydedilmemiş değişiklik bildirirse true döner. */
export function hasUnsavedChanges() {
  for (const checkFn of guards) {
    try {
      if (checkFn()) return true;
    } catch {
      // Hatalı bir guard diğer kontrolleri engellemesin.
    }
  }
  return false;
}

/**
 * Geriye dönük uyumluluk için korunur; otomatik kaydetme YAPMAZ.
 */
export function registerPendingSave() {
  return () => {};
}

/**
 * Geriye dönük uyumluluk için korunur; otomatik kaydetme YAPMAZ.
 */
export async function flushPendingSaves() {
  // Bilinçli olarak boş: sessiz otomatik kaydetme devre dışıdır.
}
