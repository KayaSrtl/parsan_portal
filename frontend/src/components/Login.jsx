import { useState } from 'react';
import { Eye, EyeOff, RefreshCw, ServerCrash, Flame, Shield } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useServerStatus } from '../hooks/useServerStatus';
import ForgeAtmosphere from './ForgeAtmosphere';

// Demo hesapları yalnızca geliştirme ortamında göster.
const DEMO_ACCOUNTS = import.meta.env.DEV
  ? [
      { label: 'Süper Admin', email: 'kaya.sertel98@gmail.com' },
      { label: 'Yönetici', email: 'dsaatcioglu@parsan.com' },
      { label: 'Standart', email: 'ahmet@gmail.com' },
    ]
  : [];

export default function Login() {
  const { login, sessionMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { status: serverStatus, retry, check } = useServerStatus();

  const isOffline = serverStatus === 'offline';
  const baseUrl = import.meta.env.BASE_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);
    if (!result.success) {
      const online = await check();
      if (online) setError(result.error);
    }
  };

  const message = isOffline ? '' : error || sessionMessage;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-white overflow-hidden p-4 select-none">
      {/* Kor, kıvılcım ve havada salınan dövme görselleri atmosferi */}
      <ForgeAtmosphere density={35} showFloatingProps={true} />

      {/* =========================================================================
          GİRİŞ KARTI (THE FORGE LOGIN BOX)
          ========================================================================= */}
      <div className="relative z-20 w-full max-w-md bg-slate-900/95 backdrop-blur-xl p-8 rounded-2xl border-2 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden">
        {/* Üst lav gradient çizgisi */}
        <div className="absolute top-0 left-0 right-0 molten-gradient h-1.5" />

        <div className="flex flex-col items-center mb-6">
          <div className="relative p-2 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-800 to-slate-900 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.3)] mb-4">
            <img
              src={`${baseUrl}parsanlogo.jpeg`}
              alt="Parsan Logo"
              className="w-16 h-16 object-contain bg-white p-2 rounded-xl shadow-md"
            />
            <div className="absolute -top-1 -right-1">
              <Flame className="w-5 h-5 text-red-500 animate-bounce" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-black uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            Ağır Dövme Çelik Sanayii
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-center tracking-tight">
            <span className="forge-text-gradient">PARSAN</span>{' '}
            <span className="molten-text-gradient">PORTAL</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1 text-center font-medium">
            5S İşletme ve Saha Operasyonları
          </p>
        </div>

        {isOffline && (
          <div
            role="alert"
            className="bg-red-950/80 border border-red-500 text-red-300 px-4 py-3 rounded-xl mb-4 text-xs"
          >
            <div className="flex items-start gap-3">
              <ServerCrash className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1">
                <p className="font-bold">Sunucuya ulaşılamıyor</p>
                <p className="mt-1 text-red-300/80">
                  Sunucu kapalı veya tünel bağlantısı yok. Otomatik tekrar deneniyor...
                </p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-400 underline hover:no-underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Şimdi tekrar dene
                </button>
              </div>
            </div>
          </div>
        )}

        {serverStatus === 'checking' && (
          <div className="text-center text-xs text-amber-400 mb-4 animate-pulse font-bold">
            ⚡ Sunucu bağlantısı kontrol ediliyor...
          </div>
        )}

        {message && (
          <div className="bg-red-950/80 border border-red-500/80 text-red-300 px-4 py-3 rounded-xl mb-4 font-bold text-xs text-center shadow-lg">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {DEMO_ACCOUNTS.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 justify-center">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => setEmail(account.email)}
                  className="text-[11px] font-bold bg-slate-800 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg hover:bg-slate-700 hover:border-amber-400 transition-colors"
                >
                  {account.label}
                </button>
              ))}
            </div>
          )}

          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1"
            >
              E-Posta Adresi
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="username"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none text-white text-sm transition-all placeholder:text-gray-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@parsan.com"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1"
            >
              Şifre
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 pr-12 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none text-white text-sm transition-all placeholder:text-gray-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-amber-400 transition-colors"
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isOffline}
            className="w-full py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wider text-white bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:via-orange-500 hover:to-amber-400 shadow-[0_4px_25px_rgba(234,88,12,0.45)] hover:shadow-[0_6px_30px_rgba(249,115,22,0.6)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Doğrulanıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-gray-400 font-medium">
            🔥 Sıcak Dövme Pres Hatları & Talaşlı İmalat
          </p>
        </div>
      </div>
    </div>
  );
}
