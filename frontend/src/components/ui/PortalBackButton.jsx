import { ArrowLeft } from 'lucide-react';

export default function PortalBackButton({ onBack, label = 'Portala Dön', className = '' }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900/90 hover:bg-slate-800 text-gray-300 hover:text-amber-400 border border-slate-700/80 hover:border-amber-500/60 shadow-md backdrop-blur-sm transition-all duration-200 cursor-pointer active:scale-95 ${className}`}
    >
      <ArrowLeft className="w-4 h-4 text-amber-500 transition-transform duration-200 group-hover:-translate-x-1" />
      <span>{label}</span>
    </button>
  );
}
