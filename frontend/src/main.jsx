import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Sekme arka plana atıldığında tüm CSS animasyonlarını duraklat.
// Böylece görünmeyen sayfa CPU/GPU tüketmeye devam etmez.
const syncTabVisibility = () => {
  document.documentElement.classList.toggle('tab-hidden', document.hidden);
};
document.addEventListener('visibilitychange', syncTabVisibility);
syncTabVisibility();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
