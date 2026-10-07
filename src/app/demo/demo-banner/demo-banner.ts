import { Component, inject, signal } from '@angular/core';
import { DemoSession } from '../demo-session';
import { DEMO_SPACES, DemoSpace } from '../demo-token';

const SPACE_LABELS: Record<DemoSpace, string> = {
  patient: 'Patient',
  doctor: 'Médecin',
  admin: 'Administrateur d’établissement',
};

/**
 * Rappelle en permanence que l'utilisateur navigue sur des données fictives. Permet de passer
 * d'un profil à l'autre (les données sont partagées), de remettre la démo à zéro et d'en sortir.
 */
@Component({
  selector: 'app-demo-banner',
  template: `
    @if (demoSession.space(); as current) {
      <aside class="demo-banner" aria-label="Mode démonstration : données fictives" [attr.aria-busy]="busy()">
        <span class="demo-banner__badge">DÉMO</span>
        <label class="demo-banner__label" for="demo-profile">Profil</label>
        <select id="demo-profile" class="demo-banner__select" [disabled]="busy()" (change)="switchTo($event)">
          @for (space of spaces; track space) {
            <option [value]="space" [selected]="space === current">{{ labels[space] }}</option>
          }
        </select>
        <button type="button" class="demo-banner__ghost" [disabled]="busy()" (click)="reset()">Réinitialiser</button>
        <button type="button" class="demo-banner__quit" [disabled]="busy()" (click)="stop()">Quitter la démo</button>
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
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
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
      background: var(--rohafya-green-400);
      color: #1e293b;
      font-weight: 800;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    .demo-banner__label {
      font-weight: 600;
    }

    .demo-banner__select {
      max-width: 100%;
      padding: 0.3rem 0.5rem;
      border: none;
      border-radius: 999px;
      background: #ffffff;
      color: #1e293b;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    .demo-banner__ghost,
    .demo-banner__quit {
      border-radius: 999px;
      padding: 0.35rem 0.8rem;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    .demo-banner__ghost {
      border: 1px solid rgba(255, 255, 255, 0.6);
      background: transparent;
      color: #ffffff;
    }

    .demo-banner__ghost:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.12);
    }

    .demo-banner__quit {
      border: none;
      background: #ffffff;
      color: #1e293b;
    }

    .demo-banner__quit:hover:not(:disabled) {
      background: #e2e8f0;
    }

    .demo-banner button:disabled,
    .demo-banner__select:disabled {
      cursor: progress;
      opacity: 0.7;
    }

    .demo-banner__select:focus-visible,
    .demo-banner__ghost:focus-visible,
    .demo-banner__quit:focus-visible {
      outline: 2px solid var(--rohafya-green-400);
      outline-offset: 2px;
    }

    @media (max-width: 640px) {
      .demo-banner {
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        bottom: 0.75rem;
        border-radius: 16px;
      }
    }
  `,
})
export class DemoBanner {
  protected readonly demoSession = inject(DemoSession);
  protected readonly spaces = DEMO_SPACES;
  protected readonly labels = SPACE_LABELS;
  protected readonly busy = signal(false);

  protected async switchTo(event: Event): Promise<void> {
    const space = (event.target as HTMLSelectElement).value as DemoSpace;
    await this.run(() => this.demoSession.switchTo(space));
  }

  protected async reset(): Promise<void> {
    if (!window.confirm('Effacer toutes les actions faites pendant la démo et revenir aux données d’origine ?')) return;
    await this.run(() => this.demoSession.resetData());
  }

  protected async stop(): Promise<void> {
    await this.run(() => this.demoSession.stop());
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } finally {
      this.busy.set(false);
    }
  }
}
