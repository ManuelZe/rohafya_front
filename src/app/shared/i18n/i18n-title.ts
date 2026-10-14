import { Injectable, Injector, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18n } from './i18n';

/** Titres d'onglet des routes (écrits en français), traduits dans la langue courante. */
@Injectable({ providedIn: 'root' })
export class I18nTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18n);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    // « Tableau de bord · Administration » : chaque partie est traduite séparément.
    if (title !== undefined) this.title.setTitle(title.split(' · ').map((part) => this.i18n.t(part)).join(' · '));
  }
}

/** Après un changement de langue, le titre de la page affichée est retraduit. */
export function refreshTranslatedTitle(injector: Injector): void {
  const router = injector.get(Router);
  injector.get(TitleStrategy).updateTitle(router.routerState.snapshot);
}
