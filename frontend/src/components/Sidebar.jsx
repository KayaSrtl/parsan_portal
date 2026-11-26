import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cog,
  Cpu,
  FileWarning,
  LayoutDashboard,
  Lock,
  LogOut,
  Settings,
  Shield,
  ShieldAlert,
  Sliders,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { isGuest, isManager, ROLE_LABELS } from '../lib/constants';

const MENU_GROUPS = [
  {
    id: 'field',
    title: 'Saha Modülleri',
    items: [
      {
        id: 'hata_karti_ac',
        label: 'Hata Kartı Oluştur',
        app: 'hata_karti_ac',
        tab: 'dashboard',
        Icon: AlertTriangle,
        accent: 'text-rose-600 dark:text-rose-400',
        guestAllowed: true,
      },
      {
        id: 'otonom_bakim',
        label: 'Otonom Bakım (TPM)',
        app: 'otonom_bakim',
        tab: 'open_issues',
        Icon: Wrench,
        accent: 'text-sky-600 dark:text-sky-400',
        guestAllowed: true,
      },
      {
        id: 'tezgah_izleme',
        label: 'Tezgah İzleme',
        app: 'tezgah_izleme',
        tab: 'open_issues',
        Icon: Cog,
        accent: 'text-teal-600 dark:text-teal-400',
        guestAllowed: true,
      },
    ],
  },
  {
    id: 'management',
    title: 'Yönetim & Takip',
    items: [
      {
        id: 'aksiyonlar',
        label: 'Aksiyonlar',
        app: 'aksiyon_modulu',
        tab: 'actions',
        Icon: CheckSquare,
        accent: 'text-emerald-600 dark:text-emerald-400',
        guestAllowed: false,
      },
      {
        id: 'hata_kartlari_takip',
        label: 'Hata Kartları Takip',
        app: 'aksiyon_modulu',
        tab: 'open_issues',
        matchTabs: ['open_issues', 'resolved_issues', 'dashboard'],
        Icon: FileWarning,
        accent: 'text-indigo-600 dark:text-indigo-400',
        badgeKey: 'openIssues',
        guestAllowed: false,
      },
      {
        id: 'istatistikler',
        label: 'İstatistik & Raporlar',
        app: 'aksiyon_modulu',
        tab: 'analytics',
        Icon: BarChart3,
        accent: 'text-purple-600 dark:text-purple-400',
        guestAllowed: false,
      },
      {
        id: 'isg',
        label: 'İSG Risk Bildirimi',
        app: 'isg_risk_bildirimi',
        tab: 'open_issues',
        Icon: ShieldAlert,
        accent: 'text-amber-600 dark:text-amber-400',
        guestAllowed: false,
      },
      {
        id: 'bes_s',
        label: '5S Denetim',
        app: 'bes_s_denetim',
        tab: 'open_issues',
        Icon: ClipboardList,
        accent: 'text-emerald-600 dark:text-emerald-400',
        guestAllowed: false,
      },
    ],
  },
  {
    id: 'admin',
    title: 'Admin Menüsü',
    managerOnly: true,
    items: [
      {
        id: 'admin_users',
        label: 'Kullanıcı Yönetimi',
        app: 'admin_paneli',
        tab: 'users',
        Icon: Users,
        accent: 'text-indigo-600 dark:text-indigo-400',
        guestAllowed: false,
      },
      {
        id: 'admin_machines',
        label: 'Tezgah Yönetimi',
        app: 'admin_paneli',
        tab: 'machines',
        Icon: Cpu,
        accent: 'text-indigo-600 dark:text-indigo-400',
        guestAllowed: false,
      },
      {
        id: 'admin_departments',
        label: 'Bölüm Yönetimi',
        app: 'admin_paneli',
        tab: 'departments',
        Icon: Building2,
        accent: 'text-indigo-600 dark:text-indigo-400',
        guestAllowed: false,
      },
      {
        id: 'admin_system',
        label: 'Sistem & E-posta',
        app: 'admin_paneli',
        tab: 'system',
        Icon: Sliders,
        accent: 'text-indigo-600 dark:text-indigo-400',
        guestAllowed: false,
      },
    ],
  },
];

function isItemActive(item, currentApp, activeTab) {
  if (currentApp !== item.app) return false;
  if (item.app === 'aksiyon_modulu') {
    if (item.matchTabs) return item.matchTabs.includes(activeTab);
    return activeTab === item.tab;
  }
  if (item.app === 'admin_paneli') {
    return activeTab === item.tab || (!activeTab && item.tab === 'users');
  }
  return true;
}

