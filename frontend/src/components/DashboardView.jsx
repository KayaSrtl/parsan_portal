import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Save, UploadCloud } from 'lucide-react';

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
  OPTION_CLASS,
  STATUS,
  STATUS_OPTIONS,
  isSuperAdmin,
} from '../lib/constants';
import { fileUrl } from '../lib/api';
import { openDatePicker } from '../lib/datePicker';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from './ui/ConfirmDialog';
import Toast from './ui/Toast';

const EMPTY_FORM = {
  problem_tanimi: '',
  planlanan_aksiyon: '',
  gelisme_notlari: '',
  mevcut_durum: STATUS.RED,
  hedef_tarih: '',
  bildirilen_alan: '',
  bildiren_bolum: '',
  ilgili_bolum: '',
};

const issueToForm = (issue) => ({
  problem_tanimi: issue.problem_tanimi || '',
  planlanan_aksiyon: issue.planlanan_aksiyon || '',
  gelisme_notlari: issue.gelisme_notlari || '',
  mevcut_durum: issue.mevcut_durum || STATUS.RED,
  hedef_tarih: toInputDate(issue.hedef_tarih),
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
}) {
  const isNew = currentIndex === -1;
  const issue = isNew ? null : issues[currentIndex];
  const issueId = issue?.id ?? null;

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [newNote, setNewNote] = useState('');

  const { toast, showToast, hideToast } = useToast();
  const datePickerRef = useRef(null);
  const objectUrlRef = useRef(null);

  // Formu yalnızca gösterilen KAYIT değiştiğinde sıfırla. Listeyi tazelemek
  // `issue` nesnesinin kimliğini değiştirir; kimliğe bağlasaydık kaydetme
  // sırasında yazılan karakterler silinirdi.
  useEffect(() => {
    const source = issueId ? issues.find((i) => i.id === issueId) : null;
    setFormData(source ? issueToForm(source) : EMPTY_FORM);
    setPreviewUrl(source ? fileUrl(source.fotograf_url) : null);
    setImageFile(null);
    setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kasıtlı: yalnızca kayıt değişince sıfırla
  }, [issueId, isNew]);

  // createObjectURL ile üretilen adresleri serbest bırak (bellek sızıntısı).
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  const notes = parseNotes(formData.gelisme_notlari, issue?.bildiren_kisi, issue?.bildirim_zamani);

  /**
   * @param {boolean} silent  true ise doğrulama uyarıları gösterilmez (otomatik kayıt)
   * @param {object|null} overrideData  kaydetmeden önce birleştirilecek alanlar
   */
  const handleSave = useCallback(
    async (silent = false, overrideData = null) => {
      const data = overrideData ? { ...formData, ...overrideData } : formData;

      if (!data.problem_tanimi?.trim()) {
        if (!silent) showToast('Hata: Problem tanımı boş bırakılamaz!', true);
        return false;
      }
      // Fotoğraf yalnızca YENİ kayıt açarken zorunlu. Eski kayıtlarda fotoğraf
      // olmayabilir; zorunlu tutulursa o kayıtlar hiç düzenlenemez hale gelir.
      if (isNew && !imageFile) {
        if (!silent) showToast('Hata: Lütfen problemle ilgili bir fotoğraf yükleyin!', true);
        return false;
      }

      setIsSaving(true);
      try {
        const payload = { ...data };
        if (payload.hedef_tarih) payload.hedef_tarih = new Date(payload.hedef_tarih).toISOString();

        if (isNew) {
          await addIssue(payload, imageFile);
          setIsDirty(false);
          if (!silent) showToast('Yeni kayıt başarıyla eklendi!');
          return true;
        }

        await updateIssue(issue.id, payload, imageFile);
        setIsDirty(false);
        if (!silent) showToast('Başarıyla güncellendi! Eski versiyon geçmişe kaydedildi.');
        return true;
      } catch (err) {
        // Otomatik kayıt da olsa hatayı göster; sessizce veri kaybetmek en kötüsü.
        showToast('Kayıt sırasında hata oluştu: ' + err.message, true);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [formData, imageFile, isNew, issue, addIssue, updateIssue, showToast]
  );

  // Menüden başka sayfaya geçilirse kaydedilmemiş değişiklikleri kaydet.
  useUnsavedChanges(isDirty && !isNew, () => handleSave(true));

  const handleFormChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Durum değişikliğini otomatik olarak gelişme notlarına düş.
      if (!isNew && field === 'mevcut_durum' && prev.mevcut_durum && value !== prev.mevcut_durum) {
        const currentNotes = parseNotes(
          prev.gelisme_notlari,
          issue?.bildiren_kisi,
          issue?.bildirim_zamani
        );
        currentNotes.push({
          text: `Durum "${prev.mevcut_durum}" ➔ "${value}" olarak güncellendi.`,
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

  /** Kaydedilmemiş değişiklik varsa önce kaydeder, sonra `action` çalışır. */
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
    if (await handleSave(false)) setTimeout(onBack, 1200);
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
    'w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-500 rounded p-2 focus:ring-2 focus:ring-blue-500 font-semibold text-gray-800 dark:text-gray-100 outline-none';

  return (
    <div className="bg-transparent min-h-screen p-2 md:p-6 flex flex-col xl:flex-row gap-6">
      {/* Sol Menü (Diğer Problemler) */}
      {!isNew && issues.length > 0 && (
        <aside className="hidden xl:flex flex-col w-80 bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700 h-[calc(100vh-120px)] sticky top-6 overflow-hidden flex-shrink-0">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                {issues.length}
              </span>
              {issue.mevcut_durum === STATUS.GREEN ? 'Çözülmüş Problemler' : 'Açık Problemler'}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {issues.map((item, idx) => (
              <button
                key={item.id}
                onClick={() =>
                  idx !== currentIndex &&
                  saveThen(() => setCurrentIndex(idx), 'Kayıt edilemediği için geçiş yapılamadı.')
                }
                className={`w-full text-left p-3 rounded-lg transition-colors border-2 ${
                  idx === currentIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-black text-gray-500 dark:text-gray-400 tracking-wider">
                    ID: {item.id}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      item.mevcut_durum === STATUS.RED
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                        : item.mevcut_durum === STATUS.YELLOW
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                    }`}
                  >
                    {item.mevcut_durum}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug">
                  {item.problem_tanimi}
                </p>
                <div className="text-[10px] text-gray-400 mt-2 font-medium">
                  {item.bildirilen_alan?.toUpperCase()}
                </div>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Ana Form İçeriği */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <button
            onClick={handleGoBack}
            className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold transition-colors self-start md:self-auto"
          >
            <ArrowLeft className="w-5 h-5 mr-1" /> Listeye Dön
          </button>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 text-center">
            Alan: {isNew ? 'YENİ KAYIT' : issue.bildirilen_alan?.toUpperCase() || '-'}
          </h2>
          <div className="flex items-center gap-2 self-end md:self-auto">
            {isNew && (
              <button
                onClick={handleCreate}
                disabled={isSaving}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-4 rounded text-sm transition shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            )}
            {!isNew && isSuperAdmin(currentUser) && (
              <button
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm transition shadow-sm"
              >
                Sil
              </button>
            )}
            <div className="text-sm text-gray-500 dark:text-gray-400 font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-transparent dark:border-slate-700">
              ID: {isNew ? 'YENİ' : issue.id}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border-l-4 border-blue-500">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide">
                Problem Tanımı
              </label>
              <textarea
                className="w-full bg-transparent border border-gray-200 dark:border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow text-gray-800 dark:text-gray-100"
                rows="4"
                value={formData.problem_tanimi}
                onBlur={handleBlur}
                onChange={(e) => handleFormChange('problem_tanimi', e.target.value)}
              />
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border-l-4 border-indigo-500">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide">
                Planlanan Aksiyon
              </label>
              <textarea
                className="w-full bg-transparent border border-gray-200 dark:border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow text-gray-800 dark:text-gray-100"
                rows="4"
                value={formData.planlanan_aksiyon}
                onBlur={handleBlur}
                onChange={(e) => handleFormChange('planlanan_aksiyon', e.target.value)}
                placeholder="Bu problem için planlanan bir aksiyon varsa belirtebilirsiniz (isteğe bağlı)..."
              />
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border-l-4 border-purple-500 flex flex-col h-[320px]">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                Gelişme Notları
              </label>

              <div className="flex flex-col flex-1 bg-gray-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-600 rounded-md overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {notes.length === 0 ? (
                    <div className="text-center text-gray-400 dark:text-gray-500 text-sm mt-8 italic">
                      Henüz bir not eklenmemiş.
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
                            className={`max-w-[85%] rounded-lg px-3 py-2 ${
                              isMine
                                ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-100 rounded-tr-sm'
                                : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-tl-sm border border-gray-100 dark:border-slate-600 shadow-sm'
                            }`}
                          >
                            <div className="text-[10px] font-bold opacity-60 mb-0.5">
                              {note.sender} • {formatDateTime(note.timestamp)}
                            </div>
                            <div className="text-sm break-words whitespace-pre-wrap leading-tight">
                              {note.text}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-2 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-600 flex gap-2 items-center">
                  <input
                    type="text"
                    className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-100 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Bir not yazın..."
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
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
                    title="Gönder"
                  >
                    ➤
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                Problem Fotoğrafı {isNew && <span className="text-red-500">*</span>}
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg h-64 flex flex-col items-center justify-center relative overflow-hidden bg-gray-50 dark:bg-slate-700/50 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer group">
                {previewUrl ? (
                  <img src={previewUrl} alt="Problem" className="object-contain h-full w-full" />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                    <UploadCloud className="w-12 h-12 mb-2" />
                    <span className="font-medium">Fotoğraf Yüklemek İçin Tıklayın</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {previewUrl && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white px-3 py-1 rounded text-xs pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    Değiştir
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow grid grid-cols-1 md:grid-cols-3 gap-4">
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
                label="Alan (Tezgah)"
                value={formData.bildirilen_alan}
                options={AREAS}
                placeholder="Seçiniz..."
                onChange={(v) => handleFormChange('bildirilen_alan', v)}
                onBlur={handleBlur}
                className={selectClass}
              />
              <SelectField
                label="İlgili Bölüm"
                value={formData.ilgili_bolum}
                options={DEPARTMENTS}
                placeholder="Bölüm Seçin..."
                onChange={(v) => handleFormChange('ilgili_bolum', v)}
                onBlur={handleBlur}
                className={selectClass}
              />
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Kaydı Açan
                </label>
                <div className="block w-full border border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700/50 rounded-md shadow-sm p-2.5 font-bold text-gray-600 dark:text-gray-300 truncate">
                  {isNew ? currentUser.name : issue.bildiren_kisi || '-'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Açılış Zamanı
                </label>
                <div className="block w-full border border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700/50 rounded-md shadow-sm p-2.5 font-bold text-gray-600 dark:text-gray-300">
                  {isNew ? 'Şimdi' : formatDateTime(issue.bildirim_zamani)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Hedef Tarih
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    placeholder="Tarih Seçin (GG.AA.YYYY)"
                    className="block w-full border border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium cursor-pointer"
                    value={toDisplayDate(formData.hedef_tarih)}
                    onClick={() => openDatePicker(datePickerRef.current)}
                  />
                  {/* Görsel olarak gizli ama erişilebilir kalan gerçek tarih alanı.
                      showPicker desteklenmeyen tarayıcılarda buraya odaklanılır. */}
                  <input
                    ref={datePickerRef}
                    type="date"
                    aria-label="Hedef tarih"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    value={formData.hedef_tarih || ''}
                    onChange={(e) => handleFormChange('hedef_tarih', e.target.value)}
                    onBlur={handleBlur}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400">
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Mevcut Durum
                </label>
                <select
                  className={`w-full rounded-md shadow-sm p-2.5 font-bold cursor-pointer outline-none border border-gray-300 dark:border-slate-500 focus:ring-2 focus:ring-blue-500 ${getStatusColor(formData.mevcut_durum)}`}
                  value={formData.mevcut_durum}
                  onBlur={handleBlur}
                  onChange={(e) => handleFormChange('mevcut_durum', e.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-white dark:bg-slate-800 text-black dark:text-white font-semibold"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {delayText && (
              <div className="bg-red-100 border-l-4 border-red-600 text-red-800 p-4 rounded shadow flex items-center animate-pulse">
                <AlertCircle className="w-8 h-8 mr-3 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-black uppercase text-sm tracking-wider">Gecikme İhbarı</p>
                  <p className="font-bold text-lg">
                    Bu problem hedef tarihinden{' '}
                    <span className="text-2xl underline">{delayDays}</span> gün gecikmiştir!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alt Kısım Kontrolleri */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-transparent dark:border-slate-700 gap-4">
          <button
            onClick={() =>
              saveThen(
                () => setCurrentIndex(Math.max(0, currentIndex - 1)),
                'Kayıt edilemediği için geçiş yapılamadı.'
              )
            }
            disabled={isNew || currentIndex <= 0}
            className="w-full sm:w-auto justify-center flex items-center px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-semibold rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Önceki
          </button>

          {isNew && (
            <button
              onClick={handleCreate}
              disabled={isSaving}
              className="w-full sm:w-auto justify-center flex items-center px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70 active:scale-95 order-first sm:order-none cursor-pointer disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5 mr-2" /> {isSaving ? 'Kaydediliyor...' : 'Kaydı Oluştur'}
            </button>
          )}

          <button
            onClick={() =>
              saveThen(
                () => setCurrentIndex(Math.min(issues.length - 1, currentIndex + 1)),
                'Kayıt edilemediği için geçiş yapılamadı.'
              )
            }
            disabled={isNew || currentIndex >= issues.length - 1}
            className="w-full sm:w-auto justify-center flex items-center px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-semibold rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Sonraki <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>

        {showExitConfirm && (
          <ConfirmDialog
            title="Çıkmak İstediğinize Emin Misiniz?"
            message="Yeni kaydı kaydetmeden çıkarsanız girdiğiniz tüm veriler ve yüklediğiniz fotoğraflar kaybolacaktır."
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
    </div>
  );
}

function SelectField({ label, value, options, placeholder, onChange, onBlur, className }) {
  return (
    <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded border dark:border-slate-600">
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
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
