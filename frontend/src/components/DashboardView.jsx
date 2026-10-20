import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  UploadCloud,
  CheckCircle2,
  Clock,
  Tag,
} from 'lucide-react';

import {
  getStatusColor,
  calculateDelay,
  getDelayDays,
  formatDateTime,
  parseNotes,
  toDisplayDate,
  toInputDate,
} from '../utils/helpers';
import {
  AREAS,
  DEPARTMENTS,
  DEFECT_CARD_TYPES,
  OPTION_CLASS,
  STATUS,
  STATUS_OPTIONS,
  isSuperAdmin,
} from '../lib/constants';
import { fileUrl } from '../lib/api';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from './ui/ConfirmDialog';
import PortalBackButton from './ui/PortalBackButton';
import Toast from './ui/Toast';

const getOneWeekLaterDate = () => {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
};

/** Boş form her açılışta yeniden üretilir; böylece termin tarihi bayatlamaz. */
const createEmptyForm = () => ({
  problem_tanimi: '',
  planlanan_aksiyon: '',
  gelisme_notlari: '',
  hata_karti_turu: DEFECT_CARD_TYPES.RED,
  mevcut_durum: STATUS.OPEN,
  hedef_tarih: getOneWeekLaterDate(),
  bildirilen_alan: '',
  bildiren_bolum: '',
  ilgili_bolum: '',
});

const normalizeStatus = (raw) => {
  if (raw === 'Yeşil' || raw === STATUS.CLOSED) return STATUS.CLOSED;
  if (raw === STATUS.WAITING) return STATUS.WAITING;
  return STATUS.OPEN;
};

const issueToForm = (issue) => ({
  problem_tanimi: issue.problem_tanimi || '',
  planlanan_aksiyon: issue.planlanan_aksiyon || '',
  gelisme_notlari: issue.gelisme_notlari || '',
  hata_karti_turu:
    issue.hata_karti_turu ||
    (issue.mevcut_durum === 'Sarı' ? DEFECT_CARD_TYPES.YELLOW : DEFECT_CARD_TYPES.RED),
  mevcut_durum: normalizeStatus(issue.mevcut_durum),
  hedef_tarih: toInputDate(issue.hedef_tarih) || getOneWeekLaterDate(),
  bildirilen_alan: (issue.bildirilen_alan || '').toUpperCase(),
  bildiren_bolum: issue.bildiren_bolum || '',
  ilgili_bolum: issue.ilgili_bolum || '',
});

