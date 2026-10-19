import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Home, LogOut, Moon, Sun, User } from 'lucide-react';

import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { useIssues } from './hooks/useIssues';
import { flushPendingSaves } from './lib/pendingSave';
import { STATUS } from './lib/constants';

import Login from './components/Login';
import PortalView from './components/PortalView';
import IssueList from './components/IssueList';
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import ActionModule from './components/ActionModule';
import AuditModule from './components/AuditModule';
import MaintenanceModule from './components/MaintenanceModule';
import SafetyModule from './components/SafetyModule';
import ForgeAtmosphere from './components/ForgeAtmosphere';
import MessageBox from './components/MessageBox';
import PortalBackButton from './components/ui/PortalBackButton';

const AnalyticsView = lazy(() => import('./components/AnalyticsView'));

const LoadingBlock = () => (
  <div className="p-12 text-center text-slate-500 dark:text-slate-400 animate-pulse font-bold">
    Yükleniyor...
  </div>
);

const APPS = {
  PORTAL: 'portal',
  ISSUE_CREATE: 'hata_karti_ac',
  ISSUES: 'hata_kartlari',
  ACTIONS: 'aksiyon_modulu',
  AUDIT: 'bes_s_denetim',
  MAINTENANCE: 'otonom_bakim',
  SAFETY: 'isg_risk_bildirimi',
};

const TABS = {
  OPEN: 'open_issues',
  RESOLVED: 'resolved_issues',
  DETAIL: 'dashboard',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
};

const APP_TITLES = {
  [APPS.ISSUE_CREATE]: 'Hata Kartı Açma Modülü',
  [APPS.ISSUES]: 'Hata Kartları Takip Bölümü',
  [APPS.ACTIONS]: 'Aksiyon Modülü',
  [APPS.AUDIT]: '5S Denetim Modülü',
  [APPS.MAINTENANCE]: 'Otonom Bakım Modülü',
  [APPS.SAFETY]: 'İSG Risk Bildirimi',
};

export default function App() {
  const { user } = useAuth();
  return user ? <MainApp key={user.id} user={user} /> : <Login />;
}

const readRoute = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    app: params.get('app') || APPS.PORTAL,
    tab: params.get('tab') || TABS.OPEN,
  };
};

