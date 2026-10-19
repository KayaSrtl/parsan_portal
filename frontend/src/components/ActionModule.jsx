import { useCallback, useRef, useState } from 'react';
import {
  Plus,
  Save,
  Trash2,
  UserCheck,
  Users,
  Filter,
  Calendar,
  Lock,
  MessageSquare,
  CheckCircle2,
  Tag,
} from 'lucide-react';

import { useActions } from '../hooks/useActions';
import { useUsers } from '../hooks/useUsers';
import { useToast } from '../hooks/useToast';
import {
  ACTION_STATUS,
  DEPARTMENTS,
  OPTION_CLASS,
  isManager,
  isSuperAdmin,
} from '../lib/constants';
import {
  formatDate,
  formatDateTime,
  parseNotes,
  toDisplayDate,
  toInputDate,
} from '../utils/helpers';
import ConfirmDialog from './ui/ConfirmDialog';
import Toast from './ui/Toast';
import PortalBackButton from './ui/PortalBackButton';

const INITIAL_SUB_ACTIONS = [{ title: 'Hedef Tanımlamak', weight: 100, completed: false }];

const EMPTY_FORM = {
  assignee_name: '',
  action_content: '',
  target_date: '',
  progress: 0,
  status: ACTION_STATUS.OPEN,
  sub_actions: INITIAL_SUB_ACTIONS,
};

const toInt = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

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
  if (progress >= 100) return 'bg-emerald-500';
  if (progress > 50) return 'bg-sky-500';
  if (progress > 0) return 'bg-amber-500';
  return 'bg-slate-300 dark:bg-slate-600';
};

