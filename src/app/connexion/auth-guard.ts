import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth-service';

/**
 * Protège une route : redirige vers /connexion si l'utilisateur n'est pas connecté.
 *
 * Usage dans les routes :
 *   { path: 'patients', component: Patients, canActivate: [authGuard] }
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  return router.parseUrl('/connexion');
};

/**
 * Variante avec contrôle de rôle. Exemple :
 *   { path: 'admin', component: Admin, canActivate: [roleGuard(['admin'])] }
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const hasAccess =
      authService.isLoggedIn() && authService.roles().some((role) => allowedRoles.includes(role));

    return hasAccess ? true : router.parseUrl('/connexion');
  };
};