/**
 * Formda kaydedilmemis degisiklik varken ust menuden baska bir sayfaya
 * gecilirse, gecis oncesi otomatik kayit calistirilir.
 *
 * Eskiden bu is `window.pendingSaveCallback` global degiskeniyle yapiliyordu;
 * ayni anda iki form acildiginda birbirinin kaydini iptal edebiliyordu.
 * Burada kayitlar bir Set'te tutulur, hepsi sirayla calisir.
 */

const handlers = new Set();

/** Bir kayit fonksiyonu kaydeder; donen fonksiyon kaydi siler. */
export function registerPendingSave(handler) {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/** Kayitli tum bekleyen kaydetme islemlerini calistirir. */
export async function flushPendingSaves() {
  for (const handler of handlers) {
    try {
      await handler();
    } catch (err) {
      console.error('Sayfa gecisinde otomatik kayit basarisiz oldu', err);
    }
  }
}
