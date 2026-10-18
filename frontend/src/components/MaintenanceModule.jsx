import { useState, useEffect, useRef } from 'react';
import {
  Wrench,
  Gauge,
  Wind,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Camera,
  History,
  Calendar,
  Clock,
  User,
  Factory,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AREAS, SHIFTS, OPTION_CLASS } from '../lib/constants';
import { apiFetch, fileUrl, toFormData } from '../lib/api';
import { formatDateTime } from '../utils/helpers';
import PortalBackButton from './ui/PortalBackButton';

export default function MaintenanceModule({ onBack, onOpenIssue }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'history'
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Form State
  const [tezgah, setTezgah] = useState('');
  const [vardiya, setVardiya] = useState(SHIFTS[0]);

  // Madde 1: Hava Basınç Barası (3-5 bar arası) - Fotoğraf zorunlu
  const [item1Val, setItem1Val] = useState('4.0');
  const [item1Status, setItem1Status] = useState('Uygun');
  const [item1File, setItem1File] = useState(null);
  const [item1Preview, setItem1Preview] = useState(null);

  // Madde 2: Hava Valfi Kaçak Kontrolü
  const [item2Status, setItem2Status] = useState('Kaçak Yok');
  const [item2Note, setItem2Note] = useState('');

  // Madde 3: Atık Yağ Tankı Boşaltma - Fotoğraf zorunlu
  const [item3Status, setItem3Status] = useState('Boşaltıldı');
  const [item3File, setItem3File] = useState(null);
  const [item3Preview, setItem3Preview] = useState(null);

  const fileInputRef1 = useRef(null);
  const fileInputRef3 = useRef(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/maintenance');
      setHistoryList(Array.isArray(data) ? data : []);
    } catch {
      try {
        const local = localStorage.getItem('parsan_maintenance_history');
        setHistoryList(local ? JSON.parse(local) : []);
      } catch {
        setHistoryList([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handlePressureChange = (val) => {
    setItem1Val(val);
    const num = parseFloat(val);
    if (!Number.isNaN(num)) {
      if (num >= 3.0 && num <= 5.0) {
        setItem1Status('Uygun');
      } else {
        setItem1Status('Uygun Değil');
      }
    }
  };

  const handleImage1Change = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setItem1File(file);
      setItem1Preview(URL.createObjectURL(file));
    }
  };

  const handleImage3Change = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setItem3File(file);
      setItem3Preview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tezgah) {
      alert('Lütfen tezgah / makine seçiniz.');
      return;
    }
    if (!item1File && !item1Preview) {
      alert('1. Madde için hava basınç barası fotoğrafı yüklenmesi zorunludur!');
      return;
    }
    if (!item3File && !item3Preview) {
      alert('3. Madde için boşaltılmış atık yağ tankı fotoğrafı yüklenmesi zorunludur!');
      return;
    }

    setIsSubmitting(true);
    setFeedback('');

    const payload = {
      tezgah_no: tezgah,
      vardiya,
      item1_val: item1Val,
      item1_status: item1Status,
      item2_status: item2Status,
      item2_note: item2Note.trim(),
      item3_status: item3Status,
    };

    try {
      const formData = new FormData();
      Object.entries(payload).forEach(([k, v]) => formData.append(k, v));
      if (item1File) formData.append('item1_foto', item1File);
      if (item3File) formData.append('item3_foto', item3File);

      await apiFetch('/maintenance', {
        method: 'POST',
        body: formData,
      });

      setFeedback('Otonom bakım kontrolü başarıyla kaydedildi!');
      resetForm();
      fetchHistory();
      setActiveTab('history');
    } catch {
      // Yerel fallback kaydet
      const localRecord = {
        id: Date.now(),
        tezgah_no: tezgah,
        vardiya,
        operator_name: user?.name || 'Saha Operatörü',
        tarih: new Date().toISOString(),
        item1_val: item1Val,
        item1_status: item1Status,
        item1_foto: item1Preview,
        item2_status: item2Status,
        item2_note: item2Note.trim(),
        item3_status: item3Status,
        item3_foto: item3Preview,
      };
      const updated = [localRecord, ...historyList];
      setHistoryList(updated);
      try {
        localStorage.setItem('parsan_maintenance_history', JSON.stringify(updated));
      } catch {}
      setFeedback('Otonom bakım kontrolü kaydedildi (Yerel Mod)');
      resetForm();
      setActiveTab('history');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTezgah('');
    setItem1Val('4.0');
    setItem1Status('Uygun');
    setItem1File(null);
    setItem1Preview(null);
    setItem2Status('Kaçak Yok');
    setItem2Note('');
    setItem3Status('Boşaltıldı');
    setItem3File(null);
    setItem3Preview(null);
  };

  return (
    <div className="max-w-5xl mx-auto p-2 sm:p-4 space-y-6 animate-fade-in pb-20">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <PortalBackButton onBack={onBack} className="mb-2" />
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <Wrench className="w-7 h-7 text-sky-400" />
            <span>Otonom Bakım Modülü (TPM)</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Operatör periyodik kontrolleri, basınç testleri ve temizlik adımları
          </p>
        </div>

        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl gap-1 w-full sm:w-auto shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'form'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ✍️ Kontrol Formu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📜 Bakım Geçmişi ({historyList.length})
          </button>
        </div>
      </div>

      {feedback && (
        <div className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-lg">
          {feedback}
        </div>
      )}

      {/* =========================================================================
          SEKME 1: KONTROL FORMU (3 MADDE)
          ========================================================================= */}
      {activeTab === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Genel Bilgiler Kartı */}
          <div className="bg-slate-900/95 border border-slate-800 p-5 rounded-2xl shadow-lg grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Tezgah / İstasyon *
              </label>
              <select
                required
                value={tezgah}
                onChange={(e) => setTezgah(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="" disabled className={OPTION_CLASS}>Tezgah Seçin...</option>
                {AREAS.map((a) => (
                  <option key={a} value={a} className={OPTION_CLASS}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Vardiya
              </label>
              <select
                value={vardiya}
                onChange={(e) => setVardiya(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {SHIFTS.map((s) => (
                  <option key={s} value={s} className={OPTION_CLASS}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Kontrol Eden Operatör
              </label>
              <div className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 text-sm text-sky-300 font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-sky-400" />
                <span>{user?.name || 'Saha Operatörü'}</span>
              </div>
            </div>
          </div>

          {/* 3 KONTROL MADDESİ */}
          <div className="space-y-4">
            {/* ===================================================================
                1. MADDE: Hava Basınç Barası (3-5 bar arası) - Fotoğraf İstensin
                =================================================================== */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-black text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Gauge className="w-5 h-5 text-sky-400" />
                      <span>Hava Basınç Barasını Kontrol Et</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Standart: Basınç <b className="text-sky-300">3 - 5 Bar</b> arasında olmalıdır.
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs font-black uppercase px-3 py-1 rounded-full border self-start sm:self-auto ${
                    item1Status === 'Uygun'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse'
                  }`}
                >
                  {item1Status === 'Uygun' ? '✓ Uygun (3-5 Bar)' : '⚠️ Uygun Değil'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Değer Girişi */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-300 uppercase">
                    Okunan Manometre Değeri (Bar)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="12"
                      value={item1Val}
                      onChange={(e) => handlePressureChange(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-sky-500 text-center"
                    />
                    <span className="text-sm font-bold text-gray-400">BAR</span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {[3.5, 4.0, 4.5].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handlePressureChange(String(preset))}
                        className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-gray-300 border border-slate-700 cursor-pointer"
                      >
                        {preset} bar
                      </button>
                    ))}
                  </div>

                  {item1Status !== 'Uygun' && (
                    <div className="bg-rose-950/80 border border-rose-500/40 p-2.5 rounded-xl text-xs text-rose-300">
                      ⚠️ Basınç 3-5 bar limitleri dışındadır! Kontrol sonrası hata kartı açılması önerilir.
                    </div>
                  )}
                </div>

                {/* Fotoğraf Yükleme (Zorunlu) */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-sky-400" />
                      <span>Manometre Fotoğrafı *</span>
                    </span>
                    <span className="text-[10px] text-rose-400 font-bold lowercase">*fotoğraf zorunlu</span>
                  </label>

                  <div
                    onClick={() => fileInputRef1.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${
                      item1Preview
                        ? 'border-emerald-500/50 bg-emerald-950/20'
                        : 'border-slate-700 hover:border-sky-500 bg-slate-800/40'
                    }`}
                  >
                    {item1Preview ? (
                      <div className="flex items-center justify-center gap-3">
                        <img
                          src={item1Preview}
                          alt="Manometre"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-700"
                        />
                        <div className="text-left text-xs">
                          <span className="text-emerald-400 font-bold block flex items-center gap-1">
                            <Check className="w-4 h-4" /> Fotoğraf Eklendi
                          </span>
                          <span className="text-gray-400 underline">Değiştirmek için tıklayın</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 text-gray-400">
                        <UploadCloud className="w-6 h-6 text-sky-400 mx-auto mb-1" />
                        <span className="text-xs font-bold text-gray-300 block">
                          Manometre Fotoğrafı Yükle
                        </span>
                        <span className="text-[10px] text-gray-500">Kamera veya galeriden seçin</span>
                      </div>
                    )}
                    <input
                      ref={fileInputRef1}
                      type="file"
                      accept="image/*"
                      onChange={handleImage1Change}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ===================================================================
                2. MADDE: Hava Valfini Kontrol Et (Hava kaçağı var mı?)
                =================================================================== */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-black text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Wind className="w-5 h-5 text-sky-400" />
                      <span>Hava Valfini Kontrol Et (Kaçak Testi)</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Standart: Valf bağlantılarında, rekorlarda veya contalarda hava kaçağı olmamalıdır.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setItem2Status('Kaçak Yok')}
                    className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      item2Status === 'Kaçak Yok'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Kaçak Yok (Normal)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setItem2Status('Hava Kaçağı Var')}
                    className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      item2Status === 'Hava Kaçağı Var'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold shadow-sm ring-2 ring-rose-500/20'
                        : 'bg-slate-800/60 border-slate-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Hava Kaçağı Var!</span>
                  </button>
                </div>

                {item2Status === 'Hava Kaçağı Var' && (
                  <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-rose-300 uppercase">
                      Kaçak Lokasyonu / Not:
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: 2 numaralı silindir giriş rekorunda kaçak tespit edildi..."
                      value={item2Note}
                      onChange={(e) => setItem2Note(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ===================================================================
                3. MADDE: Atık Yağ Tankını Boşalt - Fotoğraf İstensin
                =================================================================== */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-black text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Trash2 className="w-5 h-5 text-sky-400" />
                      <span>Atık Yağ Tankını Boşalt</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Standart: Atık yağ haznesi uygun atık bidonuna tahliye edilmeli ve hazne temizlenmelidir.
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
                  Periyodik Adım
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Durum Seçimi */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-300 uppercase">
                    İşlem Durumu
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setItem3Status('Boşaltıldı')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        item3Status === 'Boşaltıldı'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      ✓ Boşaltıldı & Temiz
                    </button>
                    <button
                      type="button"
                      onClick={() => setItem3Status('Boşaltılmadı')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        item3Status === 'Boşaltılmadı'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      ✗ Boşaltılmadı
                    </button>
                  </div>
                </div>

                {/* Fotoğraf Yükleme (Zorunlu) */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-sky-400" />
                      <span>Boşaltılmış Tank Fotoğrafı *</span>
                    </span>
                    <span className="text-[10px] text-rose-400 font-bold lowercase">*fotoğraf zorunlu</span>
                  </label>

                  <div
                    onClick={() => fileInputRef3.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${
                      item3Preview
                        ? 'border-emerald-500/50 bg-emerald-950/20'
                        : 'border-slate-700 hover:border-sky-500 bg-slate-800/40'
                    }`}
                  >
                    {item3Preview ? (
                      <div className="flex items-center justify-center gap-3">
                        <img
                          src={item3Preview}
                          alt="Tank"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-700"
                        />
                        <div className="text-left text-xs">
                          <span className="text-emerald-400 font-bold block flex items-center gap-1">
                            <Check className="w-4 h-4" /> Fotoğraf Eklendi
                          </span>
                          <span className="text-gray-400 underline">Değiştirmek için tıklayın</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 text-gray-400">
                        <UploadCloud className="w-6 h-6 text-sky-400 mx-auto mb-1" />
                        <span className="text-xs font-bold text-gray-300 block">
                          Atık Yağ Tankı Fotoğrafı Yükle
                        </span>
                        <span className="text-[10px] text-gray-500">Kamera veya galeriden seçin</span>
                      </div>
                    )}
                    <input
                      ref={fileInputRef3}
                      type="file"
                      accept="image/*"
                      onChange={handleImage3Change}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Gönderim Butonu */}
          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Kaydediliyor...' : 'Otonom Bakım Kontrolünü Kaydet'}
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          SEKME 2: BAKIM GEÇMİŞİ LİSTESİ
          ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-gray-500 animate-pulse font-bold">
              Kayıtlar Yükleniyor...
            </div>
          ) : historyList.length === 0 ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center text-gray-400">
              <CheckCircle2 className="w-12 h-12 text-sky-500/60 mx-auto mb-3" />
              <p className="font-bold text-base text-gray-200">Henüz otonom bakım kaydı bulunmuyor.</p>
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors"
              >
                + Yeni Kontrol Kaydı Yap
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historyList.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div>
                      <h4 className="font-black text-base text-white">{rec.tezgah_no}</h4>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-400" />
                        <span>{formatDateTime(rec.tarih)}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-gray-300 border border-slate-700">
                        {rec.vardiya}
                      </span>
                      <span className="block text-[10px] text-gray-500 mt-0.5">{rec.operator_name}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Madde 1 */}
                    <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-sky-400" />
                        <span>Hava Basıncı: <b>{rec.item1_val} BAR</b></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rec.item1_status === 'Uygun'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {rec.item1_status}
                        </span>
                        {rec.item1_foto && (
                          <img
                            src={fileUrl(rec.item1_foto) || rec.item1_foto}
                            alt="Basınç Foto"
                            className="w-7 h-7 rounded object-cover border border-slate-700 cursor-pointer"
                            onClick={() => window.open(fileUrl(rec.item1_foto) || rec.item1_foto, '_blank')}
                          />
                        )}
                      </div>
                    </div>

                    {/* Madde 2 */}
                    <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Wind className="w-4 h-4 text-sky-400" />
                        <span>Hava Valfi:</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rec.item2_status === 'Kaçak Yok'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {rec.item2_status}
                      </span>
                    </div>

                    {/* Madde 3 */}
                    <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-sky-400" />
                        <span>Atık Yağ Tankı:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          {rec.item3_status}
                        </span>
                        {rec.item3_foto && (
                          <img
                            src={fileUrl(rec.item3_foto) || rec.item3_foto}
                            alt="Tank Foto"
                            className="w-7 h-7 rounded object-cover border border-slate-700 cursor-pointer"
                            onClick={() => window.open(fileUrl(rec.item3_foto) || rec.item3_foto, '_blank')}
                          />
                        )}
                      </div>
                    </div>
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
