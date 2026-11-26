import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Building2,
  Check,
  CheckCircle,
  Cpu,
  Database,
  Mail,
  Pencil,
  Plus,
  Send,
  Settings,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import { apiFetch } from '../lib/api';
import { notifyCatalogUpdated } from '../hooks/useCatalog';
import { useUsers } from '../hooks/useUsers';
import { useToast } from '../hooks/useToast';
import { OPTION_CLASS, isManager, isSuperAdmin } from '../lib/constants';
import UserManagement from './UserManagement';
import ConfirmDialog from './ui/ConfirmDialog';
import PortalBackButton from './ui/PortalBackButton';
import Toast from './ui/Toast';

const VALID_TABS = ['users', 'machines', 'departments', 'system'];

const TABS = [
  { id: 'users', label: 'Kullanıcı Yönetimi', Icon: Users },
  { id: 'machines', label: 'Tezgah / Alan Yönetimi', Icon: Cpu },
  { id: 'departments', label: 'Bölüm Yönetimi', Icon: Building2 },
  { id: 'system', label: 'Sistem & E-posta', Icon: Settings },
];

const normalizeTab = (tab) => (VALID_TABS.includes(tab) ? tab : 'users');

export default function AdminPanel({ currentUser, initialTab = 'users', onBack }) {
  const [activeTab, setActiveTab] = useState(() => normalizeTab(initialTab));
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);

  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(normalizeTab(initialTab));
  }

  if (!isManager(currentUser)) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-8 animate-fade-in">
        {onBack && (
          <div className="mb-4">
            <PortalBackButton onBack={onBack} />
          </div>
        )}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center space-y-2">
          <Shield className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-red-700 dark:text-red-400">Yetkisiz Erişim</h2>
          <p className="text-sm text-red-600 dark:text-red-300">
            Yönetim Paneli yalnızca sistem yöneticileri (Admin / Süper Admin) tarafından
            kullanılabilir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-10 animate-fade-in">
      {/* Üst Başlık */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate">
                Yönetim Paneli
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Kullanıcı, tezgah/alan, bölüm ve sistem bildirim ayarlarını tek yerden yönetin.
              </p>
            </div>
          </div>
          {onBack && (
            <div className="shrink-0">
              <PortalBackButton onBack={onBack} />
            </div>
          )}
        </div>

        {/* Yatay kaydırılabilir (slide) sekme çubuğu */}
        <div className="mt-5 -mx-4 sm:mx-0 px-4 sm:px-0 border-t border-gray-100 dark:border-slate-700 pt-3 overflow-x-auto no-scrollbar">
          <div className="inline-flex items-center gap-1.5 min-w-full sm:min-w-0 whitespace-nowrap">
            {TABS.map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sekme İçerikleri */}
      {activeTab === 'users' && <UserManagement currentUser={currentUser} embedded />}
      {activeTab === 'machines' && <MachinesTab />}
      {activeTab === 'departments' && <DepartmentsTab />}
      {activeTab === 'system' && <SystemTab currentUser={currentUser} />}
    </div>
  );
}

