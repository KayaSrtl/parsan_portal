import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckSquare,
  FileWarning,
  LogOut,
  Menu,
  User,
} from 'lucide-react';

import { useAuth } from './contexts/AuthContext';
import { useIssues } from './hooks/useIssues';
import { hasUnsavedChanges } from './lib/pendingSave';
import { isManager, ROLE_LABELS, STATUS } from './lib/constants';

import Login from './components/Login';
import Sidebar from './components/Sidebar';
import PortalView from './components/PortalView';
import IssueList from './components/IssueList';
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import AdminPanel from './components/AdminPanel';
import ActionModule from './components/ActionModule';
import AuditModule from './components/AuditModule';
import MaintenanceModule from './components/MaintenanceModule';
import SafetyModule from './components/SafetyModule';
import MachineModule from './components/MachineModule';
import ForgeAtmosphere from './components/ForgeAtmosphere';
import MessageBox from './components/MessageBox';
import ConfirmDialog from './components/ui/ConfirmDialog';

const AnalyticsView = lazy(() => import('./components/AnalyticsView'));

const LoadingBlock = () => (
  <div className="p-12 text-center text-slate-500 dark:text-slate-400 animate-pulse font-bold">
    Yükleniyor...
  </div>
);

const APPS = {
  PORTAL: 'portal',
  ISSUE_CREATE: 'hata_karti_ac',
  ACTIONS: 'aksiyon_modulu',
  AUDIT: 'bes_s_denetim',
  MAINTENANCE: 'otonom_bakim',
  SAFETY: 'isg_risk_bildirimi',
  MACHINES: 'tezgah_izleme',
  ADMIN: 'admin_paneli',
};

/**
 * Eski bağlantılar (bildirim/e-posta içindeki linkler). Hata kartları takibi artık
 * Aksiyon Modülü'nün bir bölümüdür; bu yüzden eski adres oraya yönlenir.
 */
const APP_ALIASES = {
  hata_kartlari: { app: 'aksiyon_modulu', tab: 'open_issues' },
  isg_modulu: { app: 'isg_risk_bildirimi' },
};

const TABS = {
  ACTIONS: 'actions',
  OPEN: 'open_issues',
  RESOLVED: 'resolved_issues',
  DETAIL: 'dashboard',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
};

const APP_TITLES = {
  [APPS.PORTAL]: 'Genel Bakış',
  [APPS.ISSUE_CREATE]: 'Hata Kartı Oluştur',
  [APPS.ACTIONS]: 'Aksiyon & Hata Kartları',
  [APPS.AUDIT]: '5S Denetim',
  [APPS.MAINTENANCE]: 'Otonom Bakım',
  [APPS.SAFETY]: 'İSG Risk Bildirimi',
  [APPS.MACHINES]: 'Tezgah İzleme',
  [APPS.ADMIN]: 'Yönetim Paneli',
};

const GUEST_APPS = new Set([APPS.PORTAL, APPS.ISSUE_CREATE, APPS.MAINTENANCE, APPS.MACHINES]);

export default function App() {
  const { user } = useAuth();
  return user ? <MainApp key={user.id} user={user} /> : <Login />;
}

const readRoute = () => {
  const params = new URLSearchParams(window.location.search);
  const alias = APP_ALIASES[params.get('app')];
  const app = alias?.app || params.get('app') || APPS.PORTAL;
  const defaultTab =
    alias?.tab ||
    (app === APPS.ACTIONS ? TABS.ACTIONS : app === APPS.ADMIN ? 'users' : TABS.OPEN);
  return { app, tab: params.get('tab') || defaultTab };
};

