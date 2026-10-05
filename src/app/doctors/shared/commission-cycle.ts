/**
 * Les commissions sont arrêtées sur un cycle allant du 21 d'un mois au 20 du mois suivant.
 * Cette logique reproduit exactement celle de l'API (doctor_com.solde / actual_solde /
 * gnu_doctor.lists_commissions) afin que les libellés affichés correspondent aux données.
 */

export const MONTH_LABELS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

export const MONTH_SHORT_LABELS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'] as const;

/** Clés renvoyées par /doctor_com/invoiced_by_year (mois en majuscules, sans accents). */
export const API_MONTH_KEYS = [
  'JANVIER',
  'FEVRIER',
  'MARS',
  'AVRIL',
  'MAI',
  'JUIN',
  'JUILLET',
  'AOUT',
  'SEPTEMBRE',
  'OCTOBRE',
  'NOVEMBRE',
  'DECEMBRE',
] as const;

/** Premier cycle disponible côté API : 21 octobre 2025. */
export const FIRST_COMMISSION_YEAR = 2025;
export const FIRST_COMMISSION_MONTH_2025 = 10;

export interface CommissionCycle {
  start: Date;
  end: Date;
  /** Mois (1-12) auquel le cycle est rattaché : celui qui contient le 20 de clôture. */
  month: number;
  year: number;
}

export function currentCycle(today: Date = new Date()): CommissionCycle {
  const day = today.getDate();
  const month = today.getMonth(); // 0-11

  if (day < 20) {
    return {
      start: new Date(today.getFullYear(), month - 1, 21),
      end: new Date(today.getFullYear(), month, 20, 23, 59, 59),
      month: month + 1,
      year: today.getFullYear(),
    };
  }

  const end = new Date(today.getFullYear(), month + 1, 20, 23, 59, 59);
  return {
    start: new Date(today.getFullYear(), month, 21),
    end,
    month: end.getMonth() + 1,
    year: end.getFullYear(),
  };
}

/** Période couverte par le cycle d'un mois donné : du 21 du mois précédent au 20 du mois. */
export function cycleForMonth(year: number, month: number): CommissionCycle {
  return {
    start: new Date(year, month - 2, 21),
    end: new Date(year, month - 1, 20, 23, 59, 59),
    month,
    year,
  };
}

const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

export function formatCycle(cycle: CommissionCycle): string {
  return `du ${DAY_MONTH.format(cycle.start)} au ${DAY_MONTH.format(cycle.end)}`;
}

/** Nombre de jours restants avant la clôture du cycle (jour de clôture inclus). */
export function daysUntilCycleEnd(cycle: CommissionCycle, today: Date = new Date()): number {
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endDay = new Date(cycle.end.getFullYear(), cycle.end.getMonth(), cycle.end.getDate());
  return Math.max(0, Math.round((endDay.getTime() - startOfToday.getTime()) / 86_400_000));
}

/** Format attendu par /gnu_doctor/<id>/research/<start>/<end> : "%Y-%m-%d %H:%M:%S.%f". */
export function toApiDateTime(date: Date, endOfDay = false): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = endOfDay ? '23:59:59.999999' : '00:00:00.000000';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time}`;
}

/** 'YYYY-MM-DD' (valeur d'un <input type="date">) → Date locale. */
export function fromDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