export default function Sidebar({
  currentApp,
  activeTab,
  currentUser,
  isOpen = false,
  onClose,
  onNavigate,
  onLogout,
  collapsed = false,
  onToggleCollapse,
  badges = {},
}) {
  const guestUser = isGuest(currentUser);
  const managerUser = isManager(currentUser);

  // Drop/accordion grupları varsayılan olarak açık
  const [openGroups, setOpenGroups] = useState({
    field: true,
    management: true,
    admin: true,
  });

  // Mobil çekmece açıkken Escape ile kapat ve arka plan scroll'unu kilitle
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleSelect = (target, locked = false, closeDrawer = false) => {
    if (locked) return;
    onNavigate?.(target);
    if (closeDrawer) onClose?.();
  };

  const isDashboardActive = currentApp === 'portal' && activeTab !== 'settings';
  const isSettingsActive = currentApp === 'portal' && activeTab === 'settings';

  const visibleGroups = MENU_GROUPS.filter((g) => !g.managerOnly || managerUser);

  const renderNavItems = ({ isCollapsed, closeDrawer }) => (
    <div className="space-y-4">
      {/* Genel Bakış (Dashboard) */}
      <div>
        <button
          type="button"
          onClick={() => handleSelect({ app: 'portal', tab: 'open_issues' }, false, closeDrawer)}
          title={isCollapsed ? 'Genel Bakış (Dashboard)' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center px-2' : ''
          } ${
            isDashboardActive
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
          }`}
        >
          <LayoutDashboard
            className={`w-4 h-4 shrink-0 ${
              isDashboardActive ? 'text-white' : 'text-indigo-500 dark:text-amber-400'
            }`}
          />
          {!isCollapsed && <span className="truncate">Genel Bakış</span>}
        </button>
      </div>

      {/* Açılır / Kapanır Drop Grupları */}
      {visibleGroups.map((group) => {
        const isGroupOpen = openGroups[group.id] !== false;
        const isAdminGroup = group.id === 'admin';

        return (
          <div
            key={group.id}
            className={
              isAdminGroup && !isCollapsed
                ? 'rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-500/20 p-2'
                : ''
            }
          >
            {isCollapsed ? (
              <div className="my-2 border-t border-slate-200/80 dark:border-slate-800" />
            ) : (
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isGroupOpen}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 mb-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                  isAdminGroup
                    ? 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  {isAdminGroup && <Shield className="w-3.5 h-3.5 shrink-0" />}
                  {group.title}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                    isGroupOpen ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
            )}

            {(isCollapsed || isGroupOpen) && (
              <div className="space-y-1">
                {group.items.map((item) => {
                  const { Icon } = item;
                  const locked = guestUser && !item.guestAllowed;
                  const active = !locked && isItemActive(item, currentApp, activeTab);
                  const badgeValue = item.badgeKey ? Number(badges[item.badgeKey] || 0) : 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={locked}
                      onClick={() =>
                        handleSelect({ app: item.app, tab: item.tab }, locked, closeDrawer)
                      }
                      title={
                        isCollapsed
                          ? locked
                            ? `${item.label} (Yetkili girişi gerekli)`
                            : item.label
                          : locked
                            ? 'Yetkili girişi gerektirir'
                            : undefined
                      }
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs sm:text-[13px] font-bold transition-colors ${
                        isCollapsed ? 'justify-center px-2 relative' : 'justify-between'
                      } ${
                        locked
                          ? 'border-transparent opacity-45 cursor-not-allowed text-slate-400 dark:text-slate-500'
                          : active
                            ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 border-indigo-200/80 dark:border-indigo-500/40 shadow-2xs cursor-pointer'
                            : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white cursor-pointer'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            locked
                              ? 'text-slate-400 dark:text-slate-500'
                              : active
                                ? 'text-indigo-600 dark:text-indigo-300'
                                : item.accent
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </span>

                      {!isCollapsed && locked && (
                        <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      )}

                      {!locked && badgeValue > 0 && (
                        <span
                          className={
                            isCollapsed
                              ? 'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center'
                              : 'min-w-[20px] h-5 px-1.5 rounded-full bg-rose-100 dark:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 text-[10px] font-black flex items-center justify-center shrink-0'
                          }
                        >
                          {badgeValue > 99 ? '99+' : badgeValue}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderFooter = ({ isCollapsed, closeDrawer, showCollapseBtn }) => (
    <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-800 p-2.5 space-y-1 bg-white/80 dark:bg-slate-900/90">
      {!guestUser && (
        <button
          type="button"
          onClick={() => handleSelect({ app: 'portal', tab: 'settings' }, false, closeDrawer)}
          title={isCollapsed ? 'Ayarlar' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs sm:text-[13px] font-bold transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center px-2' : ''
          } ${
            isSettingsActive
              ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 border-indigo-200/80 dark:border-indigo-500/40'
              : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate">Ayarlar</span>}
        </button>
      )}

      <div className={`flex items-center gap-1.5 ${isCollapsed ? 'flex-col' : ''}`}>
        <button
          type="button"
          onClick={() => {
            if (closeDrawer) onClose?.();
            onLogout?.();
          }}
          title={isCollapsed ? 'Çıkış Yap' : undefined}
          className={`flex-1 w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center px-2' : ''
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate">Çıkış Yap</span>}
        </button>

        {showCollapseBtn && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
            aria-label={isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* MASAÜSTÜ: Sabit sol menü (sticky) */}
      <aside
        aria-label="Ana menü"
        className={`hidden lg:flex flex-col shrink-0 sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200/80 dark:border-slate-800 transition-all duration-200 z-20 print:hidden ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3">
          {renderNavItems({ isCollapsed: collapsed, closeDrawer: false })}
        </div>

        {renderFooter({
          isCollapsed: collapsed,
          closeDrawer: false,
          showCollapseBtn: true,
        })}
      </aside>

      {/* MOBİL: Sol taraftan slide-over drawer (başlık sabit, menü bağımsız kayar) */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-200 print:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        {/* Karartmalı arka plan */}
        <div
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]"
        />

        {/* Slide çekmece */}
        <aside
          aria-label="Mobil menü"
          className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-200 ease-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Sabit üst başlık */}
          <div className="shrink-0 h-14 px-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={`${import.meta.env.BASE_URL}parsanlogo.jpeg`}
                alt="Parsan Logo"
                className="w-8 h-8 object-contain bg-white p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-black tracking-tight text-slate-900 dark:text-white truncate">
                  PARSAN Portal
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                  {currentUser?.name} • {ROLE_LABELS[currentUser?.role] || currentUser?.role}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Menüyü kapat"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Bağımsız kaydırılabilir menü listesi */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3">
            {renderNavItems({ isCollapsed: false, closeDrawer: true })}
          </div>

          {/* Alt sabit ayak */}
          {renderFooter({
            isCollapsed: false,
            closeDrawer: true,
            showCollapseBtn: false,
          })}
        </aside>
      </div>
    </>
  );
}
