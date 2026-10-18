import { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Calendar,
  Layers,
  Building2,
  ArrowUpDown,
} from 'lucide-react';
import { calculateDelay, formatDate, getStatusColor } from '../utils/helpers';
import {
  AREAS,
  DEPARTMENTS,
  DEFECT_CARD_TYPES,
  DEFECT_CARD_TYPE_OPTIONS,
  STATUS,
  STATUS_OPTIONS,
  OPTION_CLASS,
} from '../lib/constants';
import { fileUrl } from '../lib/api';

export default function IssueList({ issues, onSelectIssue, onOpenNew }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedBildirenBolum, setSelectedBildirenBolum] = useState('');
  const [selectedIlgiliBolum, setSelectedIlgiliBolum] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCardType, setSelectedCardType] = useState('all');

  // Filtreleme mantığı (5 Alan Filtresi + Arama)
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // 1. Arama
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        const matchesTerm =
          String(issue.id).includes(term) ||
          (issue.problem_tanimi || '').toLowerCase().includes(term) ||
          (issue.bildiren_kisi || '').toLowerCase().includes(term) ||
          (issue.bildiren_bolum || '').toLowerCase().includes(term) ||
          (issue.ilgili_bolum || '').toLowerCase().includes(term);
        if (!matchesTerm) return false;
      }

      // 2. Alan bazlı filtre
      if (selectedArea && (issue.bildirilen_alan || '').toUpperCase() !== selectedArea.toUpperCase()) {
        return false;
      }

      // 3. Bildiren bölüm bazlı filtre
      if (selectedBildirenBolum && issue.bildiren_bolum !== selectedBildirenBolum) {
        return false;
      }

      // 4. İlgili bölüm bazlı filtre
      if (selectedIlgiliBolum && issue.ilgili_bolum !== selectedIlgiliBolum) {
        return false;
      }

      // 5. Mevcut durum bazlı filtre (Açık, Beklemede, Kapalı)
      if (selectedStatus !== 'all') {
        const status =
          issue.mevcut_durum === 'Yeşil'
            ? 'Kapalı'
            : issue.mevcut_durum === 'Kırmızı' || issue.mevcut_durum === 'Sarı'
              ? 'Açık'
              : issue.mevcut_durum;
        if (status !== selectedStatus) return false;
      }

      // 6. Hata kartı türü bazlı filtre (Kırmızı / Sarı)
      if (selectedCardType !== 'all') {
        const cardType =
          issue.hata_karti_turu ||
          (issue.mevcut_durum === 'Sarı' ? DEFECT_CARD_TYPES.YELLOW : DEFECT_CARD_TYPES.RED);
        if (cardType !== selectedCardType) return false;
      }

      return true;
    });
  }, [
    issues,
    searchTerm,
    selectedArea,
    selectedBildirenBolum,
    selectedIlgiliBolum,
    selectedStatus,
    selectedCardType,
  ]);

  // KPI İstatistikleri
  const stats = useMemo(() => {
    let openCount = 0;
    let waitingCount = 0;
    let closedCount = 0;
    let delayedCount = 0;

    issues.forEach((item) => {
      const status =
        item.mevcut_durum === 'Yeşil'
          ? 'Kapalı'
          : item.mevcut_durum === 'Kırmızı' || item.mevcut_durum === 'Sarı'
            ? 'Açık'
            : item.mevcut_durum;

      if (status === 'Kapalı') closedCount++;
      else if (status === 'Beklemede') waitingCount++;
      else openCount++;

      if (calculateDelay(item.hedef_tarih, item.mevcut_durum)) {
        delayedCount++;
      }
    });

    return { total: issues.length, openCount, waitingCount, closedCount, delayedCount };
  }, [issues]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedArea('');
    setSelectedBildirenBolum('');
    setSelectedIlgiliBolum('');
    setSelectedStatus('all');
    setSelectedCardType('all');
  };

  const hasActiveFilters =
    searchTerm ||
    selectedArea ||
    selectedBildirenBolum ||
    selectedIlgiliBolum ||
    selectedStatus !== 'all' ||
    selectedCardType !== 'all';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* =========================================================================
          1. KPI İSTATİSTİK ŞERİDİ (PASTEL INDUSTRIAL)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow-sm text-center">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Toplam Kart
          </div>
          <div className="text-2xl font-black text-white">{stats.total}</div>
        </div>

        <div className="bg-slate-900/90 border border-rose-500/20 p-3.5 rounded-xl shadow-sm text-center">
          <div className="text-xs font-semibold text-rose-300 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Açık Kartlar
          </div>
          <div className="text-2xl font-black text-rose-400">{stats.openCount}</div>
        </div>

        <div className="bg-slate-900/90 border border-amber-500/20 p-3.5 rounded-xl shadow-sm text-center">
          <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Beklemede
          </div>
          <div className="text-2xl font-black text-amber-400">{stats.waitingCount}</div>
        </div>

        <div className="bg-slate-900/90 border border-emerald-500/20 p-3.5 rounded-xl shadow-sm text-center">
          <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Kapalı
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats.closedCount}</div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-900/90 border border-rose-500/40 p-3.5 rounded-xl shadow-sm text-center">
          <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Gecikmede
          </div>
          <div className="text-2xl font-black text-rose-500">{stats.delayedCount}</div>
        </div>
      </div>

      {/* =========================================================================
          2. FİLTRELEME PANELİ (5 Temel Filtre + Arama)
          ========================================================================= */}
      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Problem tanımı, ID, açan kişi veya bölüm ara..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {onOpenNew && (
            <button
              onClick={onOpenNew}
              className="bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black py-2.5 px-5 rounded-xl shadow transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer whitespace-nowrap"
            >
              + Hata Kartı Aç
            </button>
          )}
        </div>

        {/* 5 Seçici Filtre Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-2 border-t border-slate-800">
          {/* 1. Hata Kartı Türü */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              Hata Kartı Türü
            </label>
            <select
              value={selectedCardType}
              onChange={(e) => setSelectedCardType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all" className={OPTION_CLASS}>Tüm Türler</option>
              <option value={DEFECT_CARD_TYPES.RED} className={OPTION_CLASS}>🔴 Kırmızı Hata Kartı</option>
              <option value={DEFECT_CARD_TYPES.YELLOW} className={OPTION_CLASS}>🟡 Sarı Hata Kartı</option>
            </select>
          </div>

          {/* 2. Mevcut Durum */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              Mevcut Durum
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all" className={OPTION_CLASS}>Tüm Durumlar</option>
              <option value="Açık" className={OPTION_CLASS}>⏳ Açık</option>
              <option value="Beklemede" className={OPTION_CLASS}>⏸️ Beklemede</option>
              <option value="Kapalı" className={OPTION_CLASS}>✅ Kapalı</option>
            </select>
          </div>

          {/* 3. Alan (Tezgah) */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              Alan (Tezgah)
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="" className={OPTION_CLASS}>Tüm Alanlar</option>
              {AREAS.map((area) => (
                <option key={area} value={area} className={OPTION_CLASS}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Bildiren Bölüm */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              Bildiren Bölüm
            </label>
            <select
              value={selectedBildirenBolum}
              onChange={(e) => setSelectedBildirenBolum(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="" className={OPTION_CLASS}>Tüm Bölümler</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept} className={OPTION_CLASS}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* 5. İlgili Bölüm */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              İlgili Bölüm
            </label>
            <select
              value={selectedIlgiliBolum}
              onChange={(e) => setSelectedIlgiliBolum(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="" className={OPTION_CLASS}>Tüm İlgili Bölümler</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept} className={OPTION_CLASS}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 text-xs text-gray-400">
            <span>Filtrelenen: <b className="text-white">{filteredIssues.length}</b> / {issues.length} kayıt</span>
            <button
              onClick={clearFilters}
              className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          3. HATA KARTLARI LİSTESİ (KART & TABLO GÖRÜNÜMÜ)
          ========================================================================= */}
      {filteredIssues.length === 0 ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-10 text-center text-gray-400">
          <p className="text-base font-semibold">Seçili kriterlere uygun hata kartı bulunamadı.</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-xs font-bold text-amber-400 underline cursor-pointer"
            >
              Filtreleri sıfırla
            </button>
          )}
        </div>
      ) : (
        <div className="w-full">
          {/* Mobil Görünüm (Kartlar) */}
          <div className="grid grid-cols-1 gap-3.5 md:hidden">
            {filteredIssues.map((issue) => {
              const delayText = calculateDelay(issue.hedef_tarih, issue.mevcut_durum);
              const cardType =
                issue.hata_karti_turu ||
                (issue.mevcut_durum === 'Sarı' ? DEFECT_CARD_TYPES.YELLOW : DEFECT_CARD_TYPES.RED);
              const status =
                issue.mevcut_durum === 'Yeşil'
                  ? 'Kapalı'
                  : issue.mevcut_durum === 'Kırmızı' || issue.mevcut_durum === 'Sarı'
                    ? 'Açık'
                    : issue.mevcut_durum || 'Açık';

              return (
                <div
                  key={issue.id}
                  onClick={() => onSelectIssue(issue.id)}
                  className="bg-slate-900/95 rounded-2xl border border-slate-800 p-4 cursor-pointer hover:border-slate-700 transition-all shadow-md"
                >
                  <div className="flex justify-between items-start gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusColor(cardType)}`}>
                        {cardType}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </div>
                    {delayText && (
                      <span className="font-bold text-[10px] text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full animate-pulse">
                        {delayText}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-gray-300 mb-1">
                    <span>Alan: {issue.bildirilen_alan?.toUpperCase()}</span>
                    <span className="text-[10px] text-gray-500">ID #{issue.id}</span>
                  </div>

                  <p className="text-white text-xs sm:text-sm font-medium line-clamp-2 mb-3">
                    {issue.problem_tanimi}
                  </p>

                  <div className="flex justify-between items-center text-[11px] text-gray-400 border-t border-slate-800/80 pt-2.5">
                    <span>İlgili: <b className="text-gray-300">{issue.ilgili_bolum || '-'}</b></span>
                    <span>Termin: <b className="text-amber-300">{formatDate(issue.hedef_tarih)}</b></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Masaüstü Tablo Görünümü */}
          <div className="hidden md:block overflow-x-auto bg-slate-900/95 rounded-2xl border border-slate-800 shadow-xl">
            <table className="min-w-full text-xs text-left">
              <thead className="text-[11px] uppercase tracking-wider bg-slate-950/70 text-gray-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">ID</th>
                  <th className="px-4 py-3.5">Hata Kartı Türü</th>
                  <th className="px-4 py-3.5">Mevcut Durum</th>
                  <th className="px-4 py-3.5">Alan</th>
                  <th className="px-4 py-3.5">Problem Tanımı</th>
                  <th className="px-4 py-3.5">Bildiren Bölüm</th>
                  <th className="px-4 py-3.5">İlgili Bölüm</th>
                  <th className="px-4 py-3.5">Termin</th>
                  <th className="px-4 py-3.5">Gecikme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredIssues.map((issue) => {
                  const delayText = calculateDelay(issue.hedef_tarih, issue.mevcut_durum);
                  const cardType =
                    issue.hata_karti_turu ||
                    (issue.mevcut_durum === 'Sarı' ? DEFECT_CARD_TYPES.YELLOW : DEFECT_CARD_TYPES.RED);
                  const status =
                    issue.mevcut_durum === 'Yeşil'
                      ? 'Kapalı'
                      : issue.mevcut_durum === 'Kırmızı' || issue.mevcut_durum === 'Sarı'
                        ? 'Açık'
                        : issue.mevcut_durum || 'Açık';

                  return (
                    <tr
                      key={issue.id}
                      onClick={() => onSelectIssue(issue.id)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-gray-400">
                        #{issue.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-full border ${getStatusColor(cardType)}`}>
                          {cardType}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black text-white whitespace-nowrap">
                        {issue.bildirilen_alan?.toUpperCase()}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-gray-200 font-medium">
                        {issue.problem_tanimi}
                      </td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {issue.bildiren_bolum || '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-300 whitespace-nowrap">
                        {issue.ilgili_bolum || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {formatDate(issue.hedef_tarih)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {delayText ? (
                          <span className="font-black text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-full animate-pulse">
                            {delayText}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
