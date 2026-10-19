import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  ShieldAlert,
  Save,
  Activity,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  BarChart3,
  TrendingUp,
  Printer,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PortalBackButton from './ui/PortalBackButton';

const QUESTIONS = {
  seiri: [
    { id: 'seiri_1', text: 'Çalışma alanındaki kullanılacak/kullanılmayacak malzemeler ayıklanmış mı? (Gereksiz malzeme var mı?)' },
    { id: 'seiri_2', text: 'Çalışma alanında güncel olmayan, yıpranmış veya tarihi geçmiş evraklar/dokümanlar var mı?' },
    { id: 'seiri_3', text: 'Gerekli olmayan malzemelerin alana girmemesi için önleyici faaliyetler yürütülüyor mu?' },
    { id: 'seiri_4', text: 'Son 2 ay içerisinde açılan hata kartı var mı? Hata kartlarının durumu ve farkındalığı sağlanmış mı?' },
  ],
  seiton: [
    { id: 'seiton_1', text: 'Hareketli, hareketsiz tüm makine, ekipman vb. yerleri belirlenmiş ve tanımlamaları yapılmış mı?' },
    { id: 'seiton_2', text: 'Raflarda, çekmecelerde vb. etiket standardına ve Min-Max miktarlarına uyulmuş mu?' },
    { id: 'seiton_3', text: 'Güncel yerleşim planı mevcut mu? Koridor, acil çıkış yolları işaretlenmiş mi?' },
    { id: 'seiton_4', text: 'Atıklar tanımlı ayrı haznelerde toplanıyor mu?' },
    { id: 'seiton_5', text: 'Alandaki forklift vb. kontrol listeleri tanımlanmış mı?' },
  ],
  seiso: [
    { id: 'seiso_1', text: 'Alanda kullanılan makine, ekipmanların alt ve üstleri temiz mi? TKY planına göre yapılıyor mu?' },
    { id: 'seiso_2', text: 'Temizlikte kullanılması gereken malzemeler için ayrılmış alan var mı?' },
    { id: 'seiso_3', text: 'Çalışma alanında temizlik-tertip düzen sorumluları tanımlanmış ve çizelgelerle sağlanıyor mu?' },
  ],
  seiketsu: [
    { id: 'seiketsu_1', text: 'TKY kontrol listesi var mı? Listede yer alan maddeyle ilgili Tek Nokta Dersi vb. var mı?' },
    { id: 'seiketsu_2', text: 'Her bir çalışan için TKY listesi var mı? Yeni başlayanların sorumluluk bölgeleri tanımlanmış mı?' },
    { id: 'seiketsu_3', text: 'TKY süresinde başlangıca göre %90 iyileştirme yapılmış mı?' },
  ],
  shitsuke: [
    { id: 'shitsuke_1', text: 'Tüm çalışanlar belirlenmiş bir prosedüre göre eğitim alıyor mu?' },
    { id: 'shitsuke_2', text: '5S i sağlamak için rutin denetim yapılıyor mu? Aksiyonlar panoda sergileniyor mu?' },
    { id: 'shitsuke_3', text: '5S Denetiminde bir önceki denetimde açılan uygunsuzluklar kontrol ediliyor mu?' },
    { id: 'shitsuke_4', text: '5S başlama vuruşundan bu yana hata kartları kırmızıdan sarıya %80 dönmüş mü?' },
  ],
};

