import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18n, TranslationParams } from './i18n';

/**
 * `{{ 'Tableau de bord' | t }}`, `{{ '{n} résultats' | t: { n: total } }}`.
 * Pipe non pure : elle lit la langue courante (signal) et suit donc son changement.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(text: unknown, params?: TranslationParams): string {
    return this.i18n.t(text, params);
  }
}
