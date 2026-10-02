import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, BarChart2, CalendarDays, Filter, PieChart as PieChartIcon } from 'lucide-react';
import { isAfter, subDays } from 'date-fns';

import { OPTION_CLASS, STATUS } from '../lib/constants';

const COLORS = {
  resolved: '#10B981',
  open: '#3B82F6',
  overdue: '#EF4444',
  warning: '#F59E0B',
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
    <div className="bg-white dark:bg-slate-800 p-3 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg text-sm">
      <p className="font-bold text-gray-800 dark:text-gray-100 mb-2">{label || payload[0].name}</p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color }} className="font-semibold">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Kayıt çözülmüş mü, gecikmiş mi, yoksa süresi var mı? */
const classify = (issue, now) => {
  if (issue.mevcut_durum === STATUS.GREEN) return 'resolved';
  const target = toDate(issue.hedef_tarih);
  return target && target < now ? 'overdue' : 'open';
};

export default function AnalyticsView({ issues }) {
  const [dateRange, setDateRange] = useState('all'); // 'all' | '30' | '90' | '180'
  const [department, setDepartment] = useState('all');

  const departments = useMemo(
    () => [...new Set(issues.map((i) => i.bildiren_bolum).filter(Boolean))].sort(),
    [issues]
  );

  const filteredIssues = useMemo(() => {
    let filtered = issues;

    if (department !== 'all') {
      filtered = filtered.filter((i) => i.bildiren_bolum === department);
    }

    if (dateRange !== 'all') {
      const cutoff = subDays(new Date(), parseInt(dateRange, 10));
      filtered = filtered.filter((i) => {
        const reported = toDate(i.bildirim_zamani);
        return reported ? isAfter(reported, cutoff) : false;
      });
    }

    return filtered;
  }, [issues, dateRange, department]);

  // Genel çözülme durumu
  const statusData = useMemo(() => {
    const now = new Date();
    const counts = { resolved: 0, open: 0, overdue: 0 };
    filteredIssues.forEach((issue) => counts[classify(issue, now)]++);

    return [
      { name: 'Çözülen', value: counts.resolved, color: COLORS.resolved },
      { name: 'Açık (Süresi Var)', value: counts.open, color: COLORS.open },
      { name: 'Geciken', value: counts.overdue, color: COLORS.overdue },
    ].filter((d) => d.value > 0);
  }, [filteredIssues]);

  // Bölüm performansı
  const departmentData = useMemo(() => {
    const now = new Date();
    const map = new Map();

    filteredIssues.forEach((issue) => {
      const key = issue.bildiren_bolum || 'Belirsiz';
      if (!map.has(key)) map.set(key, { name: key, Çözülen: 0, Açık: 0, Geciken: 0 });

      const bucket = map.get(key);
      const type = classify(issue, now);
      if (type === 'resolved') bucket.Çözülen++;
      else if (type === 'overdue') bucket.Geciken++;
      else bucket.Açık++;
    });

    return [...map.values()].sort(
      (a, b) => b.Çözülen + b.Açık + b.Geciken - (a.Çözülen + a.Açık + a.Geciken)
    );
  }, [filteredIssues]);

  // Aylık trend — eski sürümde sıralama yapılmadığı için grafik ters/karışık
  // çiziliyordu. Sıralanabilir bir anahtar (YYYY-MM) ile düzeltildi.
  const trendData = useMemo(() => {
    const map = new Map();

    filteredIssues.forEach((issue) => {
      const date = toDate(issue.bildirim_zamani);
      if (!date) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
          Açılan: 0,
          Çözülen: 0,
        });
      }

      const bucket = map.get(key);
      bucket.Açılan++;
      if (issue.mevcut_durum === STATUS.GREEN) bucket.Çözülen++;
    });

    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredIssues]);

  // Alana göre yoğunluk (en çok sorun çıkan 10 alan)
  const areaData = useMemo(() => {
    const now = new Date();
    const map = new Map();

    filteredIssues.forEach((issue) => {
      const key = issue.bildirilen_alan?.toUpperCase() || 'Belirsiz';
      if (!map.has(key)) map.set(key, { name: key, toplam: 0, Geciken: 0, Açık: 0, Çözülen: 0 });

      const bucket = map.get(key);
      bucket.toplam++;
      const type = classify(issue, now);
      if (type === 'resolved') bucket.Çözülen++;
      else if (type === 'overdue') bucket.Geciken++;
      else bucket.Açık++;
    });

    return [...map.values()].sort((a, b) => b.toplam - a.toplam).slice(0, 10);
  }, [filteredIssues]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Activity className="text-blue-500 w-6 h-6" /> İstatistik ve Raporlar
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Toplam{' '}
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {filteredIssues.length}
            </span>{' '}
            kayıt üzerinden analiz ediliyor.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2">
            <CalendarDays className="w-4 h-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none w-full sm:w-32"
              aria-label="Tarih aralığı"
            >
              <option value="all" className={OPTION_CLASS}>
                Tüm Zamanlar
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

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="bg-transparent text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none w-full sm:w-32"
              aria-label="Bölüm filtresi"
            >
              <option value="all" className={OPTION_CLASS}>
                Tüm Bölümler
              </option>
              {departments.map((dep) => (
                <option key={dep} value={dep} className={OPTION_CLASS}>
                  {dep}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredIssues.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-10 rounded-xl shadow-sm text-center border border-gray-100 dark:border-slate-700">
          <PieChartIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Veri Bulunamadı</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Seçili filtrelere uygun problem kaydı yok.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Çözülme Oranı" icon={<PieChartIcon className="text-blue-500 w-5 h-5" />}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ChartCard>

          <ChartCard
            title="Bölüm Performansı (Kapasite)"
            icon={<BarChart2 className="text-purple-500 w-5 h-5" />}
          >
            <BarChart data={departmentData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 12 }} />
              <YAxis tick={{ fill: '#888', fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Çözülen" stackId="a" fill={COLORS.resolved} />
              <Bar dataKey="Açık" stackId="a" fill={COLORS.open} />
              <Bar dataKey="Geciken" stackId="a" fill={COLORS.overdue} />
            </BarChart>
          </ChartCard>

          <ChartCard
            title="Aylık Problem Trendi"
            icon={<Activity className="text-orange-500 w-5 h-5" />}
          >
            <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 12 }} />
              <YAxis tick={{ fill: '#888', fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="Açılan"
                stroke={COLORS.overdue}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Çözülen"
                stroke={COLORS.resolved}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartCard>

          <ChartCard
            title="Alana Göre Toplam Sorun (Top 10)"
            icon={<BarChart2 className="text-indigo-500 w-5 h-5" />}
          >
            <BarChart
              data={areaData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal vertical={false} />
              <XAxis type="number" tick={{ fill: '#888', fontSize: 12 }} allowDecimals={false} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fill: '#888', fontSize: 12 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {/* Toplamı doğru göstermek için üç durum da çizilir; eskiden
                  sadece kırmızı/sarı çizildiğinden çözülmüş alanlar boş görünüyordu. */}
              <Bar dataKey="Geciken" stackId="a" fill={COLORS.overdue} />
              <Bar dataKey="Açık" stackId="a" fill={COLORS.warning} />
              <Bar dataKey="Çözülen" stackId="a" fill={COLORS.resolved} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, icon, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
        {icon} {title}
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
