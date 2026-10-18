import { useState } from 'react';
import { Eye, EyeOff, HardHat, KeyRound, RefreshCw, ServerCrash, Shield, User } from 'lucide-react';

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
  const { login, guestLogin, sessionMessage } = useAuth();
  const [loginMode, setLoginMode] = useState('operator'); // 'operator' | 'corporate'
  const [operatorName, setOperatorName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { status: serverStatus, retry, check } = useServerStatus();

  const isOffline = serverStatus === 'offline';
  const baseUrl = import.meta.env.BASE_URL;

  const handleCorporateSubmit = async (e) => {
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

  const handleOperatorSubmit = async (e) => {
    e.preventDefault();
    if (!operatorName.trim()) {
      setError('Lütfen Adınızı ve Soyadınızı giriniz.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    const result = await guestLogin(operatorName.trim());
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
    }
  };

  const message = isOffline ? '' : error || sessionMessage;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-white overflow-hidden p-4 select-none">
      {/* Endüstriyel hafif atmosfer ve teknik ızgara (Sıfır GPU yükü) */}
      <ForgeAtmosphere density={6} />

      {/* =========================================================================
          KURUMSAL GİRİŞ KARTI (INDUSTRIAL LOGIN PANEL)
          ========================================================================= */}
      <div className="relative z-20 w-full max-w-md bg-slate-900/95 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xs">
        {/* Üst zarif endüstriyel fırın çizgisi */}
        <div className="absolute top-0 left-0 right-0 forge-line-gradient h-1" />

        <div className="flex flex-col items-center mb-6">
          <div className="relative p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-sm mb-3">
            <img
              src={`${baseUrl}parsanlogo.jpeg`}
              alt="Parsan Logo"
              className="w-12 h-12 object-contain bg-white p-1 rounded-lg shadow-sm"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            Ağır Dövme Çelik Sanayii
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-center tracking-tight">
            <span className="forge-text-gradient">PARSAN</span>{' '}
            <span className="amber-text-gradient">PORTAL</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1 text-center font-medium">
            5S İşletme ve Saha Operasyonları Sistemi
          </p>
        </div>

        {/* Giriş Tipi Seçici Sekmeler (Pastel Modern UI) */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setLoginMode('operator');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              loginMode === 'operator'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <HardHat className="w-3.5 h-3.5 text-amber-400" />
            <span>Saha Operatörü</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginMode('corporate');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              loginMode === 'corporate'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-rose-400" />
            <span>Yönetici / Şifreli</span>
          </button>
        </div>

        {isOffline && (
          <div
            role="alert"
            className="bg-rose-950/80 border border-rose-500/60 text-rose-300 px-4 py-3 rounded-xl mb-4 text-xs"
          >
            <div className="flex items-start gap-3">
              <ServerCrash className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">
                <p className="font-bold">Sunucuya ulaşılamıyor</p>
                <p className="mt-1 text-rose-300/80">
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
          <div className="bg-rose-950/80 border border-rose-500/60 text-rose-300 px-4 py-3 rounded-xl mb-4 font-bold text-xs text-center shadow-lg">
            {message}
          </div>
        )}

        {/* =====================================================================
            1. SAHA OPERATÖR GİRİŞİ (E-postasız, İsim ile Hızlı Giriş)
            ===================================================================== */}
        {loginMode === 'operator' && (
          <form onSubmit={handleOperatorSubmit} className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 leading-relaxed">
              <span className="font-bold block text-amber-300 mb-1">📋 Saha Operatörü Hızlı Erişim:</span>
              E-posta adresi olmayan operatörler için tasarlanmıştır. Açacağınız hata kartları ve otonom bakım kayıtları girdiğiniz isimle ilişkilendirilecektir.
            </div>

            <div>
              <label
                htmlFor="operator-name"
                className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1 flex items-center justify-between"
              >
                <span>Operatör Adı Soyadı</span>
                <span className="text-amber-400 text-[10px] lowercase font-normal">*Zorunlu</span>
              </label>
              <div className="relative">
                <input
                  id="operator-name"
                  type="text"
                  required
                  autoFocus
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 pl-10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none text-white text-sm transition-all placeholder:text-gray-500"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                />
                <User className="w-4 h-4 text-amber-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !operatorName.trim()}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-150 disabled:opacity-50 cursor-pointer border border-amber-500/40"
            >
              {isSubmitting ? 'Giriş Yapılıyor...' : 'Operatör Olarak Başla'}
            </button>
          </form>
        )}

        {/* =====================================================================
            2. KURUMSAL VE YÖNETİCİ GİRİŞİ (E-posta ve Şifre)
            ===================================================================== */}
        {loginMode === 'corporate' && (
          <form onSubmit={handleCorporateSubmit} className="space-y-4">
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
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30 focus:outline-none text-white text-sm transition-all placeholder:text-gray-500"
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
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 pr-12 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30 focus:outline-none text-white text-sm transition-all placeholder:text-gray-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-rose-400 transition-colors"
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isOffline}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-150 disabled:opacity-50 cursor-pointer border border-rose-500/40"
            >
              {isSubmitting ? 'Doğrulanıyor...' : 'Giriş Yap'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-gray-500 font-medium">
            PARSAN Makina Parçaları Sanayii A.Ş. • Endüstriyel İşletim Sistemi
          </p>
        </div>
      </div>
    </div>
  );
}