function MachinesTab() {
  const { users } = useUsers();
  const { toast, showToast, hideToast } = useToast();

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadMachines = useCallback(async () => {
    try {
      const data = await apiFetch('/machines');
      setMachines(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/machines')
      .then((data) => {
        if (!cancelled) setMachines(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) showToast(err.message, true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await apiFetch('/machines', { method: 'POST', body: { name: trimmed } });
      setNewName('');
      showToast('Tezgah eklendi.');
      notifyCatalogUpdated();
      await loadMachines();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setAdding(false);
    }
  };

  const handleRename = async (machineId) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      showToast('Tezgah adı boş olamaz.', true);
      return;
    }
    setSavingId(machineId);
    try {
      await apiFetch(`/machines/${machineId}`, { method: 'PUT', body: { name: trimmed } });
      setEditingId(null);
      setEditingName('');
      showToast('Tezgah adı güncellendi.');
      notifyCatalogUpdated();
      await loadMachines();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSavingId(null);
    }
  };

  const handleManagerChange = async (machineId, managerValue) => {
    setSavingId(machineId);
    try {
      const manager_id = managerValue ? Number(managerValue) : null;
      await apiFetch(`/machines/${machineId}/manager`, {
        method: 'PUT',
        body: { manager_id },
      });
      showToast(manager_id ? 'Tezgah yöneticisi atandı.' : 'Yönetici ataması kaldırıldı.');
      notifyCatalogUpdated();
      await loadMachines();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    try {
      await apiFetch(`/machines/${target.id}`, { method: 'DELETE' });
      showToast('Tezgah silindi.');
      notifyCatalogUpdated();
      await loadMachines();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2 text-sm sm:text-base">
          <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Yeni Tezgah / Alan Ekle</span>
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            required
            maxLength={40}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Örn: MP4000, Pres-12, Kalıp Atölyesi..."
            className="flex-1 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{adding ? 'Ekleniyor...' : 'Tezgah Ekle'}</span>
          </button>
        </form>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Eklenen tezgah ve alanlar Hata Kartı, Otonom Bakım, İSG, 5S ve Tezgah İzleme formlarına
          anında yansır.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between gap-2 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2.5">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-sm sm:text-base">
            <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Tanımlı Tezgahlar / Alanlar</span>
          </h2>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
            {machines.length}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Yükleniyor...</p>
        ) : machines.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
            Henüz kayıtlı tezgah bulunmuyor.
          </p>
        ) : (
          <div className="space-y-3">
            {machines.map((machine) => {
              const isEditing = editingId === machine.id;
              const isBusy = savingId === machine.id;
              return (
                <div
                  key={machine.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600/80"
                >
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={40}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(machine.id);
                            if (e.key === 'Escape') {
                              setEditingId(null);
                              setEditingName('');
                            }
                          }}
                          autoFocus
                          className="flex-1 min-w-0 border border-indigo-400 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none"
                        />
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRename(machine.id)}
                          className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition cursor-pointer disabled:opacity-50"
                          aria-label="Tezgah adını kaydet"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingName('');
                          }}
                          className="p-2 rounded-lg bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-500 transition cursor-pointer"
                          aria-label="Düzenlemeyi iptal et"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                          {machine.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {machine.parts_count ? `${machine.parts_count} kayıtlı PDF` : 'PDF yok'}
                          {machine.manager_name ? ` · Sorumlu: ${machine.manager_name}` : ''}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`machine-mgr-${machine.id}`}
                        className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0"
                      >
                        Yönetici:
                      </label>
                      <select
                        id={`machine-mgr-${machine.id}`}
                        disabled={isBusy}
                        value={machine.manager_id || ''}
                        onChange={(e) => handleManagerChange(machine.id, e.target.value)}
                        className="w-full sm:w-44 border border-gray-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 outline-none focus:border-indigo-500 disabled:opacity-60"
                      >
                        <option value="" className={OPTION_CLASS}>
                          — Atanmadı —
                        </option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id} className={OPTION_CLASS}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-gray-200 dark:border-slate-600">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(machine.id);
                            setEditingName(machine.name);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Düzenle</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingDelete(machine)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition cursor-pointer"
                        aria-label={`${machine.name} tezgahını sil`}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sm:hidden">Sil</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Tezgahı Sil"
          message={`"${pendingDelete.name}" tezgahını ve bağlı PDF kayıtlarını silmek istediğinize emin misiniz?`}
          confirmLabel="Evet, Sil"
          cancelLabel="Vazgeç"
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}

function DepartmentsTab() {
  const { toast, showToast, hideToast } = useToast();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadDepartments = useCallback(async () => {
    try {
      const data = await apiFetch('/departments');
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/departments')
      .then((data) => {
        if (!cancelled) setDepartments(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) showToast(err.message, true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await apiFetch('/departments', { method: 'POST', body: { name: trimmed } });
      setNewName('');
      showToast('Bölüm eklendi.');
      notifyCatalogUpdated();
      await loadDepartments();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    try {
      await apiFetch(`/departments/${target.id}`, { method: 'DELETE' });
      showToast('Bölüm silindi.');
      notifyCatalogUpdated();
      await loadDepartments();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2 text-sm sm:text-base">
          <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Yeni Bölüm Ekle</span>
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            required
            maxLength={60}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Örn: Bakım Onarım, Üretim Planlama..."
            className="flex-1 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{adding ? 'Ekleniyor...' : 'Bölüm Ekle'}</span>
          </button>
        </form>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Eklenen bölümler tüm modüllerdeki bölüm seçim listelerine ve filtrelere anında yansır.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between gap-2 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2.5">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-sm sm:text-base">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Tanımlı Bölümler</span>
          </h2>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
            {departments.length}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Yükleniyor...</p>
        ) : departments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
            Henüz kayıtlı bölüm bulunmuyor.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600/80"
              >
                <span className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">
                  {dept.name}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingDelete(dept)}
                  className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition cursor-pointer shrink-0"
                  aria-label={`${dept.name} bölümünü sil`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Bölümü Sil"
          message={`"${pendingDelete.name}" bölümünü listeden silmek istediğinize emin misiniz?`}
          confirmLabel="Evet, Sil"
          cancelLabel="Vazgeç"
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}

function SystemTab({ currentUser }) {
  const isSuper = isSuperAdmin(currentUser);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(isSuper);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!isSuper) return;
    let cancelled = false;
    apiFetch('/notifications/email-status')
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch((err) => {
        if (!cancelled) setFeedback({ type: 'error', message: err.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSuper]);

  const handleTest = async () => {
    setSending(true);
    setFeedback(null);
    try {
      const data = await apiFetch('/notifications/test-email', { method: 'POST' });
      setFeedback({ type: 'success', message: data.message || 'Test e-postası gönderildi.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSending(false);
    }
  };

  const enabled = Boolean(status?.enabled);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          <span>E-posta Bildirim Altyapısı</span>
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Hata kartları, aksiyon atamaları, İSG bildirimleri ve bakım uyarıları ilgili kişilere
          Resend altyapısı üzerinden otomatik e-posta olarak gönderilir.
        </p>

        {!isSuper ? (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-sm">
            <Mail className="w-5 h-5 shrink-0 mt-0.5" />
            <span>
              E-posta servis durumu ve test gönderimi yalnızca <strong>Süper Admin</strong>{' '}
              yetkisine sahip hesaplar tarafından görüntülenip tetiklenebilir.
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Durum yükleniyor...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-700/70">
                  <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                    Durum
                  </div>
                  <div
                    className={`font-bold flex items-center gap-2 ${
                      enabled
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {enabled ? (
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{enabled ? 'Aktif' : 'Kapalı (RESEND_API_KEY tanımlı değil)'}</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-700/70 min-w-0">
                  <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                    Gönderen
                  </div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 break-words">
                    {status?.from || '-'}
                  </div>
                </div>
              </div>
            )}

            {feedback && (
              <div
                className={`p-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                  feedback.type === 'error'
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}
              >
                {feedback.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleTest}
              disabled={sending || !enabled}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-4 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'Gönderiliyor...' : 'Test E-postası Gönder'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Database className="w-5 h-5 text-green-500" />
          <span>Sistem Bilgisi</span>
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2 font-mono border-b border-gray-200 dark:border-slate-700 pb-4 mb-4">
          <p>Uygulama Sürümü: v1.3.0</p>
          <p>Veritabanı Motoru: SQLite3 (Local)</p>
          <p>API Adresi: {import.meta.env.VITE_API_URL || 'aynı sunucu (proxy)'}</p>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
          <p>
            Created by <span className="font-bold text-gray-900 dark:text-white">Kaya Sertel</span>
          </p>
          <p>kaya.sertel98@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
