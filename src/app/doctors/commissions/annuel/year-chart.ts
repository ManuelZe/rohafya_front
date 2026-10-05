import { Component, computed, input, signal } from '@angular/core';
import { MONTH_LABELS, MONTH_SHORT_LABELS } from '../../shared/commission-cycle';
import { PointsPipe, formatPoints } from '../../shared/points';
import { YearMonthPoint } from '../commissions.models';

interface Column {
  month: number;
  short: string;
  label: string;
  prescription: number;
  realisation: number;
  total: number;
  totalPct: number;
  barPrescription: number;
  barRealisation: number;
  ariaLabel: string;
}

const pos = (n: number) => Math.max(0, n);

/** Arrondit le maximum de l'axe à une valeur « propre » (1, 2, 2.5, 5 × 10^n). */
function niceMax(value: number): number {
  if (value <= 0) return 1000;
  const exponent = Math.pow(10, Math.floor(Math.log10(value)));
  const fraction = value / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
}

/**
 * Colonnes empilées prescriptions / réalisations par mois.
 * Colonnes ≤ 24px, extrémité arrondie 4px, 2px d'espace entre segments, axe unique,
 * info-bulle au survol ET au focus clavier, un seul libellé direct (meilleur mois).
 */
@Component({
  selector: 'app-year-chart',
  imports: [PointsPipe],
  template: `
    <ul class="legend" aria-label="Légende">
      <li><span class="key key-p" aria-hidden="true"></span>Prescriptions</li>
      <li><span class="key key-r" aria-hidden="true"></span>Réalisations</li>
    </ul>

    <div class="chart">
      <div class="y-axis" aria-hidden="true">
        @for (tick of ticks(); track tick.value) {
          <span class="y-tick" [style.bottom.%]="tick.pct">{{ tick.label }}</span>
        }
      </div>

      <div class="plot">
        @for (tick of ticks(); track tick.value) {
          <span class="grid-line" [style.bottom.%]="tick.pct" aria-hidden="true"></span>
        }

        <div class="columns" [style.grid-template-columns]="'repeat(' + columns().length + ', minmax(0, 1fr))'">
          @for (col of columns(); track col.month; let i = $index) {
            <div
              class="col"
              tabindex="0"
              role="img"
              [attr.aria-label]="col.ariaLabel"
              [class.col-active]="active() === i"
              (pointerenter)="active.set(i)"
              (pointerleave)="active.set(null)"
              (focus)="active.set(i)"
              (blur)="active.set(null)"
            >
              <div class="stack">
                @if (col.totalPct > 0) {
                  <div class="bars" [style.height.%]="col.totalPct">
                    @if (col.month === bestMonth()) {
                      <span class="cap-label" aria-hidden="true">{{ col.total | points: false }}</span>
                    }
                    @if (col.barRealisation > 0) {
                      <span class="seg seg-r seg-top" [style.flex-grow]="col.barRealisation"></span>
                    }
                    @if (col.barPrescription > 0) {
                      <span class="seg seg-p" [class.seg-top]="col.barRealisation === 0" [style.flex-grow]="col.barPrescription"></span>
                    }
                  </div>
                }
              </div>

              @if (active() === i) {
                <div class="tooltip" [class.tooltip-left]="i > columns().length / 2" role="presentation">
                  <strong class="tt-value">{{ col.total | points }}</strong>
                  <span class="tt-title">{{ col.label }}</span>
                  <span class="tt-row"><span class="tt-key key-p"></span>{{ col.prescription | points }} · Prescriptions</span>
                  <span class="tt-row"><span class="tt-key key-r"></span>{{ col.realisation | points }} · Réalisations</span>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <div class="x-axis" aria-hidden="true" [style.grid-template-columns]="'repeat(' + columns().length + ', minmax(0, 1fr))'">
        @for (col of columns(); track col.month) {
          <span>{{ col.short }}</span>
        }
      </div>
    </div>
  `,
  styleUrl: './year-chart.css',
})
export class YearChart {
  readonly months = input.required<YearMonthPoint[]>();

  readonly active = signal<number | null>(null);

  /** Les avoirs peuvent rendre un montant négatif : la géométrie ne dessine que les parts positives,
   *  l'info-bulle et le tableau gardent les montants réels. */
  readonly axisMax = computed(() => niceMax(Math.max(0, ...this.months().map((m) => pos(m.prescription) + pos(m.realisation)))));

  readonly ticks = computed(() => {
    const max = this.axisMax();
    return [0, 0.25, 0.5, 0.75, 1].map((f) => ({ value: max * f, pct: f * 100, label: formatPoints(max * f, false) }));
  });

  readonly bestMonth = computed(() => {
    const best = [...this.months()].sort((a, b) => b.prescription + b.realisation - (a.prescription + a.realisation))[0];
    return best?.month ?? null;
  });

  readonly columns = computed<Column[]>(() => {
    const max = this.axisMax();
    return this.months().map((m) => {
      const total = m.prescription + m.realisation;
      return {
        month: m.month,
        short: MONTH_SHORT_LABELS[m.month - 1],
        label: MONTH_LABELS[m.month - 1],
        prescription: m.prescription,
        realisation: m.realisation,
        barPrescription: pos(m.prescription),
        barRealisation: pos(m.realisation),
        total,
        totalPct: ((pos(m.prescription) + pos(m.realisation)) / max) * 100,
        ariaLabel: `${MONTH_LABELS[m.month - 1]} : ${formatPoints(total)}, dont ${formatPoints(m.prescription)} de prescriptions et ${formatPoints(m.realisation)} de réalisations`,
      };
    });
  });
}
