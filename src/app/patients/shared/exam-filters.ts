export type ExpirationFilter = 'all' | 'available' | 'expired';

export function matchesExpirationFilter(filter: ExpirationFilter, statutExpiration: boolean): boolean {
  if (filter === 'available') return !statutExpiration;
  if (filter === 'expired') return statutExpiration;
  return true;
}

/**
 * Vérifie qu'une date (chaîne API, ISO ou RFC 1123) tombe dans l'intervalle [from, to]
 * (bornes incluses, au format 'YYYY-MM-DD' — celui produit par <input type="date">).
 * Une date manquante ne correspond que si aucune borne n'est active.
 */
export function isWithinDateRange(dateStr: string | null, from: string, to: string): boolean {
  if (!from && !to) return true;

  if (!dateStr) return false;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  const day = date.toISOString().slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}
