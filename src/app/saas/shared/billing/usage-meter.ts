import { Component, computed, inject, input } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';
import { I18n } from '../../../shared/i18n/i18n';
import { TranslatePipe } from '../../../shared/i18n/t.pipe';
import { formatCount } from '../../billing.models';

/**
 * Volume publié dans le mois par rapport à la formule : barre de progression accessible,
 * avec un libellé d'état (jamais la couleur seule). Au-delà de 100 %, la barre reste pleine.
 */
@Component({
  selector: 'app-usage-meter',
  imports: [TranslatePipe, PIcon],
  template: `
    <div class="meter" [class]="'meter meter-' + level()">
      <div class="meter-head">
        <span class="meter-value">
          @if (quota(); as q) {
            {{ '{0} / {1} résultats' | t: [n(count()), n(q)] }}
          } @else {
            {{ '{0} résultats' | t: [n(count())] }}
          }
        </span>
        @if (percent() !== null) {
          <span class="meter-state">
            <svg [pIcon]="level() === 'ok' ? 'check-circle' : 'exclamation-triangle'" [size]="14" aria-hidden="true"></svg>
            {{ stateLabel() | t: [percent()] }}
          </span>
        }
      </div>
      @if (quota()) {
        <div
          class="meter-track"
          role="progressbar"
          [attr.aria-label]="label() | t"
          aria-valuemin="0"
          [attr.aria-valuemax]="quota()"
          [attr.aria-valuenow]="count()"
          [attr.aria-valuetext]="'{0} sur {1} ({2} %)' | t: [n(count()), n(quota()), percent()]"
        >
          <span class="meter-fill" [style.width.%]="fill()"></span>
        </div>
      }
    </div>
  `,
  styles: `
    .meter-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.25rem 1rem;
      margin-bottom: 0.4rem;
    }
    .meter-value {
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--rohafya-navy, #0c4562);
    }
    .meter-state {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.82rem;
      font-weight: 600;
    }
    .meter-ok .meter-state {
      color: #047857;
    }
    .meter-warn .meter-state,
    .meter-over .meter-state {
      color: #8a5a00;
    }
    .meter-track {
      height: 0.6rem;
      border-radius: 999px;
      background: #e5e7eb;
      overflow: hidden;
    }
    .meter-fill {
      display: block;
      height: 100%;
      border-radius: 999px;
      background: #047857;
      transition: width 0.4s ease;
    }
    .meter-warn .meter-fill,
    .meter-over .meter-fill {
      background: #b45309;
    }
    @media (prefers-reduced-motion: reduce) {
      .meter-fill {
        transition: none;
      }
    }
  `,
})
export class UsageMeter {
  private readonly i18n = inject(I18n);

  n(value: number | null): string {
    return formatCount(value, this.i18n.locale());
  }

  readonly count = input.required<number>();
  readonly quota = input<number | null>(null);
  readonly percent = input<number | null>(null);
  readonly label = input('Volume publié ce mois-ci');

  readonly level = computed(() => {
    const p = this.percent() ?? 0;
    return p >= 100 ? 'over' : p >= 80 ? 'warn' : 'ok';
  });
  readonly stateLabel = computed(() =>
    this.level() === 'over' ? '{0} % : au-delà de la formule' : this.level() === 'warn' ? '{0} % : proche du volume de la formule' : '{0} % de la formule'
  );
  readonly fill = computed(() => Math.min(100, this.percent() ?? 0));
}
