/** Formlarda ve filtrelerde ortak kullanilan sabitler. */

export const ROLES = {
  STANDARD: 'standart',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const ROLE_LABELS = {
  [ROLES.STANDARD]: 'Standart Kullanıcı',
  [ROLES.ADMIN]: 'Yönetici (Admin)',
  [ROLES.SUPER_ADMIN]: 'Süper Admin',
};

/** Yonetici yetkisi (tum kayitlari gorur, aksiyon tanimlar). */
export const isManager = (user) => user?.role === ROLES.ADMIN || user?.role === ROLES.SUPER_ADMIN;
export const isSuperAdmin = (user) => user?.role === ROLES.SUPER_ADMIN;

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

export const STATUS = {
  RED: 'Kırmızı',
  YELLOW: 'Sarı',
  GREEN: 'Yeşil',
};

export const STATUS_OPTIONS = [
  { value: STATUS.RED, label: '🔴 Kırmızı (Acil)' },
  { value: STATUS.YELLOW, label: '🟡 Sarı (Sürüyor)' },
  { value: STATUS.GREEN, label: '🟢 Yeşil (Çözüldü)' },
];

export const ACTION_STATUS = {
  OPEN: 'Açık',
  DONE: 'Tamamlandı',
};

/** Acilan <option> etiketlerinin koyu temada okunur kalmasi icin ortak sinif. */
export const OPTION_CLASS = 'bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100';
