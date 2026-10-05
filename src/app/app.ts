import { Component, DOCUMENT, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationCancel, NavigationEnd, NavigationError, Router, RouterOutlet } from '@angular/router';
import { filter, take } from 'rxjs';
import { RouteLoader } from './shared/route-loader/route-loader';
import { DemoBanner } from './demo/demo-banner/demo-banner';

/** Durée minimale d'affichage de l'écran de démarrage EDEN, pour que l'animation soit perçue sans ralentir l'accès. */
const SPLASH_MIN_MS = 900;
const SPLASH_FADE_MS = 450;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouteLoader, DemoBanner],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('eden_app');

  private readonly document = inject(DOCUMENT);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    // L'écran de démarrage (#eden-splash, défini dans index.html) disparaît dès que la première page est prête.
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
        take(1)
      )
      .subscribe(() => this.hideSplash());
  }

  private hideSplash(): void {
    const splash = this.document.getElementById('eden-splash');
    if (!splash) return;

    const wait = Math.max(0, SPLASH_MIN_MS - performance.now());
    setTimeout(() => {
      splash.classList.add('eden-splash--hide');
      setTimeout(() => splash.remove(), SPLASH_FADE_MS);
    }, wait);
  }
}
