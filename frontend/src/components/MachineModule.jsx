import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Cog,
  Download,
  ExternalLink,
  FileText,
  History,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCog,
  X,
} from 'lucide-react';

import { useApiResource } from '../hooks/useApiResource';
import { useUsers } from '../hooks/useUsers';
import { useToast } from '../hooks/useToast';
import { apiFetch, apiFetchBlob, toFormData } from '../lib/api';
import { OPTION_CLASS, isGuest, isManager, isSuperAdmin } from '../lib/constants';
import { formatDate } from '../utils/helpers';
import ConfirmDialog from './ui/ConfirmDialog';
import Toast from './ui/Toast';
import PortalBackButton from './ui/PortalBackButton';

const MAX_PDF_MB = 25;

/**
 * Sabit konumlu pencereler (modal/toast) body'ye taşınır: sayfa kapsayıcısındaki
 * animasyon transform'u `fixed` öğeleri sayfanın değil kapsayıcının içine hapseder.
 */
const InBody = ({ children }) => createPortal(children, document.body);

const inputClass =
  'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl p-3 focus:ring-2 focus:ring-teal-400 text-slate-800 dark:text-slate-100 outline-none text-sm font-medium';

/** PDF'i yetkili uçtan indirip uygulama içinde gösterir; açma/indirme düğmeleri de sunar. */
function PdfViewerModal({ part, onClose }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let url = null;
    let cancelled = false;
    apiFetchBlob(`/machines/parts/${part.id}/file`)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [part.id]);

  // Bazı mobil tarayıcılar PDF'i sayfa içinde gösteremez; o durumda açma/indirme yeterlidir.
  const canEmbed = typeof navigator === 'undefined' || navigator.pdfViewerEnabled !== false;

  return (
    <InBody>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="min-w-0">
              <div className="font-black text-slate-900 dark:text-white truncate">
                {part.part_name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {part.part_code ? `${part.part_code} • ` : ''}
                {part.pdf_name}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {objectUrl && (
                <>
                  <a
                    href={objectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30"
                  >
                    <ExternalLink className="w-4 h-4" /> Yeni Sekmede Aç
                  </a>
                  <a
                    href={objectUrl}
                    download={part.pdf_name || 'parca.pdf'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30"
                  >
                    <Download className="w-4 h-4" /> İndir
                  </a>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-950">
            {error ? (
              <div className="h-full flex items-center justify-center p-6 text-center text-rose-600 font-bold text-sm">
                {error}
              </div>
            ) : !objectUrl ? (
              <div className="h-full flex items-center justify-center text-slate-500 font-bold animate-pulse">
                PDF yükleniyor...
              </div>
            ) : canEmbed ? (
              <iframe title={part.part_name} src={objectUrl} className="w-full h-full border-0" />
            ) : (
              <div className="h-full flex items-center justify-center p-6 text-center text-slate-600 dark:text-slate-300 text-sm font-semibold">
                Bu tarayıcı PDF&apos;i sayfa içinde gösteremiyor. Yukarıdaki &quot;Yeni Sekmede
                Aç&quot; veya &quot;İndir&quot; düğmesini kullanın.
              </div>
            )}
          </div>
        </div>
      </div>
    </InBody>
  );
}

function UploadModal({ machine, onClose, onSaved, showToast }) {
  const [partName, setPartName] = useState('');
  const [partCode, setPartCode] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (e) => {
    const picked = e.target.files?.[0] || null;
    setError('');
    if (picked && picked.type !== 'application/pdf') {
      setFile(null);
      setError('Sadece PDF dosyası seçebilirsiniz.');
      return;
    }
    if (picked && picked.size > MAX_PDF_MB * 1024 * 1024) {
      setFile(null);
      setError(`PDF en fazla ${MAX_PDF_MB} MB olabilir.`);
      return;
    }
    setFile(picked);
    if (picked && !partName.trim()) setPartName(picked.name.replace(/\.pdf$/i, ''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partName.trim()) return setError('Dövülen parça adı zorunludur.');
    if (!file) return setError('Lütfen bir PDF dosyası seçin.');

    setSaving(true);
    try {
      await apiFetch(`/machines/${machine.id}/parts`, {
        method: 'POST',
        body: toFormData(
          { part_name: partName.trim(), part_code: partCode.trim(), note: note.trim() },
          { pdf: file },
        ),
      });
      showToast(`${machine.name} tezgahı için parça PDF'i kaydedildi.`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <InBody>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
      >
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-black text-slate-900 dark:text-white">
              {machine.name} — Dövülen Parça PDF&apos;i
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Dövülen Parça Adı *
              </label>
              <input
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                className={inputClass}
                maxLength={120}
                placeholder="Örn. Krank Mili"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Parça / Resim No
              </label>
              <input
                value={partCode}
                onChange={(e) => setPartCode(e.target.value)}
                className={inputClass}
                maxLength={60}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Not
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`${inputClass} min-h-[70px]`}
                maxLength={500}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                PDF Dosyası * (en fazla {MAX_PDF_MB} MB)
              </label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFile}
                className="block w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 dark:file:bg-teal-500/15 dark:file:text-teal-300 file:cursor-pointer"
              />
            </div>
            {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
          </div>

          <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Yükleniyor...' : 'Kaydet ve Aktif Yap'}
            </button>
          </div>
        </form>
      </div>
    </InBody>
  );
}

function MachineCard({
  machine,
  users,
  canAssign,
  canDeleteMachine,
  canEdit,
  onView,
  onUpload,
  onAssign,
  onDeleteMachine,
  onChanged,
  showToast,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [partToDelete, setPartToDelete] = useState(null);
  const active = machine.active_part;

  useEffect(() => {
    if (!showHistory) return;
    let cancelled = false;
    apiFetch(`/machines/${machine.id}/parts`)
      .then((rows) => !cancelled && setHistory(Array.isArray(rows) ? rows : []))
      .catch((err) => !cancelled && showToast(err.message, true));
    return () => {
      cancelled = true;
    };
    // parts_count/active_part değiştiğinde (yükleme, silme) geçmiş tazelenir.
  }, [showHistory, machine.id, machine.parts_count, active?.id, showToast]);

  const runPartAction = async (request, successText) => {
    try {
      await request();
      showToast(successText);
      onChanged();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 border border-teal-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-2xl bg-teal-100 text-teal-600 border border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30">
            <Cog className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
              {machine.name}
            </h3>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <UserCog className="w-3.5 h-3.5" />
              {machine.manager_name ? (
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {machine.manager_name}
                </span>
              ) : (
                <span className="italic">Yönetici atanmadı</span>
              )}
            </div>
          </div>
        </div>
        {canDeleteMachine && (
          <button
            type="button"
            onClick={() => onDeleteMachine(machine)}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
            title="Tezgahı sil"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {canAssign && (
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Tezgah Yöneticisi
          </label>
          <select
            value={machine.manager_id ?? ''}
            onChange={(e) => onAssign(machine, e.target.value)}
            className={`${inputClass} py-2`}
          >
            <option value="" className={OPTION_CLASS}>
              — Yönetici seçilmedi —
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id} className={OPTION_CLASS}>
                {u.name}
                {u.department ? ` (${u.department})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 p-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Şu An Dövülen Parça
        </div>
        {active ? (
          <>
            <div className="font-black text-slate-900 dark:text-white">{active.part_name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {active.part_code ? `${active.part_code} • ` : ''}
              {formatDate(active.created_at)} • {active.uploaded_by}
            </div>
            {active.note && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap">
                {active.note}
              </p>
            )}
            <button
              type="button"
              onClick={() => onView(active)}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 cursor-pointer"
            >
              <FileText className="w-4 h-4" /> Parça PDF&apos;ini Görüntüle
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Bu tezgah için henüz parça PDF&apos;i girilmedi.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <button
            type="button"
            onClick={() => onUpload(machine)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30 cursor-pointer"
          >
            <Upload className="w-4 h-4" /> {active ? "Parça PDF'i Güncelle" : "Parça PDF'i Ekle"}
          </button>
        )}
        {machine.parts_count > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 cursor-pointer"
          >
            <History className="w-4 h-4" /> Geçmiş ({machine.parts_count})
          </button>
        )}
      </div>

      {showHistory && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
          {history.map((part) => (
            <li
              key={part.id}
              className="p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                  {part.part_name}
                  {part.is_active ? (
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      AKTİF
                    </span>
                  ) : null}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  {part.part_code ? `${part.part_code} • ` : ''}
                  {formatDate(part.created_at)} • {part.uploaded_by}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onView(part)}
                  className="px-2.5 py-1.5 rounded-lg font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 cursor-pointer"
                >
                  Görüntüle
                </button>
                {canEdit && !part.is_active && (
                  <button
                    type="button"
                    onClick={() =>
                      runPartAction(
                        () => apiFetch(`/machines/parts/${part.id}/activate`, { method: 'PUT' }),
                        'Parça aktif olarak işaretlendi.',
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                  >
                    Aktif Yap
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setPartToDelete(part)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {partToDelete && (
        <InBody>
          <ConfirmDialog
            title="Parça kaydı silinsin mi?"
            message={`"${partToDelete.part_name}" kaydı ve PDF dosyası kalıcı olarak silinecek.`}
            confirmLabel="Evet, Sil"
            onCancel={() => setPartToDelete(null)}
            onConfirm={() => {
              const part = partToDelete;
              setPartToDelete(null);
              runPartAction(
                () => apiFetch(`/machines/parts/${part.id}`, { method: 'DELETE' }),
                'Parça kaydı silindi.',
              );
            }}
          />
        </InBody>
      )}
    </div>
  );
}

export default function MachineModule({ onBack, currentUser }) {
  const { data: machines, loading, error, refresh } = useApiResource('/machines');
  const { users } = useUsers();
  const { toast, showToast, hideToast } = useToast();

  const [search, setSearch] = useState('');
  const [viewPart, setViewPart] = useState(null);
  const [uploadFor, setUploadFor] = useState(null);
  const [newMachineName, setNewMachineName] = useState('');
  const [machineToDelete, setMachineToDelete] = useState(null);

  const manager = isManager(currentUser);
  const superAdmin = isSuperAdmin(currentUser);
  const guest = isGuest(currentUser);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return machines.filter((m) => !term || m.name.toLowerCase().includes(term));
  }, [machines, search]);

  const canEditMachine = (machine) => manager || (!guest && machine.manager_id === currentUser?.id);

  const handleAssign = async (machine, managerId) => {
    try {
      await apiFetch(`/machines/${machine.id}/manager`, {
        method: 'PUT',
        body: { manager_id: managerId === '' ? null : Number(managerId) },
      });
      showToast(
        managerId === ''
          ? `${machine.name} tezgahının yönetici ataması kaldırıldı.`
          : `${machine.name} tezgahına yönetici atandı.`,
      );
      refresh();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const handleAddMachine = async (e) => {
    e.preventDefault();
    const name = newMachineName.trim();
    if (!name) return;
    try {
      await apiFetch('/machines', { method: 'POST', body: { name } });
      setNewMachineName('');
      showToast(`${name} tezgahı eklendi.`);
      refresh();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const handleDeleteMachine = async () => {
    const machine = machineToDelete;
    setMachineToDelete(null);
    try {
      await apiFetch(`/machines/${machine.id}`, { method: 'DELETE' });
      showToast(`${machine.name} tezgahı silindi.`);
      refresh();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in p-2 md:p-4 pb-24 space-y-6">
      <div className="bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <PortalBackButton onBack={onBack} />
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Cog className="w-6 h-6 text-teal-500" /> Tezgah İzleme Modülü
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Her tezgahın bir yöneticisi vardır; yönetici tezgahta dövülen parçanın PDF&apos;ini
              girer. Usta ve operatörler tezgahta şu an dövülen parçanın PDF&apos;ini buradan
              görüntüleyebilir.
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tezgah ara..."
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        {manager && (
          <form onSubmit={handleAddMachine} className="flex flex-col sm:flex-row gap-2">
            <input
              value={newMachineName}
              onChange={(e) => setNewMachineName(e.target.value)}
              placeholder="Yeni tezgah adı (örn. MP3000)"
              maxLength={40}
              className={`${inputClass} sm:max-w-xs`}
            />
            <button
              type="submit"
              disabled={!newMachineName.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-500 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tezgah Ekle
            </button>
          </form>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500 animate-pulse font-bold">Yükleniyor...</div>
      ) : visible.length === 0 ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-semibold border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
          Eşleşen tezgah bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visible.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              users={users}
              canAssign={manager}
              canDeleteMachine={superAdmin}
              canEdit={canEditMachine(machine)}
              onView={setViewPart}
              onUpload={setUploadFor}
              onAssign={handleAssign}
              onDeleteMachine={setMachineToDelete}
              onChanged={refresh}
              showToast={showToast}
            />
          ))}
        </div>
      )}

      {viewPart && <PdfViewerModal part={viewPart} onClose={() => setViewPart(null)} />}
      {uploadFor && (
        <UploadModal
          machine={uploadFor}
          onClose={() => setUploadFor(null)}
          onSaved={refresh}
          showToast={showToast}
        />
      )}
      {machineToDelete && (
        <InBody>
          <ConfirmDialog
            title="Tezgah silinsin mi?"
            message={`"${machineToDelete.name}" tezgahı ve ona ait tüm parça PDF'leri kalıcı olarak silinecek.`}
            confirmLabel="Evet, Sil"
            onCancel={() => setMachineToDelete(null)}
            onConfirm={handleDeleteMachine}
          />
        </InBody>
      )}
      <InBody>
        <Toast toast={toast} onClose={hideToast} />
      </InBody>
    </div>
  );
}
