import { useEffect, useRef, useState } from 'react';
import { 
  Bell, Mail, CheckCheck, Send, X, ExternalLink, 
  Flame, CheckCircle, Info, Clock, Plus
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

  const popoverRef = useRef(null);

  const canBroadcast = isManager(currentUser);

  // Bildirimleri getir
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Bildirimler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      // oxlint-disable-next-line react/set-state-in-effect -- dış sistemle (sunucu) senkronizasyon
      fetchNotifications();
      // 30 saniyede bir yeni bildirimleri yokla
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Dışarı tıklayınca kapatma
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: 1 } : n))
      );
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
      // link: e.g. "?app=aksiyon_modulu"
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
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter((n) => !n.read) 
    : notifications;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning':
        return <Flame className="w-4 h-4 text-red-400" />;
      case 'action':
        return <CheckCircle className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* =========================================================================
          NAVBAR MESAJ / BİLDİRİM BUTONU
          ========================================================================= */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/80 hover:border-amber-500/50 text-gray-300 hover:text-amber-300 transition-all duration-200 cursor-pointer shadow-sm flex items-center justify-center"
        title="Mesaj Kutusu ve Bildirimler"
        aria-label="Mesaj Kutusu"
      >
        <Mail className="w-4 h-4 md:w-5 md:h-5" />

        {/* Okunmamış Bildirim Rozeti (Yanıp Sönen Kor Efekti) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* =========================================================================
          BİLDİRİM / MESAJ KUTUSU AÇILIR PANELİ (POPOVER)
          ========================================================================= */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900/95 border-2 border-amber-500/40 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50 overflow-hidden animate-fade-in text-white">
          {/* Üst Kor Lav Çizgisi */}
          <div className="molten-gradient h-1 w-full" />

          {/* Panel Başlığı */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="font-black text-sm uppercase tracking-wider text-white">
                Mesajlar & Bildirimler
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold">
                  {unreadCount} yeni
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="p-1 rounded text-xs text-gray-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                  title="Tümünü Okundu Say"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {canBroadcast && (
                <button
                  type="button"
                  onClick={handleOpenSendModal}
                  className="p-1 rounded text-xs text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                  title="Yeni Mesaj / Bildirim Gönder"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filtre Sekmeleri */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 font-bold rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-slate-800 text-amber-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Tümü ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`flex-1 py-1.5 font-bold rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-slate-800 text-amber-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Okunmamış ({unreadCount})
            </button>
          </div>

          {/* Bildirim Listesi */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 scrollbar-thin">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 animate-pulse">
                Bildirimler yükleniyor...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8 text-gray-600" />
                <span>Herhangi bir bildirim bulunmuyor.</span>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`p-3.5 hover:bg-slate-800/70 transition-colors cursor-pointer flex gap-3 items-start ${
                    !n.read ? 'bg-amber-500/5' : ''
                  }`}
                >
                  {/* Tür İkonu */}
                  <div className="p-2 rounded-xl bg-slate-800/90 border border-slate-700/80 flex-shrink-0 mt-0.5">
                    {getTypeIcon(n.type)}
                  </div>

                  {/* İçerik */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-gray-100 truncate">
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                      )}
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        {n.sender_name || 'Sistem'}
                      </span>
                      {n.link && (
                        <span className="text-amber-400 flex items-center gap-0.5 font-semibold hover:underline">
                          Git <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Alt Kısım */}
          <div className="p-2 bg-slate-950/80 border-t border-slate-800 text-center text-[10px] text-gray-400">
            Dövme Hattı & 5S Bildirim Sistemi
          </div>
        </div>
      )}

      {/* =========================================================================
          YÖNETİCİ İÇİN YENİ MESAJ / BİLDİRİM GÖNDERME MODALI
          ========================================================================= */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl p-6 text-white animate-fade-in">
            <button
              type="button"
              onClick={() => setShowSendModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-4">
              <Send className="w-5 h-5" /> Yeni Bildirim / Mesaj Gönder
            </h3>

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-300 mb-1">
                  Alıcı Kişi
                </label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
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
                <label className="block text-xs font-bold uppercase text-gray-300 mb-1">
                  Bildirim Türü
                </label>
                <select
                  value={msgType}
                  onChange={(e) => setMsgType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="info">Bilgilendirme (Mavi)</option>
                  <option value="action">Aksiyon / Görev (Sarı/Amber)</option>
                  <option value="warning">Acil / Uyarı (Kırmızı)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-300 mb-1">
                  Başlık
                </label>
                <input
                  type="text"
                  required
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  placeholder="Örn: 5S Hat Temizliği ve Denetim Hatırlatması"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-300 mb-1">
                  Mesaj İçeriği
                </label>
                <textarea
                  rows="3"
                  required
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  placeholder="İlgili personellere iletmek istediğiniz not..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-gray-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
