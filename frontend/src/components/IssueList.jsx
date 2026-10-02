import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

import { calculateDelay, formatDate, getStatusColor } from '../utils/helpers';
import { STATUS } from '../lib/constants';

const STATUS_ICONS = {
  [STATUS.RED]: AlertCircle,
  [STATUS.YELLOW]: Clock,
  [STATUS.GREEN]: CheckCircle,
};

function StatusBadge({ status, className = '' }) {
  const Icon = STATUS_ICONS[status];
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${getStatusColor(status)} ${className}`}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {status}
    </div>
  );
}

const TABLE_HEADS = [
  'Durum',
  'Alan',
  'Problem Tanımı',
  'Bildiren Bölüm',
  'Hedef Tarih',
  'Gecikme',
];

export default function IssueList({ issues, onSelectIssue }) {
  if (issues.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-slate-700 p-10 text-center text-gray-500 dark:text-gray-400">
        Görüntülenecek kayıt bulunamadı.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobil Görünüm (Kartlar) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {issues.map((issue) => {
          const delayText = calculateDelay(issue.hedef_tarih, issue.mevcut_durum);
          return (
            <div
              key={issue.id}
              onClick={() => onSelectIssue(issue.id)}
              className="bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-slate-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <StatusBadge status={issue.mevcut_durum} className="px-2.5 py-1 text-xs" />
                {delayText && (
                  <span className="font-bold text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                    {delayText}
                  </span>
                )}
              </div>
              <div className="mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                  Alan
                </span>
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {issue.bildirilen_alan?.toUpperCase()}
                </p>
              </div>
              <div className="mb-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                  Problem
                </span>
                <p className="text-gray-800 dark:text-gray-200 text-sm line-clamp-2">
                  {issue.problem_tanimi}
                </p>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-slate-700 pt-3">
                <span>
                  <span className="font-semibold">Bölüm:</span> {issue.bildiren_bolum}
                </span>
                <span>
                  <span className="font-semibold">Hedef:</span> {formatDate(issue.hedef_tarih)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Masaüstü Görünüm (Tablo) */}
      <div className="hidden md:block overflow-x-auto bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-slate-700">
        <table className="min-w-full text-sm text-left">
          <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-100 dark:bg-slate-700">
            <tr>
              {TABLE_HEADS.map((head) => (
                <th key={head} className="px-6 py-3">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => {
              const delayText = calculateDelay(issue.hedef_tarih, issue.mevcut_durum);
              return (
                <tr
                  key={issue.id}
                  onClick={() => onSelectIssue(issue.id)}
                  className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <StatusBadge status={issue.mevcut_durum} className="px-3 py-1 text-xs" />
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                    {issue.bildirilen_alan?.toUpperCase()}
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate text-gray-800 dark:text-gray-200">
                    {issue.problem_tanimi}
                  </td>
                  <td className="px-6 py-4 text-gray-800 dark:text-gray-200">
                    {issue.bildiren_bolum}
                  </td>
                  <td className="px-6 py-4 text-gray-800 dark:text-gray-200">
                    {formatDate(issue.hedef_tarih)}
                  </td>
                  <td className="px-6 py-4 font-bold text-red-600 dark:text-red-400">{delayText}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
