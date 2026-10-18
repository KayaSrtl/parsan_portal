import { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  Flame,
  CheckCircle,
  Plus,
  Filter,
  UploadCloud,
  Clock,
  User,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AREAS, DEPARTMENTS, SAFETY_TYPES, SAFETY_LEVELS, OPTION_CLASS } from '../lib/constants';
import { apiFetch, fileUrl, toFormData } from '../lib/api';
import { formatDateTime } from '../utils/helpers';
import PortalBackButton from './ui/PortalBackButton';

export default function SafetyModule({ onBack }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'new'
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Filtreler
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'Risk Bildirimi' | 'Ramak Kala'
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('');

  // Form State
  const [reportType, setReportType] = useState('Risk Bildirimi'); // 'Risk Bildirimi' | 'Ramak Kala'
  const [area, setArea] = useState('');
  const [department, setDepartment] = useState('');
  const [riskLevel, setRiskLevel] = useState('Orta');
  const [description, setDescription] = useState('');
  const [actionSuggestion, setActionSuggestion] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fileInputRef = useRef(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/safety');
      setReports(Array.isArray(data) ? data : []);
    } catch {
      // Çevrimdışı / fallback: localStorage oku
      try {
        const local = localStorage.getItem('parsan_safety_reports');
        setReports(local ? JSON.parse(local) : []);
      } catch {
        setReports([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setReportType('Risk Bildirimi');
    setArea('');
    setDepartment('');
    setRiskLevel('Orta');
    setDescription('');
    setActionSuggestion('');
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Lütfen olay veya tehlike tanımını yazınız.');
      return;
    }
    if (!area) {
      alert('Lütfen alan (tezgah/bölge) seçiniz.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    const payload = {
      type: reportType,
      alan: area,
      bolum: department,
      risk_derecesi: riskLevel,
      tanim: description.trim(),
      onlem: actionSuggestion.trim(),
    };

    try {
      await apiFetch('/safety', {
        method: 'POST',
        body: toFormData(payload, { image: imageFile }),
      });
      setMessage('İSG Bildirimi başarıyla kaydedildi!');
      resetForm();
      fetchReports();
      setActiveTab('list');
    } catch {
      // Yerel fallback
      const localReport = {
        id: Date.now(),
        type: reportType,
        alan: area,
        bolum: department,
        risk_derecesi: riskLevel,
        tanim: description.trim(),
        onlem: actionSuggestion.trim(),
        bildiren_kisi: user?.name || 'Saha Operatörü',
        tarih: new Date().toISOString(),
        durum: 'İnceleniyor',
        fotograf_url: previewUrl,
      };
      const updated = [localReport, ...reports];
      setReports(updated);
      try {
        localStorage.setItem('parsan_safety_reports', JSON.stringify(updated));
      } catch {}
      setMessage('İSG Bildirimi başarıyla kaydedildi (Yerel Mod)');
      resetForm();
      setActiveTab('list');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await apiFetch(`/safety/${id}`, {
        method: 'PUT',
        body: { durum: newStatus },
      });
      fetchReports();
    } catch {
      // Yerel güncelleme
      const updated = reports.map((r) => (r.id === id ? { ...r, durum: newStatus } : r));
      setReports(updated);
      try {
        localStorage.setItem('parsan_safety_reports', JSON.stringify(updated));
      } catch {}
    }
  };

  const filteredReports = reports.filter((r) => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (statusFilter !== 'all' && r.durum !== statusFilter) return false;
    if (areaFilter && (r.alan || '').toUpperCase() !== areaFilter.toUpperCase()) return false;
    return true;
  });

  const stats = {
    total: reports.length,
    risk: reports.filter((r) => r.type === 'Risk Bildirimi').length,
    nearMiss: reports.filter((r) => r.type === 'Ramak Kala').length,
    critical: reports.filter((r) => r.risk_derecesi === 'Kritik' || r.risk_derecesi === 'Yüksek').length,
  };

  const getRiskBadge = (level) => {
    switch (level) {
      case 'Kritik':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-black';
      case 'Yüksek':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40 font-bold';
      case 'Orta':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-medium';
      case 'Düşük':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-medium';
      default:
        return 'bg-slate-800 text-gray-300 border-slate-700';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Önlem Alındı':
      case 'Kapatıldı':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'İnceleniyor':
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 space-y-6 animate-fade-in pb-20">
      {/* Üst Başlık ve Sekmeler */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <PortalBackButton onBack={onBack} className="mb-2" />
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-amber-400" />
            <span>İSG Risk & Ramak Kala Bildirimi</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            İş Sağlığı ve Güvenliği saha tehlike bildirimleri ve önleyici faaliyetler
          </p>
        </div>

        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl gap-1 w-full sm:w-auto shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📋 Bildirim Listesi ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'new'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            + Yeni Bildirim Aç
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-lg">
          {message}
        </div>
      )}

      {/* =========================================================================
          SEKME 1: LİSTE VE TAKİP GÖRÜNÜMÜ
          ========================================================================= */}
      {activeTab === 'list' && (
        <div className="space-y-5">
          {/* KPI İstatistik Şeridi */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-center shadow-sm">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Toplam Bildirim
              </div>
              <div className="text-2xl font-black text-white">{stats.total}</div>
            </div>

            <div className="bg-slate-900/90 border border-amber-500/20 p-4 rounded-2xl text-center shadow-sm">
              <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5 text-amber-400" /> Risk Bildirimi
              </div>
              <div className="text-2xl font-black text-amber-400">{stats.risk}</div>
            </div>

            <div className="bg-slate-900/90 border border-rose-500/20 p-4 rounded-2xl text-center shadow-sm">
              <div className="text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-400" /> Ramak Kala
              </div>
              <div className="text-2xl font-black text-rose-400">{stats.nearMiss}</div>
            </div>

            <div className="bg-slate-900/90 border border-rose-500/40 p-4 rounded-2xl text-center shadow-sm">
              <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Kritik / Yüksek
              </div>
              <div className="text-2xl font-black text-rose-500">{stats.critical}</div>
            </div>
          </div>

          {/* Filtre Barı */}
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex flex-wrap items-center gap-3 shadow-md">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
              <Filter className="w-4 h-4 text-amber-400" />
              <span>Filtrele:</span>
            </div>

            {/* Tür Filtresi */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all" className={OPTION_CLASS}>Tüm Türler</option>
              <option value="Risk Bildirimi" className={OPTION_CLASS}>⚠️ Risk Bildirimi</option>
              <option value="Ramak Kala" className={OPTION_CLASS}>⚡ Ramak Kala</option>
            </select>

            {/* Durum Filtresi */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all" className={OPTION_CLASS}>Tüm Durumlar</option>
              <option value="İnceleniyor" className={OPTION_CLASS}>⏳ İnceleniyor</option>
              <option value="Önlem Alındı" className={OPTION_CLASS}>✅ Önlem Alındı</option>
              <option value="Kapatıldı" className={OPTION_CLASS}>🔒 Kapatıldı</option>
            </select>

            {/* Alan Filtresi */}
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="" className={OPTION_CLASS}>Tüm Alanlar</option>
              {AREAS.map((a) => (
                <option key={a} value={a} className={OPTION_CLASS}>
                  {a}
                </option>
              ))}
            </select>

            {(typeFilter !== 'all' || statusFilter !== 'all' || areaFilter) && (
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setAreaFilter('');
                }}
                className="text-xs text-amber-400 hover:text-amber-300 underline font-bold ml-auto cursor-pointer"
              >
                Temizle
              </button>
            )}
          </div>

          {/* Kartlar Grid */}
          {loading ? (
            <div className="p-12 text-center text-gray-500 animate-pulse font-bold">
              İSG Bildirimleri Yükleniyor...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center text-gray-400">
              <ShieldCheck className="w-12 h-12 text-emerald-500/60 mx-auto mb-3" />
              <p className="font-bold text-base text-gray-200">Kayıtlı İSG bildirimi bulunamadı.</p>
              <p className="text-xs text-gray-500 mt-1">
                Sahadaki potansiyel tehlikeleri veya ramak kala durumlarını yeni bildirim açarak kaydedebilirsiniz.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                + İlk Bildirimi Oluştur
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className={`bg-slate-900/95 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all hover:border-slate-700 ${
                    report.type === 'Ramak Kala'
                      ? 'border-rose-500/30'
                      : 'border-amber-500/30'
                  }`}
                >
                  <div>
                    {/* Üst Şerit */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            report.type === 'Ramak Kala'
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {report.type}
                        </span>

                        <span
                          className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${getRiskBadge(
                            report.risk_derecesi
                          )}`}
                        >
                          {report.risk_derecesi} Risk
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                            report.durum
                          )}`}
                        >
                          {report.durum}
                        </span>
                      </div>

                      <span className="text-[10px] text-gray-500 font-mono">
                        #{report.id}
                      </span>
                    </div>

                    {/* Konum ve Bildiren */}
                    <div className="flex items-center justify-between text-xs text-gray-300 mb-2 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-1 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span>{report.alan}</span>
                        {report.bolum && <span className="text-gray-500">({report.bolum})</span>}
                      </div>

                      <div className="text-[11px] text-gray-400 flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-500" />
                        <span>{report.bildiren_kisi}</span>
                      </div>
                    </div>

                    {/* Tanım */}
                    <div className="mb-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Olay / Tehlike Tanımı:
                      </h4>
                      <p className="text-white text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                        {report.tanim}
                      </p>
                    </div>

                    {/* Önlem Önerisi */}
                    {report.onlem && (
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 mb-3 text-xs">
                        <span className="font-bold text-emerald-400 block mb-0.5">
                          🛡️ Alınması Gereken Önlem / Öneri:
                        </span>
                        <p className="text-gray-300 leading-relaxed">{report.onlem}</p>
                      </div>
                    )}

                    {/* Fotoğraf */}
                    {report.fotograf_url && (
                      <div className="mb-3">
                        <img
                          src={fileUrl(report.fotograf_url) || report.fotograf_url}
                          alt="İSG Görseli"
                          className="w-full max-h-48 object-cover rounded-xl border border-slate-800"
                        />
                      </div>
                    )}
                  </div>

                  {/* Alt Şerit ve Durum Butonları */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-gray-400">
                    <span>{formatDateTime(report.tarih)}</span>

                    <div className="flex gap-1.5">
                      {report.durum !== 'Önlem Alındı' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(report.id, 'Önlem Alındı')}
                          className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Önlem Alındı
                        </button>
                      )}
                      {report.durum !== 'Kapatıldı' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(report.id, 'Kapatıldı')}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-gray-300 font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Kapat
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SEKME 2: YENİ İSG BİLDİRİM FORMU
          ========================================================================= */}
      {activeTab === 'new' && (
        <div className="bg-slate-900/95 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl max-w-3xl mx-auto space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>Yeni İSG Tehlike / Ramak Kala Bildirimi</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Lütfen sahada gördüğünüz tehlikeyi veya atlattığınız ramak kala durumunu eksiksiz doldurun.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Bildirim Türü İki Bölüm (Risk Bildirimi vs Ramak Kala) */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Bildirim Türü (Seçiniz)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReportType('Risk Bildirimi')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    reportType === 'Risk Bildirimi'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md ring-2 ring-amber-500/20'
                      : 'bg-slate-800/60 border-slate-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <AlertOctagon className="w-6 h-6 text-amber-400" />
                  <span className="font-black text-sm">Risk Bildirimi</span>
                  <span className="text-[10px] text-gray-400 text-center">
                    Tehlikeli durum veya potansiyel risk
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportType('Ramak Kala')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    reportType === 'Ramak Kala'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md ring-2 ring-rose-500/20'
                      : 'bg-slate-800/60 border-slate-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-6 h-6 text-rose-400" />
                  <span className="font-black text-sm">Ramak Kala</span>
                  <span className="text-[10px] text-gray-400 text-center">
                    Kaza olmadan kıl payı atlatılan olay
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Alan ve Bölüm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Alan (Tezgah / İstasyon) *
                </label>
                <select
                  required
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="" disabled className={OPTION_CLASS}>Alan Seçin...</option>
                  {AREAS.map((a) => (
                    <option key={a} value={a} className={OPTION_CLASS}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  İlgili Bölüm
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="" className={OPTION_CLASS}>Bölüm Seçin...</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d} className={OPTION_CLASS}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Risk Derecesi */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Risk Derecesi
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SAFETY_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setRiskLevel(level)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      riskLevel === level
                        ? getRiskBadge(level) + ' ring-2 ring-white/20'
                        : 'bg-slate-800/60 border-slate-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Olay / Tehlike Tanımı */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Olay / Tehlike Tanımı *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Gözlemlediğiniz tehlikeli durumu veya ramak kala olayının nasıl gerçekleştiğini açıklayınız..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* 5. Alınması Gereken Önlem / Öneri */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Alınması Gereken Önlem / Öneri
              </label>
              <textarea
                rows={2}
                placeholder="Benzer durumun tekrarlanmaması veya tehlikenin giderilmesi için öneriniz..."
                value={actionSuggestion}
                onChange={(e) => setActionSuggestion(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* 6. Fotoğraf Yükleme */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Fotoğraf (İsteğe Bağlı)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-800/50"
              >
                {previewUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={previewUrl}
                      alt="Önizleme"
                      className="max-h-40 rounded-lg object-contain mx-auto"
                    />
                    <span className="block text-xs text-amber-400 mt-2 font-bold underline">
                      Değiştirmek için tıklayın
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-gray-400">
                    <UploadCloud className="w-8 h-8 text-amber-400" />
                    <span className="text-xs font-bold text-gray-300">
                      Görsel yüklemek için tıklayın veya sürükleyin
                    </span>
                    <span className="text-[10px] text-gray-500">JPG, PNG veya WebP</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Butonlar */}
            <div className="flex gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-gray-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                İptal / Listeye Dön
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Kaydediliyor...' : 'İSG Bildirimini Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