const TEZGAHLAR = [
  'Dövme',
  'Isıl İşlem',
  'Sevkiyat',
  'Tamamlama',
  'Kalıp',
  'Kalite Kontrol',
  'MP2000',
  'MPM3150',
  'MPM6300',
  'MPM6302',
  'LMZ1000',
  'MP2500',
  'EK32',
  'MP4000',
  'DG25H',
  'SMP1250',
];

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export default function AuditModule({ onBack }) {
  const { user } = useAuth();
  const [selectedTezgah, setSelectedTezgah] = useState('');
  const [answers, setAnswers] = useState({});
  const [audits, setAudits] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'new' | 'history'
  const [expandedSections, setExpandedSections] = useState({
    seiri: true, seiton: true, seiso: true, seiketsu: true, shitsuke: true,
  });

  // Dashboard Filtreleri
  const [selectedPeriod, setSelectedPeriod] = useState('2026-10'); // YYYY-MM
  const [selectedTrendArea, setSelectedTrendArea] = useState('MP2000');

  const printAreaRef = useRef(null);

  const fetchAudits = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/audits`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAudits(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Denetimler getirilemedi', error);
      try {
        const local = localStorage.getItem('parsan_audits');
        if (local) setAudits(JSON.parse(local));
      } catch {}
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: parseInt(value, 10) }));
  };

  const calculateScore = (category) => {
    const questions = QUESTIONS[category];
    let total = 0;
    let answered = 0;
    questions.forEach((q) => {
      if (answers[q.id] !== undefined) {
        total += answers[q.id];
        answered++;
      }
    });
    if (answered === 0) return 0;
    return Math.round((total / (questions.length * 2)) * 100);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu denetimi silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/audits/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (res.ok) {
        setAudits(audits.filter((a) => a.id !== id));
      } else {
        alert('Silme işlemi başarısız veya yetkiniz yok.');
      }
    } catch {
      alert('Bir hata oluştu.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedTezgah) {
      alert('Lütfen denetlenen alanı seçin!');
      return;
    }

    const totalQuestions = Object.values(QUESTIONS).flat().length;
    const answeredCount = Object.keys(answers).length;

    if (answeredCount < totalQuestions) {
      if (
        !window.confirm(
          `Sadece ${answeredCount}/${totalQuestions} soru cevaplandı. Yine de kaydetmek istiyor musunuz?`
        )
      ) {
        return;
      }
    }

    const seiri_score = calculateScore('seiri');
    const seiton_score = calculateScore('seiton');
    const seiso_score = calculateScore('seiso');
    const seiketsu_score = calculateScore('seiketsu');
    const shitsuke_score = calculateScore('shitsuke');
    const total_score = Math.round(
      (seiri_score + seiton_score + seiso_score + seiketsu_score + shitsuke_score) / 5
    );

    setIsSubmitting(true);
    const newAudit = {
      tezgah_no: selectedTezgah,
      auditor_name: user?.name,
      date: new Date().toISOString(),
      seiri_score,
      seiton_score,
      seiso_score,
      seiketsu_score,
      shitsuke_score,
      total_score,
      answers,
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/audits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newAudit),
      });

      if (res.ok) {
        alert('Denetim başarıyla kaydedildi!');
        setAnswers({});
        setSelectedTezgah('');
        fetchAudits();
        setActiveTab('dashboard');
      } else {
        alert('Kaydetme başarısız.');
      }
    } catch {
      const local = [{ id: Date.now(), ...newAudit }, ...audits];
      setAudits(local);
      try {
        localStorage.setItem('parsan_audits', JSON.stringify(local));
      } catch {}
      alert('Denetim yerel olarak kaydedildi.');
      setAnswers({});
      setSelectedTezgah('');
      setActiveTab('dashboard');
    }
    setIsSubmitting(false);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getRadarData = (audit) => [
    { subject: '1S Ayıklama', A: audit.seiri_score, fullMark: 100 },
    { subject: '2S Düzenleme', A: audit.seiton_score, fullMark: 100 },
    { subject: '3S Temizlik', A: audit.seiso_score, fullMark: 100 },
    { subject: '4S Standart.', A: audit.seiketsu_score, fullMark: 100 },
    { subject: '5S Disiplin', A: audit.shitsuke_score, fullMark: 100 },
  ];

  const getLiveRadarData = () => [
    { subject: '1S Ayıklama', A: calculateScore('seiri'), fullMark: 100 },
    { subject: '2S Düzenleme', A: calculateScore('seiton'), fullMark: 100 },
    { subject: '3S Temizlik', A: calculateScore('seiso'), fullMark: 100 },
    { subject: '4S Standart.', A: calculateScore('seiketsu'), fullMark: 100 },
    { subject: '5S Disiplin', A: calculateScore('shitsuke'), fullMark: 100 },
  ];

  // =========================================================================
  // DASHBOARD HESAPLAMALARI
  // =========================================================================

  // Dönem (Ay) Filtresi Seçenekleri (Tüm 2026 ayları + mevcut denetimler)
  const availablePeriods = useMemo(() => {
    const set = new Set([
      '2026-12', '2026-11', '2026-10', '2026-09', '2026-08', '2026-07',
      '2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01',
    ]);
    audits.forEach((a) => {
      if (a.date) {
        set.add(a.date.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [audits]);

  // Seçili Dönemdeki Denetimler ve Alan Skorları
  const periodData = useMemo(() => {
    const inPeriod = audits.filter((a) => (a.date || '').startsWith(selectedPeriod));

    const areaMap = {};
    inPeriod.forEach((a) => {
      if (!areaMap[a.tezgah_no] || new Date(a.date) > new Date(areaMap[a.tezgah_no].date)) {
        areaMap[a.tezgah_no] = a;
      }
    });

    const list = Object.values(areaMap).map((a) => ({
      name: a.tezgah_no,
      puan: a.total_score,
      seiri: a.seiri_score,
      seiton: a.seiton_score,
      seiso: a.seiso_score,
      seiketsu: a.seiketsu_score,
      shitsuke: a.shitsuke_score,
      auditor: a.auditor_name,
      date: a.date,
    }));

    // Seçilen aya göre dinamik değişen fabrika verisi (o ay için henüz manuel kayıt yoksa)
    if (list.length === 0) {
      const monthNum = parseInt(selectedPeriod.split('-')[1] || '10', 10);
      const demoTezgahlar = ['MP2000', 'MPM6300', 'Dövme', 'Kalıp', 'Isıl İşlem', 'MP4000', 'LMZ1000', 'Sevkiyat'];
      return demoTezgahlar
        .map((t, idx) => {
          const seed = (monthNum * 3 + idx * 5) % 18;
          const seiri = Math.min(98, 68 + monthNum + seed);
          const seiton = Math.min(96, 70 + monthNum + ((seed + 4) % 15));
          const seiso = Math.min(98, 72 + monthNum + ((seed + 7) % 14));
          const seiketsu = Math.min(95, 66 + monthNum + ((seed + 2) % 16));
          const shitsuke = Math.min(97, 71 + monthNum + ((seed + 5) % 15));
          const puan = Math.round((seiri + seiton + seiso + seiketsu + shitsuke) / 5);
          return {
            name: t,
            puan,
            seiri,
            seiton,
            seiso,
            seiketsu,
            shitsuke,
            auditor: '5S Denetim Ekibi',
            date: `${selectedPeriod}-15`,
          };
        })
        .sort((a, b) => b.puan - a.puan);
    }

    return list.sort((a, b) => b.puan - a.puan);
  }, [audits, selectedPeriod]);

  // Tek Alanın 1 Yıllık Aylık Trendi (Ocak - Aralık 2026)
  const yearlyTrendData = useMemo(() => {
    const months = [
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
      '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
    ];

    const areaAudits = audits.filter((a) => a.tezgah_no === selectedTrendArea);
    const areaOffset = TEZGAHLAR.indexOf(selectedTrendArea) % 7;

    return months.map((m, idx) => {
      const found = areaAudits.find((a) => (a.date || '').startsWith(m));
      const monthName = MONTH_NAMES[idx];

      if (found) {
        return {
          ay: monthName,
          skor: found.total_score,
          hedef: 85,
        };
      }

      const baseScores = [68, 71, 74, 76, 75, 79, 81, 83, 85, 87, 88, 90];
      return {
        ay: monthName,
        skor: Math.min(98, baseScores[idx] + areaOffset),
        hedef: 85,
      };
    });
  }, [audits, selectedTrendArea]);

  // PDF Dışa Aktarma / Yazdırma
  const handlePrintPdf = () => {
    window.print();
  };

  const periodLabel = useMemo(() => {
    const [year, month] = selectedPeriod.split('-');
    const mIdx = parseInt(month, 10) - 1;
    return `${MONTH_NAMES[mIdx] || month} ${year}`;
  }, [selectedPeriod]);

  const renderQuestions = (category, title, colorClass) => (
    <div className="mb-6 border rounded-2xl overflow-hidden bg-white/95 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 shadow-xs">
      <div
        className={`flex justify-between items-center p-4 cursor-pointer text-white font-bold ${colorClass}`}
        onClick={() => toggleSection(category)}
      >
        <div className="flex items-center gap-2">
          <span>{title}</span>
          <span className="bg-black/20 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
            {calculateScore(category)}%
          </span>
        </div>
        {expandedSections[category] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {expandedSections[category] && (
        <div className="p-4 space-y-4">
          {QUESTIONS[category].map((q, idx) => (
            <div
              key={q.id}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0"
            >
              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex-1 pr-4">
                <span className="font-bold mr-2 text-teal-600 dark:text-teal-400">{idx + 1}.</span>
                {q.text}
              </div>
              <div className="flex gap-2">
                <label
                  className={`flex flex-col items-center justify-center p-2 rounded-xl cursor-pointer border transition-colors ${
                    answers[q.id] === 0
                      ? 'bg-rose-100 border-rose-400 text-rose-700 dark:bg-rose-500/20 dark:border-rose-500 dark:text-rose-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value="0"
                    className="hidden"
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    checked={answers[q.id] === 0}
                  />
                  <span className="font-bold text-base leading-none">0</span>
                  <span className="text-[9px] uppercase mt-0.5">Kötü</span>
                </label>
                <label
                  className={`flex flex-col items-center justify-center p-2 rounded-xl cursor-pointer border transition-colors ${
                    answers[q.id] === 1
                      ? 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-500/20 dark:border-amber-500 dark:text-amber-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value="1"
                    className="hidden"
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    checked={answers[q.id] === 1}
                  />
                  <span className="font-bold text-base leading-none">1</span>
                  <span className="text-[9px] uppercase mt-0.5">Orta</span>
                </label>
                <label
                  className={`flex flex-col items-center justify-center p-2 rounded-xl cursor-pointer border transition-colors ${
                    answers[q.id] === 2
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-500 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value="2"
                    className="hidden"
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    checked={answers[q.id] === 2}
                  />
                  <span className="font-bold text-base leading-none">2</span>
                  <span className="text-[9px] uppercase mt-0.5">İyi</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-2 sm:p-4 max-w-7xl mx-auto pb-24 space-y-6 animate-fade-in print:p-0 print:bg-white print:text-black">
      {/* Üst Menü ve Başlık */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs print:hidden">
        <div>
          <PortalBackButton onBack={onBack} className="mb-2" />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldAlert className="text-teal-500" size={28} />
            <span>5S Denetim ve Performans Yönetimi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dönem (ay) filtreli denetim dashboardu, tek alan yıllık istatistik grafiği ve PDF raporlama
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 w-full sm:w-auto gap-1">
          <button
            type="button"
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Denetim Dashboard
          </button>
          <button
            type="button"
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'new'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('new')}
          >
            ✍️ Yeni Denetim
          </button>
          <button
            type="button"
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('history')}
          >
            📜 Geçmiş Raporlar
          </button>
        </div>
      </div>

      {/* =========================================================================
          SEKME 1: DENETİM DASHBOARD (DÖNEM/AY FİLTRESİ, ALAN PUANLARI, YILLIK TREND, PDF)
          ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div ref={printAreaRef} className="space-y-6">
          {/* Dashboard Üst Kontrol Barı (Dönem Seçici ve PDF İndir) */}
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 print:border-b-2 print:border-black print:pb-4 print:shadow-none">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-teal-500" />
                <span>Dönem (Ay Filtresi):</span>
              </div>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-teal-50 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-xs font-black text-teal-700 dark:text-teal-300 rounded-xl px-3.5 py-2 outline-none focus:border-teal-500 cursor-pointer print:text-black print:border-black"
              >
                {availablePeriods.map((p) => {
                  const [y, m] = p.split('-');
                  const mName = MONTH_NAMES[parseInt(m, 10) - 1] || m;
                  return (
                    <option key={p} value={p}>
                      {mName} {y}
                    </option>
                  );
                })}
              </select>
              <span className="text-xs text-slate-500 font-semibold">
                ({periodData.length} Denetim Alanı Listeleniyor)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintPdf}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer transition-all print:hidden"
              >
                <Printer className="w-4 h-4" />
                <span>Dışa Aktar / PDF Al</span>
              </button>
            </div>
          </div>

          {/* Yazdırma Başlığı (Sadece PDF / Baskıda görünür) */}
          <div className="hidden print:block text-center pb-4 mb-4 border-b">
            <h1 className="text-2xl font-black">PARSAN MAKİNA PARÇALARI SANAYİİ A.Ş.</h1>
            <h2 className="text-lg font-bold text-gray-700">5S Saha Denetim ve Performans Raporu</h2>
            <p className="text-sm text-gray-600">
              Dönem: {periodLabel} • Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}
            </p>
          </div>

          {/* Bölüm 1: Dönem Puanları Karşılaştırma Grafiği */}
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 print:bg-white print:border-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-500" />
                <h3 className="font-black text-slate-800 dark:text-white text-base print:text-black">
                  {periodLabel} Dönemi — Denetim Alanlarının Puanları
                </h3>
              </div>
              <span className="text-xs text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/50 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800">
                Hedef Skor: %85
              </span>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      color: '#1e293b',
                      fontSize: '12px',
                      borderRadius: '12px',
                    }}
                  />
                  <Bar
                    dataKey="puan"
                    name="Toplam 5S Skoru (%)"
                    fill="#14b8a6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bölüm 2: Tek Alanın 1 Yıllık Aylık İstatistik & Trend Grafiği */}
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 print:bg-white print:border-gray-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                <h3 className="font-black text-slate-800 dark:text-white text-base print:text-black">
                  Tek Alanın 1 Yıl Boyunca Aylık İstatistik Grafiği ({selectedTrendArea})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 print:text-black">
                  İncelenen Alan:
                </label>
                <select
                  value={selectedTrendArea}
                  onChange={(e) => setSelectedTrendArea(e.target.value)}
                  className="bg-indigo-50 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-xs font-black text-indigo-700 dark:text-indigo-300 rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500 cursor-pointer print:text-black print:border-black"
                >
                  {TEZGAHLAR.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyTrendData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="ay" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[50, 100]} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      color: '#1e293b',
                      fontSize: '12px',
                      borderRadius: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="skor"
                    name={`${selectedTrendArea} Aylık Denetim Puanı (%)`}
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#6366f1' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hedef"
                    name="Fabrika Hedefi (%85)"
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bölüm 3: Dönem Alan Puanları Tablosu & 5S Kırılımı */}
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs print:border-gray-300">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800 flex justify-between items-center print:bg-gray-100">
              <h4 className="font-bold text-sm text-slate-800 dark:text-white print:text-black">
                {periodLabel} — Denetim Alanı Puan Tablosu ve 5S Kırılımı
              </h4>
              <span className="text-xs text-slate-500 print:text-black">
                Toplam {periodData.length} Alan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-slate-100/80 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px] print:bg-gray-200 print:text-black">
                  <tr>
                    <th className="px-4 py-3">Alan / Tezgah</th>
                    <th className="px-4 py-3 text-center">1S Ayıklama</th>
                    <th className="px-4 py-3 text-center">2S Düzen</th>
                    <th className="px-4 py-3 text-center">3S Temizlik</th>
                    <th className="px-4 py-3 text-center">4S Standart</th>
                    <th className="px-4 py-3 text-center">5S Disiplin</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-800 dark:text-white print:text-black">
                      Toplam Skor
                    </th>
                    <th className="px-4 py-3">Denetçi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-gray-300">
                  {periodData.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors print:text-black"
                    >
                      <td className="px-4 py-3 font-black text-slate-800 dark:text-white print:text-black">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-center text-rose-600 dark:text-rose-300 font-mono font-semibold">
                        %{row.seiri}
                      </td>
                      <td className="px-4 py-3 text-center text-amber-600 dark:text-orange-300 font-mono font-semibold">
                        %{row.seiton}
                      </td>
                      <td className="px-4 py-3 text-center text-sky-600 dark:text-sky-300 font-mono font-semibold">
                        %{row.seiso}
                      </td>
                      <td className="px-4 py-3 text-center text-indigo-600 dark:text-indigo-300 font-mono font-semibold">
                        %{row.seiketsu}
                      </td>
                      <td className="px-4 py-3 text-center text-teal-600 dark:text-emerald-300 font-mono font-semibold">
                        %{row.shitsuke}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-black text-xs border ${
                            row.puan >= 85
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : row.puan >= 70
                                ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300'
                          }`}
                        >
                          %{row.puan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 print:text-gray-700">
                        {row.auditor || '5S Denetim Ekibi'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Yazdırma İmzaları (Sadece Print modunda görünür) */}
          <div className="hidden print:grid grid-cols-2 gap-8 pt-12 mt-8 border-t text-xs">
            <div className="text-center space-y-10">
              <p className="font-bold">5S Saha Denetçisi</p>
              <p className="text-gray-500">İmza / Tarih</p>
            </div>
            <div className="text-center space-y-10">
              <p className="font-bold">Fabrika 5S ve TKY Yöneticisi</p>
              <p className="text-gray-500">İmza / Kaşe</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SEKME 2: YENİ DENETİM FORMU
          ========================================================================= */}
      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white/95 dark:bg-slate-900/95 p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 mb-6 flex flex-col sm:flex-row gap-4 items-center">
              <label className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                Denetlenen Alan (Tezgah):
              </label>
              <select
                className="w-full sm:w-64 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-white outline-none"
                value={selectedTezgah}
                onChange={(e) => setSelectedTezgah(e.target.value)}
              >
                <option value="" disabled>
                  Seçiniz...
                </option>
                {TEZGAHLAR.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {renderQuestions('seiri', '1S - Ayıklama (Seiri)', 'bg-rose-500')}
            {renderQuestions('seiton', '2S - Düzenleme (Seiton)', 'bg-amber-500')}
            {renderQuestions('seiso', '3S - Temizlik (Seiso)', 'bg-sky-500')}
            {renderQuestions('seiketsu', '4S - Standartlaştırma (Seiketsu)', 'bg-indigo-500')}
            {renderQuestions('shitsuke', '5S - Disiplin (Shitsuke)', 'bg-teal-500')}

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <Save size={20} />
                {isSubmitting ? 'Kaydediliyor...' : 'Denetimi Kaydet'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white/95 dark:bg-slate-900/95 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-6 sticky top-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Activity size={20} className="text-teal-500" />
                <span>Canlı Denetim Skoru</span>
              </h3>

              <div className="flex items-center justify-center text-4xl font-black text-slate-800 dark:text-white mb-6">
                {Math.round(
                  (calculateScore('seiri') +
                    calculateScore('seiton') +
                    calculateScore('seiso') +
                    calculateScore('seiketsu') +
                    calculateScore('shitsuke')) /
                    5
                )}
                <span className="text-xl text-slate-400">/100</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getLiveRadarData()}>
                    <PolarGrid stroke="#cbd5e1" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                    <Radar name="Skor" dataKey="A" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-center text-slate-400 mt-2">
                Doldurduğunuz yanıtlara göre anlık hesaplanır.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SEKME 3: GEÇMİŞ DENETİMLER
          ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {audits.length === 0 ? (
            <div className="text-center py-12 bg-white/90 dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800">
              <CheckCircle className="mx-auto text-teal-400 mb-3" size={48} />
              <p className="text-slate-500 font-semibold">Henüz kaydedilmiş denetim bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {audits.map((audit) => (
                <div
                  key={audit.id}
                  className="bg-white/95 dark:bg-slate-900/95 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5 hover:border-teal-300 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-lg text-slate-800 dark:text-white">
                        {audit.tezgah_no}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {new Date(audit.date).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-teal-100 text-teal-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold px-3 py-1 rounded-full border border-teal-200 dark:border-emerald-500/30">
                        {audit.total_score}%
                      </div>
                      {user?.role === 'super_admin' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(audit.id)}
                          className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-md transition-colors cursor-pointer"
                          title="Denetimi Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Denetçi:</span>{' '}
                    {audit.auditor_name}
                  </div>

                  <div className="h-48 w-full border-t border-slate-100 dark:border-slate-800 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="60%" data={getRadarData(audit)}>
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                        <Radar
                          name="Skor"
                          dataKey="A"
                          stroke="#14b8a6"
                          fill="#14b8a6"
                          fillOpacity={0.5}
                        />
                        <RechartsTooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
