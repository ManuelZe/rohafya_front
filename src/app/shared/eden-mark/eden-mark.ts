import { Component, input } from '@angular/core';

let nextId = 0;

/**
 * Emblème EDEN : pastille en dégradé bleu → teal, tracé de pouls qui se dessine
 * et feuille (le « jardin » d'Eden) qui oscille. `animated` = false pour une version statique.
 */
@Component({
  selector: 'app-eden-mark',
  template: `
    <svg
      class="mark"
      [class.eden-animated]="animated()"
      [class.is-animated]="animated()"
      viewBox="0 0 48 48"
      [attr.width]="size()"
      [attr.height]="size()"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1a54c9" />
          <stop offset="100%" stop-color="#0d9488" />
        </linearGradient>
      </defs>
      <circle class="halo" cx="24" cy="24" r="22" [attr.fill]="'url(#' + gradientId + ')'" />
      <path class="leaf" d="M33 9c6 0 8 3 8 3s-1 7-8 7c-3 0-4-2-4-2s1-8 4-8z" fill="#f5a414" />
      <path
        class="pulse"
        d="M8 27h8l3-7 5 14 4-11 3 4h9"
        fill="none"
        stroke="#ffffff"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
    .pulse {
      stroke-dasharray: 60;
      stroke-dashoffset: 0;
    }
    .leaf {
      transform-origin: 33px 17px;
    }
    .is-animated .pulse {
      animation: eden-draw 1.6s ease-in-out infinite;
    }
    .is-animated .leaf {
      animation: eden-sway 2.4s ease-in-out infinite;
    }
    .is-animated .halo {
      transform-origin: 24px 24px;
      animation: eden-breathe 2.4s ease-in-out infinite;
    }
    @keyframes eden-draw {
      0% {
        stroke-dashoffset: 60;
      }
      55%,
      75% {
        stroke-dashoffset: 0;
      }
      100% {
        stroke-dashoffset: -60;
      }
    }
    @keyframes eden-sway {
      0%,
      100% {
        transform: rotate(0deg);
      }
      50% {
        transform: rotate(-12deg);
      }
    }
    @keyframes eden-breathe {
      0%,
      100% {
        transform: scale(1);
      }
      50% {
        transform: scale(0.94);
      }
    }
  `,
})
export class EdenMark {
  readonly size = input(40);
  readonly animated = input(true);

  /** Identifiant unique : plusieurs emblèmes peuvent coexister dans la page. */
  protected readonly gradientId = `eden-grad-${nextId++}`;
}
