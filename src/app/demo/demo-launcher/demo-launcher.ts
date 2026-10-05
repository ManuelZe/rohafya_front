import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DemoSession } from '../demo-session';
import { DemoSpace } from '../demo-token';

interface DemoChoice {
  space: DemoSpace;
  title: string;
  description: string;
}

const CHOICES: DemoChoice[] = [
  {
    space: 'patient',
    title: 'Espace patient',
    description: 'Résultats de laboratoire, imagerie et exploration, factures, prescriptions, partage avec un médecin, requêtes…',
  },
  // {
  //   space: 'doctor',
  //   title: 'Espace médecin',
  //   description: 'Tableau de bord des commissions (mois, année, période), relevé, résultats reçus des patients, actualités…',
  // },
];

/** Bouton « Démo » de la page d'introduction : choix de l'espace puis ouverture de la session fictive. */
@Component({
  selector: 'app-demo-launcher',
  imports: [ButtonModule],
  template: `
    <button pButton type="button" class="btn-demo" aria-haspopup="dialog" (click)="open()">Démo</button>

    <dialog #dialog class="demo-dialog" aria-labelledby="demo-dialog-title" aria-describedby="demo-dialog-desc" (close)="error.set(null)">
      <div class="demo-dialog__header">
        <h2 id="demo-dialog-title">Découvrir EDEN en démo</h2>
        <button type="button" class="demo-dialog__close" aria-label="Fermer" (click)="close()">&times;</button>
      </div>

      <p id="demo-dialog-desc" class="demo-dialog__intro">
        Explorez toutes les fonctionnalités avec un utilisateur fictif. Les données sont inventées : rien n'est lu ni enregistré sur
        nos serveurs.
      </p>

      <div class="demo-dialog__choices" [attr.aria-busy]="starting() !== null">
        @for (choice of choices; track choice.space) {
          <button type="button" class="demo-choice" [disabled]="starting() !== null" (click)="start(choice.space)">
            <span class="demo-choice__title">
              {{ choice.title }}
              @if (starting() === choice.space) {
                <span class="demo-choice__loading">Ouverture…</span>
              }
            </span>
            <span class="demo-choice__desc">{{ choice.description }}</span>
          </button>
        }
      </div>

      @if (error(); as message) {
        <p class="demo-dialog__error" role="alert">{{ message }}</p>
      }
    </dialog>
  `,
  styles: `
    .btn-demo.p-button {
      background: transparent;
      color: var(--color-primary);
      border: 1px solid var(--color-primary);
      font-weight: 600;
      border-radius: 8px;
      padding: 0.6rem 1.4rem;
    }

    .btn-demo.p-button:hover,
    .btn-demo.p-button:focus-visible {
      background: var(--color-primary-light);
      color: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
    }

    .demo-dialog {
      width: min(34rem, calc(100vw - 2rem));
      padding: 1.5rem;
      border: none;
      border-radius: 14px;
      color: var(--color-text);
      background: var(--color-surface);
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
    }

    .demo-dialog::backdrop {
      background: rgba(15, 23, 42, 0.5);
    }

    .demo-dialog__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    .demo-dialog__header h2 {
      margin: 0;
      font-size: 1.25rem;
      color: var(--color-text);
    }

    .demo-dialog__close {
      border: none;
      background: transparent;
      font-size: 1.6rem;
      line-height: 1;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 0.1rem 0.4rem;
      border-radius: 6px;
    }

    .demo-dialog__close:hover,
    .demo-dialog__close:focus-visible {
      color: var(--color-text);
      background: var(--color-primary-light);
    }

    .demo-dialog__intro {
      margin: 0.75rem 0 1.25rem;
      font-size: 0.95rem;
      line-height: 1.5;
      color: #4a5568;
    }

    .demo-dialog__choices {
      display: grid;
      gap: 0.75rem;
    }

    .demo-choice {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      width: 100%;
      padding: 1rem 1.1rem;
      text-align: left;
      font: inherit;
      color: inherit;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }

    .demo-choice:hover:not(:disabled),
    .demo-choice:focus-visible {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
    }

    .demo-choice:focus-visible,
    .demo-dialog__close:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .demo-choice:disabled {
      cursor: progress;
      opacity: 0.7;
    }

    .demo-choice__title {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      font-weight: 700;
      color: var(--color-primary);
    }

    .demo-choice__loading {
      font-weight: 500;
      font-size: 0.85rem;
      color: #4a5568;
    }

    .demo-choice__desc {
      font-size: 0.875rem;
      line-height: 1.45;
      color: #4a5568;
    }

    .demo-dialog__error {
      margin: 1rem 0 0;
      color: var(--color-danger);
      font-size: 0.9rem;
    }

    @media (max-width: 480px) {
      .btn-demo.p-button {
        padding: 0.45rem 0.95rem;
        font-size: 0.85rem;
      }
    }
  `,
})
export class DemoLauncher {
  private readonly demoSession = inject(DemoSession);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly choices = CHOICES;
  readonly starting = signal<DemoSpace | null>(null);
  readonly error = signal<string | null>(null);

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  async start(space: DemoSpace): Promise<void> {
    this.starting.set(space);
    this.error.set(null);
    try {
      await this.demoSession.start(space);
      this.close();
    } catch (err) {
      console.error(err);
      this.error.set('Impossible de lancer la démo. Réessayez.');
    } finally {
      this.starting.set(null);
    }
  }
}
