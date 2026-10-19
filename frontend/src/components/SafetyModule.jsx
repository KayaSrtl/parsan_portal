import { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  Flame,
  Plus,
  Filter,
  UploadCloud,
  User,
  MapPin,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AREAS, DEPARTMENTS, SAFETY_LEVELS, OPTION_CLASS } from '../lib/constants';
import { apiFetch, fileUrl, toFormData } from '../lib/api';
import { formatDateTime } from '../utils/helpers';
import PortalBackButton from './ui/PortalBackButton';

export default function SafetyModule({ onBack }) {
  const { user } = useAuth();
  // Modül doğrudan 2 ana bölüme ayrılmıştır: 'Risk Bildirimi' ve 'Ramak Kala'
  const [activeCategory, setActiveCategory] = useState('Risk Bildirimi'); // 'Risk Bildirimi' | 'Ramak Kala'
  const [showNewForm, setShowNewForm] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Filtreler
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('');

  // Form State
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
      type: activeCategory,
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
      setMessage(`${activeCategory} kaydı başarıyla oluşturuldu!`);
      resetForm();
      fetchReports();
      setShowNewForm(false);
    } catch {
      const localReport = {
        id: Date.now(),
        type: activeCategory,
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
      setMessage(`${activeCategory} kaydı başarıyla oluşturuldu!`);
      resetForm();
      setShowNewForm(false);
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
      const updated = reports.map((r) => (r.id === id ? { ...r, durum: newStatus } : r));
      setReports(updated);
      try {
        localStorage.setItem('parsan_safety_reports', JSON.stringify(updated));
      } catch {}
    }
  };

  const filteredReports = reports.filter((r) => {
    if (r.type !== activeCategory) return false;
    if (statusFilter !== 'all' && r.durum !== statusFilter) return false;
    if (areaFilter && (r.alan || '').toUpperCase() !== areaFilter.toUpperCase()) return false;
    return true;
  });

  const stats = {
    total: reports.length,
    risk: reports.filter((r) => r.type === 'Risk Bildirimi').length,
    nearMiss: reports.filter((r) => r.type === 'Ramak Kala').length,
    critical: reports.filter(
      (r) => r.risk_derecesi === 'Kritik' || r.risk_derecesi === 'Yüksek'
    ).length,
  };

  const getRiskBadge = (level) => {
    switch (level) {
      case 'Kritik':
        return 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 font-black';
      case 'Yüksek':
        return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/40 font-bold';
      case 'Orta':
        return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 font-semibold';
      case 'Düşük':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 font-semibold';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Önlem Alındı':
      case 'Kapatıldı':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30';
      case 'İnceleniyor':
      default:
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30';
    }
  };

  const isRiskTab = activeCategory === 'Risk Bildirimi';

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 space-y-6 animate-fade-in pb-20">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <PortalBackButton onBack={onBack} className="mb-2" />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-amber-500" />
            <span>İSG Risk Bildirimi Modülü</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Modül iki ana bölümden oluşmaktadır: <b>1) Risk Bildirimi</b> ve <b>2) Ramak Kala</b>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewForm(!showNewForm)}
          className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 shadow-sm ${
            showNewForm
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              : isRiskTab
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white'
          }`}
        >
          {showNewForm ? (
            <>
              <X className="w-4 h-4" /> Formu Kapat
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Yeni {activeCategory} Kaydı Aç
            </>
          )}
        </button>
      </div>

      {/* =========================================================================
          İKİ ANA BÖLÜM SEÇİCİSİ: 1) RİSK BİLDİRİMİ  |  2) RAMAK KALA
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setActiveCategory('Risk Bildirimi')}
          className={`p-5 rounded-3xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
            isRiskTab
              ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-400 dark:border-amber-500/60 shadow-md ring-2 ring-amber-400/20'
              : 'bg-white/85 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                isRiskTab
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
              }`}
            >
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 block">
                1. BÖLÜM
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">
                ⚠️ Risk Bildirimi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sahadaki güvensiz durumlar, ekipman ve çevre tehlikeleri
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.risk}
            </span>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Kayıt</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('Ramak Kala')}
          className={`p-5 rounded-3xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
            !isRiskTab
              ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-400 dark:border-rose-500/60 shadow-md ring-2 ring-rose-400/20'
              : 'bg-white/85 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                !isRiskTab
                  ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
              }`}
            >
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 block">
                2. BÖLÜM
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">
                ⚡ Ramak Kala Bildirimi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Yaralanma veya hasar doğurmadan kıl payı atlatılan olaylar
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {stats.nearMiss}
            </span>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Kayıt</span>
          </div>
        </button>
      </div>

      {message && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-xs">
          {message}
        </div>
      )}

      {/* =========================================================================
          YENİ BİLDİRİM FORMU (AKTİF BÖLÜME GÖRE)
          ========================================================================= */}
      {showNewForm && (
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-md space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                {isRiskTab ? (
                  <AlertOctagon className="w-5 h-5 text-amber-500" />
                ) : (
                  <Flame className="w-5 h-5 text-rose-500" />
                )}
                <span>Yeni {activeCategory} Kaydı Oluştur</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Lütfen sahada gözlemlediğiniz durumu ve önerdiğiniz önlemi aşağıya giriniz.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory('Risk Bildirimi')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  isRiskTab
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                ⚠️ Risk Bildirimi
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('Ramak Kala')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  !isRiskTab
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                ⚡ Ramak Kala
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Alan (Tezgah / İstasyon) *
                </label>
                <select
                  required
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="" disabled className={OPTION_CLASS}>
                    Alan Seçin...
                  </option>
                  {AREAS.map((a) => (
                    <option key={a} value={a} className={OPTION_CLASS}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  İlgili Bölüm
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="" className={OPTION_CLASS}>
                    Bölüm Seçin...
                  </option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d} className={OPTION_CLASS}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                Risk Derecesi
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SAFETY_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setRiskLevel(level)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      riskLevel === level
                        ? getRiskBadge(level) + ' ring-2 ring-amber-400/30'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                {isRiskTab ? 'Tehlike / Risk Tanımı *' : 'Ramak Kala Olay Tanımı *'}
              </label>
              <textarea
                required
                rows={3}
                placeholder={
                  isRiskTab
                    ? 'Gözlemlediğiniz tehlikeli durumu açıklayınız...'
                    : 'Ramak kala olayının nasıl gerçekleştiğini açıklayınız...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Alınması Gereken Önlem / Öneri
              </label>
              <textarea
                rows={2}
                placeholder="Tehlikenin giderilmesi veya tekrarlanmaması için öneriniz..."
                value={actionSuggestion}
                onChange={(e) => setActionSuggestion(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Saha Fotoğrafı (İsteğe Bağlı)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-amber-400 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50/70 dark:bg-slate-800/50"
              >
                {previewUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={previewUrl}
                      alt="Önizleme"
                      className="max-h-40 rounded-xl object-contain mx-auto"
                    />
                    <span className="block text-xs text-amber-600 dark:text-amber-400 mt-2 font-bold underline">
                      Değiştirmek için tıklayın
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-slate-500">
                    <UploadCloud className="w-8 h-8 text-amber-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Görsel yüklemek için tıklayın
                    </span>
                    <span className="text-[10px] text-slate-400">JPG, PNG veya WebP</span>
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

            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 py-3 px-4 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 ${
                  isRiskTab
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600'
                }`}
              >
                {isSubmitting ? 'Kaydediliyor...' : `${activeCategory} Kaydını Gönder`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          SEÇİLİ BÖLÜMÜN LİSTESİ VE FİLTRELERİ
          ========================================================================= */}
      <div className="space-y-4">
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl flex flex-wrap items-center gap-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-bold">
            <Filter className="w-4 h-4 text-amber-500" />
            <span>{activeCategory} Filtreleri:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white rounded-xl px-3 py-2 outline-none focus:border-amber-500 cursor-pointer font-semibold"
          >
            <option value="all" className={OPTION_CLASS}>
              Tüm Durumlar
            </option>
            <option value="İnceleniyor" className={OPTION_CLASS}>
              ⏳ İnceleniyor
            </option>
            <option value="Önlem Alındı" className={OPTION_CLASS}>
              ✅ Önlem Alındı
            </option>
            <option value="Kapatıldı" className={OPTION_CLASS}>
              🔒 Kapatıldı
            </option>
          </select>

          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-white rounded-xl px-3 py-2 outline-none focus:border-amber-500 cursor-pointer font-semibold"
          >
            <option value="" className={OPTION_CLASS}>
              Tüm Alanlar
            </option>
            {AREAS.map((a) => (
              <option key={a} value={a} className={OPTION_CLASS}>
                {a}
              </option>
            ))}
          </select>

          {(statusFilter !== 'all' || areaFilter) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setAreaFilter('');
              }}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-bold ml-auto cursor-pointer"
            >
              Filtreyi Temizle
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse font-bold">
            İSG Bildirimleri Yükleniyor...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 shadow-xs">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-bold text-base text-slate-800 dark:text-slate-200">
              Bu bölümde ({activeCategory}) kayıtlı bildirim bulunamadı.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Yeni bir <b>{activeCategory}</b> eklemek için aşağıdaki butona tıklayabilirsiniz.
            </p>
            <button
              type="button"
              onClick={() => setShowNewForm(true)}
              className="mt-4 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
            >
              + Yeni {activeCategory} Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className={`bg-white/95 dark:bg-slate-900/95 border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                  report.type === 'Ramak Kala'
                    ? 'border-rose-200 dark:border-rose-500/30'
                    : 'border-amber-200 dark:border-amber-500/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          report.type === 'Ramak Kala'
                            ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
                            : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
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

                    <span className="text-[10px] text-slate-400 font-mono">#{report.id}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      <span>{report.alan}</span>
                      {report.bolum && <span className="text-slate-400">({report.bolum})</span>}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{report.bildiren_kisi}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Olay / Tehlike Tanımı:
                    </h4>
                    <p className="text-slate-800 dark:text-white text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                      {report.tanim}
                    </p>
                  </div>

                  {report.onlem && (
                    <div className="bg-emerald-50/70 dark:bg-slate-950/60 border border-emerald-200/70 dark:border-slate-800/80 rounded-xl p-3 mb-3 text-xs">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                        🛡️ Alınması Gereken Önlem / Öneri:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {report.onlem}
                      </p>
                    </div>
                  )}

                  {report.fotograf_url && (
                    <div className="mb-3">
                      <img
                        src={fileUrl(report.fotograf_url) || report.fotograf_url}
                        alt="İSG Görseli"
                        className="w-full max-h-48 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{formatDateTime(report.tarih)}</span>

                  <div className="flex gap-1.5">
                    {report.durum !== 'Önlem Alındı' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(report.id, 'Önlem Alındı')}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Önlem Alındı
                      </button>
                    )}
                    {report.durum !== 'Kapatıldı' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(report.id, 'Kapatıldı')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg transition-colors cursor-pointer"
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
    </div>
  );
}
