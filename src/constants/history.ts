// Scans kept on the device; the oldest one is dropped when a new scan arrives.
export const HISTORY_LIMIT = 50;
// From this many scans the History page asks the user to export before old scans (and their notes) are dropped.
export const HISTORY_WARN_AT = 40;

export const historyCapacityNotice = (count: number): string | null => {
  if (count >= HISTORY_LIMIT) return 'Historique plein : chaque nouveau scan supprime le plus ancien, avec sa note. Exportez maintenant.';
  if (count >= HISTORY_WARN_AT) return `Historique bientôt plein : encore ${HISTORY_LIMIT - count} scans avant que les plus anciens soient supprimés, avec leurs notes. Exportez maintenant.`;
  return null;
};
