import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Mail,
  CheckCheck,
  Send,
  X,
  ExternalLink,
  Flame,
  CheckCircle,
  Info,
  Clock,
  Plus,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { isManager } from '../lib/constants';

export default function MessageBox({ currentUser, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  // Yeni mesaj formu state
  const [targetUserId, setTargetUserId] = useState('');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [isSending, setIsSending] = useState(false);
  const [usersList, setUsersList] = useState([]);

  // Panel konumu (mobil uyumlu, viewport'a göre hesaplanır)
  const [coords, setCoords] = useState(null);

  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  const canBroadcast = isManager(currentUser);
  const isGuest = currentUser?.role === 'misafir' || currentUser?.isGuest;

  // Bildirimleri getir
  const fetchNotifications = async () => {
    if (isGuest) return;
    try {
      setLoading(true);
      const data = await apiFetch('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // Sessizce geç
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && !isGuest) {
      fetchNotifications();
      const interval = setInterval(() => {
        if (!document.hidden) fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, isGuest]);

  // Panel konumunu butona göre hesapla (mobilde ekran genişliğine sığdır)
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const isMobile = vw < 640;

    const width = isMobile ? vw - margin * 2 : 384; // mobilde tam genişlik, masaüstünde 384px
    let left = isMobile ? margin : rect.right - width;
    if (left < margin) left = margin;
    if (left + width > vw - margin) left = vw - margin - width;

    const top = rect.bottom + 8;
    const maxHeight = Math.max(240, vh - top - margin);

    setCoords({ top, left, width, maxHeight });
  };

  // Açılınca konumu hesapla; scroll/resize'da güncelle
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handle = () => updatePosition();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [isOpen]);

  // Dışarı tıklayınca kapatma (buton ve portal paneli hariç)
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Misafir kullanıcılar için mesaj kutusu gösterilmez
  if (isGuest) return null;

  // Kullanıcı listesini getir (yeni mesaj için)
  const fetchUsers = async () => {
    try {
      const data = await apiFetch('/users');
      setUsersList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Kullanıcılar alınamadı', err);
    }
  };

  const handleOpenSendModal = () => {
    fetchUsers();
    setShowSendModal(true);
  };

  // Tek bildirimi okundu yap
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: 1 } : n)));
    } catch (err) {
      console.error('Okundu işaretlenemedi:', err);
    }
  };

  // Tümünü okundu yap
  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
    } catch (err) {
      console.error('Tümü okundu işaretlenemedi:', err);
    }
  };

  // Yeni mesaj gönder
  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!msgTitle.trim() || !msgContent.trim()) return;

    setIsSending(true);
    try {
      await apiFetch('/notifications', {
        method: 'POST',
        body: {
          target_user_id: targetUserId ? parseInt(targetUserId, 10) : null,
          title: msgTitle,
          message: msgContent,
          type: msgType,
        },
      });
      setShowSendModal(false);
      setMsgTitle('');
      setMsgContent('');
      setTargetUserId('');
      fetchNotifications();
    } catch (err) {
      alert('Mesaj gönderilemedi: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Tıklanan bildirimin bağlantısına git
  const handleClickNotification = (n) => {
    if (!n.read) handleMarkAsRead(n.id);
    if (n.link && onNavigate) {
      const params = new URLSearchParams(n.link.replace('?', ''));
      const app = params.get('app');
      const tab = params.get('tab');
      if (app) {
        onNavigate({ app, ...(tab ? { tab } : {}) });
        setIsOpen(false);
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning':
        return <Flame className="w-4 h-4 text-rose-500" />;
      case 'action':
        return <CheckCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-amber-300 transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-center"
        title="Mesaj Kutusu ve Bildirimler"
        aria-label="Mesaj Kutusu"
        aria-expanded={isOpen}
      >
        <Mail className="w-4 h-4 md:w-5 md:h-5" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
            }}
            className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-fade-in text-slate-800 dark:text-white flex flex-col"
          >
            <div className="forge-line-gradient h-1 w-full flex-shrink-0" />

            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Bell className="w-4 h-4 text-indigo-500 dark:text-amber-400 flex-shrink-0" />
                <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800 dark:text-white truncate">
                  Mesajlar & Bildirimler
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40 text-[10px] font-bold flex-shrink-0">
                    {unreadCount} yeni
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="p-1.5 rounded-lg text-xs text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Tümünü Okundu Say"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                {canBroadcast && (
                  <button
                    type="button"
                    onClick={handleOpenSendModal}
                    className="p-1.5 rounded-lg text-xs text-indigo-600 dark:text-amber-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Yeni Mesaj / Bildirim Gönder"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-xs text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-1 text-xs flex-shrink-0">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`flex-1 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Tümü ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`flex-1 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
                  filter === 'unread'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Okunmamış ({unreadCount})
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 scrollbar-thin">
              {loading && notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 animate-pulse">
                  Bildirimler yükleniyor...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-400/60" />
                  <span>Herhangi bir bildirim bulunmuyor.</span>
                </div>
              ) : (
                filteredNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleClickNotification(n)}
                    className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex gap-3 items-start ${
                      !n.read ? 'bg-indigo-50/40 dark:bg-amber-500/5' : ''
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 flex-shrink-0 mt-0.5">
                      {getTypeIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {n.sender_name || 'Sistem'}
                        </span>
                        {n.link && (
                          <span className="text-indigo-600 dark:text-amber-400 flex items-center gap-0.5 font-semibold hover:underline">
                            Git <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400 flex-shrink-0">
              Dövme Hattı & 5S Bildirim Sistemi
            </div>
          </div>,
          document.body
        )}

      {showSendModal &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-800 dark:text-white animate-fade-in">
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-black uppercase tracking-wider text-indigo-600 dark:text-amber-400 flex items-center gap-2 mb-4 pr-8">
                <Send className="w-5 h-5" /> Yeni Bildirim / Mesaj Gönder
              </h3>

              <form onSubmit={handleSendNotification} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-300 mb-1">
                    Alıcı Kişi
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">Tüm Fabrika / Herkes</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-300 mb-1">
                    Bildirim Türü
                  </label>
                  <select
                    value={msgType}
                    onChange={(e) => setMsgType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="info">Bilgilendirme (Mavi)</option>
                    <option value="action">Aksiyon / Görev (Sarı/Amber)</option>
                    <option value="warning">Acil / Uyarı (Kırmızı)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-300 mb-1">
                    Başlık
                  </label>
                  <input
                    type="text"
                    required
                    value={msgTitle}
                    onChange={(e) => setMsgTitle(e.target.value)}
                    placeholder="Örn: 5S Hat Temizliği ve Denetim Hatırlatması"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-300 mb-1">
                    Mesaj İçeriği
                  </label>
                  <textarea
                    rows="3"
                    required
                    value={msgContent}
                    onChange={(e) => setMsgContent(e.target.value)}
                    placeholder="İlgili personellere iletmek istediğiniz not..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSendModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSending ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
