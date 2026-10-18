import { differenceInDays } from 'date-fns';
import { STATUS } from '../lib/constants';

/** Hedef tarihi gecmis ve cozulmemis kayitlar icin gecikme metni doner. */
export const calculateDelay = (hedef_tarih, mevcut_durum) => {
  if (!hedef_tarih || mevcut_durum === STATUS.CLOSED || mevcut_durum === 'Kapalı' || mevcut_durum === STATUS.GREEN) {
    return null;
  }

  const targetDate = new Date(hedef_tarih);
  if (Number.isNaN(targetDate.getTime())) return null;

  const daysLate = differenceInDays(new Date(), targetDate);
  return daysLate > 0 ? `${daysLate} Gün Gecikti` : null;
};

/** Gecikme gun sayisi (metin ayristirmaya gerek kalmasin diye). */
export const getDelayDays = (hedef_tarih, mevcut_durum) => {
  if (!hedef_tarih || mevcut_durum === STATUS.CLOSED || mevcut_durum === 'Kapalı' || mevcut_durum === STATUS.GREEN) {
    return 0;
  }
  const targetDate = new Date(hedef_tarih);
  if (Number.isNaN(targetDate.getTime())) return 0;
  return Math.max(0, differenceInDays(new Date(), targetDate));
};

/**
 * Modern pastel renk stilleri (Durum ve Kart Türü)
 */
export const getStatusColor = (status) => {
  switch (status) {
    case 'Açık':
    case STATUS.RED:
      return 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
    case 'Beklemede':
    case STATUS.YELLOW:
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    case 'Kapalı':
    case STATUS.GREEN:
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    case 'Kırmızı Hata Kartı':
      return 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold';
    case 'Sarı Hata Kartı':
      return 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold';
    default:
      return 'bg-slate-800 text-slate-300 border border-slate-700';
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

/** 'YYYY-MM-DD' veya ISO metni -> 'GG.AA.YYYY' */
export const toDisplayDate = (isoDate) => {
  if (!isoDate) return '';
  const dateOnly = String(isoDate).split('T')[0];
  const parts = dateOnly.split('-');
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateOnly;
};

/** ISO tarih -> <input type="date"> degeri (YYYY-MM-DD) */
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
