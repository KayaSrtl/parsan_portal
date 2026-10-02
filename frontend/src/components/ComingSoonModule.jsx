import PortalBackButton from './ui/PortalBackButton';

/**
 * Henüz geliştirilmemiş modüller için ortak yer tutucu ekran.
 */
export default function ComingSoonModule({ onBack, title, description, Icon, color = 'green' }) {
  const palette = {
    green: { border: 'border-green-500', icon: 'text-green-500', text: 'text-green-600 dark:text-green-400' },
    purple: {
      border: 'border-purple-500',
      icon: 'text-purple-500',
      text: 'text-purple-600 dark:text-purple-400',
    },
  }[color];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in p-4 sm:p-6">
      <div className="flex items-center mb-6">
        <PortalBackButton onBack={onBack} />
      </div>

      <div
        className={`bg-slate-900/90 border-2 border-slate-700 rounded-2xl shadow-2xl p-8 sm:p-12 text-center border-t-8 ${palette.border} backdrop-blur-md`}
      >
        <Icon className={`w-20 h-20 ${palette.icon} mx-auto mb-6 opacity-90`} />
        <h2 className="text-3xl font-black text-white mb-4">{title}</h2>
        <p className="text-lg text-gray-300 mb-8 max-w-lg mx-auto">
          Bu modül şu anda <span className={`font-bold ${palette.text}`}>yapım aşamasındadır</span>.{' '}
          {description}
        </p>
        <PortalBackButton onBack={onBack} label="Portala Geri Dön" />
      </div>
    </div>
  );
}
