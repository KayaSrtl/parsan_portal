import { useMemo, useState } from 'react';
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
  Activity,
  AlertTriangle,
  BarChart2,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Filter,
  Flame,
  PieChart as PieChartIcon,
  RotateCcw,
  Tag,
  Wrench,
} from 'lucide-react';
import { isAfter, subDays } from 'date-fns';

import { useCatalog } from '../hooks/useCatalog';
import { DEFECT_CARD_TYPES, OPTION_CLASS, STATUS } from '../lib/constants';
import { getDelayDays } from '../utils/helpers';

const COLORS = {
  resolved: '#10B981',
  open: '#3B82F6',
  waiting: '#F59E0B',
  overdue: '#EF4444',
  redCard: '#E11D48',
  yellowCard: '#D97706',
};

const MONTH_NAMES = [
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

/** Render sırasında yeniden tanımlanmaması için bileşen dışında. */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg text-xs">
      <p className="font-bold text-slate-800 dark:text-slate-100 mb-1.5">
        {label || payload[0].name}
      </p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-semibold flex items-center gap-2">
            <span>{entry.name}:</span>
            <span className="font-black">{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Kayıt çözülmüş mü, gecikmiş mi, beklemede mi, yoksa açık mı? */
const classifyStatus = (issue) => {
  if (issue.mevcut_durum === STATUS.CLOSED || issue.mevcut_durum === STATUS.GREEN) {
    return 'resolved';
  }
  if (getDelayDays(issue.hedef_tarih, issue.mevcut_durum) > 0) {
    return 'overdue';
  }
  if (issue.mevcut_durum === STATUS.WAITING || issue.mevcut_durum === STATUS.YELLOW) {
    return 'waiting';
  }
  return 'open';
};

const isYellowCard = (issue) =>
  issue.hata_karti_turu === DEFECT_CARD_TYPES.YELLOW ||
  String(issue.hata_karti_turu || '').toLowerCase().includes('sarı');

export default function AnalyticsView({ issues = [] }) {
  const { departmentNames } = useCatalog();
  const [dateRange, setDateRange] = useState('all'); // 'all' | '7' | '30' | '90' | '180'
  const [relatedDepartment, setRelatedDepartment] = useState('all');
  const [reportingDepartment, setReportingDepartment] = useState('all');
  const [cardType, setCardType] = useState('all'); // 'all' | RED | YELLOW

  const relatedDepartments = useMemo(() => {
    const set = new Set(departmentNames);
    issues.forEach((i) => {
      if (i.ilgili_bolum) set.add(i.ilgili_bolum);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [departmentNames, issues]);

  const reportingDepartments = useMemo(() => {
    const set = new Set(departmentNames);
    issues.forEach((i) => {
      if (i.bildiren_bolum) set.add(i.bildiren_bolum);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [departmentNames, issues]);

  const hasActiveFilter =
    dateRange !== 'all' ||
    relatedDepartment !== 'all' ||
    reportingDepartment !== 'all' ||
    cardType !== 'all';

  const resetFilters = () => {
    setDateRange('all');
    setRelatedDepartment('all');
    setReportingDepartment('all');
    setCardType('all');
  };

  const filteredIssues = useMemo(() => {
    let filtered = issues;

    if (relatedDepartment !== 'all') {
      filtered = filtered.filter((i) => i.ilgili_bolum === relatedDepartment);
    }

    if (reportingDepartment !== 'all') {
      filtered = filtered.filter((i) => i.bildiren_bolum === reportingDepartment);
    }

    if (cardType !== 'all') {
      filtered = filtered.filter((i) => {
        if (cardType === DEFECT_CARD_TYPES.YELLOW) return isYellowCard(i);
        return !isYellowCard(i);
      });
    }

    if (dateRange !== 'all') {
      const cutoff = subDays(new Date(), parseInt(dateRange, 10));
      filtered = filtered.filter((i) => {
        const reported = toDate(i.bildirim_zamani);
        return reported ? isAfter(reported, cutoff) : false;
      });
    }

    return filtered;
  }, [issues, dateRange, relatedDepartment, reportingDepartment, cardType]);

  // Genel KPI & Durum İstatistikleri
  const summary = useMemo(() => {
    const counts = { resolved: 0, open: 0, waiting: 0, overdue: 0 };
    let totalDelayDays = 0;
    let delayedCount = 0;
    let redTotal = 0;
    let redOpen = 0;
    let redOverdue = 0;
    let redResolved = 0;
    let yellowTotal = 0;
    let yellowOpen = 0;
    let yellowOverdue = 0;
    let yellowResolved = 0;

    filteredIssues.forEach((issue) => {
      const bucket = classifyStatus(issue);
      counts[bucket]++;

      const delay = getDelayDays(issue.hedef_tarih, issue.mevcut_durum);
      if (delay > 0) {
        totalDelayDays += delay;
        delayedCount++;
      }

      const yellow = isYellowCard(issue);
      if (yellow) {
        yellowTotal++;
        if (bucket === 'resolved') yellowResolved++;
        else if (bucket === 'overdue') yellowOverdue++;
        else yellowOpen++;
      } else {
        redTotal++;
        if (bucket === 'resolved') redResolved++;
        else if (bucket === 'overdue') redOverdue++;
        else redOpen++;
      }
    });

    const total = filteredIssues.length;
    const activeCount = counts.open + counts.waiting + counts.overdue;
    const closeRate = total > 0 ? Math.round((counts.resolved / total) * 100) : 0;
    const avgDelayDays = delayedCount > 0 ? Math.round((totalDelayDays / delayedCount) * 10) / 10 : 0;

    return {
      total,
      counts,
      activeCount,
      closeRate,
      avgDelayDays,
      red: {
        total: redTotal,
        open: redOpen,
        overdue: redOverdue,
        resolved: redResolved,
        rate: redTotal > 0 ? Math.round((redResolved / redTotal) * 100) : 0,
      },
      yellow: {
        total: yellowTotal,
        open: yellowOpen,
        overdue: yellowOverdue,
        resolved: yellowResolved,
        rate: yellowTotal > 0 ? Math.round((yellowResolved / yellowTotal) * 100) : 0,
      },
    };
  }, [filteredIssues]);

  // 1. Çözülme & Durum Dağılımı (Donut)
  const statusData = useMemo(
    () =>
      [
        { name: 'Çözülen', value: summary.counts.resolved, color: COLORS.resolved },
        { name: 'Açık', value: summary.counts.open, color: COLORS.open },
        { name: 'Beklemede', value: summary.counts.waiting, color: COLORS.waiting },
        { name: 'Geciken', value: summary.counts.overdue, color: COLORS.overdue },
      ].filter((d) => d.value > 0),
    [summary]
  );

  // 2. İlgili Bölüm Performansı (sorumluluk bazlı)
  const departmentData = useMemo(() => {
    const map = new Map();

    filteredIssues.forEach((issue) => {
      const key = issue.ilgili_bolum || 'Belirsiz';
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          toplam: 0,
          Çözülen: 0,
          Açık: 0,
          Beklemede: 0,
          Geciken: 0,
        });
      }

      const bucket = map.get(key);
      bucket.toplam++;
      const status = classifyStatus(issue);
      if (status === 'resolved') bucket.Çözülen++;
      else if (status === 'overdue') bucket.Geciken++;
      else if (status === 'waiting') bucket.Beklemede++;
      else bucket.Açık++;
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        aktifAcik: row.Açık + row.Beklemede,
        kapanmaOrani: row.toplam > 0 ? Math.round((row.Çözülen / row.toplam) * 100) : 0,
      }))
      .sort((a, b) => b.toplam - a.toplam);
  }, [filteredIssues]);

  // 3. Aylık Problem Trendi (Açılan vs Çözülen)
  const trendData = useMemo(() => {
    const map = new Map();

    filteredIssues.forEach((issue) => {
      const date = toDate(issue.bildirim_zamani);
      if (!date) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: `${MONTH_NAMES[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`,
          Açılan: 0,
          Çözülen: 0,
        });
      }

      const bucket = map.get(key);
      bucket.Açılan++;
      if (issue.mevcut_durum === STATUS.CLOSED || issue.mevcut_durum === STATUS.GREEN) {
        bucket.Çözülen++;
      }
    });

    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredIssues]);

  // 4. En Çok Sorun Çıkan Tezgahlar Top 10
  const areaData = useMemo(() => {
    const map = new Map();

    filteredIssues.forEach((issue) => {
      const key = issue.bildirilen_alan?.toUpperCase() || 'Belirsiz';
      if (!map.has(key)) {
        map.set(key, { name: key, toplam: 0, Geciken: 0, Açık: 0, Çözülen: 0 });
      }

      const bucket = map.get(key);
      bucket.toplam++;
      const status = classifyStatus(issue);
      if (status === 'resolved') bucket.Çözülen++;
      else if (status === 'overdue') bucket.Geciken++;
      else bucket.Açık++;
    });

    return [...map.values()].sort((a, b) => b.toplam - a.toplam).slice(0, 10);
  }, [filteredIssues]);

  const topArea = areaData[0] || null;
  const redShare = summary.total > 0 ? Math.round((summary.red.total / summary.total) * 100) : 0;
  const yellowShare = summary.total > 0 ? 100 - redShare : 0;

  return (
    <div className="animate-fade-in space-y-6 pb-8">
      {/* Başlık ve Gelişmiş Filtre Çubuğu */}
      <div className="bg-white/95 dark:bg-slate-900/95 p-4 sm:p-6 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="text-indigo-500 w-6 h-6 shrink-0" />
              <span>İstatistik ve Performans Analitiği</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Toplam{' '}
              <span className="font-black text-indigo-600 dark:text-indigo-400">
                {filteredIssues.length}
              </span>{' '}
              hata kartı üzerinden canlı analiz ediliyor.
            </p>
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Filtreleri Sıfırla
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Tarih Aralığı */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <CalendarDays className="w-4 h-4 text-indigo-500 shrink-0" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none w-full cursor-pointer"
              aria-label="Tarih aralığı"
            >
              <option value="all" className={OPTION_CLASS}>
                Tüm Zamanlar
              </option>
              <option value="7" className={OPTION_CLASS}>
                Son 7 Gün
              </option>
              <option value="30" className={OPTION_CLASS}>
                Son 30 Gün
              </option>
              <option value="90" className={OPTION_CLASS}>
                Son 3 Ay
              </option>
              <option value="180" className={OPTION_CLASS}>
                Son 6 Ay
              </option>
            </select>
          </div>

          {/* İlgili Bölüm */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <select
              value={relatedDepartment}
              onChange={(e) => setRelatedDepartment(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none w-full cursor-pointer"
              aria-label="İlgili bölüm filtresi"
            >
              <option value="all" className={OPTION_CLASS}>
                İlgili Bölüm: Tümü
              </option>
              {relatedDepartments.map((dep) => (
                <option key={dep} value={dep} className={OPTION_CLASS}>
                  {dep}
                </option>
              ))}
            </select>
          </div>

          {/* Bildiren Bölüm */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-sky-500 shrink-0" />
            <select
              value={reportingDepartment}
              onChange={(e) => setReportingDepartment(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none w-full cursor-pointer"
              aria-label="Bildiren bölüm filtresi"
            >
              <option value="all" className={OPTION_CLASS}>
                Bildiren Bölüm: Tümü
              </option>
              {reportingDepartments.map((dep) => (
                <option key={dep} value={dep} className={OPTION_CLASS}>
                  {dep}
                </option>
              ))}
            </select>
          </div>

          {/* Hata Kartı Türü */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <Tag className="w-4 h-4 text-rose-500 shrink-0" />
            <select
              value={cardType}
              onChange={(e) => setCardType(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none w-full cursor-pointer"
              aria-label="Hata kartı türü filtresi"
            >
              <option value="all" className={OPTION_CLASS}>
                Kart Türü: Tümü
              </option>
              <option value={DEFECT_CARD_TYPES.RED} className={OPTION_CLASS}>
                🔴 Kırmızı Hata Kartı
              </option>
              <option value={DEFECT_CARD_TYPES.YELLOW} className={OPTION_CLASS}>
                🟡 Sarı Hata Kartı
              </option>
            </select>
          </div>
        </div>
      </div>

      {filteredIssues.length === 0 ? (
        <div className="bg-white/95 dark:bg-slate-900/95 p-10 rounded-3xl shadow-xs text-center border border-slate-200/80 dark:border-slate-800">
          <PieChartIcon className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Veri Bulunamadı</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Seçili filtrelere uygun hata kartı kaydı yok.
          </p>
        </div>
      ) : (
        <>
          {/* 5 KPI Özet Kartı */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Toplam Kart */}
            <div className="bg-white/95 dark:bg-slate-900/95 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Toplam Kart</span>
                <ClipboardList className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="mt-2">
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {summary.total}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {departmentData.length} farklı ilgili bölüm
                </p>
              </div>
            </div>

            {/* 2. Kapanma Oranı */}
            <div className="bg-white/95 dark:bg-slate-900/95 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Kapanma Oranı</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2">
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  %{summary.closeRate}
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${summary.closeRate}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {summary.counts.resolved} kapanan kart
                </p>
              </div>
            </div>

            {/* 3. Açık / Geciken & Ort. Gecikme */}
            <div className="bg-white/95 dark:bg-slate-900/95 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Açık / Geciken</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {summary.activeCount}
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                    {summary.counts.overdue} geciken
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Ort. gecikme:{' '}
                  <b className="text-rose-600 dark:text-rose-400">
                    {summary.avgDelayDays > 0 ? `${summary.avgDelayDays} gün` : 'Gecikme yok'}
                  </b>
                </p>
              </div>
            </div>

            {/* 4. Kırmızı / Sarı Kart Dağılımı */}
            <div className="bg-white/95 dark:bg-slate-900/95 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Kırmızı / Sarı</span>
                <Flame className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-2 text-lg font-black">
                  <span className="text-rose-600 dark:text-rose-400">{summary.red.total} Kırmızı</span>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span className="text-amber-600 dark:text-amber-400">{summary.yellow.total} Sarı</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 mt-2">
                  <div className="bg-rose-500 h-full" style={{ width: `${redShare}%` }} />
                  <div className="bg-amber-400 h-full" style={{ width: `${yellowShare}%` }} />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  %{redShare} Kırmızı • %{yellowShare} Sarı
                </p>
              </div>
            </div>

            {/* 5. En Yoğun Tezgah / Alan */}
            <div className="bg-white/95 dark:bg-slate-900/95 p-4 rounded-2xl border border-sky-200/80 dark:border-sky-900/60 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-sky-700 dark:text-sky-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">En Yoğun Alan</span>
                <Wrench className="w-4 h-4 text-sky-500" />
              </div>
              <div className="mt-2">
                <div
                  className="text-2xl font-black text-slate-900 dark:text-white truncate"
                  title={topArea?.name || '-'}
                >
                  {topArea?.name || '-'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {topArea
                    ? `${topArea.toplam} kayıt (${topArea.Geciken} geciken)`
                    : 'Kayıt yok'}
                </p>
              </div>
            </div>
          </div>

          {/* 4 Ana Grafik Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Çözülme & Durum Dağılımı (Donut) */}
            <ChartCard
              title="Çözülme & Durum Dağılımı"
              subtitle="Çözülen, açık, beklemede ve geciken kart oranları"
              icon={<PieChartIcon className="text-indigo-500 w-5 h-5" />}
            >
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}
                  labelLine={false}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ChartCard>

            {/* 2. İlgili Bölüm Performansı (Stacked BarChart) */}
            <ChartCard
              title="İlgili Bölüm Performansı"
              subtitle="Sorumluluk bazlı çözülen, açık ve geciken kart yükü"
              icon={<BarChart2 className="text-purple-500 w-5 h-5" />}
            >
              <BarChart data={departmentData} margin={{ top: 10, right: 16, left: -12, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                  height={48}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Çözülen" stackId="a" fill={COLORS.resolved} />
                <Bar dataKey="aktifAcik" name="Açık / Beklemede" stackId="a" fill={COLORS.open} />
                <Bar dataKey="Geciken" stackId="a" fill={COLORS.overdue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>

            {/* 3. Aylık Problem Trendi (AreaChart) */}
            <ChartCard
              title="Aylık Problem Trendi"
              subtitle="Aylara göre açılan ve çözülen hata kartı eğilimi"
              icon={<Activity className="text-orange-500 w-5 h-5" />}
            >
              <AreaChart data={trendData} margin={{ top: 10, right: 16, left: -12, bottom: 5 }}>
                <defs>
                  <linearGradient id="analyticsOpenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.overdue} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={COLORS.overdue} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="analyticsResolvedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.resolved} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={COLORS.resolved} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  type="monotone"
                  dataKey="Açılan"
                  stroke={COLORS.overdue}
                  strokeWidth={2.5}
                  fill="url(#analyticsOpenGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="Çözülen"
                  stroke={COLORS.resolved}
                  strokeWidth={2.5}
                  fill="url(#analyticsResolvedGrad)"
                />
              </AreaChart>
            </ChartCard>

            {/* 4. En Çok Sorun Çıkan Tezgahlar Top 10 */}
            <ChartCard
              title="En Çok Sorun Çıkan Tezgahlar (Top 10)"
              subtitle="Alan/tezgah bazlı toplam hata kartı yoğunluğu"
              icon={<BarChart2 className="text-sky-500 w-5 h-5" />}
            >
              <BarChart
                data={areaData}
                layout="vertical"
                margin={{ top: 5, right: 16, left: 8, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal vertical={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  width={76}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Geciken" stackId="a" fill={COLORS.overdue} />
                <Bar dataKey="Açık" stackId="a" fill={COLORS.waiting} />
                <Bar dataKey="Çözülen" stackId="a" fill={COLORS.resolved} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartCard>
          </div>

          {/* 5. Kırmızı vs Sarı Hata Kartı Kırılımı + Bölüm Bazlı Özet Performans Tablosu */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Kırmızı vs Sarı Kırılımı */}
            <div className="bg-white/95 dark:bg-slate-900/95 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4 min-w-0">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-rose-500" />
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white text-sm sm:text-base">
                    Kırmızı vs Sarı Kart Kırılımı
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kart türüne göre kapanma ve gecikme dağılımı
                  </p>
                </div>
              </div>

              {/* Kırmızı Kart Kutusu */}
              <div className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-950/20 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-800 dark:text-rose-300">
                    🔴 Kırmızı Hata Kartı
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                    {summary.red.total} kayıt (%{redShare})
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white/80 dark:bg-slate-900/70 rounded-xl p-2">
                    <div className="font-black text-emerald-600 dark:text-emerald-400">
                      {summary.red.resolved}
                    </div>
                    <div className="text-[10px] text-slate-500">Çözülen</div>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/70 rounded-xl p-2">
                    <div className="font-black text-sky-600 dark:text-sky-400">
                      {summary.red.open}
                    </div>
                    <div className="text-[10px] text-slate-500">Açık</div>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/70 rounded-xl p-2">
                    <div className="font-black text-rose-600 dark:text-rose-400">
                      {summary.red.overdue}
                    </div>
                    <div className="text-[10px] text-slate-500">Geciken</div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-rose-700 dark:text-rose-300 mb-1">
                    <span>Kapanma Oranı</span>
                    <span>%{summary.red.rate}</span>
                  </div>
                  <div className="w-full h-2 bg-rose-200/70 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${summary.red.rate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Sarı Kart Kutusu */}
              <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-800 dark:text-amber-300">
                    🟡 Sarı Hata Kartı
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                    {summary.yellow.total} kayıt (%{yellowShare})
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white/80 dark:bg-slate-900/70 rounded-xl p-2">
                    <div className="font-black text-emerald-600 dark:text-emerald-400">
                      {summary.yellow.resolved}
                    </div>
                    <div className="text-[10px] text-slate-500">Çözülen</div>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/70 rounded-xl p-2">
                    <div className="font-black text-sky-600 dark:text-sky-400">
                      {summary.yellow.open}
                    </div>
                    <div className="text-[10px] text-slate-500">Açık</div>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/70 rounded-xl p-2">
                    <div className="font-black text-rose-600 dark:text-rose-400">
                      {summary.yellow.overdue}
                    </div>
                    <div className="text-[10px] text-slate-500">Geciken</div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                    <span>Kapanma Oranı</span>
                    <span>%{summary.yellow.rate}</span>
                  </div>
                  <div className="w-full h-2 bg-amber-200/70 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${summary.yellow.rate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bölüm Bazlı Özet Performans Tablosu */}
            <div className="xl:col-span-2 bg-white/95 dark:bg-slate-900/95 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden min-w-0">
              <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white text-sm sm:text-base">
                      Bölüm Bazlı Özet Performans Tablosu
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      İlgili bölümlerin toplam yükü, gecikmeleri ve kapanma oranları
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                  {departmentData.length} Bölüm
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">İlgili Bölüm</th>
                      <th className="px-3 py-3 text-center">Toplam</th>
                      <th className="px-3 py-3 text-center">Çözülen</th>
                      <th className="px-3 py-3 text-center">Açık</th>
                      <th className="px-3 py-3 text-center">Geciken</th>
                      <th className="px-4 py-3 min-w-[160px]">Kapanma Oranı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {departmentData.map((row) => (
                      <tr
                        key={row.name}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white whitespace-nowrap">
                          {row.name}
                        </td>
                        <td className="px-3 py-3 text-center font-black text-slate-700 dark:text-slate-200">
                          {row.toplam}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {row.Çözülen}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-sky-600 dark:text-sky-400">
                          {row.aktifAcik}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-black text-[11px] ${
                              row.Geciken > 0
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {row.Geciken}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  row.kapanmaOrani >= 80
                                    ? 'bg-emerald-500'
                                    : row.kapanmaOrani >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                }`}
                                style={{ width: `${row.kapanmaOrani}%` }}
                              />
                            </div>
                            <span className="font-black text-slate-700 dark:text-slate-200 w-10 text-right">
                              %{row.kapanmaOrani}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, icon, children }) {
  return (
    <div className="bg-white/95 dark:bg-slate-900/95 p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 min-w-0 overflow-hidden">
      <div className="mb-4">
        <h3 className="font-black text-slate-800 dark:text-white text-sm sm:text-base flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </h3>
        {subtitle && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="h-64 sm:h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
