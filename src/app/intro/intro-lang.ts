import { inject } from '@angular/core';
import { CanActivateFn, ResolveFn, Router } from '@angular/router';
import { I18n, Lang } from '../shared/i18n/i18n';

/**
 * Langue du site de présentation, fixée par l'adresse : /intro en français, /en en anglais.
 * Le dictionnaire est chargé avant l'affichage (y compris au pré-rendu) : la page est servie
 * directement dans sa langue. Une visite sur /en retient l'anglais pour la suite de l'application.
 */
export function introLang(lang: Lang): ResolveFn<Lang> {
  return async () => {
    await inject(I18n).use(lang, lang === 'en');
    return lang;
  };
}

/** /intro pour un visiteur qui a déjà choisi l'anglais : la version anglaise. */
export const frenchIntroGuard: CanActivateFn = () => {
  const i18n = inject(I18n);
  return i18n.stored() === 'en' ? inject(Router).parseUrl('/en') : true;
};
