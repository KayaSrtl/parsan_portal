/** Formlarda ve filtrelerde ortak kullanilan sabitler. */

export const ROLES = {
  STANDARD: 'standart',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  GUEST: 'misafir',
};

export const ROLE_LABELS = {
  [ROLES.STANDARD]: 'Standart Kullanıcı',
  [ROLES.ADMIN]: 'Yönetici (Admin)',
  [ROLES.SUPER_ADMIN]: 'Süper Admin',
  [ROLES.GUEST]: 'Saha Operatörü',
};

/** Yonetici yetkisi (tum kayitlari gorur, aksiyon tanimlar). */
export const isManager = (user) => user?.role === ROLES.ADMIN || user?.role === ROLES.SUPER_ADMIN;
export const isSuperAdmin = (user) => user?.role === ROLES.SUPER_ADMIN;
export const isGuest = (user) => user?.role === ROLES.GUEST || Boolean(user?.isGuest);

export const DEPARTMENTS = [
  'Dövme',
  'Isıl İşlem',
  'Sevkiyat',
  'Tamamlama',
  'Kalıp',
  'Kalite Kontrol',
];

export const AREAS = [
  'MP2000',
  'MPM3150',
  'MPM6300',
  'MPM6302',
  'LMZ1000',
  'MP2500',
  'EK32',
  'MP4000',
  'DG25H',
  'SMP1250',
];

/** Hata Kartı Türleri */
export const DEFECT_CARD_TYPES = {
  RED: 'Kırmızı Hata Kartı',
  YELLOW: 'Sarı Hata Kartı',
};

export const DEFECT_CARD_TYPE_OPTIONS = [
  { value: DEFECT_CARD_TYPES.RED, label: '🔴 Kırmızı Hata Kartı' },
  { value: DEFECT_CARD_TYPES.YELLOW, label: '🟡 Sarı Hata Kartı' },
];

/** Mevcut Durum (Takip Amaçlı: Açık, Kapalı, Beklemede) */
export const STATUS = {
  OPEN: 'Açık',
  WAITING: 'Beklemede',
  CLOSED: 'Kapalı',
  // Eski kayıtlar için geriye dönük uyumluluk:
  RED: 'Kırmızı',
  YELLOW: 'Sarı',
  GREEN: 'Yeşil',
};

export const STATUS_OPTIONS = [
  { value: STATUS.OPEN, label: '⏳ Açık' },
  { value: STATUS.WAITING, label: '⏸️ Beklemede' },
  { value: STATUS.CLOSED, label: '✅ Kapalı' },
];

export const ACTION_STATUS = {
  OPEN: 'Açık',
  DONE: 'Tamamlandı',
};

export const SAFETY_TYPES = {
  RISK: 'Risk Bildirimi',
  NEAR_MISS: 'Ramak Kala',
};

export const SAFETY_LEVELS = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];

export const SHIFTS = [
  '1. Vardiya (08:00 - 16:00)',
  '2. Vardiya (16:00 - 24:00)',
  '3. Vardiya (24:00 - 08:00)',
];

/** Acilan <option> etiketlerinin koyu temada okunur kalmasi icin ortak sinif. */
export const OPTION_CLASS = 'bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100';
