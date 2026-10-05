import { Component, input } from '@angular/core';

/**
 * Emblème ROHAFYA : croix verte traversée d'un tracé de pouls qui se dessine.
 * `animated` = false pour une version statique.
 */
@Component({
  selector: 'app-rohafya-mark',
  template: `
    <svg
      class="mark"
      [class.rohafya-animated]="animated()"
      [class.is-animated]="animated()"
      viewBox="0 0 48 48"
      [attr.width]="size()"
      [attr.height]="size()"
      aria-hidden="true"
      focusable="false"
    >
      <path class="cross" d="M16 3h16v13h13v16H32v13H16V32H3V16h13z" fill="#10b981" />
      <path
        class="pulse"
        d="M5 24h10l3-6 5 12 4-11 3 5h13"
        fill="none"
        stroke="#ffffff"
        stroke-width="2.5"
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
    .is-animated .pulse {
      animation: rohafya-draw 1.6s ease-in-out infinite;
    }
    .is-animated .cross {
      transform-origin: 24px 24px;
      animation: rohafya-breathe 2.4s ease-in-out infinite;
    }
    @keyframes rohafya-draw {
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
    @keyframes rohafya-breathe {
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
export class RohafyaMark {
  readonly size = input(40);
  readonly animated = input(true);
}
