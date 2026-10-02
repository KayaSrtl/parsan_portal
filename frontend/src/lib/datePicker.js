/**
 * Tarih secici acar. showPicker() Firefox/Safari'de desteklenmeyebilir;
 * o durumda alani odaklayip kullanicinin elle yazmasina izin veririz.
 */
export function openDatePicker(input) {
  if (!input) return;
  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
  } catch {
    // Kullanici etkilesimi disinda cagrildiysa veya tarayici desteklemiyorsa
  }
  input.focus();
  input.click();
}
