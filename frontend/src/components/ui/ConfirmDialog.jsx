/** Yıkıcı işlemler öncesi onay penceresi. */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Evet, Devam Et',
  cancelLabel = 'İptal Et ve Geri Dön',
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-gray-600 dark:text-gray-300">{message}</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
