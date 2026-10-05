import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../connexion/auth-service';
import { isDemoToken } from './demo-token';

/**
 * Pendant une session démo, répond à la place de l'API Flask avec les données fictives
 * de ./data (le module est chargé à la demande). Aucune requête ne part vers le serveur.
 *
 * La connexion (user/login) reste toujours transmise à l'API : un vrai utilisateur peut
 * ainsi se connecter même si une session démo était ouverte dans le navigateur.
 *
 * À enregistrer AVANT authInterceptor dans app.config.ts.
 */
export const demoInterceptor: HttpInterceptorFn = (req, next) => {
  const user = inject(AuthService).currentUser();

  if (!user || !isDemoToken(user.token) || !req.url.startsWith(environment.apiUrl) || req.url.endsWith('user/login')) {
    return next(req);
  }

  return from(import('./demo-backend')).pipe(switchMap((backend) => backend.handleDemoRequest(req, user)));
};
