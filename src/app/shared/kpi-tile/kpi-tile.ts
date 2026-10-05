import { Component, input } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

/** Tuile indicateur : libellé · valeur · précision. La couleur ne sert qu'à l'icône, jamais au texte. */
@Component({
  selector: 'app-kpi-tile',
  imports: [PIcon],
  template: `
    <article class="kpi" [style.--kpi-accent]="accent()" [attr.aria-busy]="loading()">
      <div class="kpi-top">
        <span class="kpi-icon" aria-hidden="true"><svg [pIcon]="icon()" [size]="18"></svg></span>
        <h3 class="kpi-label">{{ label() }}</h3>
      </div>
      @if (loading()) {
        <span class="kpi-skeleton" aria-hidden="true"></span>
        <span class="sr-only">Chargement…</span>
      } @else if (error()) {
        <p class="kpi-value kpi-value-na">—</p>
        <p class="kpi-hint">Indisponible</p>
      } @else {
        <p class="kpi-value">{{ value() }}</p>
        @if (hint()) {
          <p class="kpi-hint">{{ hint() }}</p>
        }
      }
    </article>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .kpi {
      height: 100%;
      background: #fff;
      border-radius: 12px;
      border-left: 4px solid var(--kpi-accent, #1a54c9);
      padding: 1.1rem 1.25rem;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .kpi-top {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      min-width: 0;
    }
    .kpi-icon {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      flex-shrink: 0;
      color: var(--kpi-accent, #1a54c9);
      background: color-mix(in srgb, var(--kpi-accent, #1a54c9) 13%, white);
    }
    .kpi-label {
      margin: 0;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      color: #545d6b;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .kpi-value {
      margin: 0;
      font-size: 1.65rem;
      font-weight: 800;
      line-height: 1.1;
      color: #1f2937;
      overflow-wrap: anywhere;
    }
    .kpi-value-na {
      color: #8a94a3;
    }
    .kpi-hint {
      margin: 0;
      font-size: 0.8rem;
      color: #545d6b;
    }
    .kpi-skeleton {
      display: block;
      height: 1.9rem;
      width: 70%;
      border-radius: 6px;
      background: linear-gradient(90deg, #eef1f6 25%, #f7f8fb 50%, #eef1f6 75%);
      background-size: 200% 100%;
      animation: kpi-shimmer 1.4s ease-in-out infinite;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    @keyframes kpi-shimmer {
      to {
        background-position: -200% 0;
      }
    }
    @media (max-width: 640px) {
      .kpi {
        padding: 0.85rem;
      }
      .kpi-value {
        font-size: 1.3rem;
      }
      .kpi-label {
        font-size: 0.7rem;
        white-space: normal;
      }
    }
  `,
})
export class KpiTile {
  readonly label = input.required<string>();
  readonly value = input<string>('');
  readonly hint = input<string>();
  readonly icon = input.required<string>();
  readonly accent = input<string>('#1a54c9');
  readonly loading = input(false);
  readonly error = input(false);
}
