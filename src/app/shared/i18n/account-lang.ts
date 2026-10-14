import { HttpClient } from '@angular/common/http';
import { Injector, Service, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../connexion/auth-service';
import { isDemoToken } from '../../demo/demo-token';
import { I18n, Lang } from './i18n';

/**
 * Langue du compte : un utilisateur connecté retrouve sa langue sur tous ses appareils
 * (PUT /saas/me/preferences ; renvoyée par GET /saas/me). Sans compte, elle reste sur l'appareil.
 */
@Service()
export class AccountLang {
  private readonly http = inject(HttpClient);
  // AuthService dépend (indirectement) de ce service : il est lu au moment du choix, pas à la création.
  private readonly injector = inject(Injector);
  private readonly i18n = inject(I18n);

  async choose(lang: Lang): Promise<void> {
    await this.i18n.use(lang);
    const token = this.injector.get(AuthService).token();
    if (!token || isDemoToken(token)) return;
    this.http.put(`${environment.apiUrl}saas/me/preferences`, { locale: lang }).subscribe({ error: () => undefined });
  }

  /** Langue enregistrée sur le compte (GET /saas/me) : appliquée si elle diffère. */
  apply(locale: string | null | undefined): void {
    if ((locale === 'fr' || locale === 'en') && locale !== this.i18n.lang()) void this.i18n.use(locale);
  }
}
