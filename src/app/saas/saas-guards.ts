import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../connexion/auth-service';
import { SaasAccountService } from './saas-account.service';

/** /admin : administrateur d'au moins un établissement (ou super-administrateur). */
export const tenantAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const account = inject(SaasAccountService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.parseUrl('/connexion');
  return account.load().pipe(
    map((me) => {
      if (me && me.admin_tenants.length > 0) return true;
      // Rôle d'administrateur sans établissement : homeUrl() renverrait vers /admin (boucle).
      const home = auth.homeUrl();
      return router.parseUrl(home === '/admin' ? '/intro' : home);
    })
  );
};

/** /super-admin : réservé au super-administrateur. */
export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const account = inject(SaasAccountService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.parseUrl('/connexion');
  return account.load().pipe(map((me) => (me?.is_super_admin ? true : router.parseUrl(auth.homeUrl()))));
};
