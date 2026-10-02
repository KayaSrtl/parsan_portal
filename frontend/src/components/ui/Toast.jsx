import { AlertCircle, CheckCircle } from 'lucide-react';

/** Sağ altta beliren kısa bildirim. `toast` = { text, isError } */
export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 min-w-[320px] max-w-[90vw] bg-white dark:bg-slate-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 dark:border-slate-700 overflow-hidden flex z-50"
    >
      <div className={`w-2 ${toast.isError ? 'bg-red-500' : 'bg-green-500'}`} />
      <div className="flex-1 p-4 flex items-center gap-4">
        <div
          className={`p-2 rounded-full ${
            toast.isError ? 'bg-red-100 dark:bg-red-900/50' : 'bg-green-100 dark:bg-green-900/50'
          }`}
        >
          {toast.isError ? (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">
            {toast.isError ? 'Hata Oluştu' : 'İşlem Başarılı'}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 break-words">{toast.text}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors focus:outline-none"
        aria-label="Bildirimi kapat"
      >
        ✕
      </button>
    </div>
  );
}
