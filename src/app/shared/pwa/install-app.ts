import { Component, inject, input, signal } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { PIcon } from '@primeicons/angular/p-icon';
import { TranslatePipe } from '../i18n/t.pipe';
import { PwaService } from './pwa.service';

/** Bouton « Installer l'application » : invitation du navigateur, ou marche à suivre sur iPhone. */
@Component({
  selector: 'app-install-app',
  imports: [TranslatePipe, PIcon, CdkTrapFocus],
  template: `
    @if (pwa.offerInstall()) {
      <button type="button" [class]="'install-btn install-' + tone()" (click)="install()" aria-haspopup="dialog">
        <svg [pIcon]="'mobile'" [size]="16" aria-hidden="true"></svg>
        <span>{{ 'Installer l’application' | t }}</span>
      </button>
    }
    @if (iosHelp()) {
      <div class="install-overlay" (click)="iosHelp.set(false)">
        <div class="install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title" cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (click)="$event.stopPropagation()">
          <h2 id="install-title">{{ 'Installer ROHAFYA sur votre iPhone' | t }}</h2>
          <ol>
            <li>{{ 'Ouvrez ROHAFYA dans Safari.' | t }}</li>
            <li>{{ 'Touchez le bouton Partager (le carré avec une flèche vers le haut).' | t }}</li>
            <li>{{ 'Choisissez « Sur l’écran d’accueil », puis « Ajouter ».' | t }}</li>
          </ol>
          <p>{{ 'ROHAFYA s’ouvre alors comme une application, sans passer par un store. Vos résultats restent sur nos serveurs : rien de médical n’est enregistré sur le téléphone.' | t }}</p>
          <button type="button" class="install-close" (click)="iosHelp.set(false)">{{ 'J’ai compris' | t }}</button>
        </div>
      </div>
    }
  `,
  styles: `
    .install-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      min-height: 2.25rem;
      padding: 0.35rem 0.8rem;
      border-radius: 999px;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
    .install-dark {
      border: 1px solid rgba(255, 255, 255, 0.45);
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }
    .install-light {
      border: 1px solid var(--rohafya-green-700, #047857);
      background: #ffffff;
      color: var(--rohafya-green-700, #047857);
    }
    .install-btn:focus-visible,
    .install-close:focus-visible {
      outline: 3px solid var(--rohafya-green-400, #34d399);
      outline-offset: 2px;
    }
    .install-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 1rem;
      background: rgba(17, 24, 39, 0.55);
    }
    .install-dialog {
      width: 100%;
      max-width: 26rem;
      padding: 1.25rem;
      border-radius: 1rem;
      background: #ffffff;
      color: #1f2937;
      line-height: 1.55;
    }
    .install-dialog h2 {
      margin: 0 0 0.5rem;
      font-size: 1.1rem;
      color: #0c4562;
    }
    .install-close {
      width: 100%;
      min-height: 2.75rem;
      border: none;
      border-radius: 0.5rem;
      background: #047857;
      color: #ffffff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
  `,
})
export class InstallApp {
  readonly pwa = inject(PwaService);
  readonly tone = input<'dark' | 'light'>('dark');
  readonly iosHelp = signal(false);

  async install(): Promise<void> {
    if (this.pwa.canPrompt()) {
      await this.pwa.install();
    } else if (this.pwa.isIos()) {
      this.iosHelp.set(true);
    }
  }
}
