import { Component, computed, input } from '@angular/core';
import { EdenMark } from '../eden-mark/eden-mark';

/** Indicateur de chargement EDEN : emblème animé, anneau en orbite et message. */
@Component({
  selector: 'app-eden-loader',
  imports: [EdenMark],
  template: `
    <div class="loader" [class]="'loader-' + size()" role="status" aria-live="polite">
      <div class="visual eden-animated">
        <svg class="orbit" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <circle class="track" cx="50" cy="50" r="44" />
          <circle class="arc" cx="50" cy="50" r="44" />
          <circle class="dot" cx="50" cy="6" r="3.5" />
        </svg>
        <app-eden-mark [size]="markSize()" />
      </div>
      @if (label()) {
        <p class="label">
          {{ label() }}<span class="dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
        </p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.85rem;
      padding: 1.5rem 1rem;
      text-align: center;
    }
    .visual {
      position: relative;
      display: grid;
      place-items: center;
    }
    .loader-sm .visual {
      width: 44px;
      height: 44px;
    }
    .loader-md .visual {
      width: 76px;
      height: 76px;
    }
    .loader-lg .visual {
      width: 112px;
      height: 112px;
    }
    .orbit {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      animation: loader-spin 1.8s linear infinite;
    }
    .track {
      fill: none;
      stroke: rgba(26, 84, 201, 0.12);
      stroke-width: 3;
    }
    .arc {
      fill: none;
      stroke: #1a54c9;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-dasharray: 70 207;
    }
    .dot {
      fill: #0d9488;
    }
    .label {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: #545d6b;
    }
    .loader-sm {
      flex-direction: row;
      padding: 0.5rem;
    }
    .loader-sm .label {
      font-size: 0.82rem;
    }
    .dots span {
      animation: loader-dot 1.2s infinite;
      opacity: 0;
    }
    .dots span:nth-child(2) {
      animation-delay: 0.2s;
    }
    .dots span:nth-child(3) {
      animation-delay: 0.4s;
    }
    @keyframes loader-spin {
      to {
        transform: rotate(360deg);
      }
    }
    @keyframes loader-dot {
      30%,
      60% {
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .orbit,
      .dots span {
        animation: none;
        opacity: 1;
      }
    }
  `,
})
export class EdenLoader {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly label = input<string>('Chargement');

  protected readonly markSize = computed(() => ({ sm: 26, md: 44, lg: 64 })[this.size()]);
}
