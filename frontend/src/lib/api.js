/**
 * Tum API cagrilarinin tek giris noktasi.
 * Adres, token ve hata yonetimi burada toplandi; bilesenler fetch detaylariyla
 * ugrasmaz.
 */

export const API_URL = import.meta.env.VITE_API_URL || '';

/** Sunucudan donen hatayi mesaji ve durum koduyla birlikte tasir. */
export class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  /** Oturum dustuyse kullaniciyi giris ekranina yollamamiz gerekir. */
  get isAuthError() {
    return this.status === 401 || this.code === 'TOKEN_EXPIRED' || this.code === 'TOKEN_INVALID';
  }
}

export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

// Oturum dustugunde AuthContext'in haberdar olmasi icin basit bir abonelik.
const authErrorListeners = new Set();
export function onAuthError(listener) {
  authErrorListeners.add(listener);
  return () => authErrorListeners.delete(listener);
}

/** Resim yolunu tam adrese cevirir ('' veya null ise null doner). */
export const fileUrl = (path) => (path ? `${API_URL}${path}` : null);

async function parseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return { error: 'Sunucudan beklenmeyen bir yanıt alındı. Sunucunun çalıştığından emin olun.' };
  }
  try {
    return await response.json();
  } catch {
    return { error: 'Sunucu yanıtı okunamadı.' };
  }
}

/**
 * Yetkili istek gonderir.
 * @param {string} path  '/issues' gibi /api altindaki yol
 * @param {object} options  { method, body, auth }  body FormData ise Content-Type set edilmez
 */
export async function apiFetch(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = {};
  const isFormData = body instanceof FormData;

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.', { status: 0 });
  }

  const data = await parseBody(response);

  if (!response.ok) {
    const error = new ApiError(data?.error || `İstek başarısız (${response.status})`, {
      status: response.status,
      code: data?.code,
    });
    if (error.isAuthError) authErrorListeners.forEach((fn) => fn(error));
    throw error;
  }

  return data;
}

/**
 * Sunucunun ayakta olup olmadığını kontrol eder. Asla hata fırlatmaz.
 * Vite proxy'si veya Cloudflare tüneli, backend kapalıyken HTML hata sayfası
 * döndürdüğü için yalnızca `{ status: 'ok' }` yanıtı başarılı sayılır.
 */
export async function checkServerHealth({ timeoutMs = 5000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const data = await apiFetch('/health', { auth: false, signal: controller.signal });
    return data?.status === 'ok';
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** FormData'yi undefined/null degerleri atlayarak olusturur. */
export function toFormData(values, files = {}) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  Object.entries(files).forEach(([key, file]) => {
    if (file) formData.append(key, file);
  });
  return formData;
}
