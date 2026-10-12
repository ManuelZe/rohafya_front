import { Component, ElementRef, Injector, afterNextRender, computed, inject, input, viewChild } from '@angular/core';
import { ListWindow } from './list-window';

/**
 * Pied de liste : « 10 sur 48 affichés », « Afficher 10 de plus », « Tout afficher ».
 * Quand tout est affiché, le focus passe sur le compteur (le bouton disparaît).
 */
@Component({
  selector: 'app-show-more',
  template: `
    @if (list().total() > list().pageSize) {
      <div class="show-more">
        <p #status class="show-more-status" tabindex="-1" aria-live="polite">
          {{ list().shown() }} sur {{ list().total() }} {{ noun() }} affiché{{ list().shown() > 1 ? 's' : '' }}
        </p>
        @if (list().remaining() > 0) {
          <div class="show-more-actions">
            <button type="button" class="show-more-btn" (click)="more()">Afficher {{ nextCount() }} de plus</button>
            @if (list().remaining() > list().pageSize) {
              <button type="button" class="show-more-link" (click)="all()">Tout afficher</button>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .show-more {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
      margin: 1rem 0 0.5rem;
    }
    .show-more-status {
      margin: 0;
      font-size: 0.85rem;
      color: #4b5563;
    }
    .show-more-status:focus-visible {
      outline: 3px solid #059669;
      outline-offset: 2px;
    }
    .show-more-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
    }
    .show-more-btn,
    .show-more-link {
      min-height: 44px;
      padding: 0.55rem 1.1rem;
      border-radius: 0.6rem;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .show-more-btn {
      flex: 0 1 18rem;
      border: 1px solid var(--color-primary, #047857);
      background: #ffffff;
      color: var(--color-primary, #047857);
    }
    .show-more-btn:hover {
      background: var(--color-primary-light, #ecfdf5);
    }
    .show-more-link {
      border: none;
      background: transparent;
      color: #374151;
      text-decoration: underline;
    }
    .show-more-btn:focus-visible,
    .show-more-link:focus-visible {
      outline: 3px solid #059669;
      outline-offset: 2px;
    }
  `,
})
export class ShowMore<T> {
  readonly list = input.required<ListWindow<T>>();
  /** Nom des éléments, au pluriel (« résultats », « requêtes »…). */
  readonly noun = input('éléments');

  private readonly injector = inject(Injector);
  private readonly status = viewChild<ElementRef<HTMLElement>>('status');
  protected readonly nextCount = computed(() => Math.min(this.list().pageSize, this.list().remaining()));

  more(): void {
    this.list().showMore();
    this.focusStatusIfDone();
  }

  all(): void {
    this.list().showAll();
    this.focusStatusIfDone();
  }

  private focusStatusIfDone(): void {
    if (this.list().remaining() > 0) return;
    afterNextRender(() => this.status()?.nativeElement.focus(), { injector: this.injector });
  }
}
