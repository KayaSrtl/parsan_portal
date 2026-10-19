import { ArrowLeft } from 'lucide-react';

export default function PortalBackButton({ onBack, label = 'Portala Dön', className = '' }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/95 dark:bg-slate-900/90 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-amber-400 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-amber-500/60 shadow-sm transition-all duration-200 cursor-pointer active:scale-95 ${className}`}
    >
      <ArrowLeft className="w-4 h-4 text-indigo-500 dark:text-amber-500 transition-transform duration-200 group-hover:-translate-x-1" />
      <span>{label}</span>
    </button>
  );
}
