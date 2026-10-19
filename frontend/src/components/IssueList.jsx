import { useState, useMemo } from 'react';
import {
  AlertCircle,
  Search,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { calculateDelay, formatDate, getStatusColor } from '../utils/helpers';
import {
  AREAS,
  DEPARTMENTS,
  DEFECT_CARD_TYPES,
  STATUS_OPTIONS,
  OPTION_CLASS,
} from '../lib/constants';

const normalizeStatus = (raw) => {
  if (raw === 'Yeşil' || raw === 'Kapalı') return 'Kapalı';
  if (raw === 'Beklemede') return 'Beklemede';
  return 'Açık';
};

const normalizeCardType = (issue) =>
  issue.hata_karti_turu ||
  (issue.mevcut_durum === 'Sarı' ? DEFECT_CARD_TYPES.YELLOW : DEFECT_CARD_TYPES.RED);

export default function IssueList({ issues, onSelectIssue, onOpenNew, onQuickStatusChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedBildirenBolum, setSelectedBildirenBolum] = useState('');
  const [selectedIlgiliBolum, setSelectedIlgiliBolum] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCardType, setSelectedCardType] = useState('all');

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
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

      if (selectedArea && (issue.bildirilen_alan || '').toUpperCase() !== selectedArea.toUpperCase()) {
        return false;
      }

      if (selectedBildirenBolum && issue.bildiren_bolum !== selectedBildirenBolum) {
        return false;
      }

      if (selectedIlgiliBolum && issue.ilgili_bolum !== selectedIlgiliBolum) {
        return false;
      }

      if (selectedStatus !== 'all') {
        const status = normalizeStatus(issue.mevcut_durum);
        if (status !== selectedStatus) return false;
      }

      if (selectedCardType !== 'all') {
        const cardType = normalizeCardType(issue);
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

  const stats = useMemo(() => {
    let openCount = 0;
    let waitingCount = 0;
    let closedCount = 0;
    let delayedCount = 0;

    issues.forEach((item) => {
      const status = normalizeStatus(item.mevcut_durum);
      if (status === 'Kapalı') closedCount++;
      else if (status === 'Beklemede') waitingCount++;
      else openCount++;

      if (calculateDelay(item.hedef_tarih, status)) {
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

  const filterSelectClass =
    'w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-violet-400 cursor-pointer';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* =========================================================================
          1. KPI İSTATİSTİK ŞERİDİ (PASTEL MODERN)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl shadow-2xs text-center">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Toplam Hata Kartı
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white">{stats.total}</div>
        </div>

        <div className="bg-rose-50/80 dark:bg-slate-900/90 border border-rose-200 dark:border-rose-500/20 p-4 rounded-2xl shadow-2xs text-center">
          <div className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Açık
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.openCount}</div>
        </div>

        <div className="bg-amber-50/80 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-500/20 p-4 rounded-2xl shadow-2xs text-center">
          <div className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Beklemede
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.waitingCount}</div>
        </div>

        <div className="bg-emerald-50/80 dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-500/20 p-4 rounded-2xl shadow-2xs text-center">
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Kapalı
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.closedCount}</div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-rose-100/70 dark:bg-slate-900/90 border border-rose-300 dark:border-rose-500/40 p-4 rounded-2xl shadow-2xs text-center">
          <div className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> Gecikmede
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-500">{stats.delayedCount}</div>
        </div>
      </div>

      {/* =========================================================================
          2. FİLTRELEME PANELİ (5 Temel Filtre + Arama)
          ========================================================================= */}
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 rounded-3xl shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Problem tanımı, kart ID, açan kişi veya bölüm ara..."
              className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-400 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {onOpenNew && (
            <button
              onClick={onOpenNew}
              className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-black py-2.5 px-5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer whitespace-nowrap"
            >
              + Yeni Hata Kartı Aç (Veri Girişi)
            </button>
          )}
        </div>

        {/* 5 Seçici Filtre Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* 1. Alan Bazlı */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              1. Alan (Tezgah) Bazlı
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className={filterSelectClass}
            >
              <option value="" className={OPTION_CLASS}>Tüm Alanlar</option>
              {AREAS.map((area) => (
                <option key={area} value={area} className={OPTION_CLASS}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Bildiren Bölüm Bazlı */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              2. Bildiren Bölüm Bazlı
            </label>
            <select
              value={selectedBildirenBolum}
              onChange={(e) => setSelectedBildirenBolum(e.target.value)}
              className={filterSelectClass}
            >
              <option value="" className={OPTION_CLASS}>Tüm Bildiren Bölümler</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept} className={OPTION_CLASS}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* 3. İlgili Bölüm Bazlı */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              3. İlgili Bölüm Bazlı
            </label>
            <select
              value={selectedIlgiliBolum}
              onChange={(e) => setSelectedIlgiliBolum(e.target.value)}
              className={filterSelectClass}
            >
              <option value="" className={OPTION_CLASS}>Tüm İlgili Bölümler</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept} className={OPTION_CLASS}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Mevcut Durum Bazlı */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              4. Mevcut Durum Bazlı
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={filterSelectClass}
            >
              <option value="all" className={OPTION_CLASS}>Tüm Durumlar</option>
              <option value="Açık" className={OPTION_CLASS}>⏳ Açık</option>
              <option value="Beklemede" className={OPTION_CLASS}>⏸️ Beklemede</option>
              <option value="Kapalı" className={OPTION_CLASS}>✅ Kapalı</option>
            </select>
          </div>

          {/* 5. Hata Kartı Türü Bazlı */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              5. Hata Kartı Türü Bazlı
            </label>
            <select
              value={selectedCardType}
              onChange={(e) => setSelectedCardType(e.target.value)}
              className={filterSelectClass}
            >
              <option value="all" className={OPTION_CLASS}>Tüm Kart Türleri</option>
              <option value={DEFECT_CARD_TYPES.RED} className={OPTION_CLASS}>🔴 Kırmızı Hata Kartı</option>
              <option value={DEFECT_CARD_TYPES.YELLOW} className={OPTION_CLASS}>🟡 Sarı Hata Kartı</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Filtrelenen: <b className="text-slate-900 dark:text-white">{filteredIssues.length}</b> / {issues.length} kayıt
            </span>
            <button
              onClick={clearFilters}
              className="text-rose-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          3. HATA KARTLARI TAKİP LİSTESİ (KART & TABLO GÖRÜNÜMÜ)
          ========================================================================= */}
      {filteredIssues.length === 0 ? (
        <div className="bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-500">
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">
            Seçili filtrelere uygun hata kartı bulunamadı.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-xs font-bold text-rose-600 dark:text-amber-400 underline cursor-pointer"
            >
              Filtreleri sıfırla
            </button>
          )}
        </div>
      ) : (
        <div className="w-full">
          {/* Mobil Görünüm */}
          <div className="grid grid-cols-1 gap-3.5 md:hidden">
            {filteredIssues.map((issue) => {
              const status = normalizeStatus(issue.mevcut_durum);
              const cardType = normalizeCardType(issue);
              const delayText = calculateDelay(issue.hedef_tarih, status);

              return (
                <div
                  key={issue.id}
                  onClick={() => onSelectIssue(issue.id)}
                  className="bg-white/95 dark:bg-slate-900/95 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 cursor-pointer hover:border-violet-300 transition-all shadow-xs"
                >
                  <div className="flex justify-between items-start gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${getStatusColor(cardType)}`}>
                        {cardType}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </div>
                    {delayText ? (
                      <span className="font-bold text-[10px] text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse">
                        {delayText}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                        Süresinde
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Alan: {issue.bildirilen_alan?.toUpperCase() || '-'}</span>
                    <span className="text-[10px] text-slate-400">ID #{issue.id}</span>
                  </div>

                  <p className="text-slate-900 dark:text-white text-xs sm:text-sm font-medium line-clamp-2 mb-3">
                    {issue.problem_tanimi}
                  </p>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                    <span>İlgili: <b className="text-slate-700 dark:text-slate-200">{issue.ilgili_bolum || '-'}</b></span>
                    <span>Termin: <b className="text-amber-700 dark:text-amber-300">{formatDate(issue.hedef_tarih)}</b></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Masaüstü Tablo Görünümü */}
          <div className="hidden md:block overflow-x-auto bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
            <table className="min-w-full text-xs text-left">
              <thead className="text-[11px] uppercase tracking-wider bg-slate-50/90 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">ID</th>
                  <th className="px-4 py-3.5">Hata Kartı Türü</th>
                  <th className="px-4 py-3.5">Mevcut Durum</th>
                  <th className="px-4 py-3.5">Alan</th>
                  <th className="px-4 py-3.5">Problem Tanımı</th>
                  <th className="px-4 py-3.5">Bildiren Bölüm</th>
                  <th className="px-4 py-3.5">İlgili Bölüm</th>
                  <th className="px-4 py-3.5">Termin (1 Hafta)</th>
                  <th className="px-4 py-3.5">Gecikme Durumu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredIssues.map((issue) => {
                  const status = normalizeStatus(issue.mevcut_durum);
                  const cardType = normalizeCardType(issue);
                  const delayText = calculateDelay(issue.hedef_tarih, status);

                  return (
                    <tr
                      key={issue.id}
                      onClick={() => onSelectIssue(issue.id)}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-500">
                        #{issue.id}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-full ${getStatusColor(cardType)}`}>
                          {cardType}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {onQuickStatusChange ? (
                          <select
                            value={status}
                            onChange={(e) => onQuickStatusChange(issue, e.target.value)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer outline-none ${getStatusColor(status)}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value} className={OPTION_CLASS}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-black text-slate-800 dark:text-white whitespace-nowrap">
                        {issue.bildirilen_alan?.toUpperCase() || '-'}
                      </td>
                      <td className="px-4 py-3.5 max-w-xs truncate text-slate-700 dark:text-slate-200 font-medium">
                        {issue.problem_tanimi}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {issue.bildiren_bolum || '-'}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-indigo-700 dark:text-amber-300 whitespace-nowrap">
                        {issue.ilgili_bolum || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(issue.hedef_tarih)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {delayText ? (
                          <span className="inline-flex items-center gap-1 font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 px-2.5 py-1 rounded-full animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {delayText}
                          </span>
                        ) : status === 'Kapalı' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Tamamlandı
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                            Süresi İçinde
                          </span>
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
