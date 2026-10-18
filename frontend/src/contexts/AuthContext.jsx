import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, onAuthError, TOKEN_KEY, USER_KEY } from '../lib/api';

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Bozuk kayit varsa temizle, uygulama acilmadan cokmesin.
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  // Baslangic degerlerini dogrudan localStorage'dan okuyoruz; boylece
  // "once bos, sonra dolu" seklinde ekstra render turu olusmuyor.
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => (localStorage.getItem(TOKEN_KEY) ? readStoredUser() : null));
  const [sessionMessage, setSessionMessage] = useState('');

  const logout = useCallback((message = '') => {
    setUser(null);
    setToken(null);
    setSessionMessage(message);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Token suresi dolduysa (veya sunucu reddettiyse) otomatik cikis yap.
  useEffect(() => onAuthError((err) => logout(err.message)), [logout]);

  const login = useCallback(async (email, password) => {
    try {
      const data = await apiFetch('/login', {
        method: 'POST',
        auth: false,
        body: { email, password },
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setSessionMessage('');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const guestLogin = useCallback(async (name) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Operatör Adı ve Soyadı girilmesi zorunludur' };
    }

    try {
      const data = await apiFetch('/guest-login', {
        method: 'POST',
        auth: false,
        body: { name: trimmed },
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setSessionMessage('');
      return { success: true };
    } catch {
      // Çevrimdışı veya statik sunucuda çalışabilmesi için yerel misafir token'ı üret
      const guestId = `guest_${Date.now()}`;
      const guestUser = {
        id: guestId,
        name: trimmed,
        email: '',
        role: 'misafir',
        isGuest: true,
      };
      const guestToken = `guest_token_${Date.now()}`;
      localStorage.setItem(TOKEN_KEY, guestToken);
      localStorage.setItem(USER_KEY, JSON.stringify(guestUser));
      setToken(guestToken);
      setUser(guestUser);
      setSessionMessage('');
      return { success: true };
    }
  }, []);

  const value = useMemo(
    () => ({ user, token, login, guestLogin, logout, sessionMessage }),
    [user, token, login, guestLogin, logout, sessionMessage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- context ile ayni dosyada kalmasi okunakli
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır');
  return context;
};
