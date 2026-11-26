import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const CONFIRM_VARIANT_CLASSES = {
  danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-400',
  primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
};

/** Yıkıcı veya onay gerektiren işlemler öncesi portal tabanlı onay penceresi. */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Evet, Devam Et',
  cancelLabel = 'İptal Et ve Geri Dön',
  confirmVariant = 'danger',
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const confirmClass =
    CONFIRM_VARIANT_CLASSES[confirmVariant] || CONFIRM_VARIANT_CLASSES.danger;

  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-md w-full overflow-hidden">
        <div className="p-5 sm:p-6">
          <h3
            id="confirm-dialog-title"
            className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2"
          >
            {title}
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 px-5 sm:px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 border-t border-gray-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-xl transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full sm:w-auto px-4 py-2.5 text-sm font-semibold rounded-xl shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return dialog;
  return createPortal(dialog, document.body);
}
