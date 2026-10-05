import { Component, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { ProgressBarModule } from 'primeng/progressbar';
import { EdenMark } from '../eden-mark/eden-mark';

/** En dessous de ce délai, la navigation est jugée instantanée : aucun indicateur (évite le clignotement). */
const SHOW_DELAY_MS = 200;

/**
 * Indicateur de navigation global : barre de progression PrimeNG en haut de l'écran
 * et pastille EDEN animée pendant le chargement d'une page (modules différés, guards, profils…).
 */
@Component({
  selector: 'app-route-loader',
  imports: [ProgressBarModule, EdenMark],
  template: `
    @if (visible()) {
      <div class="route-loader" role="status" aria-live="polite">
        <p-progressbar mode="indeterminate" styleClass="route-bar" [style]="{ height: '3px' }" />
        <div class="pill">
          <app-eden-mark [size]="22" />
          <span>Chargement de la page…</span>
        </div>
      </div>
    }
  `,
  styles: `
    .route-loader {
      position: fixed;
      inset: 0 0 auto 0;
      z-index: 2000;
      pointer-events: none;
    }
    :host ::ng-deep .route-bar {
      border-radius: 0;
      background: rgba(26, 84, 201, 0.12);
    }
    .pill {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.85rem 0.45rem 0.5rem;
      border-radius: 999px;
      background: #ffffff;
      box-shadow: 0 6px 20px rgba(15, 23, 42, 0.15);
      font-size: 0.82rem;
      font-weight: 600;
      color: #1f2937;
      animation: pill-in 0.25s ease-out;
    }
    @keyframes pill-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
  `,
})
export class RouteLoader {
  protected readonly visible = signal(false);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const sub = inject(Router).events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => this.visible.set(true), SHOW_DELAY_MS);
      } else if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        if (timer) clearTimeout(timer);
        timer = null;
        this.visible.set(false);
      }
    });

    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      if (timer) clearTimeout(timer);
    });
  }
}
