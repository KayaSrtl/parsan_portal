/**
 * JSON metnini güvenle çözer. Değer zaten çözülmüş bir nesne/dizi ise
 * (ornegin JSON govdeli bir istekten geldiyse) olduğu gibi döner.
 * Bozuk JSON'un sunucuyu çökertmesini engeller.
 */
function safeJsonParse(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/** Sonucu her zaman dizi olarak döner (bozuk/eksik veri dahil). */
const parseArray = (value) => {
  const parsed = safeJsonParse(value, []);
  return Array.isArray(parsed) ? parsed : [];
};

module.exports = { safeJsonParse, parseArray };
