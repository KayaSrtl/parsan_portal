import { differenceInDays } from 'date-fns';
import { STATUS } from '../lib/constants';

/** Hedef tarihi gecmis ve cozulmemis kayitlar icin gecikme metni doner. */
export const calculateDelay = (hedef_tarih, mevcut_durum) => {
  if (!hedef_tarih || mevcut_durum === STATUS.GREEN) return null;

  const targetDate = new Date(hedef_tarih);
  if (Number.isNaN(targetDate.getTime())) return null;

  const daysLate = differenceInDays(new Date(), targetDate);
  return daysLate > 0 ? `${daysLate} Gün Gecikti` : null;
};

/** Gecikme gun sayisi (metin ayristirmaya gerek kalmasin diye). */
export const getDelayDays = (hedef_tarih, mevcut_durum) => {
  if (!hedef_tarih || mevcut_durum === STATUS.GREEN) return 0;
  const targetDate = new Date(hedef_tarih);
  if (Number.isNaN(targetDate.getTime())) return 0;
  return Math.max(0, differenceInDays(new Date(), targetDate));
};

export const getStatusColor = (status) => {
  switch (status) {
    case STATUS.RED:
      return 'bg-red-500 text-white';
    case STATUS.YELLOW:
      return 'bg-yellow-400 text-gray-900';
    case STATUS.GREEN:
      return 'bg-green-500 text-white';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('tr-TR');
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

/** 'YYYY-MM-DD' -> 'GG.AA.YYYY' */
export const toDisplayDate = (isoDate) => (isoDate ? isoDate.split('-').reverse().join('.') : '');

/** ISO tarih -> <input type="date"> degeri */
export const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

/**
 * Gelisme notlari alani gecmiste duz metin, bugun JSON dizisi olarak tutuluyor.
 * Her iki formati da tek bir dizi haline getirir.
 */
export const parseNotes = (raw, fallbackSender = 'Bilinmeyen', fallbackDate = null) => {
  if (!raw) return [];

  const asLegacyNote = () => [
    { text: String(raw), sender: fallbackSender, timestamp: fallbackDate || new Date().toISOString() },
  ];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : asLegacyNote();
  } catch {
    return asLegacyNote();
  }
};
