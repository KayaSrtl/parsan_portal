import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Home, LogOut, User, Flame } from 'lucide-react';

import { useAuth } from './contexts/AuthContext';
import { useIssues } from './hooks/useIssues';
import { flushPendingSaves } from './lib/pendingSave';
import { isManager, OPTION_CLASS, STATUS } from './lib/constants';

import Login from './components/Login';
import PortalView from './components/PortalView';
import IssueList from './components/IssueList';
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import ActionModule from './components/ActionModule';
import AuditModule from './components/AuditModule';
import MaintenanceModule from './components/MaintenanceModule';
import ForgeAtmosphere from './components/ForgeAtmosphere';
import MessageBox from './components/MessageBox';
import PortalBackButton from './components/ui/PortalBackButton';

// Grafik kütüphanesi (recharts) paketin en ağır parçası ve yalnızca
// istatistik sekmesinde gerekiyor; ilk açılışı yavaşlatmasın diye ayrıldı.
const AnalyticsView = lazy(() => import('./components/AnalyticsView'));

const LoadingBlock = () => (
  <div className="p-12 text-center text-gray-500 dark:text-gray-400 animate-pulse">
    Yükleniyor...
  </div>
);

const APPS = {
  PORTAL: 'portal',
  ISSUES: 'hata_kartlari',
  ACTIONS: 'aksiyon_modulu',
  AUDIT: 'bes_s_denetim',
  MAINTENANCE: 'otonom_bakim',
};

const TABS = {
  OPEN: 'open_issues',
  RESOLVED: 'resolved_issues',
  DETAIL: 'dashboard',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
};

const APP_TITLES = {
  [APPS.ISSUES]: '5S Hata Kartları',
  [APPS.ACTIONS]: 'Aksiyon Modülü',
  [APPS.AUDIT]: '5S Denetim Modülü',
  [APPS.MAINTENANCE]: 'Otonom Bakım Modülü',
};

export default function App() {
  const { user } = useAuth();
  // key={user.id}: kullanıcı değişince tüm alt state sıfırlansın.
  return user ? <MainApp key={user.id} user={user} /> : <Login />;
}

/** Adres çubuğundaki ?app= ve ?tab= parametrelerini okur. */
const readRoute = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    app: params.get('app') || APPS.PORTAL,
    tab: params.get('tab') || TABS.OPEN,
  };
};