export default function ActionModule({ onBack, currentUser }) {
  const { actions, loading, error, addAction, updateAction, deleteAction, refresh } = useActions();
  const { users } = useUsers();
  const { toast, showToast, hideToast } = useToast();

  const [view, setView] = useState('list'); // 'list' | 'form'
  const [currentAction, setCurrentAction] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [newIssueNote, setNewIssueNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionScope, setActionScope] = useState('all'); // 'all' | 'my'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Açık' | 'Tamamlandı'

  const savingRef = useRef(false);

  const canManage = isManager(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const isEditing = Boolean(currentAction);

  // 1 Kereliğine Hedef Tarih Kuralı:
  // Aksiyon yeni açılıyorsa veya mevcut aksiyonda hedef tarih henüz tanımlanmamışsa / kilitlenmemişse
  // kullanıcı 1 kereliğine hedef tarih girebilir. Girip kaydettiğinde kilitlenir.
  const isTargetDateLocked =
    isEditing &&
    Boolean(currentAction?.target_date && String(currentAction.target_date).trim()) &&
    (Boolean(currentAction?.target_date_locked) || !superAdmin);

  const canEditTargetDate = !isEditing || !isTargetDateLocked || superAdmin;

  const getCombinedNotes = (action) => {
    if (!action) return [];
    const issueNotes = parseNotes(
      action.issue_notes,
      action.issue_reporter || 'Saha Operatörü',
      action.created_at
    );
    const actNotes = Array.isArray(action.notes)
      ? action.notes
      : parseNotes(action.notes, currentUser?.name, action.created_at);

    // Aynı metin ve zamanlı notları tekilleştir
    const seen = new Set();
    const allNotes = [];
    [...issueNotes, ...actNotes].forEach((n) => {
      if (!n?.text) return;
      const cleanKey = `${n.sender || ''}:${n.text.replace(/^\[Aksiyon(?: Notu)?\]\s*/, '')}`;
      if (!seen.has(cleanKey)) {
        seen.add(cleanKey);
        allNotes.push(n);
      }
    });
    return allNotes;
  };

  const handleSave = useCallback(
    async ({ silent = false, extraPayload = {} } = {}) => {
      if (savingRef.current) return false;

      const merged = { ...formData, ...extraPayload };

      if (!merged.action_content?.trim()) {
        if (!silent) showToast('Aksiyon konusu / içeriği boş bırakılamaz.', true);
        return false;
      }
      if (!merged.assignee_name?.trim()) {
        if (!silent) showToast('Lütfen sorumlu kişi veya bölüm seçiniz.', true);
        return false;
      }

      savingRef.current = true;
      setIsSaving(true);
      try {
        // Eğer hedef tarih ilk kez girildiyse 'Hedef Tanımlamak' alt aksiyonunu otomatik tamamla
        let updatedSubs = Array.isArray(merged.sub_actions) && merged.sub_actions.length > 0
          ? [...merged.sub_actions]
          : INITIAL_SUB_ACTIONS;

        if (merged.target_date && String(merged.target_date).trim()) {
          updatedSubs = updatedSubs.map((s) =>
            s.title.toLowerCase().includes('hedef tanımlamak') ? { ...s, completed: true } : s
          );
        }

        const balancedSubs = balanceWeights(updatedSubs);
        const progress = calcProgress(balancedSubs);
        const payload = {
          ...merged,
          sub_actions: balancedSubs,
          progress,
          status: progress >= 100 ? ACTION_STATUS.DONE : ACTION_STATUS.OPEN,
        };

        if (newIssueNote.trim() && !payload.new_note) {
          payload.new_note = newIssueNote.trim();
          setNewIssueNote('');
        }

        if (currentAction) {
          const res = await updateAction(currentAction.id, payload);
          const updatedAct = res?.action || { ...currentAction, ...payload, target_date_locked: Boolean(payload.target_date) };
          setCurrentAction(updatedAct);
          setFormData({
            assignee_name: updatedAct.assignee_name || '',
            action_content: updatedAct.action_content || '',
            target_date:
              toInputDate(updatedAct.target_date) ||
              (updatedAct.target_date ? String(updatedAct.target_date).split('T')[0] : ''),
            progress: updatedAct.progress ?? progress,
            status: updatedAct.status || payload.status,
            sub_actions:
              Array.isArray(updatedAct.sub_actions) && updatedAct.sub_actions.length > 0
                ? updatedAct.sub_actions
                : balancedSubs,
          });
        } else {
          const created = await addAction(payload);
          const createdAct = created?.action || {
            id: created.id,
            ...payload,
            target_date_locked: Boolean(payload.target_date),
          };
          setCurrentAction(createdAct);
          setFormData((prev) => ({
            ...prev,
            sub_actions: balancedSubs,
            progress,
            status: payload.status,
          }));
        }
        setIsDirty(false);
        await refresh();
        if (!silent) {
          showToast(
            merged.target_date && !currentAction?.target_date
              ? 'Hedef tarih 1 kereliğine tanımlandı ve "Hedef Tanımlamak" tamamlandı!'
              : 'Aksiyon başarıyla kaydedildi.'
          );
        }
        return true;
      } catch (err) {
        showToast('Kayıt başarısız: ' + err.message, true);
        return false;
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [formData, newIssueNote, currentAction, addAction, updateAction, refresh, showToast]
  );

  const handleAddIssueNote = async () => {
    if (!newIssueNote.trim()) return;
    if (!currentAction?.id) {
      showToast('Not eklemek için önce aksiyonu kaydedin.', true);
      return;
    }
    const noteText = newIssueNote.trim();
    setNewIssueNote('');
    await handleSave({ silent: false, extraPayload: { new_note: noteText } });
  };

  const openForm = (action = null) => {
    setCurrentAction(action);
    setFormData(
      action
        ? {
            assignee_name: action.assignee_name || '',
            action_content: action.action_content || '',
            target_date:
              toInputDate(action.target_date) ||
              (action.target_date ? String(action.target_date).split('T')[0] : ''),
            progress: action.progress || 0,
            status: action.status || ACTION_STATUS.OPEN,
            sub_actions:
              Array.isArray(action.sub_actions) && action.sub_actions.length > 0
                ? action.sub_actions
                : INITIAL_SUB_ACTIONS,
          }
        : {
            ...EMPTY_FORM,
            assignee_name: `${DEPARTMENTS[0]} Yöneticisi`,
            sub_actions: [{ title: 'Hedef Tanımlamak', weight: 100, completed: false }],
          }
    );
    setNewIssueNote('');
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
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Hedef tarih seçildiğinde ilk aksiyon olan 'Hedef Tanımlamak' otomatik işaretlensin
      if (field === 'target_date' && value) {
        const subs = balanceWeights(
          (prev.sub_actions || INITIAL_SUB_ACTIONS).map((s) =>
            s.title.toLowerCase().includes('hedef tanımlamak') ? { ...s, completed: true } : s
          )
        );
        const progress = calcProgress(subs);
        next.sub_actions = subs;
        next.progress = progress;
        next.status = progress >= 100 ? ACTION_STATUS.DONE : ACTION_STATUS.OPEN;
      }
      return next;
    });
    setIsDirty(true);
  };

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
    if (!isEditing && isDirty && formData.action_content?.trim()) {
      setShowExitConfirm(true);
      return;
    }
    closeForm();
  };

  if (loading && actions.length === 0) {
    return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-rose-500">Hata: {error}</div>;
  }

  const isMine = (act) => {
    if (!act.assignee_name || !currentUser?.name) return false;
    const a = act.assignee_name.trim().toLowerCase();
    const u = currentUser.name.trim().toLowerCase();
    if (a === u || a.includes(u) || u.includes(a)) return true;
    // Yöneticiler için bölüm yöneticisi aksiyonları da kendi görevlerinde görünsün
    if (canManage && a.includes('yöneticisi')) return true;
    return false;
  };

  const myActions = actions.filter(isMine);
  const scopeActions = actionScope === 'my' ? myActions : actions;
  const displayedActions =
    statusFilter === 'all'
      ? scopeActions
      : scopeActions.filter((a) => a.status === statusFilter);

  const departmentAssignees = [
    ...DEPARTMENTS.map((d) => `${d} Yöneticisi`),
    'Bakım Onarım Yöneticisi',
    'İlgili Bölüm Sorumlusu',
  ];

  const allKnownAssignees = new Set([
    ...departmentAssignees,
    ...users.map((u) => u.name),
  ]);

  const inputClass =
    'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 text-slate-800 dark:text-slate-100 outline-none text-sm font-medium';

  const combinedNotes = getCombinedNotes(currentAction);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in p-2 md:p-4">
      <div className="bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-6 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 self-start md:self-auto">
          <PortalBackButton
            onBack={handleGoBack}
            label={view === 'form' ? 'Aksiyon Listesine Dön' : 'Portala Dön'}
          />
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              {view === 'form'
                ? isEditing
                  ? `Aksiyon Detayı & Hedef Tanımlama (#${currentAction.id})`
                  : 'Yeni Aksiyon Tanımla'
                : 'Aksiyon Modülü & Görev Takibi'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Açılan hata kartları ilgili bölüm yöneticisine otomatik düşer; ilk aksiyon olarak &quot;Hedef Tanımlamak&quot; gelir ve 1 kereliğine hedef tarih girilir.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {view === 'list' && canManage && (
            <button
              onClick={() => openForm()}
              className="w-full md:w-auto justify-center bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-xs transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Yeni Aksiyon Aç
            </button>
          )}

          {view === 'form' && (
            <>
              <button
                onClick={() => handleSave()}
                disabled={isSaving}
                className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-xs transition-colors flex items-center gap-2 text-xs sm:text-sm disabled:opacity-60 cursor-pointer"
              >
                <Save className="w-4 h-4" /> {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>

              {isEditing && superAdmin && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Sil
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* =========================================================================
          GÖREV KAPSAMI SEKMELERİ
          ========================================================================= */}
      {view === 'list' && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 p-2.5 rounded-2xl shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActionScope('all')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  actionScope === 'all'
                    ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/40 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Tüm Bölüm Aksiyonları</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-white/80 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300">
                  {actions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActionScope('my')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  actionScope === 'my'
                    ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/40 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Bana / Bölümümüze Ait</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-white/80 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300">
                  {myActions.length}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 px-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-white rounded-xl px-3 py-2 outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option value="all" className={OPTION_CLASS}>
                  Tüm Durumlar ({scopeActions.length})
                </option>
                <option value="Açık" className={OPTION_CLASS}>
                  Açık Aksiyonlar ({scopeActions.filter((a) => a.status === 'Açık').length})
                </option>
                <option value="Tamamlandı" className={OPTION_CLASS}>
                  Tamamlananlar ({scopeActions.filter((a) => a.status === 'Tamamlandı').length})
                </option>
              </select>
            </div>
          </div>
        </div>
      )}

      {view === 'list' ? (
        <ActionList
          actions={displayedActions}
          onSelect={openForm}
          getCombinedNotes={getCombinedNotes}
        />
      ) : (
        <div className="bg-white/95 dark:bg-slate-900/95 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/90 dark:border-slate-800 max-w-4xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-6"
          >
            {/* Bağlı Hata Kartı Bilgi Şeridi */}
            {currentAction?.issue_id && (
              <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Tag className="w-5 h-5 text-rose-500" />
                  <div>
                    <div className="text-xs font-black text-rose-900 dark:text-rose-200">
                      Hata Kartı #{currentAction.issue_id} Kaynaklı Otomatik Aksiyon
                    </div>
                    <div className="text-[11px] text-rose-700 dark:text-rose-300">
                      {currentAction.issue_area && `Alan: ${currentAction.issue_area.toUpperCase()} • `}
                      {currentAction.issue_department && `İlgili Bölüm: ${currentAction.issue_department} • `}
                      Hata Kartı Termini: {formatDate(currentAction.issue_target_date)}
                    </div>
                  </div>
                </div>
                {currentAction.hata_karti_turu && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300">
                    {currentAction.hata_karti_turu}
                  </span>
                )}
              </div>
            )}

            {/* İşlem Yapılacak Konu */}
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                İşlem Yapılacak Konu (Aksiyon Tanımı)
              </label>
              <textarea
                disabled={!canManage && isEditing}
                className={`${inputClass} ${!canManage && isEditing ? 'opacity-75 cursor-not-allowed' : ''}`}
                rows="3"
                placeholder="Aksiyon konusunu yazınız..."
                value={formData.action_content}
                onChange={(e) => handleFormChange('action_content', e.target.value)}
              />
            </div>

            {/* Sorumlu Bölüm/Kişi & 1 Kerelik Hedef Tarih Girişi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Sorumlu Bölüm Yöneticisi / Kişi
                </label>
                {canManage ? (
                  <select
                    className={`${inputClass} cursor-pointer`}
                    value={formData.assignee_name}
                    onChange={(e) => handleFormChange('assignee_name', e.target.value)}
                  >
                    <option value="" disabled className={OPTION_CLASS}>
                      Sorumlu Seçiniz...
                    </option>
                    {formData.assignee_name && !allKnownAssignees.has(formData.assignee_name) && (
                      <option value={formData.assignee_name} className={OPTION_CLASS}>
                        {formData.assignee_name}
                      </option>
                    )}
                    <optgroup label="Bölüm Yöneticileri" className={OPTION_CLASS}>
                      {departmentAssignees.map((deptMgr) => (
                        <option key={deptMgr} value={deptMgr} className={OPTION_CLASS}>
                          {deptMgr}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Sistem Kullanıcıları" className={OPTION_CLASS}>
                      {users.map((u) => (
                        <option key={u.id} value={u.name} className={OPTION_CLASS}>
                          {u.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                ) : (
                  <input
                    disabled
                    type="text"
                    className={`${inputClass} opacity-75 cursor-not-allowed`}
                    value={formData.assignee_name}
                  />
                )}
              </div>

              {/* HEDEF TARİH OLUŞTURMA (1 KERELİK TANIMLAMA) */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>Hedef Tarih (Termin)</span>
                  </span>
                  {isTargetDateLocked && !superAdmin ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 normal-case">
                      <Lock className="w-3 h-3" /> 1 Kerelik Hedef Girildi
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold normal-case">
                      1 Kereliğine Hedef Tarih Giriniz
                    </span>
                  )}
                </label>

                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      disabled={!canEditTargetDate}
                      className={`flex-1 ${inputClass} ${
                        canEditTargetDate ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'
                      }`}
                      value={formData.target_date || ''}
                      onChange={(e) => handleFormChange('target_date', e.target.value)}
                    />
                  </div>

                  {canEditTargetDate && (
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '+1 Hafta', days: 7 },
                        { label: '+2 Hafta', days: 14 },
                        { label: '+1 Ay', days: 30 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            const d = new Date(Date.now() + preset.days * 86400000)
                              .toISOString()
                              .split('T')[0];
                            handleFormChange('target_date', d);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-slate-700 hover:bg-indigo-100 rounded-lg cursor-pointer transition-colors"
                        >
                          {preset.label} ({toDisplayDate(new Date(Date.now() + preset.days * 86400000).toISOString())})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Alt Başlıklar (İlk Aksiyon: Hedef Tanımlamak) */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Aksiyon Adımları (İlk Adım: Hedef Tanımlamak)
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    İlk aksiyon otomatik olarak &quot;Hedef Tanımlamak&quot; gelir. Hedef tarih girildiğinde otomatik tamamlanır.
                  </p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={addSubAction}
                    className="text-xs flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3.5 py-2 rounded-xl hover:bg-indigo-200 transition-colors font-bold cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" /> Yeni Alt Aksiyon Ekle
                  </button>
                )}
              </div>

              {formData.sub_actions?.length > 0 ? (
                <div className="space-y-2.5">
                  {formData.sub_actions.map((sub, idx) => {
                    const isLast = idx === formData.sub_actions.length - 1;
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white dark:bg-slate-800 p-3.5 rounded-xl border transition-colors ${
                          sub.completed
                            ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/20 dark:border-emerald-500/40'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(sub.completed)}
                          onChange={(e) => updateSubAction(idx, 'completed', e.target.checked)}
                          className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer flex-shrink-0"
                        />
                        <input
                          type="text"
                          disabled={!canManage && idx === 0}
                          placeholder="Alt aksiyon tanımı..."
                          className={`flex-1 w-full bg-transparent border-b border-slate-200 dark:border-slate-600 p-1 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 ${
                            sub.completed ? 'line-through text-slate-400' : ''
                          }`}
                          value={sub.title}
                          onChange={(e) => updateSubAction(idx, 'title', e.target.value)}
                        />
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          {canManage ? (
                            <div className="flex-1 sm:w-32 flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                disabled={isLast}
                                className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 ${
                                  isLast ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                value={sub.weight}
                                onChange={(e) =>
                                  updateSubAction(idx, 'weight', toInt(e.target.value))
                                }
                              />
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-9">
                                %{sub.weight}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-xs text-slate-500">%{sub.weight}</span>
                          )}
                          {canManage && formData.sub_actions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSubAction(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* HATA KARTI & AKSİYON GELİŞME NOTLARI (Her Aksiyonda Görünür) */}
            <div className="bg-violet-50/60 dark:bg-slate-900 p-5 rounded-2xl border border-violet-200/90 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between border-b border-violet-200/70 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="font-black text-slate-800 dark:text-white text-xs sm:text-sm uppercase tracking-wider">
                    {currentAction?.issue_id
                      ? `Hata Kartı (#${currentAction.issue_id}) & Aksiyon Gelişme Notları`
                      : 'Gelişme Notları'}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/20 px-2.5 py-0.5 rounded-full">
                  {combinedNotes.length} Not
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                {combinedNotes.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-3 text-center">
                    Henüz gelişme notu bulunmuyor. Aşağıdan yeni gelişme notu ekleyebilirsiniz.
                  </div>
                ) : (
                  combinedNotes.map((note, nIdx) => (
                    <div
                      key={nIdx}
                      className="bg-white dark:bg-slate-800 border border-violet-100 dark:border-slate-700 rounded-xl p-3 text-xs shadow-2xs"
                    >
                      <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                        <span className="font-bold text-violet-700 dark:text-amber-400">
                          {note.sender || 'Kullanıcı'}
                        </span>
                        <span>{formatDateTime(note.timestamp)}</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {note.text}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {isEditing && (
                <div className="flex gap-2 pt-2 border-t border-violet-200/60 dark:border-slate-800">
                  <input
                    type="text"
                    placeholder="Gelişme notu yazın (Hata kartına ve aksiyona işlenir)..."
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500"
                    value={newIssueNote}
                    onChange={(e) => setNewIssueNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddIssueNote();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddIssueNote}
                    disabled={!newIssueNote.trim()}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
                  >
                    Not Ekle
                  </button>
                </div>
              )}
            </div>

            {/* Genel İlerleme Durumu */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                <span>Genel İlerleme Durumu</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-black text-base">
                  %{formData.progress}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${getProgressColor(formData.progress)} transition-all duration-300`}
                  style={{ width: `${formData.progress || 0}%` }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleGoBack}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm cursor-pointer"
              >
                Listeye Dön
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-bold text-xs sm:text-sm shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Kaydediliyor...' : 'Aksiyonu Kaydet'}
              </button>
            </div>
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

function ActionList({ actions, onSelect, getCombinedNotes }) {
  if (actions.length === 0) {
    return (
      <div className="p-10 text-center bg-white/95 dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
        <UserCheck className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
          Kayıtlı Aksiyon Bulunamadı
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Hata kartı açıldığında ilgili bölüm yöneticisine otomatik olarak aksiyon düşer veya yukarıdaki butondan yeni aksiyon tanımlayabilirsiniz.
        </p>
      </div>
    );
  }

  const statusBadge = (status) =>
    status === ACTION_STATUS.DONE
      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300'
      : 'bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300';

  return (
    <div className="w-full">
      {/* Mobil Görünüm */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {actions.map((action) => {
          const notes = getCombinedNotes(action);
          const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;
          return (
            <div
              key={action.id}
              onClick={() => onSelect(action)}
              className="bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 cursor-pointer hover:border-indigo-300 transition-all"
            >
              <div className="flex justify-between items-start mb-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusBadge(action.status)}`}>
                    {action.status}
                  </span>
                  {action.issue_id && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      Hata Kartı #{action.issue_id}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  %{action.progress || 0}
                </span>
              </div>

              <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                {action.assignee_name}
              </p>
              <p className="text-slate-700 dark:text-slate-300 text-xs line-clamp-2 mb-2">
                {action.action_content}
              </p>

              {lastNote && (
                <div className="bg-violet-50 dark:bg-slate-800/80 border border-violet-100 dark:border-slate-700 rounded-xl p-2 mb-2 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                  <b className="text-violet-700 dark:text-violet-300">Not:</b> {lastNote.text}
                </div>
              )}

              <div className="text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2.5 flex justify-between items-center">
                <span>
                  İlk Aksiyon: <b className="text-slate-700 dark:text-slate-200">{action.sub_actions?.[0]?.title || 'Hedef Tanımlamak'}</b>
                </span>
                <span>
                  Hedef:{' '}
                  <b className="text-indigo-700 dark:text-amber-300">
                    {action.target_date ? formatDate(action.target_date) : 'Bekleniyor (1 Kerelik)'}
                  </b>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Masaüstü Görünüm */}
      <div className="hidden md:block bg-white/95 dark:bg-slate-900/95 shadow-sm rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-slate-50/90 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Durum</th>
                <th className="px-4 py-3.5">Sorumlu Bölüm / Kişi</th>
                <th className="px-4 py-3.5">Aksiyon Konusu & İlk Adım</th>
                <th className="px-4 py-3.5">Gelişme Notları</th>
                <th className="px-4 py-3.5">Hedef Tarih</th>
                <th className="px-4 py-3.5">İlerleme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {actions.map((action) => {
                const notes = getCombinedNotes(action);
                const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;
                return (
                  <tr
                    key={action.id}
                    onClick={() => onSelect(action)}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusBadge(action.status)}`}>
                        {action.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {action.assignee_name}
                    </td>
                    <td className="px-4 py-3.5 max-w-sm">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {action.action_content}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {action.issue_id && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300">
                            Kart #{action.issue_id}
                          </span>
                        )}
                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          1. Adım: {action.sub_actions?.[0]?.title || 'Hedef Tanımlamak'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      {lastNote ? (
                        <div className="bg-violet-50/80 dark:bg-slate-800 border border-violet-200/70 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 truncate">
                          <span className="font-bold text-violet-700 dark:text-violet-300">
                            {lastNote.sender}:{' '}
                          </span>
                          {lastNote.text}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Not eklenmemiş</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {action.target_date ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {formatDate(action.target_date)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 px-2.5 py-1 rounded-full text-[11px]">
                          Hedef Girilecek (1 Kerelik)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(action.progress)}`}
                            style={{ width: `${action.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-9 text-right">
                          %{action.progress || 0}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
