import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  UploadCloud,
  CheckCircle2,
  Clock,
  Tag,
  Lock,
  Trash2,
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
  DEFECT_CARD_TYPES,
  OPTION_CLASS,
  STATUS,
  STATUS_OPTIONS,
  isManager,
  isSuperAdmin,
} from '../lib/constants';
import { fileUrl } from '../lib/api';
import { useCatalog } from '../hooks/useCatalog';
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
  bildirilen_alan: issue.bildirilen_alan || '',
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
  const issueCardType = issue?.hata_karti_turu ?? null;

  const isOwner =
    issue?.user_id != null &&
    currentUser?.id != null &&
    Number(issue.user_id) === Number(currentUser.id);
  const canEdit = isNew || isManager(currentUser) || isOwner;

  const { machineNames, departmentNames } = useCatalog();

  const [formData, setFormData] = useState(createEmptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
  }, [issueId, isNew, issueCardType]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  // Yalnızca çıkış onay koruması — asla sessiz otomatik kaydetme yapmaz
  useUnsavedChanges(isDirty && canEdit);

  const notes = parseNotes(formData.gelisme_notlari, issue?.bildiren_kisi, issue?.bildirim_zamani);

  const handleSave = useCallback(
    async (overrideData = null) => {
      if (!canEdit) {
        showToast('Bu kartı düzenleme yetkiniz bulunmamaktadır.', true);
        return false;
      }

      const data = overrideData ? { ...formData, ...overrideData } : { ...formData };

      if (!data.problem_tanimi?.trim()) {
        showToast('Hata: Problem tanımı boş bırakılamaz!', true);
        return false;
      }
      if (isNew && !data.bildirilen_alan) {
        showToast('Hata: Lütfen Alan (Tezgah) seçiniz!', true);
        return false;
      }
      if (isNew && !data.ilgili_bolum) {
        showToast('Hata: Aksiyonun düşeceği İlgili Bölümü seçiniz!', true);
        return false;
      }
      if (isNew && !imageFile) {
        showToast('Hata: Lütfen problemle ilgili bir fotoğraf yükleyin!', true);
        return false;
      }

      // Kullanıcı mevcut kartta not kutusuna yazı yazıp 'Not Ekle'ye basmadan kaydettiyse notu koru
      if (!isNew && newNote.trim()) {
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
          setFormData(createEmptyForm());
          setImageFile(null);
          setPreviewUrl(null);
          setNewNote('');
          showToast(
            `Hata kartı başarıyla kaydedildi! "${payload.ilgili_bolum} Yöneticisi" aksiyon modülüne ve takip paneline eklendi.`
          );
          return true;
        }

        await updateIssue(issue.id, payload, imageFile);
        setIsDirty(false);
        showToast('Hata kartı durumu ve bilgileri güncellendi.');
        return true;
      } catch (err) {
        showToast('Kayıt sırasında hata oluştu: ' + err.message, true);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [
      canEdit,
      formData,
      newNote,
      imageFile,
      isNew,
      issue,
      currentUser,
      addIssue,
      updateIssue,
      showToast,
    ]
  );

  const handleFormChange = (field, value) => {
    if (!canEdit) return;
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

  const handleAddNote = () => {
    if (!canEdit || !newNote.trim()) return;

    const updatedNotes = [
      ...notes,
      {
        text: newNote.trim(),
        sender: currentUser?.name || 'Kullanıcı',
        timestamp: new Date().toISOString(),
      },
    ];
    const serialized = JSON.stringify(updatedNotes);

    setFormData((prev) => ({ ...prev, gelisme_notlari: serialized }));
    setNewNote('');
    setIsDirty(true);
  };

  const handleImageChange = (e) => {
    if (!canEdit) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);

    setImageFile(file);
    setPreviewUrl(objectUrlRef.current);
    setIsDirty(true);
  };

  const requestNavigation = (action) => {
    if (isDirty && canEdit) {
      setPendingAction(() => action);
      return;
    }
    action();
  };

  const handleGoBack = () => {
    requestNavigation(() => onBack?.());
  };

  const handleCreate = async () => {
    await handleSave();
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await deleteIssue(issue.id);
      setIsDirty(false);
      onBack?.();
    } catch (err) {
      showToast('Silme hatası: ' + err.message, true);
    }
  };

  if (!isNew && !issue) return null;

  const isYellow = formData.hata_karti_turu === DEFECT_CARD_TYPES.YELLOW;
  const delayDays = getDelayDays(formData.hedef_tarih, formData.mevcut_durum);
  const delayText = calculateDelay(formData.hedef_tarih, formData.mevcut_durum);

  // Seçili kart türüne göre dinamik renk teması (Sarı -> amber, Kırmızı -> rose)
  const theme = isYellow
    ? {
        cardBorder: 'border-amber-300 dark:border-amber-500/40',
        softBorder: 'border-amber-200/90 dark:border-amber-500/25',
        headerBar: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500',
        tagIcon: 'text-amber-500 dark:text-amber-400',
        badge:
          'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40',
        dot: 'bg-amber-400',
        focusRing: 'focus:ring-amber-400 focus:border-amber-400',
        uploadHover: 'hover:border-amber-400 dark:hover:border-amber-400',
        uploadIcon: 'text-amber-500',
        uploadTextHover: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
        primaryBtn:
          'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-amber-500/20',
        saveBtn: 'bg-amber-500 hover:bg-amber-600 text-slate-950',
      }
    : {
        cardBorder: 'border-rose-300 dark:border-rose-500/40',
        softBorder: 'border-rose-200/90 dark:border-rose-500/25',
        headerBar: 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-600',
        tagIcon: 'text-rose-500 dark:text-rose-400',
        badge:
          'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-500/40',
        dot: 'bg-rose-500',
        focusRing: 'focus:ring-rose-400 focus:border-rose-400',
        uploadHover: 'hover:border-rose-400 dark:hover:border-rose-400',
        uploadIcon: 'text-rose-400',
        uploadTextHover: 'group-hover:text-rose-500 dark:group-hover:text-rose-400',
        primaryBtn:
          'bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600 text-white shadow-rose-500/20',
        saveBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
      };

  const selectClass = `w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 ${theme.focusRing} font-semibold text-slate-800 dark:text-slate-100 outline-none disabled:opacity-65 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/60`;

  return (
    <div className="bg-transparent min-h-screen p-2 sm:p-4 max-w-6xl mx-auto">
      {/* Üst Başlık */}
      <div
        className={`bg-white/95 dark:bg-slate-900/90 border-2 ${theme.cardBorder} rounded-3xl overflow-hidden mb-5 shadow-sm transition-colors`}
      >
        <div className={`h-1.5 w-full ${theme.headerBar} transition-colors`} />
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 w-full md:w-auto">
            <PortalBackButton
              onBack={handleGoBack}
              label={isNew ? 'Portala Dön' : 'Hata Kartları Listesine Dön'}
              className="self-start flex-shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-2 break-words leading-tight">
                <Tag className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 ${theme.tagIcon}`} />
                {isNew ? (
                  <span>Hata Kartı Oluştur</span>
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
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black px-3 py-1.5 rounded-xl border whitespace-nowrap ${theme.badge}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
              {formData.hata_karti_turu}
            </span>

            {!isNew && (
              <div className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                KART #{issue.id}
              </div>
            )}

            {!isNew && isSuperAdmin(currentUser) && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-bold py-1.5 px-3 rounded-xl text-xs transition cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Kaydı Sil
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Salt-Okunur Yetki Uyarı Şeridi */}
      {!canEdit && (
        <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-500/40 text-amber-950 dark:text-amber-200 flex items-start gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm font-semibold leading-relaxed">
            Salt Okunur Görünüm — Bu kart{' '}
            <span className="font-black underline">
              {issue?.bildiren_kisi || 'başka bir kullanıcı'}
            </span>{' '}
            tarafından açılmıştır. Yalnızca kart sahibi veya yöneticiler düzenleyebilir.
          </div>
        </div>
      )}

      {/* Kayıt Başarı Bilgilendirme Kartı */}
      {savedSuccessInfo && (
        <div className="mb-5 p-4 sm:p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-600 shadow-sm animate-fade-in text-slate-800 dark:text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm sm:text-base font-black text-emerald-800 dark:text-emerald-300">
                  Hata Kartı Başarıyla Kaydedildi ve İlgili Bölüm Yöneticisine İletildi!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  <b>{savedSuccessInfo.turu}</b> [{savedSuccessInfo.alan}] veritabanına işlendi.{' '}
                  <b>{savedSuccessInfo.ilgili_bolum} Yöneticisi</b> için Aksiyon Modülüne otomatik
                  görev olarak düştü ve <b>Hata Kartları Takip Bölümü</b> paneline eklendi.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSavedSuccessInfo(null)}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              >
                + Yeni Kart Açmaya Devam Et
              </button>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs cursor-pointer transition-colors"
                >
                  Portala Dön
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ana Form İçeriği */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Sol Sütun: Hata Kartı Türü, Bölüm/Alan Seçimleri, Problem Tanımı, (Mevcut Kartta) Gelişme Notları */}
        <div className="space-y-4 sm:space-y-5 min-w-0">
          {/* 1. Hata Kartı Türü Seçimi (Kırmızı Hata Kartı / Sarı Hata Kartı) */}
          <div
            className={`bg-white/95 dark:bg-slate-900/90 p-4 sm:p-5 rounded-3xl shadow-sm border-2 ${theme.cardBorder} transition-colors`}
          >
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              1. Hata Kartı Türü Seçiniz *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => handleFormChange('hata_karti_turu', DEFECT_CARD_TYPES.RED)}
                className={`p-3 sm:p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-2.5 sm:gap-3 min-w-0 disabled:opacity-65 disabled:cursor-not-allowed ${
                  !isYellow
                    ? 'bg-rose-50 dark:bg-rose-500/20 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-rose-300'
                } ${canEdit ? 'cursor-pointer' : ''}`}
              >
                <span className="w-4 h-4 rounded-full bg-rose-500 flex-shrink-0 shadow-xs" />
                <div className="min-w-0">
                  <div className="font-black text-xs sm:text-sm break-words">
                    Kırmızı Hata Kartı
                  </div>
                  <div className="text-[11px] opacity-75 leading-snug">
                    Bakım / Teknik Destek Gerektiren
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={!canEdit}
                onClick={() => handleFormChange('hata_karti_turu', DEFECT_CARD_TYPES.YELLOW)}
                className={`p-3 sm:p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-2.5 sm:gap-3 min-w-0 disabled:opacity-65 disabled:cursor-not-allowed ${
                  isYellow
                    ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-400 dark:border-amber-500 text-amber-950 dark:text-amber-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
                } ${canEdit ? 'cursor-pointer' : ''}`}
              >
                <span className="w-4 h-4 rounded-full bg-amber-400 flex-shrink-0 shadow-xs" />
                <div className="min-w-0">
                  <div className="font-black text-xs sm:text-sm break-words">Sarı Hata Kartı</div>
                  <div className="text-[11px] opacity-75 leading-snug">
                    Operatör / Bölüm İçi Giderilebilir
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Alan, Bildiren Bölüm, İlgili Bölüm */}
          <div
            className={`bg-white/95 dark:bg-slate-900/90 p-4 sm:p-5 rounded-3xl shadow-sm border ${theme.softBorder} grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 transition-colors`}
          >
            <SelectField
              label="Alan (Tezgah) *"
              value={formData.bildirilen_alan}
              options={machineNames}
              placeholder="Alan Seçin..."
              disabled={!canEdit}
              onChange={(v) => handleFormChange('bildirilen_alan', v)}
              className={selectClass}
            />
            <SelectField
              label="Bildiren Bölüm"
              value={formData.bildiren_bolum}
              options={departmentNames}
              placeholder="Bölüm Seçin..."
              disabled={!canEdit}
              onChange={(v) => handleFormChange('bildiren_bolum', v)}
              className={selectClass}
            />
            <SelectField
              label="İlgili Bölüm (Aksiyon) *"
              value={formData.ilgili_bolum}
              options={departmentNames}
              placeholder="Bölüm Seçin..."
              disabled={!canEdit}
              onChange={(v) => handleFormChange('ilgili_bolum', v)}
              className={selectClass}
            />
          </div>

          {/* 3. Problem Tanımı */}
          <div
            className={`bg-white/95 dark:bg-slate-900/90 p-4 sm:p-5 rounded-3xl shadow-sm border ${theme.softBorder} transition-colors`}
          >
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Problem / Uygunsuzluk Tanımı *
            </label>
            <textarea
              className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 focus:ring-2 ${theme.focusRing} focus:outline-none transition-shadow text-slate-800 dark:text-slate-100 text-sm disabled:opacity-65 disabled:cursor-not-allowed`}
              rows="4"
              disabled={!canEdit}
              placeholder="Tespit edilen uygunsuzluğu veya arızayı detaylı olarak açıklayınız..."
              value={formData.problem_tanimi}
              onChange={(e) => handleFormChange('problem_tanimi', e.target.value)}
            />
          </div>

          {/* 4. Gelişme Notları — Yalnızca mevcut kart detayında (!isNew) gösterilir */}
          {!isNew && (
            <div className="bg-white/95 dark:bg-slate-900/90 p-4 sm:p-5 rounded-3xl shadow-sm border border-violet-200/80 dark:border-slate-800 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Gelişme Notları {notes.length > 0 && `(${notes.length})`}
                </label>
                <span className="text-[10px] sm:text-[11px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 sm:px-2.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-500/20 whitespace-nowrap">
                  Aksiyon Modülü ile Senkronize
                </span>
              </div>

              <div className="flex flex-col bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                {notes.length > 0 && (
                  <div className="max-h-60 overflow-y-auto p-3 space-y-2.5">
                    {notes.map((note, index) => {
                      const isMine = note.sender === currentUser?.name;
                      return (
                        <div
                          key={`${note.timestamp}-${index}`}
                          className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[88%] rounded-2xl px-3.5 py-2 ${
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
                    })}
                  </div>
                )}

                <div
                  className={`p-2 bg-white dark:bg-slate-800 flex gap-2 items-center ${
                    notes.length > 0 ? 'border-t border-slate-200 dark:border-slate-700' : ''
                  }`}
                >
                  <input
                    type="text"
                    disabled={!canEdit}
                    className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder={
                      canEdit
                        ? 'Gelişme notu ekleyin...'
                        : notes.length === 0
                          ? 'Henüz gelişme notu eklenmemiş.'
                          : 'Not ekleme yetkiniz yok'
                    }
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
                    disabled={!canEdit || !newNote.trim()}
                    className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl px-3 sm:px-3.5 py-2 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    Not Ekle
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sağ Sütun: Fotoğraf, Otomatik Termin ve Takip Durumu */}
        <div className="space-y-4 sm:space-y-5 min-w-0">
          <div
            className={`bg-white/95 dark:bg-slate-900/90 p-4 sm:p-5 rounded-3xl shadow-sm border ${theme.softBorder} transition-colors`}
          >
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              Problem Fotoğrafı {isNew && <span className="text-rose-500">*</span>}
            </label>
            <div
              className={`border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl h-48 sm:h-64 flex flex-col items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-800/50 transition-colors ${
                canEdit ? `${theme.uploadHover} cursor-pointer group` : 'cursor-not-allowed opacity-85'
              }`}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Problem" className="object-contain h-full w-full" />
              ) : (
                <div
                  className={`text-slate-400 flex flex-col items-center transition-colors p-4 text-center ${
                    canEdit ? theme.uploadTextHover : ''
                  }`}
                >
                  <UploadCloud className={`w-11 h-11 sm:w-12 sm:h-12 mb-2 ${theme.uploadIcon}`} />
                  <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                    {canEdit ? 'Fotoğraf Yüklemek İçin Tıklayın' : 'Fotoğraf Bulunmuyor'}
                  </span>
                  {canEdit && (
                    <span className="text-[11px] sm:text-xs text-slate-400 mt-1">
                      Sahadaki uygunsuzluğun görselini seçin veya kamerayla çekin
                    </span>
                  )}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                disabled={!canEdit}
                onChange={handleImageChange}
                className={`absolute inset-0 w-full h-full opacity-0 ${
                  canEdit ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              />
              {previewUrl && canEdit && (
                <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white px-3 py-1 rounded-lg text-xs pointer-events-none">
                  Fotoğrafı Değiştir
                </div>
              )}
            </div>
          </div>

          {/* Kayıt & Termin Bilgileri */}
          <div
            className={`bg-white/95 dark:bg-slate-900/90 p-4 sm:p-5 rounded-3xl shadow-sm border ${theme.softBorder} space-y-4 transition-colors`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="min-w-0">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Kaydı Açan Operatör / Personel
                </label>
                <div className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                  {isNew ? currentUser?.name || '-' : issue.bildiren_kisi || '-'}
                </div>
              </div>

              <div className="min-w-0">
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

            {!isNew ? (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-2">
                  Mevcut Durum (Problem Takibi)
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => handleFormChange('mevcut_durum', option.value)}
                      className={`py-2.5 px-2 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs border transition-all disabled:opacity-65 disabled:cursor-not-allowed ${
                        formData.mevcut_durum === option.value
                          ? `${getStatusColor(option.value)} ring-2 ring-offset-1 ring-slate-400`
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      } ${canEdit ? 'cursor-pointer' : ''}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-500/30 rounded-2xl p-3.5 text-xs text-sky-900 dark:text-sky-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-sky-800 dark:text-sky-300">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
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
              className={`w-full justify-center flex items-center py-4 px-5 font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer ${theme.primaryBtn}`}
            >
              <Save className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>{isSaving ? 'Kaydediliyor...' : 'Hata Kartını Kaydet ve Aksiyon Oluştur'}</span>
            </button>
          ) : (
            <div className="bg-white/95 dark:bg-slate-900/90 p-3 sm:p-4 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
              {/* Önceki / Sonraki Kart */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() =>
                    requestNavigation(() => setCurrentIndex(Math.max(0, currentIndex - 1)))
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
                  type="button"
                  onClick={() =>
                    requestNavigation(() =>
                      setCurrentIndex(Math.min(issues.length - 1, currentIndex + 1))
                    )
                  }
                  disabled={currentIndex >= issues.length - 1}
                  className="flex-1 sm:flex-none justify-center flex items-center px-3 sm:px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors min-w-0"
                >
                  <span className="truncate">Sonraki Kart</span>
                  <ChevronRight className="w-4 h-4 ml-1 flex-shrink-0" />
                </button>
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={isSaving}
                  className={`w-full sm:w-auto justify-center flex items-center px-5 py-2.5 font-bold text-xs rounded-xl shadow-xs disabled:opacity-60 cursor-pointer transition-colors whitespace-nowrap ${theme.saveBtn}`}
                >
                  <Save className="w-4 h-4 mr-1.5 flex-shrink-0" />
                  {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {pendingAction && (
        <ConfirmDialog
          title="Kaydedilmemiş Değişiklikler Var"
          message="Yaptığınız değişiklikler kaydedilmedi. Kaydetmeden çıkmak istediğinize emin misiniz?"
          confirmLabel="Kaydetmeden Çık"
          cancelLabel="Vazgeç"
          confirmVariant="warning"
          onCancel={() => setPendingAction(null)}
          onConfirm={() => {
            const action = pendingAction;
            setPendingAction(null);
            setIsDirty(false);
            action();
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Hata Kartını Sil"
          message="Bu hata kartını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
          confirmLabel="Evet, Sil"
          cancelLabel="Vazgeç"
          confirmVariant="danger"
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
        />
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}

function SelectField({ label, value, options, placeholder, disabled, onChange, className }) {
  const safeOptions = useMemo(() => {
    if (!value) return options;
    if (options.includes(value)) return options;
    return [value, ...options];
  }, [options, value]);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/70 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 min-w-0">
      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5 truncate">
        {label}
      </label>
      <select
        className={className}
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled className={OPTION_CLASS}>
          {placeholder}
        </option>
        {safeOptions.map((option) => (
          <option key={option} value={option} className={OPTION_CLASS}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
