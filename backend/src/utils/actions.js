const { parseArray } = require('./json');

/**
 * Aksiyon alt adımları (sub_actions) ile ilgili ortak kurallar.
 *
 * ÖNEMLİ: "Hedef Tanımlamak" adımı bir kilometre taşıdır (milestone).
 * Hedef tarih girildiğinde otomatik tamamlanır ancak aksiyonun genel
 * ilerlemesine DAHİL EDİLMEZ. Aksi halde hedef tarih girildiği anda
 * aksiyon %100 "Tamamlandı" olur ve takip listesinden düşer.
 */

const MILESTONE_TITLE = 'Hedef Tanımlamak';

const clamp = (n) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));

const isMilestone = (sub) =>
  Boolean(sub && (sub.milestone || /hedef\s*tan[ıi]mlamak/i.test(String(sub.title || ''))));

const normalizeSubActions = (value) =>
  parseArray(value)
    .filter((s) => s && typeof s === 'object')
    .map((s) => {
      const milestone = isMilestone(s);
      return {
        title: String(s.title ?? ''),
        weight: milestone ? 0 : clamp(s.weight),
        completed: Boolean(s.completed),
        milestone,
      };
    });

/** Sadece gerçek iş adımlarının ağırlıklı tamamlanma yüzdesi. */
function deriveProgress(subActions) {
  const work = subActions.filter((s) => !isMilestone(s));
  if (!work.length) return 0;
  return clamp(work.reduce((sum, s) => sum + (s.completed ? s.weight : 0), 0));
}

/** Aksiyon ancak en az bir gerçek iş adımı %100 tamamlandıysa kapanır. */
function deriveStatus(subActions, progress) {
  const hasWork = subActions.some((s) => !isMilestone(s));
  return hasWork && progress >= 100 ? 'Tamamlandı' : 'Açık';
}

/** Hedef tarih girildiğinde kilometre taşını tamamlar. */
function completeMilestone(subActions) {
  return subActions.map((s) => (isMilestone(s) ? { ...s, completed: true } : s));
}

/**
 * Kilometre taşı hariç gerçek iş adımlarının ağırlıklarını %100'e dengeler.
 * Kilometre taşının ağırlığı her zaman 0'dır.
 */
function balanceSubActions(subActions) {
  const normalized = subActions.map((s) =>
    isMilestone(s) ? { ...s, weight: 0, milestone: true } : { ...s }
  );
  const workIndexes = normalized.map((s, i) => (isMilestone(s) ? -1 : i)).filter((i) => i >= 0);
  if (!workIndexes.length) return normalized;

  let used = 0;
  workIndexes.forEach((idx, order) => {
    if (order === workIndexes.length - 1) {
      normalized[idx].weight = Math.max(0, 100 - used);
      return;
    }
    let weight = clamp(normalized[idx].weight);
    if (used + weight > 100) weight = 100 - used;
    used += weight;
    normalized[idx].weight = weight;
  });
  return normalized;
}

const initialSubActions = (targetDefined = false) => [
  { title: MILESTONE_TITLE, weight: 0, completed: Boolean(targetDefined), milestone: true },
];

module.exports = {
  MILESTONE_TITLE,
  clamp,
  isMilestone,
  normalizeSubActions,
  deriveProgress,
  deriveStatus,
  completeMilestone,
  balanceSubActions,
  initialSubActions,
};