function MainApp({ user }) {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { issues, loading, error, updateIssue, addIssue, deleteIssue, refresh } = useIssues();

  const isGuest = user?.role === 'misafir' || Boolean(user?.isGuest);

  const [route, setRoute] = useState(readRoute);
  const [currentIssueId, setCurrentIssueId] = useState(null);

  const { app: rawApp, tab: activeTab } = route;

  // Misafir erişim kısıtlaması: sadece Portal, Hata Kartı Açma ve Otonom Bakım modüllerine girebilir
  const currentApp =
    isGuest &&
    rawApp !== APPS.PORTAL &&
    rawApp !== APPS.ISSUE_CREATE &&
    rawApp !== APPS.MAINTENANCE
      ? APPS.PORTAL
      : rawApp;

  const navigate = useCallback((next) => {
    setRoute((prev) => {
      const merged = { ...prev, ...next };
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

  const handleNavigate = useCallback(async (action) => {
    await flushPendingSaves();
    action();
  }, []);

  const handleQuickStatusChange = useCallback(
    async (issueId, newStatus) => {
      const target = issues.find((i) => i.id === issueId);
      if (!target) return;
      await updateIssue(
        issueId,
        {
          ...target,
          mevcut_durum: newStatus,
        },
        {}
      );
    },
    [issues, updateIssue]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb] dark:bg-slate-950">
        <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 animate-pulse flex items-center gap-2">
          <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Veriler Yükleniyor...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb] dark:bg-slate-950 p-6">
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

  const navButton = (label, tab, activeClass) => (
    <button
      key={tab}
      onClick={() => goToList(tab)}
      className={`px-3 py-2 md:px-4 rounded-xl font-bold text-xs md:text-sm transition-colors cursor-pointer ${
        activeTab === tab
          ? activeClass
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="relative min-h-screen bg-[#f4f7fb] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200 overflow-x-hidden">
      {/* Yumuşak Pastel Fabrika & Fırın Ambiyansı (Sıfır GPU yükü) */}
      <ForgeAtmosphere density={6} />

      <nav className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-white p-3.5 sm:p-4 shadow-xs border-b border-slate-200/80 dark:border-slate-800 relative z-30 print:hidden">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <h1
            onClick={() =>
              handleNavigate(() => {
                setCurrentIssueId(null);
                navigate({ app: APPS.PORTAL, tab: TABS.OPEN });
              })
            }
            className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-3 cursor-pointer"
          >
            <div className="relative p-1 bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700/80 rounded-xl shadow-xs">
              <img
                src={`${import.meta.env.BASE_URL}parsanlogo.jpeg`}
                alt="Parsan Logo"
                className="w-8 h-8 md:w-9 md:h-9 object-contain bg-white p-1 rounded-lg"
              />
            </div>
            <span className="sm:inline text-slate-800 dark:text-white font-black tracking-tight flex items-center gap-2">
              <span className="forge-text-gradient">PARSAN</span>
              <span className="text-xs uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-emerald-700 dark:text-slate-300 font-bold hidden sm:inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-status-beacon" /> İşletme Portalı
              </span>
              {APP_TITLES[currentApp] && (
                <span className="text-indigo-600 dark:text-amber-400 text-sm md:text-base font-extrabold">
                  — {APP_TITLES[currentApp]}
                </span>
              )}
            </span>
          </h1>

          <div className="flex flex-wrap justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 p-1 rounded-2xl gap-1 w-full md:w-auto">
            {(currentApp !== APPS.PORTAL || activeTab === TABS.SETTINGS) && (
              <button
                onClick={() =>
                  handleNavigate(() => {
                    setCurrentIssueId(null);
                    navigate({ app: APPS.PORTAL, tab: TABS.OPEN });
                  })
                }
                className="px-3 py-2 md:px-4 rounded-xl font-bold text-xs md:text-sm transition-colors text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-amber-300 hover:bg-white dark:hover:bg-slate-700/60 flex items-center gap-1 md:gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4 text-indigo-500 dark:text-amber-400" />{' '}
                <span className="hidden sm:inline">Ana Sayfa</span>
              </button>
            )}

            {currentApp === APPS.ISSUES &&
              !isGuest && [
                navButton(
                  'Hata Kartları Takip Paneli',
                  TABS.OPEN,
                  'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs'
                ),
                navButton(
                  'İstatistikler',
                  TABS.ANALYTICS,
                  'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-300 shadow-xs'
                ),
              ]}

            {!isGuest && (
              <button
                onClick={() =>
                  handleNavigate(() => {
                    setCurrentIssueId(null);
                    navigate({ app: APPS.PORTAL, tab: TABS.SETTINGS });
                  })
                }
                className={`px-3 py-2 md:px-4 rounded-xl font-bold text-xs md:text-sm transition-colors cursor-pointer ${
                  activeTab === TABS.SETTINGS && currentApp === APPS.PORTAL
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Ayarlar
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-2.5 w-full md:w-auto flex-wrap">
            {/* Pastel Açık / Koyu Tema Değiştirici */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-amber-300 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Pastel Açık Temaya Geç' : 'Koyu Temaya Geç'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Mesaj Kutusu ve Bildirimler */}
            <MessageBox currentUser={user} onNavigate={navigate} />

            <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 px-3 py-1.5 rounded-xl text-xs md:text-sm">
              <User className="w-4 h-4 text-indigo-500 dark:text-amber-400" />
              <span className="font-bold text-slate-800 dark:text-white">{user.name}</span>
              <span className="bg-indigo-100 dark:bg-amber-500/15 text-indigo-700 dark:text-amber-300 border border-indigo-200 dark:border-amber-500/30 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                {isGuest ? 'Misafir Operatör' : user.role}
              </span>
            </div>
            <button
              onClick={() => handleNavigate(() => logout())}
              className="flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 font-bold text-xs sm:text-sm px-2.5 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Çıkış
            </button>
          </div>
        </div>
      </nav>
      <div className="forge-line-gradient h-0.5 w-full relative z-20 print:hidden" />

      <main className="container mx-auto py-4 md:py-8 px-2 md:px-4 relative z-10">
        {currentApp === APPS.PORTAL &&
          (activeTab === TABS.SETTINGS && !isGuest ? (
            <SettingsView
              currentUser={user}
              onBack={() => handleNavigate(() => navigate({ app: APPS.PORTAL, tab: TABS.OPEN }))}
            />
          ) : (
            <PortalView
              onSelectApp={(app) =>
                handleNavigate(() => {
                  setCurrentIssueId(null);
                  navigate({
                    app,
                    tab: app === APPS.ISSUE_CREATE ? TABS.DETAIL : TABS.OPEN,
                  });
                })
              }
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

        {/* MODÜL 3: HATA KARTLARI TAKİP BÖLÜMÜ (5 FİLTRELİ İZLEME PANELİ) */}
        {currentApp === APPS.ISSUES && !isGuest && (
          <>
            {isListTab && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <PortalBackButton
                    onBack={() =>
                      handleNavigate(() => navigate({ app: APPS.PORTAL, tab: TABS.OPEN }))
                    }
                  />
                </div>

                <IssueList
                  issues={issues}
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
                  currentIndex={currentIssue ? issues.findIndex((i) => i.id === currentIssue.id) : -1}
                  setCurrentIndex={(idx) => setCurrentIssueId(idx === -1 ? null : issues[idx]?.id)}
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
              <div className="space-y-4 animate-fade-in">
                <div>
                  <PortalBackButton
                    onBack={() =>
                      handleNavigate(() => navigate({ app: APPS.PORTAL, tab: TABS.OPEN }))
                    }
                  />
                </div>
                <Suspense fallback={<LoadingBlock />}>
                  <AnalyticsView issues={issues} />
                </Suspense>
              </div>
            )}
          </>
        )}

        {currentApp === APPS.ACTIONS && !isGuest && (
          <ActionModule onBack={() => navigate({ app: APPS.PORTAL })} currentUser={user} />
        )}
        {currentApp === APPS.AUDIT && !isGuest && (
          <AuditModule onBack={() => navigate({ app: APPS.PORTAL })} />
        )}
        {currentApp === APPS.MAINTENANCE && (
          <MaintenanceModule
            onBack={() => navigate({ app: APPS.PORTAL })}
            onOpenIssue={() => navigate({ app: APPS.ISSUE_CREATE, tab: TABS.DETAIL })}
          />
        )}
        {currentApp === APPS.SAFETY && !isGuest && (
          <SafetyModule onBack={() => navigate({ app: APPS.PORTAL })} />
        )}
      </main>
    </div>
  );
}
