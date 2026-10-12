/** Outils communs aux filtres des listes (examens, requêtes, prescriptions, pré-enregistrements). */

export type SortOrder = 'recent' | 'oldest';

export interface FilterOption {
  value: string;
  label: string;
}

/** Valeurs distinctes non vides, triées (ex. établissements présents dans la liste). */
export function distinctValues(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.map((v) => (v ?? '').trim()).filter((v) => !!v))].sort((a, b) => a.localeCompare(b, 'fr'));
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Recherche insensible à la casse et aux accents sur plusieurs champs. */
export function matchesText(term: string, ...fields: (string | number | null | undefined)[]): boolean {
  const needle = fold(term.trim());
  if (!needle) return true;
  return fields.some((f) => f !== null && f !== undefined && fold(String(f)).includes(needle));
}

function time(value: string | null | undefined): number {
  const t = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
}

/** Copie triée par date (les éléments sans date en dernier). */
export function sortByDate<T>(items: T[], dateOf: (item: T) => string | null | undefined, order: SortOrder): T[] {
  const sign = order === 'recent' ? -1 : 1;
  return [...items].sort((a, b) => {
    const ta = time(dateOf(a));
    const tb = time(dateOf(b));
    if (!ta || !tb) return ta ? -1 : tb ? 1 : 0;
    return sign * (ta - tb);
  });
}
