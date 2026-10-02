import { useCallback, useRef, useState } from 'react';
import { Plus, Save, Trash2, UserCheck, Users, Filter } from 'lucide-react';

import { useActions } from '../hooks/useActions';
import { useUsers } from '../hooks/useUsers';
import { useToast } from '../hooks/useToast';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { openDatePicker } from '../lib/datePicker';
import { ACTION_STATUS, OPTION_CLASS, isManager, isSuperAdmin } from '../lib/constants';
import { formatDate, toDisplayDate, toInputDate } from '../utils/helpers';
import ConfirmDialog from './ui/ConfirmDialog';
import Toast from './ui/Toast';
import PortalBackButton from './ui/PortalBackButton';

const EMPTY_FORM = {
  assignee_name: '',
  action_content: '',
  target_date: '',
  progress: 0,
  status: ACTION_STATUS.OPEN,
  sub_actions: [],
};

const toInt = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Alt başlık ağırlıklarını toplamı 100 olacak şekilde dengeler.
 * Son satır artık payı alır. Girdiyi değiştirmeden YENİ nesneler döner —
 * doğrudan state içindeki nesneleri değiştirmek React'te bayat render'a yol açar.
 */
const balanceWeights = (subs) => {
  if (subs.length === 0) return [];
  if (subs.length === 1) return [{ ...subs[0], weight: 100 }];

  let used = 0;
  const balanced = subs.slice(0, -1).map((sub) => {
    let weight = Math.max(0, toInt(sub.weight));
    if (used + weight > 100) weight = 100 - used;
    used += weight;
    return { ...sub, weight };
  });

  balanced.push({ ...subs[subs.length - 1], weight: 100 - used });
  return balanced;
};

const calcProgress = (subs) =>
  Math.min(
    100,
    subs.reduce((total, sub) => total + (sub.completed ? toInt(sub.weight) : 0), 0)
  );

const getProgressColor = (progress) => {
  if (progress >= 100) return 'bg-green-500';
  if (progress > 50) return 'bg-blue-500';
  if (progress > 0) return 'bg-yellow-500';
  return 'bg-gray-300 dark:bg-gray-600';
};

