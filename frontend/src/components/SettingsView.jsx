import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Database,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Shield,
  Sun,
  UserCircle,
} from 'lucide-react';

import { useTheme } from '../contexts/ThemeContext';
import { apiFetch } from '../lib/api';
import { ROLES, isManager } from '../lib/constants';

const MIN_PASSWORD_LENGTH = 6;

const ROLE_DESCRIPTIONS = {
  [ROLES.SUPER_ADMIN]: { text: 'Süper Admin (Tüm Yetkiler)', color: 'text-purple-500' },
  [ROLES.ADMIN]: { text: 'Sistem Yöneticisi', color: 'text-red-500' },
  [ROLES.STANDARD]: { text: 'Standart Kullanıcı', color: 'text-blue-500' },
};

const THEME_OPTIONS = [
  { value: 'light', label: 'Açık Tema', Icon: Sun },
  { value: 'dark', label: 'Koyu Tema', Icon: Moon },
  { value: 'system', label: 'Sistem Teması', Icon: Monitor },
];

export default function SettingsView({ currentUser, onOpenAdmin, onLogout }) {
  const { theme, setTheme } = useTheme();

  const [passwords, setPasswords] = useState({ old: '', next: '', confirm: '' });
  const [status, setStatus] = useState(null);
  const [isChanging, setIsChanging] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwords.next !== passwords.confirm) {
      setStatus({ type: 'error', message: 'Yeni şifreler birbiriyle eşleşmiyor!' });
      return;
    }
    if (passwords.next.length < MIN_PASSWORD_LENGTH) {
      setStatus({
        type: 'error',
        message: `Yeni şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.`,
      });
      return;
    }

    setIsChanging(true);
    setStatus(null);
    try {
      await apiFetch('/change-password', {
        method: 'POST',
        body: { oldPassword: passwords.old, newPassword: passwords.next },
      });
      setStatus({ type: 'success', message: 'Şifreniz başarıyla değiştirildi.' });
      setPasswords({ old: '', next: '', confirm: '' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsChanging(false);
    }
  };

  const roleInfo = ROLE_DESCRIPTIONS[currentUser?.role] || ROLE_DESCRIPTIONS[ROLES.STANDARD];
  const passwordInputClass =
    'w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      {/* Yöneticiler için Yönetim Paneli Yönlendirme Kartı */}
      {isManager(currentUser) && (
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-700 dark:to-slate-800 p-5 sm:p-6 rounded-2xl shadow-md text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="p-2.5 rounded-xl bg-white/15 shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black leading-snug">
                Yönetim Paneli (Kullanıcı, Tezgah &amp; Bölüm Yönetimi)
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100 mt-1">
                Kullanıcı hesapları, tezgah/alan listesi, bölüm tanımları ve e-posta ayarlarını
                Yönetim Paneli üzerinden yönetebilirsiniz.
              </p>
            </div>
          </div>
          {onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition shrink-0 cursor-pointer"
            >
              <span>Yönetim Panelini Aç</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Profil */}
      <Card title="Profil Bilgileri" icon={<UserCircle className="text-blue-500" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Field label="Ad Soyad">{currentUser?.name}</Field>
          <Field label="E-Posta Adresi">{currentUser?.email}</Field>
          {currentUser?.department && <Field label="Bölüm">{currentUser.department}</Field>}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Hesap Yetkisi
            </label>
            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg font-semibold flex items-center gap-2 text-sm sm:text-base">
              <Shield className={`w-5 h-5 shrink-0 ${roleInfo.color}`} />
              <span className="dark:text-gray-200">{roleInfo.text}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Şifre Değiştirme */}
      <Card title="Şifre Değiştirme" icon={<Lock className="text-red-500" />}>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          {status && (
            <div
              className={`p-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                status.type === 'error'
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}
            >
              {status.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          {[
            { key: 'old', label: 'Mevcut Şifre', autoComplete: 'current-password' },
            { key: 'next', label: 'Yeni Şifre', autoComplete: 'new-password' },
            { key: 'confirm', label: 'Yeni Şifre (Tekrar)', autoComplete: 'new-password' },
          ].map(({ key, label, autoComplete }) => (
            <div key={key}>
              <label
                htmlFor={`password-${key}`}
                className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1"
              >
                {label}
              </label>
              <input
                id={`password-${key}`}
                type="password"
                required
                autoComplete={autoComplete}
                value={passwords[key]}
                onChange={(e) => setPasswords((prev) => ({ ...prev, [key]: e.target.value }))}
                className={passwordInputClass}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={isChanging}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isChanging ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
      </Card>

      {/* Tema */}
      <Card title="Görünüm ve Tema" icon={<Monitor className="text-purple-500" />}>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Uygulamanın renk temasını göz zevkinize göre özelleştirebilirsiniz.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {THEME_OPTIONS.map(({ value, label, Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  active
                    ? 'border-blue-500 bg-blue-50 dark:bg-slate-700'
                    : 'border-gray-200 dark:border-slate-600 hover:border-blue-300'
                }`}
              >
                <Icon
                  className={`w-7 h-7 sm:w-8 sm:h-8 mb-2 ${
                    active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                  }`}
                />
                <span
                  className={`text-sm font-bold ${
                    active
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Sistem Bilgisi */}
      <Card title="Sistem Bilgisi" icon={<Database className="text-green-500" />}>
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2 font-mono border-b border-gray-200 dark:border-slate-700 pb-4 mb-4">
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
      </Card>

      {/* Oturumu Kapat */}
      {onLogout && (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-rose-200/80 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-rose-500" /> Oturumu Kapat
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Mevcut hesabınızdan güvenli bir şekilde çıkış yapabilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      )}
    </div>
  );
}

function Card({ title, icon, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
      <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
        {label}
      </label>
      <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-sm sm:text-base text-gray-800 dark:text-gray-200 font-semibold break-words">
        {children}
      </div>
    </div>
  );
}