export default function DashboardView({
  issues,
  currentIndex,
  setCurrentIndex,
  onBack,
  updateIssue,
  addIssue,
  deleteIssue,
  currentUser,
  entryOnly = false,
}) {
  const isNew = currentIndex === -1 || entryOnly;
  const issue = isNew ? null : issues[currentIndex];
  const issueId = issue?.id ?? null;

  const [formData, setFormData] = useState(createEmptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savedSuccessInfo, setSavedSuccessInfo] = useState(null);

  const { toast, showToast, hideToast } = useToast();
  const objectUrlRef = useRef(null);

  useEffect(() => {
    const source = !isNew && issueId ? issues.find((i) => i.id === issueId) : null;
    setFormData(source ? issueToForm(source) : createEmptyForm());
    setPreviewUrl(source ? fileUrl(source.fotograf_url) : null);
    setImageFile(null);
    setNewNote('');
    setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId, isNew]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  const notes = parseNotes(formData.gelisme_notlari, issue?.bildiren_kisi, issue?.bildirim_zamani);

  const handleSave = useCallback(
    async (silent = false, overrideData = null) => {
      const data = overrideData ? { ...formData, ...overrideData } : { ...formData };

      if (!data.problem_tanimi?.trim()) {
        if (!silent) showToast('Hata: Problem tanımı boş bırakılamaz!', true);
        return false;
      }
      if (isNew && !data.bildirilen_alan) {
        if (!silent) showToast('Hata: Lütfen Alan (Tezgah) seçiniz!', true);
        return false;
      }
      if (isNew && !data.ilgili_bolum) {
        if (!silent) showToast('Hata: Aksiyonun düşeceği İlgili Bölümü seçiniz!', true);
        return false;
      }
      if (isNew && !imageFile) {
        if (!silent) showToast('Hata: Lütfen problemle ilgili bir fotoğraf yükleyin!', true);
        return false;
      }

      // Kullanıcı not kutusuna yazı yazıp '+' tuşuna basmadan kaydettiyse notu kaybetme
      if (newNote.trim()) {
        const mergedNotes = [
          ...parseNotes(data.gelisme_notlari, currentUser?.name, new Date().toISOString()),
          {
            text: newNote.trim(),
            sender: currentUser?.name || 'Saha Operatörü',
            timestamp: new Date().toISOString(),
          },
        ];
        data.gelisme_notlari = JSON.stringify(mergedNotes);
        setNewNote('');
      }

      setIsSaving(true);
      try {
        const payload = { ...data };
        // Yeni hata kartında termin sabit 1 hafta (7 gün)
        const targetIso = isNew
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : payload.hedef_tarih
            ? new Date(payload.hedef_tarih).toISOString()
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        payload.hedef_tarih = targetIso;

        if (isNew) {
          payload.mevcut_durum = STATUS.OPEN;
          await addIssue(payload, imageFile);
          setIsDirty(false);
          setSavedSuccessInfo({
            alan: payload.bildirilen_alan,
            ilgili_bolum: payload.ilgili_bolum,
            turu: payload.hata_karti_turu,
            tanim: payload.problem_tanimi,
          });
          // Formu yeni kayıt için temizle
          setFormData(createEmptyForm());
          setImageFile(null);
          setPreviewUrl(null);
          setNewNote('');
          if (!silent) {
            showToast(
              `Hata kartı başarıyla kaydedildi! "${payload.ilgili_bolum} Yöneticisi" aksiyon modülüne ve takip paneline eklendi.`
            );
          }
          return true;
        }

        await updateIssue(issue.id, payload, imageFile);
        setIsDirty(false);
        if (!silent) showToast('Hata kartı durumu ve bilgileri güncellendi.');
        return true;
      } catch (err) {
        showToast('Kayıt sırasında hata oluştu: ' + err.message, true);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [formData, newNote, imageFile, isNew, issue, currentUser, addIssue, updateIssue, showToast]
  );

  useUnsavedChanges(isDirty && !isNew, () => handleSave(true));

  const handleFormChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      if (!isNew && field === 'mevcut_durum' && prev.mevcut_durum && value !== prev.mevcut_durum) {
        const currentNotes = parseNotes(
          prev.gelisme_notlari,
          issue?.bildiren_kisi,
          issue?.bildirim_zamani
        );
        currentNotes.push({
          text: `Mevcut durum "${prev.mevcut_durum}" ➔ "${value}" olarak güncellendi.`,
          sender: currentUser?.name || 'Sistem',
          timestamp: new Date().toISOString(),
        });
        updated.gelisme_notlari = JSON.stringify(currentNotes);
      }

      return updated;
    });
    setIsDirty(true);
  };

  const handleBlur = () => {
    if (isDirty && !isNew) handleSave(true);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const updatedNotes = [
      ...notes,
      { text: newNote.trim(), sender: currentUser.name, timestamp: new Date().toISOString() },
    ];
    const serialized = JSON.stringify(updatedNotes);

    setFormData((prev) => ({ ...prev, gelisme_notlari: serialized }));
    setNewNote('');

    if (isNew) {
      setIsDirty(true);
    } else {
      await handleSave(true, { gelisme_notlari: serialized });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);

    setImageFile(file);
    setPreviewUrl(objectUrlRef.current);
    setIsDirty(true);
  };

  const saveThen = async (action, failMessage) => {
    if (!isDirty || isNew) {
      action();
      return;
    }
    if (await handleSave(true)) action();
    else showToast(failMessage, true);
  };

  const handleGoBack = () => {
    if (isNew) {
      if (isDirty) setShowExitConfirm(true);
      else onBack();
      return;
    }
    saveThen(onBack, 'Kayıt edilemediği için çıkılamadı. Lütfen hataları giderin.');
  };

  const handleCreate = async () => {
    // Kayıt başarılıysa form zaten sıfırlanır ve başarı paneli gösterilir.
    // Kullanıcı isterse "Portala Dön" veya "+ Yeni Kart Açmaya Devam Et" butonunu kullanır.
    await handleSave(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Bu kaydı kalıcı olarak silmek istediğinize emin misiniz?')) return;
    try {
      await deleteIssue(issue.id);
      onBack();
    } catch (err) {
      showToast('Silme hatası: ' + err.message, true);
    }
  };

  if (!isNew && !issue) return null;

  const delayDays = getDelayDays(formData.hedef_tarih, formData.mevcut_durum);
  const delayText = calculateDelay(formData.hedef_tarih, formData.mevcut_durum);

  const selectClass =
    'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 focus:ring-2 focus:ring-rose-400 font-semibold text-slate-800 dark:text-slate-100 outline-none';

  return (
    <div className="bg-transparent min-h-screen p-2 md:p-4 max-w-6xl mx-auto">
      {/* Üst Başlık */}
      <div className="bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-6 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 w-full md:w-auto">
          <PortalBackButton
            onBack={handleGoBack}
            label={isNew ? 'Portala Dön' : 'Hata Kartları Listesine Dön'}
            className="self-start flex-shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-2 break-words leading-tight">
              {isNew ? (
                <>
                  <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 flex-shrink-0" />
                  <span>Hata Kartı Açma Modülü (Veri Girişi)</span>
                </>
              ) : (
                <span className="break-words">
                  Hata Kartı Detayı — Alan: {issue.bildirilen_alan?.toUpperCase() || '-'}
                </span>
              )}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {isNew
                ? 'Açılan hata kartı 1 hafta terminle ilgili bölüm yöneticisine otomatik aksiyon olarak düşer.'
                : `Bildiren: ${issue.bildiren_kisi || '-'} • Açılış: ${formatDateTime(issue.bildirim_zamani)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end">
          {isNew && (
            <button
              onClick={handleCreate}
              disabled={isSaving}
              className="flex-1 sm:flex-none justify-center bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold py-2.5 px-4 sm:px-5 rounded-xl text-xs sm:text-sm transition shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <Save className="w-4 h-4 flex-shrink-0" />
              {isSaving ? 'Kaydediliyor...' : 'Hata Kartını Oluştur'}
            </button>
          )}
          {!isNew && isSuperAdmin(currentUser) && (
            <button
              onClick={handleDelete}
              className="bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-bold py-2 px-3.5 rounded-xl text-xs sm:text-sm transition cursor-pointer whitespace-nowrap"
            >
              Kaydı Sil
            </button>
          )}
          <div className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-nowrap">
            {isNew ? 'YENİ KART' : `KART #${issue.id}`}
          </div>
        </div>
      </div>

      {/* Kayıt Başarı Bilgilendirme Kartı */}
      {savedSuccessInfo && (
        <div className="mb-6 p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-600 shadow-sm animate-fade-in text-slate-800 dark:text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-black text-emerald-800 dark:text-emerald-300">
                  Hata Kartı Başarıyla Kaydedildi ve İlgili Bölüm Yöneticisine İletildi!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  <b>{savedSuccessInfo.turu}</b> [{savedSuccessInfo.alan}] veritabanına işlendi. <b>{savedSuccessInfo.ilgili_bolum} Yöneticisi</b> için Aksiyon Modülüne otomatik görev olarak düştü ve <b>Hata Kartları Takip Bölümü</b> paneline eklendi.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSavedSuccessInfo(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              >
                + Yeni Kart Açmaya Devam Et
              </button>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs cursor-pointer transition-colors"
                >
                  Portala Dön
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ana Form İçeriği */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Sütun: Hata Kartı Türü, Bölüm/Alan Seçimleri, Problem Tanımı, Gelişme Notları */}
        <div className="space-y-5">
          {/* 1. Hata Kartı Türü Seçimi (Kırmızı Hata Kartı / Sarı Hata Kartı) */}
          <div className="bg-white/95 dark:bg-slate-900/90 p-5 rounded-3xl shadow-sm border border-rose-200/80 dark:border-slate-800">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              1. Hata Kartı Türü Seçiniz *
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => handleFormChange('hata_karti_turu', DEFECT_CARD_TYPES.RED)}
                className={`p-3 sm:p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 sm:gap-3 min-w-0 ${
                  formData.hata_karti_turu === DEFECT_CARD_TYPES.RED
                    ? 'bg-rose-50 dark:bg-rose-500/20 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-rose-300'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-rose-500 flex-shrink-0 shadow-xs" />
                <div className="min-w-0">
                  <div className="font-black text-xs sm:text-sm break-words">Kırmızı Hata Kartı</div>
                  <div className="text-[10px] opacity-75 leading-snug">
                    Bakım / Teknik Destek Gerektiren
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleFormChange('hata_karti_turu', DEFECT_CARD_TYPES.YELLOW)}
                className={`p-3 sm:p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 sm:gap-3 min-w-0 ${
                  formData.hata_karti_turu === DEFECT_CARD_TYPES.YELLOW
                    ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-400 dark:border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-amber-400 flex-shrink-0 shadow-xs" />
                <div className="min-w-0">
                  <div className="font-black text-xs sm:text-sm break-words">Sarı Hata Kartı</div>
                  <div className="text-[10px] opacity-75 leading-snug">
                    Operatör / Bölüm İçi Giderilebilir
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Alan, Bildiren Bölüm, İlgili Bölüm */}
          <div className="bg-white/95 dark:bg-slate-900/90 p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField
              label="Alan (Tezgah) *"
              value={formData.bildirilen_alan}
              options={AREAS}
              placeholder="Alan Seçin..."
              onChange={(v) => handleFormChange('bildirilen_alan', v)}
              onBlur={handleBlur}
              className={selectClass}
            />
            <SelectField
              label="Bildiren Bölüm"
              value={formData.bildiren_bolum}
              options={DEPARTMENTS}
              placeholder="Bölüm Seçin..."
              onChange={(v) => handleFormChange('bildiren_bolum', v)}
              onBlur={handleBlur}
              className={selectClass}
            />
            <SelectField
              label="İlgili Bölüm (Aksiyon) *"
              value={formData.ilgili_bolum}
              options={DEPARTMENTS}
              placeholder="Bölüm Seçin..."
              onChange={(v) => handleFormChange('ilgili_bolum', v)}
              onBlur={handleBlur}
              className={selectClass}
            />
          </div>

          {/* 3. Problem Tanımı */}
          <div className="bg-white/95 dark:bg-slate-900/90 p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Problem / Uygunsuzluk Tanımı *
            </label>
            <textarea
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 focus:ring-2 focus:ring-rose-400 focus:outline-none transition-shadow text-slate-800 dark:text-slate-100 text-sm"
              rows="4"
              placeholder="Tespit edilen uygunsuzluğu veya arızayı detaylı olarak açıklayınız..."
              value={formData.problem_tanimi}
              onBlur={handleBlur}
              onChange={(e) => handleFormChange('problem_tanimi', e.target.value)}
            />
          </div>

          {/* 4. Gelişme Notları (Aksiyon modülünde de görünür) */}
          <div className="bg-white/95 dark:bg-slate-900/90 p-4 sm:p-5 rounded-3xl shadow-sm border border-violet-200/80 dark:border-slate-800 flex flex-col h-[320px] sm:h-[290px]">
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Gelişme Notları
              </label>
              <span className="text-[10px] sm:text-[11px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 sm:px-2.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-500/20 whitespace-nowrap">
                Aksiyon Modülü ile Senkronize
              </span>
            </div>

            <div className="flex flex-col flex-1 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {notes.length === 0 ? (
                  <div className="text-center text-slate-400 dark:text-slate-500 text-xs mt-8 italic">
                    Henüz gelişme notu eklenmemiş. Buraya yazılan notlar Aksiyon Modülünde de görünür.
                  </div>
                ) : (
                  notes.map((note, index) => {
                    const isMine = note.sender === currentUser.name;
                    return (
                      <div
                        key={`${note.timestamp}-${index}`}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${
                            isMine
                              ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-950 dark:text-violet-100 rounded-tr-xs border border-violet-200 dark:border-violet-700'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-200 dark:border-slate-700 shadow-2xs'
                          }`}
                        >
                          <div className="text-[10px] font-bold opacity-65 mb-0.5">
                            {note.sender} • {formatDateTime(note.timestamp)}
                          </div>
                          <div className="text-xs sm:text-sm break-words whitespace-pre-wrap leading-tight">
                            {note.text}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-2 items-center">
                <input
                  type="text"
                  className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder="Gelişme notu yazın..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl px-3 sm:px-3.5 py-2 text-xs font-bold transition-colors disabled:opacity-50 flex-shrink-0 cursor-pointer whitespace-nowrap"
                >
                  Not Ekle
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Sütun: Fotoğraf, Otomatik Termin ve Takip Durumu */}
        <div className="space-y-5">
          <div className="bg-white/95 dark:bg-slate-900/90 p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Problem Fotoğrafı {isNew && <span className="text-rose-500">*</span>}
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl h-52 sm:h-64 flex flex-col items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-800/50 hover:border-rose-400 dark:hover:border-rose-400 cursor-pointer group transition-colors">
              {previewUrl ? (
                <img src={previewUrl} alt="Problem" className="object-contain h-full w-full" />
              ) : (
                <div className="text-slate-400 flex flex-col items-center group-hover:text-rose-500 transition-colors p-4 text-center">
                  <UploadCloud className="w-12 h-12 mb-2 text-rose-400" />
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                    Fotoğraf Yüklemek İçin Tıklayın
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    Sahadaki uygunsuzluğun görselini seçin veya kamerayla çekin
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {previewUrl && (
                <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white px-3 py-1 rounded-lg text-xs pointer-events-none">
                  Fotoğrafı Değiştir
                </div>
              )}
            </div>
          </div>

          {/* Kayıt & Termin Bilgileri */}
          <div className="bg-white/95 dark:bg-slate-900/90 p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Kaydı Açan Operatör / Personel
                </label>
                <div className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                  {isNew ? currentUser.name : issue.bildiren_kisi || '-'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Hata Kartı Termini (1 Hafta)
                </label>
                <div className="w-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10 rounded-xl p-2.5 font-bold text-emerald-800 dark:text-emerald-300 text-sm flex flex-wrap items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{toDisplayDate(formData.hedef_tarih)}</span>
                  </span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-200/70 dark:bg-emerald-500/20 whitespace-nowrap">
                    7 Gün Termin
                  </span>
                </div>
              </div>
            </div>

            {/* Mevcut Durum yalnızca mevcut kayıt takip/detay ekranında düzenlenir;
                yeni açılan kart otomatik olarak 'Açık' başlar ve Aksiyon Modülüne düşer. */}
            {!isNew ? (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-2">
                  Mevcut Durum (Problem Takibi)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleFormChange('mevcut_durum', option.value)}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                        formData.mevcut_durum === option.value
                          ? `${getStatusColor(option.value)} ring-2 ring-offset-1 ring-slate-400`
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-500/30 rounded-2xl p-3.5 text-xs text-sky-900 dark:text-sky-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-sky-800 dark:text-sky-300">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  Otomatik Aksiyon & Takip Akışı
                </div>
                <p className="opacity-90 leading-relaxed">
                  Bu hata kartı kaydedildiğinde otomatik olarak <b>Açık</b> durumuyla{' '}
                  <b>Hata Kartları Takip</b> bölümüne ve <b>1 hafta terminle</b> seçtiğiniz ilgili
                  bölüm yöneticisinin <b>Aksiyon Modülüne</b> düşer.
                </p>
              </div>
            )}
          </div>

          {!isNew && delayText && (
            <div className="bg-rose-50 dark:bg-rose-950/60 border-l-4 border-rose-500 text-rose-800 dark:text-rose-200 p-4 rounded-2xl shadow-xs flex items-center">
              <AlertCircle className="w-7 h-7 mr-3 text-rose-600 flex-shrink-0" />
              <div>
                <p className="font-black uppercase text-xs tracking-wider">Gecikme Uyarısı</p>
                <p className="font-bold text-sm sm:text-base">
                  Bu hata kartı hedef termin tarihinden{' '}
                  <span className="text-lg underline font-black">{delayDays}</span> gün gecikmiştir!
                </p>
              </div>
            </div>
          )}

          {/* Alt Kayıt / Navigasyon */}
          {isNew ? (
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSaving}
              className="w-full justify-center flex items-center py-4 px-6 bg-gradient-to-r from-rose-500 via-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSaving ? 'Kaydediliyor...' : 'Hata Kartını Kaydet ve Aksiyon Oluştur'}
            </button>
          ) : (
            <div className="bg-white/95 dark:bg-slate-900/90 p-3 sm:p-4 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
              {/* Önceki / Sonraki Kart */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() =>
                    saveThen(
                      () => setCurrentIndex(Math.max(0, currentIndex - 1)),
                      'Kayıt edilemediği için geçiş yapılamadı.'
                    )
                  }
                  disabled={currentIndex <= 0}
                  className="flex-1 sm:flex-none justify-center flex items-center px-3 sm:px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors min-w-0"
                >
                  <ChevronLeft className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="truncate">Önceki Kart</span>
                </button>

                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap px-1">
                  {currentIndex + 1} / {issues.length}
                </span>

                <button
                  onClick={() =>
                    saveThen(
                      () => setCurrentIndex(Math.min(issues.length - 1, currentIndex + 1)),
                      'Kayıt edilemediği için geçiş yapılamadı.'
                    )
                  }
                  disabled={currentIndex >= issues.length - 1}
                  className="flex-1 sm:flex-none justify-center flex items-center px-3 sm:px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors min-w-0"
                >
                  <span className="truncate">Sonraki Kart</span>
                  <ChevronRight className="w-4 h-4 ml-1 flex-shrink-0" />
                </button>
              </div>

              <button
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="w-full sm:w-auto justify-center flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-60 cursor-pointer transition-colors whitespace-nowrap"
              >
                <Save className="w-4 h-4 mr-1.5 flex-shrink-0" />
                {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showExitConfirm && (
        <ConfirmDialog
          title="Çıkmak İstediğinize Emin Misiniz?"
          message="Yeni hata kartını kaydetmeden çıkarsanız girdiğiniz veriler kaybolacaktır."
          confirmLabel="Evet, Çıkış Yap"
          onCancel={() => setShowExitConfirm(false)}
          onConfirm={() => {
            setShowExitConfirm(false);
            onBack();
          }}
        />
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}

function SelectField({ label, value, options, placeholder, onChange, onBlur, className }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/70 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700">
      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">
        {label}
      </label>
      <select
        className={className}
        value={value || ''}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled className={OPTION_CLASS}>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option} className={OPTION_CLASS}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
