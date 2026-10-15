import { Component, computed, inject, input, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { I18n } from '../../../shared/i18n/i18n';
import { TranslatePipe } from '../../../shared/i18n/t.pipe';
import { UsagePoint, formatCount, periodDate } from '../../billing.models';

/**
 * Résultats publiés par mois (12 derniers mois) : barres d'une seule teinte, ligne de référence
 * au volume de la formule, infobulle au survol ou au focus de chaque mois, et tableau équivalent
 * pour les lecteurs d'écran.
 */
@Component({
  selector: 'app-usage-history',
  imports: [TranslatePipe],
  template: `
    <figure class="history">
      <div class="plot" aria-hidden="true">
        @if (quotaTop() !== null) {
          <div class="quota" [style.bottom.%]="quotaTop()">
            <span>{{ 'Formule : {0}' | t: [quotaText()] }}</span>
          </div>
        }
        @for (bar of bars(); track bar.period) {
          <div
            class="col"
            (mouseenter)="active.set(bar.period)"
            (mouseleave)="active.set(null)"
          >
            <span class="bar" [class.is-current]="$last" [style.height.%]="bar.height"></span>
            @if (active() === bar.period) {
              <span class="tip">{{ bar.label }} · {{ '{0} résultats' | t: [bar.countText] }}</span>
            }
            <span class="month">{{ bar.short }}</span>
          </div>
        }
      </div>
      <figcaption class="sr-only">{{ 'Résultats publiés par mois, sur les douze derniers mois.' | t }}</figcaption>
      <table class="sr-only">
        <caption>{{ 'Résultats publiés par mois' | t }}</caption>
        <thead>
          <tr><th scope="col">{{ 'Mois' | t }}</th><th scope="col">{{ 'Résultats publiés' | t }}</th></tr>
        </thead>
        <tbody>
          @for (bar of bars(); track bar.period) {
            <tr><th scope="row">{{ bar.label }}</th><td>{{ bar.count }}</td></tr>
          }
        </tbody>
      </table>
    </figure>
  `,
  styles: `
    .history {
      margin: 0;
    }
    .plot {
      position: relative;
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 2px;
      align-items: end;
      height: 160px;
      margin-bottom: 1.4rem;
      border-bottom: 1px solid #d1d5db;
    }
    .col {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      height: 100%;
    }
    .bar {
      width: min(70%, 28px);
      min-height: 2px;
      border-radius: 4px 4px 0 0;
      background: #7c9db1;
    }
    .bar.is-current {
      background: var(--rohafya-navy, #0c4562);
    }
    .month {
      position: absolute;
      bottom: -1.3rem;
      font-size: 0.7rem;
      color: #4b5563;
      white-space: nowrap;
    }
    .quota {
      position: absolute;
      left: 0;
      right: 0;
      border-top: 1px dashed #6b7280;
      pointer-events: none;
    }
    .quota span {
      position: absolute;
      right: 0;
      top: -1.1rem;
      font-size: 0.7rem;
      color: #374151;
      background: #ffffff;
      padding: 0 0.25rem;
    }
    .tip {
      position: absolute;
      bottom: calc(100% + 4px);
      z-index: 2;
      padding: 0.3rem 0.5rem;
      border-radius: 6px;
      background: #111827;
      color: #ffffff;
      font-size: 0.75rem;
      white-space: nowrap;
    }
    @media (max-width: 520px) {
      .month {
        font-size: 0.6rem;
      }
      .col:nth-child(odd of .col) .month {
        visibility: hidden;
      }
    }
  `,
})
export class UsageHistory {
  private readonly i18n = inject(I18n);

  readonly history = input.required<UsagePoint[]>();
  readonly quota = input<number | null>(null);
  readonly active = signal<string | null>(null);

  /** Échelle : le plus grand mois ou le volume de la formule (la ligne reste visible). */
  private readonly max = computed(() => Math.max(1, this.quota() ?? 0, ...this.history().map((p) => p.count)) * 1.1);
  readonly quotaText = computed(() => formatCount(this.quota(), this.i18n.locale()));
  readonly quotaTop = computed(() => (this.quota() ? (this.quota()! / this.max()) * 100 : null));
  readonly bars = computed(() => {
    const locale = this.i18n.locale();
    return this.history().map((point) => ({
      ...point,
      height: (point.count / this.max()) * 100,
      countText: formatCount(point.count, locale),
      label: formatDate(periodDate(point.period), 'MMMM yyyy', locale),
      short: formatDate(periodDate(point.period), 'MMM', locale),
    }));
  });
}
