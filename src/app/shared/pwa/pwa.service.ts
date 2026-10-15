import { DOCUMENT, PLATFORM_ID, Service, computed, inject, isDevMode, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Évènement « beforeinstallprompt » (Chrome, Edge, Samsung Internet) : non typé par TypeScript. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Application installable : enregistre le service worker (production) et garde l'invitation
 * d'installation du navigateur pour la proposer au bon moment (bouton « Installer l'application »).
 * Sur iPhone et iPad, Safari n'a pas d'invitation : on affiche la marche à suivre.
 */
@Service()
export class PwaService {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private deferred: InstallPromptEvent | null = null;

  readonly canPrompt = signal(false);
  readonly installed = signal(false);
  readonly isIos = signal(false);
  /** Le bouton s'affiche : invitation disponible, ou iPhone/iPad dans Safari, et pas déjà installée. */
  readonly offerInstall = computed(() => !this.installed() && (this.canPrompt() || this.isIos()));

  init(): void {
    if (!this.browser) return;
    const view = this.document.defaultView!;
    const nav = view.navigator as Navigator & { standalone?: boolean };
    this.installed.set(view.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true);
    this.isIos.set(/iphone|ipad|ipod/i.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1));
    view.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferred = event as InstallPromptEvent;
      this.canPrompt.set(true);
    });
    view.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.canPrompt.set(false);
      this.deferred = null;
    });
    if (!isDevMode() && 'serviceWorker' in nav) {
      view.addEventListener('load', () => {
        nav.serviceWorker.register('/sw.js').catch((err: unknown) => console.error('Service worker non enregistré', err));
      });
    }
  }

  /** Ouvre l'invitation du navigateur. Renvoie vrai si l'utilisateur a accepté. */
  async install(): Promise<boolean> {
    const event = this.deferred;
    if (!event) return false;
    await event.prompt();
    const choice = await event.userChoice;
    this.deferred = null;
    this.canPrompt.set(false);
    if (choice.outcome === 'accepted') this.installed.set(true);
    return choice.outcome === 'accepted';
  }
}