function MainApp({ user }) {
  const { logout } = useAuth();
  const { issues, loading, error, updateIssue, addIssue, deleteIssue, refresh } = useIssues();

  const isGuest = user?.role === 'misafir' || Boolean(user?.isGuest);
  const managerUser = !isGuest && isManager(user);

  const [route, setRoute] = useState(readRoute);
  const [currentIssueId, setCurrentIssueId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingNavAction, setPendingNavAction] = useState(null);

  const { app: rawApp, tab: activeTab } = route;

  // Misafir ve yönetici erişim kısıtlaması
  const currentApp =
    isGuest && !GUEST_APPS.has(rawApp)
      ? APPS.PORTAL
      : rawApp === APPS.ADMIN && !managerUser
        ? APPS.PORTAL
        : rawApp;

  const navigate = useCallback((next) => {
    // Bildirim bağlantıları eski adresleri taşıyabilir (ör. hata_kartlari).
    const alias = APP_ALIASES[next.app];
    const app = alias?.app || next.app;
    const tab =
      next.tab ||
      alias?.tab ||
      (app === APPS.ACTIONS ? TABS.ACTIONS : app === APPS.ADMIN ? 'users' : undefined);
    const target = { ...next, ...(app ? { app } : {}), ...(tab ? { tab } : {}) };
    setRoute((prev) => {
      const merged = { ...prev, ...target };
      const url = new URL(window.location);
      url.searchParams.set('app', merged.app);
      url.searchParams.set('tab', merged.tab);
      window.history.pushState({}, '', url);
      return merged;
    });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(readRoute());
      setCurrentIssueId(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Scroll-to-Top: Modül, sekme veya kart değiştiğinde sayfa her zaman en üstten başlar.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentApp, activeTab, currentIssueId]);

  // Kaydedilmemiş değişiklik koruması (sessiz otomatik kaydetme YOK).
  const handleNavigate = useCallback((action) => {
    if (hasUnsavedChanges()) {
      setPendingNavAction(() => action);
      return;
    }
    action();
  }, []);

  const handleConfirmDiscard = useCallback(() => {
    const action = pendingNavAction;
    setPendingNavAction(null);
    action?.();
  }, [pendingNavAction]);

  const handleCancelDiscard = useCallback(() => {
    setPendingNavAction(null);
  }, []);

  const navigateToTarget = useCallback(
    (target) => {
      handleNavigate(() => {
        if (target?.issueId != null) {
          setCurrentIssueId(target.issueId);
        } else {
          setCurrentIssueId(null);
        }
        const nextApp = target?.app || APPS.PORTAL;
        const nextTab =
          target?.tab ||
          (nextApp === APPS.ISSUE_CREATE
            ? TABS.DETAIL
            : nextApp === APPS.ACTIONS
              ? TABS.ACTIONS
              : nextApp === APPS.ADMIN
                ? 'users'
                : TABS.OPEN);
        navigate({ app: nextApp, tab: nextTab });
      });
    },
    [handleNavigate, navigate]
  );

  const openIssueCount = useMemo(
    () =>
      issues.filter(
        (i) => i.mevcut_durum !== STATUS.CLOSED && i.mevcut_durum !== STATUS.GREEN
      ).length,
    [issues]
  );

  const handleQuickStatusChange = useCallback(
    async (issueOrId, newStatus) => {
      const issueId = typeof issueOrId === 'object' ? issueOrId?.id : issueOrId;
      const target = issues.find((i) => i.id === issueId);
      if (!target) return;

      let notes = target.gelisme_notlari || '';
      try {
        const parsed = notes ? JSON.parse(notes) : [];
        const list = Array.isArray(parsed) ? parsed : [];
        list.push({
          text: `Mevcut durum "${target.mevcut_durum}" ➔ "${newStatus}" olarak güncellendi.`,
          sender: user?.name || 'Sistem',
          timestamp: new Date().toISOString(),
        });
        notes = JSON.stringify(list);
      } catch {
        // Eski düz metin notlar bozulmasın; olduğu gibi bırakılır.
      }

      await updateIssue(issueId, { mevcut_durum: newStatus, gelisme_notlari: notes }, {});
    },
    [issues, updateIssue, user]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 animate-pulse flex items-center gap-2">
          <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Veriler Yükleniyor...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent p-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border-l-4 border-rose-500 max-w-lg w-full">
          <h2 className="text-2xl font-bold text-rose-600 mb-2">Sunucu Hatası</h2>
          <p className="text-slate-700 dark:text-slate-300">{error}</p>
          <div className="mt-4 flex gap-4">
            <button onClick={refresh} className="text-indigo-600 underline font-semibold cursor-pointer">
              Tekrar dene
            </button>
            <button onClick={() => logout()} className="text-slate-500 underline cursor-pointer">
              Çıkış yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentIssue = currentIssueId ? issues.find((i) => i.id === currentIssueId) : null;
  const isListTab = activeTab === TABS.OPEN || activeTab === TABS.RESOLVED;

  const openIssueDetail = (id) => {
    setCurrentIssueId(id);
    navigate({ tab: TABS.DETAIL });
  };

  const goToList = (tab) =>
    handleNavigate(() => {
      setCurrentIssueId(null);
      navigate({ tab });
    });

  const pageTitle =
    currentApp === APPS.PORTAL && activeTab === TABS.SETTINGS
      ? 'Ayarlar'
      : APP_TITLES[currentApp] || 'Genel Bakış';

  const actionSubTabs = [
    {
      id: TABS.ACTIONS,
      label: 'Aksiyonlar',
      Icon: CheckSquare,
      active: activeTab === TABS.ACTIONS,
      activeClass: 'bg-emerald-600 text-white shadow-xs',
    },
    {
      id: TABS.OPEN,
      label: `Hata Kartları (${openIssueCount})`,
      Icon: FileWarning,
      active: isListTab || activeTab === TABS.DETAIL,
      activeClass: 'bg-indigo-600 text-white shadow-xs',
    },
    {
      id: TABS.ANALYTICS,
      label: 'İstatistikler',
      Icon: BarChart3,
      active: activeTab === TABS.ANALYTICS,
      activeClass: 'bg-purple-600 text-white shadow-xs',
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200 overflow-x-clip">
      {/* Yumuşak Pastel Fabrika & Fırın Ambiyansı (Sıfır GPU yükü) */}
      <ForgeAtmosphere density={6} />

      {/* SABİT TEK SATIR ÜST BAŞLIK */}
      <header className="sticky top-0 z-40 h-14 sm:h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs print:hidden">
        <div className="h-full px-3 sm:px-4 flex items-center justify-between gap-2">
          {/* Sol: Mobil Hamburger + PARSAN Logo + Kısa Sayfa Başlığı */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Menüyü aç"
              aria-expanded={sidebarOpen}
              className="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => navigateToTarget({ app: APPS.PORTAL, tab: TABS.OPEN })}
              className="flex items-center gap-2 sm:gap-2.5 min-w-0 cursor-pointer text-left"
            >
              <div className="p-0.5 bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700/80 rounded-lg shrink-0">
                <img
                  src={`${import.meta.env.BASE_URL}parsanlogo.jpeg`}
                  alt="Parsan Logo"
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain bg-white p-0.5 rounded-md"
                />
              </div>
              <span className="font-black text-base sm:text-lg tracking-tight forge-text-gradient shrink-0">
                PARSAN
              </span>
            </button>

            <span className="text-slate-300 dark:text-slate-700 font-light select-none shrink-0">
              /
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 truncate">
              {pageTitle}
            </span>
          </div>

          {/* Sağ: Mesaj Kutusu + Kompakt Kullanıcı/Ayarlar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <MessageBox currentUser={user} onNavigate={navigateToTarget} />

            {!isGuest ? (
              <button
                type="button"
                onClick={() => navigateToTarget({ app: APPS.PORTAL, tab: TABS.SETTINGS })}
                title={`${user.name} (${ROLE_LABELS[user.role] || user.role}) — Ayarlar`}
                className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                  currentApp === APPS.PORTAL && activeTab === TABS.SETTINGS
                    ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-200'
                    : 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-indigo-50/70 dark:hover:bg-slate-700/80'
                }`}
              >
                <User className="w-4 h-4 text-indigo-500 dark:text-amber-400 shrink-0" />
                <span className="hidden sm:inline font-bold max-w-[120px] truncate">
                  {user.name}
                </span>
                <span className="hidden md:inline bg-indigo-100 dark:bg-amber-500/15 text-indigo-700 dark:text-amber-300 border border-indigo-200 dark:border-amber-500/30 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                  {user.role}
                </span>
              </button>
            ) : (
              <>
                <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                  <User className="w-4 h-4 text-indigo-500 dark:text-amber-400 shrink-0" />
                  <span className="hidden sm:inline font-bold max-w-[110px] truncate">
                    {user.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigate(() => logout())}
                  title="Çıkış Yap"
                  aria-label="Çıkış Yap"
                  className="flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 font-bold text-xs p-2 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Çıkış</span>
                </button>
              </>
            )}
          </div>
        </div>
        <div className="forge-line-gradient h-0.5 w-full" />
      </header>

      {/* SOL MENÜ + ANA İÇERİK */}
      <div className="flex flex-1 min-w-0 relative z-10">
        <Sidebar
          currentApp={currentApp}
          activeTab={activeTab}
          currentUser={user}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNavigate={navigateToTarget}
          onLogout={() => handleNavigate(() => logout())}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          badges={{ openIssues: openIssueCount }}
        />

        <main className="flex-1 min-w-0 py-4 sm:py-6 px-3 sm:px-5 lg:px-6">
          {currentApp === APPS.PORTAL &&
            (activeTab === TABS.SETTINGS && !isGuest ? (
              <SettingsView
                currentUser={user}
                onBack={() => handleNavigate(() => navigate({ app: APPS.PORTAL, tab: TABS.OPEN }))}
                onOpenAdmin={() =>
                  handleNavigate(() => navigate({ app: APPS.ADMIN, tab: 'users' }))
                }
                onLogout={() => handleNavigate(() => logout())}
              />
            ) : (
              <PortalView
                issues={issues}
                onNavigate={navigateToTarget}
                onSelectApp={(app) => navigateToTarget({ app })}
              />
            ))}

          {/* MODÜL 1: SADECE VERİ GİRİŞİ İÇİN HATA KARTI AÇMA MODÜLÜ */}
          {currentApp === APPS.ISSUE_CREATE && (
            <div className="animate-fade-in">
              <DashboardView
                issues={issues}
                currentIndex={-1}
                setCurrentIndex={() => {}}
                entryOnly={true}
                onBack={() => handleNavigate(() => navigate({ app: APPS.PORTAL, tab: TABS.OPEN }))}
                updateIssue={updateIssue}
                addIssue={addIssue}
                deleteIssue={deleteIssue}
                currentUser={user}
              />
            </div>
          )}

          {/* AKSİYON MODÜLÜ: Yatay slide sekme şeridi + içerik */}
          {currentApp === APPS.ACTIONS && !isGuest && (
            <div className="space-y-4">
              <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
                <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-2xs whitespace-nowrap">
                  {actionSubTabs.map(({ id, label, Icon, active, activeClass }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => goToList(id)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors shrink-0 cursor-pointer ${
                        active
                          ? activeClass
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === TABS.ACTIONS && (
                <ActionModule
                  onBack={() =>
                    handleNavigate(() => navigate({ app: APPS.PORTAL, tab: TABS.OPEN }))
                  }
                  currentUser={user}
                />
              )}

              {isListTab && (
                <div className="animate-fade-in">
                  <IssueList
                    issues={issues}
                    currentUser={user}
                    onSelectIssue={openIssueDetail}
                    onOpenNew={() =>
                      handleNavigate(() => navigate({ app: APPS.ISSUE_CREATE, tab: TABS.DETAIL }))
                    }
                    onQuickStatusChange={handleQuickStatusChange}
                  />
                </div>
              )}

              {activeTab === TABS.DETAIL && (
                <div className="animate-fade-in">
                  <DashboardView
                    issues={issues}
                    currentIndex={
                      currentIssue ? issues.findIndex((i) => i.id === currentIssue.id) : -1
                    }
                    setCurrentIndex={(idx) =>
                      setCurrentIssueId(idx === -1 ? null : issues[idx]?.id)
                    }
                    entryOnly={false}
                    onBack={() => goToList(TABS.OPEN)}
                    updateIssue={updateIssue}
                    addIssue={addIssue}
                    deleteIssue={deleteIssue}
                    currentUser={user}
                  />
                </div>
              )}

              {activeTab === TABS.ANALYTICS && (
                <div className="animate-fade-in">
                  <Suspense fallback={<LoadingBlock />}>
                    <AnalyticsView issues={issues} />
                  </Suspense>
                </div>
              )}
            </div>
          )}

          {currentApp === APPS.AUDIT && !isGuest && (
            <AuditModule
              onBack={() => handleNavigate(() => navigate({ app: APPS.PORTAL, tab: TABS.OPEN }))}
            />
          )}

          {currentApp === APPS.MAINTENANCE && (
            <MaintenanceModule
              onBack={() => handleNavigate(() => navigate({ app: APPS.PORTAL, tab: TABS.OPEN }))}
              onOpenIssue={() =>
                handleNavigate(() => navigate({ app: APPS.ISSUE_CREATE, tab: TABS.DETAIL }))
              }
            />
          )}

          {currentApp === APPS.MACHINES && (
            <MachineModule
              onBack={() => handleNavigate(() => navigate({ app: APPS.PORTAL, tab: TABS.OPEN }))}
              currentUser={user}
            />
          )}

          {currentApp === APPS.SAFETY && !isGuest && (
            <SafetyModule
              onBack={() => handleNavigate(() => navigate({ app: APPS.PORTAL, tab: TABS.OPEN }))}
            />
          )}

          {currentApp === APPS.ADMIN && managerUser && (
            <AdminPanel
              currentUser={user}
              initialTab={activeTab}
              onBack={() => handleNavigate(() => navigate({ app: APPS.PORTAL, tab: TABS.OPEN }))}
            />
          )}
        </main>
      </div>

      {/* Kaydedilmemiş Değişiklikler Onay Penceresi */}
      {pendingNavAction && (
        <ConfirmDialog
          title="Kaydedilmemiş Değişiklikler Var"
          message="Yaptığınız değişiklikler kaydedilmedi. Kaydetmeden çıkmak istediğinize emin misiniz?"
          confirmLabel="Kaydetmeden Çık"
          cancelLabel="Vazgeç"
          confirmVariant="warning"
          onConfirm={handleConfirmDiscard}
          onCancel={handleCancelDiscard}
        />
      )}
    </div>
  );
}