export default function ActionModule({ onBack, currentUser }) {
  const { actions, loading, error, addAction, updateAction, deleteAction } = useActions();
  const { users } = useUsers();
  const { toast, showToast, hideToast } = useToast();

  const [view, setView] = useState('list'); // 'list' | 'form'
  const [currentAction, setCurrentAction] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionScope, setActionScope] = useState('my'); // 'my' | 'all'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Açık' | 'Tamamlandı'

  const datePickerRef = useRef(null);
  // Aynı anda iki kaydetme isteği gitmesin: blur + tıklama üst üste gelirse
  // eskiden aynı aksiyon iki kez oluşturuluyordu.
  const savingRef = useRef(false);

  const canManage = isManager(currentUser);
  const isEditing = Boolean(currentAction);

  const handleSave = useCallback(
    async ({ silent = false } = {}) => {
      if (savingRef.current) return false;

      if (!formData.action_content?.trim()) {
        if (!silent) showToast('Aksiyon içeriği boş bırakılamaz.', true);
        return false;
      }
      if (canManage && (!formData.assignee_name || !formData.target_date)) {
        if (!silent) showToast('Sorumlu kişi ve hedef tarih zorunludur.', true);
        return false;
      }

      savingRef.current = true;
      setIsSaving(true);
      try {
        if (currentAction) {
          await updateAction(currentAction.id, formData);
        } else {
          const created = await addAction(formData);
          setCurrentAction({ id: created.id, ...formData });
        }
        setIsDirty(false);
        if (!silent) showToast('Aksiyon kaydedildi.');
        return true;
      } catch (err) {
        showToast('Kayıt başarısız: ' + err.message, true);
        return false;
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [formData, currentAction, canManage, addAction, updateAction, showToast]
  );

  // Sadece MEVCUT bir aksiyon düzenlenirken otomatik kayıt yap. Yeni aksiyon
  // için açıkça "Kaydet" gerekir; aksi halde yarım kalmış taslaklar oluşuyordu.
  useUnsavedChanges(isDirty && isEditing, () => handleSave({ silent: true }));

  const openForm = (action = null) => {
    setCurrentAction(action);
    setFormData(
      action
        ? {
            assignee_name: action.assignee_name || '',
            action_content: action.action_content || '',
            target_date: toInputDate(action.target_date),
            progress: action.progress || 0,
            status: action.status || ACTION_STATUS.OPEN,
            sub_actions: Array.isArray(action.sub_actions) ? action.sub_actions : [],
          }
        : EMPTY_FORM
    );
    setIsDirty(false);
    setView('form');
  };

  const closeForm = () => {
    setView('list');
    setCurrentAction(null);
    setFormData(EMPTY_FORM);
    setIsDirty(false);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  /** Alt başlıkları güncelledikten sonra ilerleme ve durumu yeniden hesaplar. */
  const applySubActions = (updater) => {
    setFormData((prev) => {
      const subs = balanceWeights(updater(prev.sub_actions || []));
      const progress = calcProgress(subs);
      return {
        ...prev,
        sub_actions: subs,
        progress,
        status: progress >= 100 ? ACTION_STATUS.DONE : ACTION_STATUS.OPEN,
      };
    });
    setIsDirty(true);
  };

  const addSubAction = () =>
    applySubActions((subs) => [...subs, { title: '', weight: 0, completed: false }]);

  const updateSubAction = (index, field, value) =>
    applySubActions((subs) => subs.map((s, i) => (i === index ? { ...s, [field]: value } : s)));

  const removeSubAction = (index) =>
    applySubActions((subs) => subs.filter((_, i) => i !== index));

  const handleBlur = () => {
    if (isDirty && isEditing) handleSave({ silent: true });
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await deleteAction(currentAction.id);
      showToast('Aksiyon silindi.');
      closeForm();
    } catch (err) {
      showToast('Silme işlemi başarısız: ' + err.message, true);
    }
  };

  const handleGoBack = async () => {
    if (view !== 'form') {
      onBack();
      return;
    }
    // Yeni ve dolu bir form kapatılıyorsa kullanıcıya sor; kaydedilmemiş veri kaybolur.
    if (!isEditing && isDirty && formData.action_content?.trim()) {
      setShowExitConfirm(true);
      return;
    }
    if (isEditing && isDirty) await handleSave({ silent: true });
    closeForm();
  };

  if (loading && actions.length === 0) {
    return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Hata: {error}</div>;
  }

  const isMine = (act) => {
    if (!act.assignee_name || !currentUser?.name) return false;
    const a = act.assignee_name.trim().toLowerCase();
    const u = currentUser.name.trim().toLowerCase();
    return a === u || a.includes(u) || u.includes(a);
  };

  const myActions = actions.filter(isMine);
  const scopeActions = actionScope === 'my' ? myActions : actions;
  const displayedActions =
    statusFilter === 'all'
      ? scopeActions
      : scopeActions.filter((a) => a.status === statusFilter);

  const inputClass =
    'w-full bg-transparent border border-gray-300 dark:border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100 outline-none';
  const readOnlyClass = canManage ? '' : 'opacity-70 cursor-not-allowed';

  return (
    <div className="max-w-6xl mx-auto animate-fade-in p-2 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2 md:gap-4 self-start md:self-auto">
          <PortalBackButton
            onBack={handleGoBack}
            label={view === 'form' ? 'Aksiyonlara Dön' : 'Portala Dön'}
          />
          <h2 className="text-xl md:text-3xl font-black text-gray-800 dark:text-gray-100">
            {view === 'form'
              ? canManage
                ? isEditing
                  ? 'Aksiyon Düzenle'
                  : 'Aksiyon Tanımla'
                : 'Aksiyon Detayı / İşlem'
              : 'Aksiyon Modülü & Görev Takibi'}
          </h2>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {view === 'list' && canManage && (
            <button
              onClick={() => openForm()}
              className="w-full md:w-auto justify-center bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black py-2.5 md:py-3 px-5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Yeni Aksiyon Tanımla
            </button>
          )}

          {view === 'form' && (
            <>
              <button
                onClick={() => handleSave()}
                disabled={isSaving}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 md:py-3 px-4 rounded-xl shadow transition-colors flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <Save className="w-5 h-5" /> {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>

              {isEditing && isSuperAdmin(currentUser) && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 md:py-3 px-4 rounded-xl text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" /> <span className="hidden sm:inline">Sil</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* =========================================================================
          GÖREV KAPSAMI SEKMELERİ (Bana Ait Görevler vs. Genel Görevler)
          ========================================================================= */}
      {view === 'list' && (
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-700/80 p-2 rounded-2xl shadow-lg backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-2">
              {/* Bana Ait Görevler */}
              <button
                type="button"
                onClick={() => setActionScope('my')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                  actionScope === 'my'
                    ? 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Bana Ait Görevler</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    actionScope === 'my'
                      ? 'bg-black/30 text-white'
                      : 'bg-slate-800 text-amber-400'
                  }`}
                >
                  {myActions.length}
                </span>
              </button>

              {/* Genel Görevler (Tüm Şirket) - Admin ve Yöneticiler için */}
              {canManage && (
                <button
                  type="button"
                  onClick={() => setActionScope('all')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                    actionScope === 'all'
                      ? 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                      : 'text-gray-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Genel Görevler (Tüm Şirket)</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-black ${
                      actionScope === 'all'
                        ? 'bg-black/30 text-white'
                        : 'bg-slate-800 text-amber-400'
                    }`}
                  >
                    {actions.length}
                  </span>
                </button>
              )}
            </div>

            {/* Durum Filtresi (Tümü, Açık, Tamamlandı) */}
            <div className="flex items-center justify-end gap-2 px-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">Tüm Durumlar ({scopeActions.length})</option>
                <option value="Açık">
                  Sadece Açık ({scopeActions.filter((a) => a.status === 'Açık').length})
                </option>
                <option value="Tamamlandı">
                  Tamamlananlar ({scopeActions.filter((a) => a.status === 'Tamamlandı').length})
                </option>
              </select>
            </div>
          </div>
        </div>
      )}

      {view === 'list' ? (
        <ActionList actions={displayedActions} onSelect={openForm} scope={actionScope} />
      ) : (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                İşlem Yapılacak Konu (Aksiyon)
              </label>
              <textarea
                disabled={!canManage}
                className={`${inputClass} ${readOnlyClass}`}
                rows="3"
                value={formData.action_content}
                onChange={(e) => handleFormChange('action_content', e.target.value)}
                onBlur={handleBlur}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Sorumlu Kişi
                </label>
                {canManage ? (
                  <select
                    className={inputClass}
                    value={formData.assignee_name}
                    onChange={(e) => handleFormChange('assignee_name', e.target.value)}
                    onBlur={handleBlur}
                  >
                    <option value="" disabled className={OPTION_CLASS}>
                      Kişi Seçiniz...
                    </option>
                    {users.map((user) => (
                      <option key={user.id} value={user.name} className={OPTION_CLASS}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    disabled
                    type="text"
                    className={`${inputClass} opacity-70 cursor-not-allowed`}
                    value={formData.assignee_name}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Hedef Tarih
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    placeholder="Tarih Seçin (GG.AA.YYYY)"
                    disabled={!canManage}
                    className={`${inputClass} cursor-pointer ${readOnlyClass}`}
                    value={toDisplayDate(formData.target_date)}
                    onClick={() => canManage && openDatePicker(datePickerRef.current)}
                  />
                  {canManage && (
                    <input
                      ref={datePickerRef}
                      type="date"
                      aria-label="Hedef tarih"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      value={formData.target_date || ''}
                      onChange={(e) => handleFormChange('target_date', e.target.value)}
                      onBlur={handleBlur}
                    />
                  )}
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
            </div>

            {/* Alt Başlıklar */}
            <div className="bg-gray-50 dark:bg-slate-700/30 p-4 rounded-lg border border-gray-200 dark:border-slate-600 space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  Alt Başlıklar (Görevler)
                </label>
                {canManage && (
                  <button
                    type="button"
                    onClick={addSubAction}
                    className="text-xs flex items-center gap-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors font-bold"
                  >
                    <Plus className="w-3 h-3" /> Alt Başlık Ekle
                  </button>
                )}
              </div>

              {formData.sub_actions?.length > 0 ? (
                <div className="space-y-3">
                  {formData.sub_actions.map((sub, idx) => {
                    const isLast = idx === formData.sub_actions.length - 1;
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white dark:bg-slate-800 p-3 rounded border ${
                          sub.completed
                            ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(sub.completed)}
                          onChange={(e) => updateSubAction(idx, 'completed', e.target.checked)}
                          onBlur={handleBlur}
                          className="w-6 h-6 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 cursor-pointer flex-shrink-0"
                          aria-label={sub.title || `Alt başlık ${idx + 1}`}
                        />
                        <input
                          type="text"
                          disabled={!canManage}
                          placeholder="Alt başlık tanımı"
                          className={`flex-1 w-full bg-transparent border-b border-gray-300 dark:border-slate-500 p-1 text-sm text-gray-800 dark:text-gray-100 outline-none focus:border-blue-500 ${
                            canManage ? '' : 'border-none opacity-90 cursor-default'
                          } ${sub.completed ? 'line-through text-gray-500' : ''}`}
                          value={sub.title}
                          onChange={(e) => updateSubAction(idx, 'title', e.target.value)}
                          onBlur={handleBlur}
                        />
                        <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                          {canManage ? (
                            <div className="flex-1 sm:w-32 flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                // Son satır kalan payı otomatik alır, elle değiştirilemez.
                                disabled={isLast}
                                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 ${
                                  isLast ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                value={sub.weight}
                                onChange={(e) =>
                                  updateSubAction(idx, 'weight', toInt(e.target.value))
                                }
                                onBlur={handleBlur}
                                aria-label="Ağırlık"
                              />
                              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 w-8">
                                %{sub.weight}
                              </span>
                            </div>
                          ) : (
                            <div className="flex-1 sm:w-24 flex items-center gap-1">
                              <span className="text-xs text-gray-500">Ağırlık:</span>
                              <span className="font-bold text-sm text-gray-700 dark:text-gray-300">
                                %{sub.weight}
                              </span>
                            </div>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => removeSubAction(idx)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                              aria-label="Alt başlığı sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Henüz alt başlık eklenmemiş.
                </p>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-600">
              <div className="flex justify-between text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
                <span>Genel İlerleme Durumu (Otomatik Hesaplanır)</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                  %{formData.progress}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${getProgressColor(formData.progress)} transition-all duration-500`}
                  style={{ width: `${formData.progress || 0}%` }}
                />
              </div>
            </div>

            {/* Enter ile gönderimi mümkün kılan gizli submit düğmesi. */}
            <button type="submit" className="sr-only" tabIndex={-1}>
              Kaydet
            </button>
          </form>
        </div>
      )}

      {showExitConfirm && (
        <ConfirmDialog
          title="Çıkmak İstediğinize Emin Misiniz?"
          message="Aksiyon henüz kaydedilmedi. Çıkarsanız girdiğiniz veriler kaybolacaktır."
          confirmLabel="Evet, Çıkış Yap"
          onCancel={() => setShowExitConfirm(false)}
          onConfirm={() => {
            setShowExitConfirm(false);
            closeForm();
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Aksiyonu Sil"
          message="Bu aksiyonu silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
          confirmLabel="Evet, Sil"
          cancelLabel="Vazgeç"
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}

function ActionList({ actions, onSelect, scope }) {
  if (actions.length === 0) {
    return (
      <div className="p-10 text-center bg-slate-900/85 border border-slate-700/80 rounded-2xl shadow-xl backdrop-blur-md">
        <UserCheck className="w-10 h-10 text-amber-500/60 mx-auto mb-3" />
        <h4 className="text-base font-bold text-gray-200 mb-1">
          {scope === 'my'
            ? 'Üzerinize Atanmış Görev Bulunmuyor'
            : 'Filtrelere Uygun Aksiyon Bulunmuyor'}
        </h4>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          {scope === 'my'
            ? 'Şu anda adınıza atanmış herhangi bir görev yok. Yukarıdaki "Genel Görevler" sekmesinden fabrikanın tüm aksiyonlarını inceleyebilirsiniz.'
            : 'Mevcut filtre kriterlerine uyan bir aksiyon kaydı bulunamadı.'}
        </p>
      </div>
    );
  }

  const statusBadge = (status) =>
    status === ACTION_STATUS.DONE
      ? 'bg-green-100 text-green-800'
      : 'bg-blue-100 text-blue-800';

  return (
    <div className="w-full">
      {/* Mobil Görünüm */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {actions.map((action) => (
          <div
            key={action.id}
            onClick={() => onSelect(action)}
            className="bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-slate-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <span className={`px-2 py-1 rounded text-xs font-bold ${statusBadge(action.status)}`}>
                {action.status}
              </span>
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  İlerleme: %{action.progress || 0}
                </span>
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full ${getProgressColor(action.progress)}`}
                    style={{ width: `${action.progress || 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                Sorumlu Kişi
              </span>
              <p className="font-bold text-gray-900 dark:text-gray-100">{action.assignee_name}</p>
            </div>
            <div className="mb-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                Aksiyon / İşlem
              </span>
              <p className="text-gray-800 dark:text-gray-200 text-sm line-clamp-2">
                {action.action_content}
              </p>
              {action.sub_actions?.length > 0 && (
                <div className="mt-1 text-xs text-blue-500 font-semibold">
                  {action.sub_actions.length} Alt Başlık
                </div>
              )}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-slate-700 pt-3">
              <span className="font-semibold">Hedef Tarih:</span> {formatDate(action.target_date)}
            </div>
          </div>
        ))}
      </div>

      {/* Masaüstü Görünüm */}
      <div className="hidden md:block bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead>
              <tr>
                {['Durum', 'Sorumlu Kişi', 'İşlem / Konu', 'Hedef Tarih', 'İlerleme'].map((head) => (
                  <th
                    key={head}
                    className="px-5 py-3 border-b-2 border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr
                  key={action.id}
                  onClick={() => onSelect(action)}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-gray-200 dark:border-slate-700"
                >
                  <td className="px-5 py-4 bg-white dark:bg-slate-800 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${statusBadge(action.status)}`}
                    >
                      {action.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 bg-white dark:bg-slate-800 text-sm font-bold text-gray-900 dark:text-gray-100">
                    {action.assignee_name}
                  </td>
                  <td className="px-5 py-4 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-200">
                    <div className="line-clamp-2">{action.action_content}</div>
                    {action.sub_actions?.length > 0 && (
                      <div className="mt-1 text-xs text-blue-500 font-semibold">
                        {action.sub_actions.length} Alt Başlık
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-200">
                    {formatDate(action.target_date)}
                  </td>
                  <td className="px-5 py-4 bg-white dark:bg-slate-800 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 min-w-[100px]">
                        <div
                          className={`h-2.5 rounded-full ${getProgressColor(action.progress)}`}
                          style={{ width: `${action.progress || 0}%` }}
                        />
                      </div>
                      <span className="font-bold text-xs text-gray-600 dark:text-gray-300">
                        %{action.progress || 0}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
