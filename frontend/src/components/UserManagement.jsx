import { useState } from 'react';
import { Shield, Trash2, User as UserIcon, UserPlus } from 'lucide-react';

import { apiFetch } from '../lib/api';
import { useUsers } from '../hooks/useUsers';
import { useToast } from '../hooks/useToast';
import { OPTION_CLASS, ROLES, ROLE_LABELS, isSuperAdmin } from '../lib/constants';
import ConfirmDialog from './ui/ConfirmDialog';
import Toast from './ui/Toast';

const EMPTY_FORM = { id: null, name: '', email: '', password: '', role: ROLES.STANDARD };

const ROLE_BADGE = {
  [ROLES.SUPER_ADMIN]: { className: 'bg-purple-600', label: 'Süper Admin' },
  [ROLES.ADMIN]: { className: 'bg-blue-600', label: 'Yönetici' },
  [ROLES.STANDARD]: { className: 'bg-gray-500', label: 'Standart' },
};

export default function UserManagement({ currentUser }) {
  const { users, loading, refresh } = useUsers();
  const { toast, showToast, hideToast } = useToast();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  if (!isSuperAdmin(currentUser)) {
    return <div className="p-8 text-center text-red-500 font-bold">Yetkisiz Erişim</div>;
  }

  const isEditing = Boolean(formData.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiFetch(isEditing ? `/users/${formData.id}` : '/users', {
        method: isEditing ? 'PUT' : 'POST',
        body: {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
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
    'w-full border dark:border-slate-600 rounded p-2 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white outline-none focus:border-blue-500';

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-8">
        <Shield className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100">
          Kullanıcı Yönetimi (Süper Admin)
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 bg-white dark:bg-slate-800 p-5 rounded-lg shadow border border-gray-200 dark:border-slate-700 h-fit">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2 border-b dark:border-slate-700 pb-2">
            <UserPlus className="w-5 h-5" /> {isEditing ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                Ad Soyad
              </label>
              <input
                required
                type="text"
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
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value} className={OPTION_CLASS}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition disabled:opacity-60"
              >
                {isSaving ? 'Kaydediliyor...' : isEditing ? 'Güncelle' : 'Ekle'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setFormData(EMPTY_FORM)}
                  className="px-4 bg-gray-500 text-white font-bold py-2 rounded hover:bg-gray-600 transition"
                >
                  İptal
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="md:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-lg shadow border border-gray-200 dark:border-slate-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2 border-b dark:border-slate-700 pb-2">
            <UserIcon className="w-5 h-5" /> Kayıtlı Kullanıcılar
          </h3>
          {loading ? (
            <p className="text-gray-500">Yükleniyor...</p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => {
                const badge = ROLE_BADGE[user.role] || ROLE_BADGE[ROLES.STANDARD];
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded border border-gray-200 dark:border-slate-600"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <span className="truncate">{user.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded text-white uppercase flex-shrink-0 ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {user.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() =>
                          setFormData({
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            password: '',
                          })
                        }
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded transition text-sm font-bold"
                      >
                        Düzenle
                      </button>
                      {user.id !== currentUser.id && (
                        <button
                          onClick={() => setPendingDelete(user)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded transition"
                          aria-label={`${user.name} kullanıcısını sil`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
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
