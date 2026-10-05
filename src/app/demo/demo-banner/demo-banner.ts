import { Component, inject } from '@angular/core';
import { DemoSession } from '../demo-session';

/** Rappelle en permanence que l'utilisateur navigue sur des données fictives, avec une sortie directe. */
@Component({
  selector: 'app-demo-banner',
  template: `
    @if (demoSession.active()) {
      <aside class="demo-banner" aria-label="Mode démonstration">
        <span class="demo-banner__badge">DÉMO</span>
        <span class="demo-banner__text">Données fictives</span>
        <button type="button" class="demo-banner__quit" (click)="demoSession.stop()">Quitter la démo</button>
      </aside>
    }
  `,
  styles: `
    .demo-banner {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 1100;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      max-width: calc(100vw - 2rem);
      padding: 0.45rem 0.5rem 0.45rem 0.6rem;
      border-radius: 999px;
      background: #1e293b;
      color: #ffffff;
      font-size: 0.85rem;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.3);
    }

    .demo-banner__badge {
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: var(--color-accent);
      color: #1e293b;
      font-weight: 800;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    .demo-banner__quit {
      border: none;
      border-radius: 999px;
      padding: 0.35rem 0.8rem;
      background: #ffffff;
      color: #1e293b;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    .demo-banner__quit:hover {
      background: #e2e8f0;
    }

    .demo-banner__quit:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    @media (max-width: 480px) {
      .demo-banner {
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        bottom: 0.75rem;
      }
    }
  `,
})
export class DemoBanner {
  protected readonly demoSession = inject(DemoSession);
}
