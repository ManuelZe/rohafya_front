import { Component, inject, input, output } from '@angular/core';
import { AccountLang } from './account-lang';
import { I18n, LANG_LABELS, LANGS, Lang } from './i18n';
import { TranslatePipe } from './t.pipe';

/**
 * Choix de la langue : « FR | EN ». Chaque bouton porte le nom de la langue dans cette langue
 * (« Français », « English ») pour les lecteurs d'écran.
 * Par défaut, la langue est appliquée tout de suite ; avec `[navigate]="true"`, le choix est
 * seulement émis (page d'accueil : chaque langue a sa propre adresse).
 */
@Component({
  selector: 'app-lang-switch',
  imports: [TranslatePipe],
  template: `
    <div class="lang-switch" [class.lang-switch--dark]="tone() === 'dark'" role="group" [attr.aria-label]="'Langue de l’interface' | t">
      @for (l of langs; track l) {
        <button type="button" [attr.aria-pressed]="i18n.lang() === l" [attr.lang]="l" [attr.aria-label]="labels[l]" (click)="choose(l)">
          {{ l.toUpperCase() }}
        </button>
      }
    </div>
  `,
  styles: `
    .lang-switch {
      display: inline-flex;
      gap: 2px;
      padding: 2px;
      border: 1px solid #c5d7e2;
      border-radius: 999px;
      background: #ffffff;
    }
    .lang-switch button {
      min-width: 40px;
      min-height: 32px;
      padding: 0 0.6rem;
      border: none;
      border-radius: 999px;
      background: transparent;
      color: #0c4562;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      cursor: pointer;
    }
    .lang-switch button[aria-pressed='true'] {
      background: #0c4562;
      color: #ffffff;
    }
    .lang-switch--dark {
      border-color: rgba(255, 255, 255, 0.35);
      background: transparent;
    }
    .lang-switch--dark button {
      color: #e2edf3;
    }
    .lang-switch--dark button[aria-pressed='true'] {
      background: #34d399;
      color: #08304a;
    }
    .lang-switch button:focus-visible {
      outline: 3px solid #059669;
      outline-offset: 2px;
    }
  `,
})
export class LangSwitch {
  protected readonly i18n = inject(I18n);
  private readonly account = inject(AccountLang);
  protected readonly langs = LANGS;
  protected readonly labels = LANG_LABELS;

  /** Fond sur lequel le sélecteur est posé. */
  readonly tone = input<'light' | 'dark'>('light');
  /** Vrai : la langue n'est pas appliquée ici, seulement émise (le parent change de page). */
  readonly navigate = input(false);
  readonly changed = output<Lang>();

  protected choose(lang: Lang): void {
    if (!this.navigate()) void this.account.choose(lang);
    this.changed.emit(lang);
  }
}
