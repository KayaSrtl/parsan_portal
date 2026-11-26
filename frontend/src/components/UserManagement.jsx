import { useMemo, useState } from 'react';
import { Pencil, Shield, Trash2, User as UserIcon, UserPlus } from 'lucide-react';

import { apiFetch } from '../lib/api';
import { useUsers } from '../hooks/useUsers';
import { useCatalog } from '../hooks/useCatalog';
import { useToast } from '../hooks/useToast';
import {
  OPTION_CLASS,
  ROLES,
  ROLE_LABELS,
  isManager,
  isSuperAdmin,
} from '../lib/constants';
import ConfirmDialog from './ui/ConfirmDialog';
import Toast from './ui/Toast';

const EMPTY_FORM = {
  id: null,
  name: '',
  email: '',
  password: '',
  role: ROLES.STANDARD,
  department: '',
};

const ROLE_BADGE = {
  [ROLES.SUPER_ADMIN]: { className: 'bg-purple-600 text-white', label: 'Süper Admin' },
  [ROLES.ADMIN]: { className: 'bg-blue-600 text-white', label: 'Yönetici' },
  [ROLES.STANDARD]: { className: 'bg-slate-500 text-white', label: 'Standart' },
};

export default function UserManagement({ currentUser, embedded = false }) {
  const { users, loading, refresh } = useUsers();
  const { departmentNames } = useCatalog();
  const { toast, showToast, hideToast } = useToast();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const isSuper = isSuperAdmin(currentUser);
  const canManage = isManager(currentUser);

  const assignableRoles = useMemo(
    () =>
      Object.entries(ROLE_LABELS).filter(
        ([value]) => value !== ROLES.GUEST && (isSuper || value !== ROLES.SUPER_ADMIN)
      ),
    [isSuper]
  );

  const departmentOptions = useMemo(() => {
    const list = [...departmentNames];
    if (formData.department && !list.includes(formData.department)) {
      list.push(formData.department);
    }
    return list;
  }, [departmentNames, formData.department]);

  if (!canManage) {
    return (
      <div className="p-6 sm:p-8 text-center text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
        Yetkisiz Erişim — Bu alanı görüntülemek için yönetici yetkisi gerekir.
      </div>
    );
  }

  const isEditing = Boolean(formData.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiFetch(isEditing ? `/users/${formData.id}` : '/users', {
        method: isEditing ? 'PUT' : 'POST',
        body: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          department: formData.department,
        },
      });
      showToast(isEditing ? 'Kullanıcı güncellendi.' : 'Kullanıcı eklendi.');
      setFormData(EMPTY_FORM);
      refresh();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const user = pendingDelete;
    setPendingDelete(null);
    if (!user) return;
    try {
      await apiFetch(`/users/${user.id}`, { method: 'DELETE' });
      showToast('Kullanıcı silindi.');
      if (formData.id === user.id) setFormData(EMPTY_FORM);
      refresh();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const inputClass =
    'w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition';

  const containerClass = embedded
    ? 'animate-fade-in'
    : 'max-w-5xl mx-auto p-3 sm:p-6 animate-fade-in';

  return (
    <div className={containerClass}>
      {!embedded && (
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-gray-100 truncate">
              Kullanıcı Yönetimi
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Kullanıcı hesaplarını, rollerini ve bölüm atamalarını yönetin.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 h-fit">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-slate-700 pb-2.5 text-sm sm:text-base">
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{isEditing ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</span>
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                Ad Soyad
              </label>
              <input
                required
                type="text"
                placeholder="Örn: Ahmet Yılmaz"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                E-Posta
              </label>
              <input
                required
                type="email"
                placeholder="ornek@parsan.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                {isEditing ? 'Yeni Şifre (Boş bırakılabilir)' : 'Şifre'}
              </label>
              <input
                required={!isEditing}
                minLength={isEditing ? undefined : 6}
                type="password"
                autoComplete="new-password"
                placeholder={isEditing ? 'Değiştirmek için yazın' : 'En az 6 karakter'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className={inputClass}
              >
                {assignableRoles.map(([value, label]) => (
                  <option key={value} value={value} className={OPTION_CLASS}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                Bölüm (E-posta Bildirimleri)
              </label>
              <select
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className={inputClass}
              >
                <option value="" className={OPTION_CLASS}>
                  — Bölüm Yok —
                </option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept} className={OPTION_CLASS}>
                    {dept}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                İlgili bölümde açılan hata kartları bu kullanıcıya e-posta ile bildirilir.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-blue-600 text-white text-sm font-bold py-2.5 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-60 cursor-pointer"
              >
                {isSaving ? 'Kaydediliyor...' : isEditing ? 'Güncelle' : 'Kullanıcı Ekle'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setFormData(EMPTY_FORM)}
                  className="px-4 py-2.5 text-sm bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-100 font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition cursor-pointer"
                >
                  İptal
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2.5">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-sm sm:text-base">
              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Kayıtlı Kullanıcılar</span>
            </h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
              {users.length}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Yükleniyor...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
              Henüz kayıtlı kullanıcı bulunmuyor.
            </p>
          ) : (
            <div className="space-y-2.5">
              {users.map((user) => {
                const badge = ROLE_BADGE[user.role] || ROLE_BADGE[ROLES.STANDARD];
                const isTargetSuperAdmin = user.role === ROLES.SUPER_ADMIN;
                const canModifyTarget = isSuper || !isTargetSuperAdmin;
                const isSelf = Number(user.id) === Number(currentUser?.id);

                return (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gray-50 dark:bg-slate-700/60 rounded-xl border border-gray-200 dark:border-slate-600/80"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm sm:text-base text-gray-800 dark:text-gray-100 flex flex-wrap items-center gap-2">
                        <span className="truncate">{user.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all sm:truncate">
                        {user.email}
                        {user.department ? ` · ${user.department}` : ''}
                      </div>
                    </div>

                    {canModifyTarget ? (
                      <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200 dark:border-slate-600">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              id: user.id,
                              name: user.name,
                              email: user.email,
                              role: user.role,
                              department: user.department || '',
                              password: '',
                            })
                          }
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2.5 py-1.5 rounded-lg transition text-xs font-bold cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Düzenle</span>
                        </button>
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => setPendingDelete(user)}
                            className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-2.5 py-1.5 rounded-lg transition text-xs font-bold cursor-pointer"
                            aria-label={`${user.name} kullanıcısını sil`}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sm:hidden">Sil</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 shrink-0 self-end sm:self-center">
                        Korumalı
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Kullanıcıyı Sil"
          message={`"${pendingDelete.name}" kullanıcısını silmek istediğinize emin misiniz?`}
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
