import { useState } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle,
  Database,
  Lock,
  Monitor,
  Moon,
  Shield,
  Sun,
  UserCircle,
} from 'lucide-react';

import { useTheme } from '../contexts/ThemeContext';
import { apiFetch } from '../lib/api';
import { ROLES } from '../lib/constants';
import UserManagement from './UserManagement';
import PortalBackButton from './ui/PortalBackButton';

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

export default function SettingsView({ currentUser, onBack }) {
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

  const roleInfo = ROLE_DESCRIPTIONS[currentUser.role] || ROLE_DESCRIPTIONS[ROLES.STANDARD];
  const passwordInputClass =
    'w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      {onBack && (
        <div className="mb-2">
          <PortalBackButton onBack={onBack} />
        </div>
      )}
      {/* Profil */}
      <Card title="Profil Bilgileri" icon={<UserCircle className="text-blue-500" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Ad Soyad">{currentUser.name}</Field>
          <Field label="E-Posta Adresi">{currentUser.email}</Field>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Hesap Yetkisi
            </label>
            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg font-semibold flex items-center gap-2">
              <Shield className={`w-5 h-5 ${roleInfo.color}`} />
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
              className={`p-3 rounded-md text-sm font-semibold flex items-center gap-2 ${
                status.type === 'error'
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}
            >
              {status.type === 'error' ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {status.message}
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
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md shadow transition-colors disabled:opacity-50"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {THEME_OPTIONS.map(({ value, label, Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  active
                    ? 'border-blue-500 bg-blue-50 dark:bg-slate-700'
                    : 'border-gray-200 dark:border-slate-600 hover:border-blue-300'
                }`}
              >
                <Icon
                  className={`w-8 h-8 mb-2 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}
                />
                <span
                  className={`font-bold ${
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

      {/* Bildirimler (yakında) */}
      <div className="opacity-70">
        <Card
          title={
            <>
              Bildirim Tercihleri
              <span className="text-xs bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded ml-2">
                Yakında
              </span>
            </>
          }
          icon={<Bell className="text-yellow-500" />}
        >
          <div className="space-y-3">
            {[
              'Bana atanan problemlerde e-posta gönder',
              'Problemler hedef tarihi geçtiğinde uyar',
            ].map((text) => (
              <label key={text} className="flex items-center gap-3 cursor-not-allowed">
                <input
                  type="checkbox"
                  disabled
                  defaultChecked
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300 font-medium">{text}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      {currentUser.role === ROLES.SUPER_ADMIN && (
        <div className="mt-8">
          <UserManagement currentUser={currentUser} />
        </div>
      )}

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
    </div>
  );
}

function Card({ title, icon, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
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
      <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-gray-800 dark:text-gray-200 font-semibold break-words">
        {children}
      </div>
    </div>
  );
}
