import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Clock,
  Cog,
  Flame,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Wrench,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import {
  ACTION_STATUS,
  DEFECT_CARD_TYPES,
  isGuest,
  STATUS,
} from '../lib/constants';
import { formatDate, getDelayDays, getStatusColor } from '../utils/helpers';

const CHART_COLORS = {
  resolved: '#10B981',
  open: '#3B82F6',
  waiting: '#F59E0B',
  overdue: '#EF4444',
  score: '#6366F1',
};

const MONTH_LABELS = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

const isClosedIssue = (issue) =>
  issue?.mevcut_durum === STATUS.CLOSED || issue?.mevcut_durum === STATUS.GREEN;

const isYellowCard = (issue) =>
  issue?.hata_karti_turu === DEFECT_CARD_TYPES.YELLOW ||
  String(issue?.hata_karti_turu || '')
    .toLowerCase()
    .includes('sarı');

const isClosedSafety = (item) => {
  const status = String(item?.durum || '').toLowerCase();
  return status.includes('çözüld') || status.includes('kapal') || status.includes('tamamlan');
};

const hasMaintenanceProblem = (item) =>
  item?.item1_status === 'Uygun Değil' ||
  item?.item2_status === 'Hava Kaçağı Var' ||
  item?.item3_status === 'Boşaltılmadı';

function DashboardTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg text-xs">
      <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">
        {label || payload[0].name}
      </p>
      <div className="space-y-0.5">
        {payload.map((entry, idx) => (
          <p
            key={idx}
            style={{ color: entry.color || entry.fill }}
            className="font-semibold flex items-center justify-between gap-3"
          >
            <span>{entry.name}:</span>
            <span className="font-black">{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

/** Misafir (Saha Operatörü) için sade ve mobil dostu giriş ekranı. */
function GuestOperatorView({ user, issues, onNavigateTarget }) {
  const myIssues = useMemo(() => {
    const uid = user?.id;
    const uname = String(user?.name || '').trim().toLowerCase();
    return issues.filter(
      (i) =>
        (uid != null && i.user_id != null && Number(i.user_id) === Number(uid)) ||
        (uname && String(i.bildiren_kisi || '').trim().toLowerCase() === uname)
    );
  }, [issues, user]);

  const myOpenCount = useMemo(
    () => myIssues.filter((i) => !isClosedIssue(i)).length,
    [myIssues]
  );

  const quickCards = [
    {
      title: 'Hata Kartı Oluştur',
      subtitle: 'Kırmızı / Sarı uygunsuzluk bildirimi',
      Icon: AlertTriangle,
      target: { app: 'hata_karti_ac', tab: 'dashboard' },
      cardClass:
        'bg-rose-50/90 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/30 hover:border-rose-400',
      iconClass: 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300',
    },
    {
      title: 'Otonom Bakım (TPM)',
      subtitle: '3 maddelik vardiya başı kontrol',
      Icon: Wrench,
      target: { app: 'otonom_bakim', tab: 'open_issues' },
      cardClass:
        'bg-sky-50/90 dark:bg-sky-950/30 border-sky-200 dark:border-sky-500/30 hover:border-sky-400',
      iconClass: 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300',
    },
    {
      title: 'Tezgah PDF İzleme',
      subtitle: 'Tezgahta dövülen parça teknik resmi',
      Icon: Cog,
      target: { app: 'tezgah_izleme', tab: 'open_issues' },
      cardClass:
        'bg-teal-50/90 dark:bg-teal-950/30 border-teal-200 dark:border-teal-500/30 hover:border-teal-400',
      iconClass: 'bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-amber-400">
              Saha Operatörü Ekranı
            </p>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              Hoş geldiniz, {user?.name || 'Operatör'}
            </h1>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3.5 py-2">
            <div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Açtığınız Kartlar
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                {myIssues.length}{' '}
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  ({myOpenCount} açık)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 büyük dokunmatik hızlı işlem kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickCards.map(({ title, subtitle, Icon, target, cardClass, iconClass }) => (
          <button
            key={target.app}
            type="button"
            onClick={() => onNavigateTarget(target)}
            className={`group text-left p-5 rounded-2xl border transition-all duration-200 active:scale-[0.99] hover:shadow-md cursor-pointer flex flex-col justify-between gap-4 ${cardClass}`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl ${iconClass}`}>
                <Icon className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                {subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Operatörün kendi son kartları */}
      {myIssues.length > 0 && (
        <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm font-black text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            Son Açtığınız Hata Kartları
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {myIssues.slice(0, 5).map((issue) => (
              <div
                key={issue.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm"
              >
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                    #{issue.id} • {issue.bildirilen_alan || 'Alan belirtilmemiş'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {issue.hata_tanimi || 'Açıklama yok'}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${getStatusColor(
                    issue.mevcut_durum
                  )}`}
                >
                  {issue.mevcut_durum}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PortalView({ onSelectApp, onNavigate, issues = [] }) {
  const { user } = useAuth();
  const guestUser = isGuest(user);

  const [actions, setActions] = useState([]);
  const [audits, setAudits] = useState([]);
  const [safety, setSafety] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loadingLive, setLoadingLive] = useState(!guestUser);

  const navigateTarget = useCallback(
    (target) => {
      if (onNavigate) {
        onNavigate(target);
      } else if (onSelectApp && target?.app) {
        onSelectApp(target.app);
      }
    },
    [onNavigate, onSelectApp]
  );

  const fetchAllLive = useCallback(async () => {
    const results = await Promise.allSettled([
      apiFetch('/actions'),
      apiFetch('/audits'),
      apiFetch('/safety'),
      apiFetch('/maintenance'),
      apiFetch('/machines'),
    ]);

    const asArray = (res) =>
      res.status === 'fulfilled' && Array.isArray(res.value) ? res.value : [];

    return {
      actions: asArray(results[0]),
      audits: asArray(results[1]),
      safety: asArray(results[2]),
      maintenances: asArray(results[3]),
      machines: asArray(results[4]),
    };
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (guestUser) return;
    setLoadingLive(true);
    const data = await fetchAllLive();
    setActions(data.actions);
    setAudits(data.audits);
    setSafety(data.safety);
    setMaintenances(data.maintenances);
    setMachines(data.machines);
    setLoadingLive(false);
  }, [guestUser, fetchAllLive]);

  useEffect(() => {
    if (guestUser) return;
    let active = true;
    fetchAllLive().then((data) => {
      if (!active) return;
      setActions(data.actions);
      setAudits(data.audits);
      setSafety(data.safety);
      setMaintenances(data.maintenances);
      setMachines(data.machines);
      setLoadingLive(false);
    });
    return () => {
      active = false;
    };
  }, [guestUser, fetchAllLive]);

  // 1. Hata Kartı KPI ve grafikleri
  const issueStats = useMemo(() => {
    let open = 0;
    let waiting = 0;
    let overdue = 0;
    let closed = 0;
    let redOpen = 0;
    let yellowOpen = 0;
    let redTotal = 0;
    let yellowTotal = 0;

    const deptMap = new Map();
    const monthMap = new Map();
    const urgentList = [];

    issues.forEach((issue) => {
      const closedFlag = isClosedIssue(issue);
      const delay = closedFlag ? 0 : getDelayDays(issue.hedef_tarih, issue.mevcut_durum);
      const yellow = isYellowCard(issue);

      if (yellow) yellowTotal++;
      else redTotal++;

      let bucket = 'open';
      if (closedFlag) {
        closed++;
        bucket = 'closed';
      } else if (delay > 0) {
        overdue++;
        bucket = 'overdue';
      } else if (
        issue.mevcut_durum === STATUS.WAITING ||
        issue.mevcut_durum === STATUS.YELLOW
      ) {
        waiting++;
        bucket = 'waiting';
      } else {
        open++;
        bucket = 'open';
      }

      if (!closedFlag) {
        if (yellow) yellowOpen++;
        else redOpen++;
        urgentList.push({ ...issue, delayDays: delay, isYellow: yellow });
      }

      // Bölüm kırılımı
      const dept = issue.ilgili_bolum || 'Belirtilmemiş';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { name: dept, Kapalı: 0, Açık: 0, Geciken: 0, total: 0 });
      }
      const d = deptMap.get(dept);
      d.total++;
      if (bucket === 'closed') d.Kapalı++;
      else if (bucket === 'overdue') d.Geciken++;
      else d.Açık++;

      // Aylık trend (Açılan vs Çözülen)
      const reportedDate = issue.bildirim_zamani ? new Date(issue.bildirim_zamani) : null;
      if (reportedDate && !Number.isNaN(reportedDate.getTime())) {
        const key = `${reportedDate.getFullYear()}-${String(reportedDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap.has(key)) {
          monthMap.set(key, {
            key,
            name: `${MONTH_LABELS[reportedDate.getMonth()]} ${String(reportedDate.getFullYear()).slice(-2)}`,
            Açılan: 0,
            Çözülen: 0,
          });
        }
        const m = monthMap.get(key);
        m.Açılan++;
        if (closedFlag) m.Çözülen++;
      }
    });

    const activeTotal = open + waiting + overdue;

    const departmentData = [...deptMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const monthlyTrend = [...monthMap.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6);

    const statusPie = [
      { name: 'Çözülen', value: closed, color: CHART_COLORS.resolved },
      { name: 'Açık', value: open, color: CHART_COLORS.open },
      { name: 'Beklemede', value: waiting, color: CHART_COLORS.waiting },
      { name: 'Geciken', value: overdue, color: CHART_COLORS.overdue },
    ].filter((s) => s.value > 0);

    // Acil / geciken açık kartlar (önce en çok geciken, sonra Kırmızı kartlar, sonra en yeni)
    urgentList.sort((a, b) => {
      if (b.delayDays !== a.delayDays) return b.delayDays - a.delayDays;
      if (a.isYellow !== b.isYellow) return a.isYellow ? 1 : -1;
      return (b.id || 0) - (a.id || 0);
    });

    return {
      total: issues.length,
      activeTotal,
      open,
      waiting,
      overdue,
      closed,
      redOpen,
      yellowOpen,
      redTotal,
      yellowTotal,
      departmentData,
      monthlyTrend,
      statusPie,
      urgentList: urgentList.slice(0, 6),
    };
  }, [issues]);

  // 2. Aksiyon, 5S, İSG, Otonom Bakım ve Tezgah KPI'ları
  const actionStats = useMemo(() => {
    const active = actions.filter((a) => a.status !== ACTION_STATUS.DONE);
    const avgProgress = active.length
      ? Math.round(active.reduce((sum, a) => sum + (Number(a.progress) || 0), 0) / active.length)
      : actions.length
        ? 100
        : 0;
    return { activeCount: active.length, total: actions.length, avgProgress };
  }, [actions]);

  const auditStats = useMemo(() => {
    if (!audits.length) {
      return { avgScore: null, latestPeriodLabel: 'Henüz denetim yok', areaScores: [], count: 0 };
    }

    // Her alanın en güncel denetimi
    const latestByArea = new Map();
    const sorted = [...audits].sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return db - da || (b.id || 0) - (a.id || 0);
    });

    sorted.forEach((a) => {
      const area = a.tezgah_no || 'Bilinmeyen';
      if (!latestByArea.has(area)) {
        latestByArea.set(area, {
          name: area,
          Puan: Math.round(Number(a.total_score) || 0),
          date: a.date,
        });
      }
    });

    const areaScores = [...latestByArea.values()]
      .sort((a, b) => b.Puan - a.Puan)
      .slice(0, 10);

    // Son dönem (en son ay) ortalaması
    const newestDate = sorted[0]?.date ? new Date(sorted[0].date) : null;
    let periodAudits = sorted;
    let latestPeriodLabel = `${sorted.length} denetim`;
    if (newestDate && !Number.isNaN(newestDate.getTime())) {
      const y = newestDate.getFullYear();
      const m = newestDate.getMonth();
      periodAudits = sorted.filter((a) => {
        const d = a.date ? new Date(a.date) : null;
        return d && !Number.isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m;
      });
      latestPeriodLabel = `${MONTH_LABELS[m]} ${y} (${periodAudits.length} alan)`;
    }

    const avgScore = periodAudits.length
      ? Math.round(
          periodAudits.reduce((sum, a) => sum + (Number(a.total_score) || 0), 0) /
            periodAudits.length
        )
      : 0;

    return { avgScore, latestPeriodLabel, areaScores, count: periodAudits.length };
  }, [audits]);

  const safetyStats = useMemo(() => {
    const openItems = safety.filter((s) => !isClosedSafety(s));
    const criticalCount = openItems.filter(
      (s) => s.risk_derecesi === 'Kritik' || s.risk_derecesi === 'Yüksek'
    ).length;
    return { openCount: openItems.length, criticalCount, total: safety.length };
  }, [safety]);

  const maintenanceStats = useMemo(() => {
    const faulty = maintenances.filter(hasMaintenanceProblem);
    const activeMachinesWithPdf = machines.filter((m) => Boolean(m.active_part)).length;
    return {
      faultyCount: faulty.length,
      totalRecords: maintenances.length,
      machineCount: machines.length,
      activeMachinesWithPdf,
    };
  }, [maintenances, machines]);

  // 3. Son Otonom Bakım & İSG Uyarıları (birleşik akış)
  const fieldAlerts = useMemo(() => {
    const list = [];

    maintenances
      .filter(hasMaintenanceProblem)
      .slice(0, 6)
      .forEach((m) => {
        const reasons = [];
        if (m.item1_status === 'Uygun Değil') reasons.push(`Basınç ${m.item1_val} bar`);
        if (m.item2_status === 'Hava Kaçağı Var') reasons.push('Hava kaçağı');
        if (m.item3_status === 'Boşaltılmadı') reasons.push('Atık yağ tankı dolu');
        list.push({
          id: `tpm-${m.id}`,
          kind: 'tpm',
          title: `${m.tezgah_no} • Otonom Bakım`,
          detail: reasons.join(' · '),
          meta: m.operator_name || 'Operatör',
          date: m.tarih,
          severity: 'warning',
          target: { app: 'otonom_bakim', tab: 'open_issues' },
        });
      });

    safety
      .filter((s) => !isClosedSafety(s))
      .slice(0, 6)
      .forEach((s) => {
        list.push({
          id: `isg-${s.id}`,
          kind: 'isg',
          title: `${s.alan || 'Saha'} • ${s.type || 'İSG'}`,
          detail: s.tanim || 'Açıklama yok',
          meta: `${s.risk_derecesi || 'Orta'} Risk`,
          date: s.tarih,
          severity:
            s.risk_derecesi === 'Kritik' || s.risk_derecesi === 'Yüksek' ? 'danger' : 'info',
          target: { app: 'isg_risk_bildirimi', tab: 'open_issues' },
        });
      });

    list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return list.slice(0, 6);
  }, [maintenances, safety]);

  if (guestUser) {
    return (
      <GuestOperatorView user={user} issues={issues} onNavigateTarget={navigateTarget} />
    );
  }

  const redPct =
    issueStats.total > 0 ? Math.round((issueStats.redTotal / issueStats.total) * 100) : 0;
  const yellowPct = issueStats.total > 0 ? 100 - redPct : 0;

  const kpiCards = [
    {
      id: 'open_issues',
      label: 'Açık Hata Kartları',
      value: issueStats.activeTotal,
      sub: `🔴 ${issueStats.redOpen} Kırmızı · 🟡 ${issueStats.yellowOpen} Sarı`,
      Icon: AlertTriangle,
      iconBg: 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300',
      border: 'border-slate-200/90 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-500/50',
      target: { app: 'aksiyon_modulu', tab: 'open_issues' },
    },
    {
      id: 'overdue',
      label: 'Geciken Kartlar',
      value: issueStats.overdue,
      sub:
        issueStats.overdue > 0
          ? 'Acil aksiyon gerektiriyor'
          : 'Termini geçen kart yok',
      Icon: Flame,
      iconBg:
        issueStats.overdue > 0
          ? 'bg-red-100 dark:bg-red-500/25 text-red-600 dark:text-red-300'
          : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300',
      border:
        issueStats.overdue > 0
          ? 'border-red-300 dark:border-red-500/50 bg-red-50/40 dark:bg-red-950/20 hover:border-red-400'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-300',
      valueClass:
        issueStats.overdue > 0
          ? 'text-red-600 dark:text-red-400'
          : 'text-emerald-600 dark:text-emerald-400',
      target: { app: 'aksiyon_modulu', tab: 'open_issues' },
    },
    {
      id: 'actions',
      label: 'Aktif Aksiyonlar',
      value: actionStats.activeCount,
      sub: `Ort. ilerleme: %${actionStats.avgProgress}`,
      Icon: CheckSquare,
      iconBg: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300',
      border: 'border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50',
      target: { app: 'aksiyon_modulu', tab: 'actions' },
    },
    {
      id: 'audit',
      label: 'Son Dönem 5S Puanı',
      value: auditStats.avgScore !== null ? `${auditStats.avgScore}` : '—',
      sub: auditStats.latestPeriodLabel,
      Icon: ClipboardList,
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300',
      border: 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50',
      target: { app: 'bes_s_denetim', tab: 'open_issues' },
    },
    {
      id: 'safety',
      label: 'İSG Açık Risk / Ramak Kala',
      value: safetyStats.openCount,
      sub:
        safetyStats.criticalCount > 0
          ? `${safetyStats.criticalCount} Yüksek/Kritik risk`
          : `Toplam ${safetyStats.total} kayıt`,
      Icon: ShieldAlert,
      iconBg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300',
      border: 'border-slate-200/90 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/50',
      target: { app: 'isg_risk_bildirimi', tab: 'open_issues' },
    },
    {
      id: 'maintenance',
      label: 'TPM Uygunsuzluk / Tezgah',
      value: maintenanceStats.faultyCount,
      sub: `${maintenanceStats.machineCount} tezgah (${maintenanceStats.activeMachinesWithPdf} PDF)`,
      Icon: Wrench,
      iconBg: 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300',
      border: 'border-slate-200/90 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-500/50',
      target: { app: 'otonom_bakim', tab: 'open_issues' },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* 1. KOMPAKT KARŞILAMA */}
      <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-status-beacon shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Yönetici Genel Bakış
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate mt-0.5">
              Hoş geldiniz, {user?.name}
            </h1>
          </div>

          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loadingLive}
            title="Verileri Yenile"
            aria-label="Verileri Yenile"
            className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingLive ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. 6 CANLI KPI KARTI */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {kpiCards.map(({ id, label, value, sub, Icon, iconBg, border, valueClass, target }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigateTarget(target)}
            className={`group text-left bg-white/95 dark:bg-slate-900/90 rounded-2xl border p-3.5 sm:p-4 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md cursor-pointer flex flex-col justify-between gap-2.5 ${border}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className={`p-2 rounded-xl ${iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="min-w-0">
              <div
                className={`text-2xl sm:text-3xl font-black leading-none tracking-tight ${
                  valueClass || 'text-slate-900 dark:text-white'
                }`}
              >
                {loadingLive && id !== 'open_issues' && id !== 'overdue' ? '…' : value}
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1.5 truncate">
                {label}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {sub}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 3. YÖNETİCİ GRAFİKLERİ (2 SÜTUN RESPONSIVE GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Grafik 1: İlgili Bölümlere Göre Hata Kartları */}
        <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 truncate">
              <BarChart3 className="w-4 h-4 text-indigo-500 shrink-0" />
              İlgili Bölümlere Göre Hata Kartları
            </h2>
            <button
              type="button"
              onClick={() => navigateTarget({ app: 'aksiyon_modulu', tab: 'analytics' })}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
            >
              Detaylı Analiz →
            </button>
          </div>
          {issueStats.departmentData.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400">
              Henüz bölüm bazlı hata kartı verisi yok.
            </div>
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={issueStats.departmentData}
                  margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={44}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<DashboardTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Kapalı" stackId="a" fill={CHART_COLORS.resolved} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Açık" stackId="a" fill={CHART_COLORS.open} />
                  <Bar dataKey="Geciken" stackId="a" fill={CHART_COLORS.overdue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Grafik 2: Hata Kartı Durum & Tür Dağılımı */}
        <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 truncate">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Hata Kartı Durum & Tür Dağılımı
            </h2>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
              Toplam {issueStats.total} kart
            </span>
          </div>

          {issueStats.statusPie.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              Henüz hata kartı kaydı yok.
            </div>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={issueStats.statusPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={74}
                    paddingAngle={3}
                  >
                    {issueStats.statusPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<DashboardTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Kırmızı / Sarı kart özet çubuğu */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
              <span className="text-rose-600 dark:text-rose-400">
                🔴 Kırmızı Kart: {issueStats.redTotal} (%{redPct})
              </span>
              <span className="text-amber-600 dark:text-amber-400">
                🟡 Sarı Kart: {issueStats.yellowTotal} (%{yellowPct})
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${redPct}%` }}
                className="bg-rose-500 transition-all duration-300"
              />
              <div
                style={{ width: `${yellowPct}%` }}
                className="bg-amber-400 transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Grafik 3: Aylık Hata Kartı Trendi */}
        <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 truncate">
              <TrendingUp className="w-4 h-4 text-sky-500 shrink-0" />
              Aylık Hata Kartı Trendi
            </h2>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
              Açılan vs Çözülen
            </span>
          </div>
          {issueStats.monthlyTrend.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400">
              Aylık trend için yeterli veri yok.
            </div>
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={issueStats.monthlyTrend}
                  margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="portalOpenedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="portalClosedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<DashboardTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area
                    type="monotone"
                    dataKey="Açılan"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fill="url(#portalOpenedGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Çözülen"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#portalClosedGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Grafik 4: Son 5S Denetim Alan Puanları */}
        <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 truncate">
              <ClipboardList className="w-4 h-4 text-emerald-500 shrink-0" />
              Son 5S Denetim Alan Puanları
            </h2>
            <button
              type="button"
              onClick={() => navigateTarget({ app: 'bes_s_denetim', tab: 'open_issues' })}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 cursor-pointer"
            >
              5S Modülü →
            </button>
          </div>
          {auditStats.areaScores.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400">
              {loadingLive ? '5S denetim verileri yükleniyor...' : 'Henüz 5S denetim kaydı yok.'}
            </div>
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={auditStats.areaScores}
                  margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={44}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<DashboardTooltip />} />
                  <Bar dataKey="Puan" radius={[6, 6, 0, 0]}>
                    {auditStats.areaScores.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.Puan >= 80
                            ? '#10B981'
                            : entry.Puan >= 60
                              ? '#F59E0B'
                              : '#EF4444'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 4. KRİTİK DİKKAT PANELİ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* En acil / geciken açık hata kartları */}
        <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500 shrink-0" />
              Öncelikli & Geciken Hata Kartları
            </h2>
            <button
              type="button"
              onClick={() => navigateTarget({ app: 'aksiyon_modulu', tab: 'open_issues' })}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
            >
              Tümünü Gör →
            </button>
          </div>

          {issueStats.urgentList.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400/70" />
              <span>Açık veya geciken hata kartı bulunmuyor.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {issueStats.urgentList.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() =>
                    navigateTarget({
                      app: 'aksiyon_modulu',
                      tab: 'dashboard',
                      issueId: issue.id,
                    })
                  }
                  className="w-full text-left py-2.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          issue.isYellow ? 'bg-amber-400' : 'bg-rose-500'
                        }`}
                      />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                        #{issue.id} · {issue.bildirilen_alan || 'Alan yok'}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                        ({issue.ilgili_bolum || '-'})
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                      {issue.hata_tanimi || 'Açıklama girilmemiş'}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    {issue.delayDays > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/40 text-[10px] font-black">
                        <Clock className="w-3 h-3" /> {issue.delayDays}g gecikti
                      </span>
                    ) : (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(
                          issue.mevcut_durum
                        )}`}
                      >
                        {issue.mevcut_durum}
                      </span>
                    )}
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Termin: {formatDate(issue.hedef_tarih)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Son Otonom Bakım & İSG Uyarıları */}
        <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              Son Otonom Bakım & İSG Uyarıları
            </h2>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
              {fieldAlerts.length} uyarı
            </span>
          </div>

          {fieldAlerts.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400/70" />
              <span>
                {loadingLive
                  ? 'Saha uyarıları yükleniyor...'
                  : 'Aktif otonom bakım veya İSG uyarısı bulunmuyor.'}
              </span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {fieldAlerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => navigateTarget(alert.target)}
                  className="w-full text-left py-2.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        alert.kind === 'tpm'
                          ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300'
                      }`}
                    >
                      {alert.kind === 'tpm' ? (
                        <Wrench className="w-3.5 h-3.5" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                        {alert.title}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                        {alert.detail}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        alert.severity === 'danger'
                          ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          : alert.severity === 'warning'
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            : 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300'
                      }`}
                    >
                      {alert.meta}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {formatDate(alert.date)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(PortalView);