function MainApp({ user }) {
  const { logout } = useAuth();
  const { issues, loading, error, updateIssue, addIssue, deleteIssue, refresh } = useIssues();

  const [route, setRoute] = useState(readRoute);
  // Index yerine ID tutuyoruz: liste yeniden yüklendiğinde sıralama değişse bile
  // açık olan kayıt kaymaz.
  const [currentIssueId, setCurrentIssueId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchArea, setSearchArea] = useState('');

  const { app: currentApp, tab: activeTab } = route;

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

  /** Sayfa değiştirmeden önce bekleyen otomatik kayıtları tamamlar. */
  const handleNavigate = useCallback(async (action) => {
    await flushPendingSaves();
    action();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-xl font-bold text-blue-600 dark:text-blue-400 animate-pulse flex items-center gap-2">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Veriler Yükleniyor...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border-l-4 border-red-500 max-w-lg w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Sunucu Hatası</h2>
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
          <div className="mt-4 flex gap-4">
            <button onClick={refresh} className="text-blue-500 underline font-semibold">
              Tekrar dene
            </button>
            <button onClick={() => logout()} className="text-gray-500 underline">
              Çıkış yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      !normalizedSearch ||
      (issue.problem_tanimi || '').toLowerCase().includes(normalizedSearch) ||
      (issue.bildiren_bolum || '').toLowerCase().includes(normalizedSearch) ||
      String(issue.id) === normalizedSearch;

    // Alan adları veritabanında karışık yazılmış olabilir (mp4000 / MP4000).
    const matchesArea =
      searchArea === '' || (issue.bildirilen_alan || '').toUpperCase() === searchArea;

    return matchesSearch && matchesArea;
  });

  const openIssues = filteredIssues.filter((i) => i.mevcut_durum !== STATUS.GREEN);
  const resolvedIssues = filteredIssues.filter((i) => i.mevcut_durum === STATUS.GREEN);
  const allAreas = [...new Set(issues.map((i) => (i.bildirilen_alan || '').toUpperCase()))]
    .filter(Boolean)
    .sort();

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
      className={`px-3 py-2 md:px-4 rounded-md font-bold text-xs md:text-sm transition-colors ${
        activeTab === tab ? activeClass : 'text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-gray-100 transition-colors duration-200 overflow-x-hidden">
      {/* Tüm sayfalarda çalışan ateşli dövme arka planı ve salınan görseller */}
      <ForgeAtmosphere density={35} showFloatingProps={true} />

      <nav className="bg-slate-900/95 backdrop-blur-md text-white p-4 shadow-2xl relative z-30">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-3">
            <div className="relative p-1 bg-gradient-to-br from-amber-500/20 via-slate-800 to-slate-900 border border-amber-500/40 rounded-lg shadow-sm">
              <img
                src={`${import.meta.env.BASE_URL}parsanlogo.jpeg`}
                alt="Parsan Logo"
                className="w-8 h-8 md:w-9 md:h-9 object-contain bg-white p-1 rounded"
              />
            </div>
            <span className="sm:inline text-white font-black tracking-tight flex items-center gap-2">
              <span className="forge-text-gradient">PARSAN</span>
              <span className="text-xs uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold hidden sm:inline-flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" /> Dövme Portalı
              </span>
              {APP_TITLES[currentApp] && (
                <span className="text-amber-400 text-sm md:text-base font-extrabold"> - {APP_TITLES[currentApp]}</span>
              )}
            </span>
          </h1>

          <div className="flex flex-wrap justify-center bg-slate-800/90 border border-slate-700/80 p-1 rounded-xl gap-1 w-full md:w-auto shadow-inner">
            {(currentApp !== APPS.PORTAL || activeTab === TABS.SETTINGS) && (
              <button
                onClick={() =>
                  handleNavigate(() => {
                    setCurrentIssueId(null);
                    navigate({ app: APPS.PORTAL, tab: TABS.OPEN });
                  })
                }
                className="px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-colors text-gray-300 hover:text-amber-300 hover:bg-slate-700/60 flex items-center gap-1 md:gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" /> <span className="hidden sm:inline">Ana Sayfa</span>
              </button>
            )}

            {currentApp === APPS.ISSUES && [
              navButton('Açık Problemler', TABS.OPEN, 'bg-amber-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)]'),
              navButton('Çözülmüş Problemler', TABS.RESOLVED, 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'),
              navButton('İstatistikler', TABS.ANALYTICS, 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'),
            ]}

            <button
              onClick={() =>
                handleNavigate(() => {
                  setCurrentIssueId(null);
                  navigate({ app: APPS.PORTAL, tab: TABS.SETTINGS });
                })
              }
              className={`px-3 py-2 md:px-4 rounded-md font-bold text-xs md:text-sm transition-colors ${
                activeTab === TABS.SETTINGS && currentApp === APPS.PORTAL
                  ? 'bg-slate-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Ayarlar
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 w-full md:w-auto flex-wrap">
            {/* Mesaj Kutusu ve Bildirimler */}
            <MessageBox currentUser={user} onNavigate={navigate} />

            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs md:text-sm shadow-sm">
              <User className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-white">{user.name}</span>
              <span className="bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-[10px] px-2 py-0.5 rounded uppercase">
                {user.role}
              </span>
            </div>
            <button
              onClick={() => handleNavigate(() => logout())}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 font-semibold text-sm md:text-base transition-colors"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" /> Çıkış
            </button>
          </div>
        </div>
      </nav>
      <div className="molten-gradient h-1 w-full shadow-[0_0_15px_rgba(245,158,11,0.5)] relative z-20" />

      <main className="container mx-auto py-4 md:py-8 px-2 md:px-4 relative z-10">
        {currentApp === APPS.PORTAL &&
          (activeTab === TABS.SETTINGS ? (
            <SettingsView
              currentUser={user}
              onBack={() => handleNavigate(() => navigate({ app: APPS.PORTAL, tab: TABS.OPEN }))}
            />
          ) : (
            <PortalView
              onSelectApp={(app) => handleNavigate(() => navigate({ app, tab: TABS.OPEN }))}
            />
          ))}

        {currentApp === APPS.ISSUES && (
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
                <div className="flex flex-col md:flex-row justify-between md:items-end px-1 gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
                      {activeTab === TABS.OPEN ? 'Açık Problemler' : 'Çözülmüş Problemler'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">
                      {isManager(user)
                        ? 'Tüm kullanıcıların kayıtları'
                        : 'Sadece kendi kayıtlarınız'}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <button
                      onClick={() => openIssueDetail(null)}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow transition-colors flex items-center gap-2 text-sm md:text-base justify-center"
                    >
                      + Yeni Kayıt
                    </button>
                    <div className="text-sm font-bold text-white bg-blue-600 px-3 py-2 sm:py-1 rounded-md sm:rounded-full shadow text-center">
                      Toplam: {activeTab === TABS.OPEN ? openIssues.length : resolvedIssues.length}
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    placeholder="Problem tanımı, bölüm veya ID ara..."
                    className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md px-4 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select
                    className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md px-4 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchArea}
                    onChange={(e) => setSearchArea(e.target.value)}
                  >
                    <option value="" className={OPTION_CLASS}>
                      Tüm Alanlar
                    </option>
                    {allAreas.map((area) => (
                      <option key={area} value={area} className={OPTION_CLASS}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <IssueList
                  issues={activeTab === TABS.OPEN ? openIssues : resolvedIssues}
                  onSelectIssue={openIssueDetail}
                />
              </div>
            )}

            {activeTab === TABS.DETAIL &&
              (() => {
                const isResolved = currentIssue?.mevcut_durum === STATUS.GREEN;
                const list = isResolved ? resolvedIssues : openIssues;
                const index = currentIssue ? list.findIndex((i) => i.id === currentIssue.id) : -1;

                return (
                  <div className="animate-fade-in">
                    <DashboardView
                      issues={list}
                      currentIndex={index}
                      setCurrentIndex={(idx) => setCurrentIssueId(idx === -1 ? null : list[idx].id)}
                      onBack={() => goToList(isResolved ? TABS.RESOLVED : TABS.OPEN)}
                      updateIssue={updateIssue}
                      addIssue={addIssue}
                      deleteIssue={deleteIssue}
                      currentUser={user}
                    />
                  </div>
                );
              })()}

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
                  <AnalyticsView issues={filteredIssues} />
                </Suspense>
              </div>
            )}
          </>
        )}

        {currentApp === APPS.ACTIONS && (
          <ActionModule onBack={() => navigate({ app: APPS.PORTAL })} currentUser={user} />
        )}
        {currentApp === APPS.AUDIT && <AuditModule onBack={() => navigate({ app: APPS.PORTAL })} />}
        {currentApp === APPS.MAINTENANCE && (
          <MaintenanceModule onBack={() => navigate({ app: APPS.PORTAL })} />
        )}
      </main>
    </div>
  );
}
