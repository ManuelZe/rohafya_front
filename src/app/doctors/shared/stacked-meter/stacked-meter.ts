import { Component, computed, input } from '@angular/core';
import { PointsPipe } from '../points';

/**
 * Répartition prescriptions / réalisations sur une barre empilée.
 * Deux séries → légende toujours présente, valeurs en texte (jamais la couleur seule).
 */
@Component({
  selector: 'app-stacked-meter',
  imports: [PointsPipe],
  template: `
    <div class="meter" role="img" [attr.aria-label]="ariaLabel()">
      @if (total() > 0) {
        @if (prescriptionPct() > 0) {
          <span class="seg seg-prescription" [style.flex-grow]="prescriptionPct()"></span>
        }
        @if (realisationPct() > 0) {
          <span class="seg seg-realisation" [style.flex-grow]="realisationPct()"></span>
        }
      }
    </div>
    <ul class="legend">
      <li>
        <span class="key key-prescription" aria-hidden="true"></span>
        <span class="legend-label">Prescriptions</span>
        <strong>{{ prescription() | points }}</strong>
        @if (showPct()) {
          <span class="legend-pct">{{ prescriptionPct() }} %</span>
        }
      </li>
      <li>
        <span class="key key-realisation" aria-hidden="true"></span>
        <span class="legend-label">Réalisations</span>
        <strong>{{ realisation() | points }}</strong>
        @if (showPct()) {
          <span class="legend-pct">{{ realisationPct() }} %</span>
        }
      </li>
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }
    .meter {
      display: flex;
      gap: 2px;
      height: 10px;
      border-radius: 999px;
      overflow: hidden;
      background: var(--meter-track, #e6ebf3);
    }
    .seg {
      flex-basis: 0;
      min-width: 4px;
    }
    .seg-prescription {
      background: #2a78d6;
    }
    .seg-realisation {
      background: #eb6834;
    }
    .legend {
      list-style: none;
      margin: 0.75rem 0 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem;
      font-size: 0.85rem;
      color: var(--meter-text, #1f2937);
    }
    .legend li {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .key {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      box-shadow: 0 0 0 2px var(--meter-ring, #fff);
    }
    .key-prescription {
      background: #2a78d6;
    }
    .key-realisation {
      background: #eb6834;
    }
    .legend-label {
      color: var(--meter-muted, #545d6b);
    }
    .legend-pct {
      color: var(--meter-muted, #545d6b);
      font-size: 0.78rem;
    }
  `,
})
export class StackedMeter {
  readonly prescription = input(0);
  readonly realisation = input(0);

  /** Un montant peut être négatif (avoir / annulation) : la barre ne représente que les parts positives. */
  private readonly positivePrescription = computed(() => Math.max(0, this.prescription()));
  private readonly positiveRealisation = computed(() => Math.max(0, this.realisation()));

  readonly total = computed(() => this.positivePrescription() + this.positiveRealisation());
  readonly prescriptionPct = computed(() => (this.total() > 0 ? Math.round((this.positivePrescription() / this.total()) * 100) : 0));
  readonly realisationPct = computed(() => (this.total() > 0 ? 100 - this.prescriptionPct() : 0));

  /** Les pourcentages n'ont de sens que si aucun des deux montants n'est négatif. */
  readonly showPct = computed(() => this.total() > 0 && this.prescription() >= 0 && this.realisation() >= 0);

  readonly ariaLabel = computed(
    () => `Répartition : prescriptions ${this.prescriptionPct()} %, réalisations ${this.realisationPct()} %`
  );
}
