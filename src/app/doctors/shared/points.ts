import { Pipe, PipeTransform } from '@angular/core';

/**
 * Les commissions sont affichées en points : 1 F CFA = 1 pt.
 * Format « 25.000 pts » (séparateur de milliers « . », pas de décimales).
 */
const POINTS_FORMATTER = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function formatPoints(value: unknown, withUnit = true): string {
  const formatted = POINTS_FORMATTER.format(Math.round(toNumber(value)));
  return withUnit ? `${formatted} pts` : formatted;
}

/** Usage : {{ montant | points }} → « 25.000 pts » ; {{ montant | points: false }} → « 25.000 » */
@Pipe({ name: 'points' })
export class PointsPipe implements PipeTransform {
  transform(value: unknown, withUnit = true): string {
    return formatPoints(value, withUnit);
  }
}
