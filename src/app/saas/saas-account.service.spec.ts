import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SaasAccountService } from './saas-account.service';
import { SaasMe } from './saas.models';

describe('SaasAccountService.commissionsEnabled', () => {
  let account: SaasAccountService;
  let http: HttpTestingController;

  const me = (commissions: boolean) => ({ features: { commissions } }) as unknown as SaasMe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    account = TestBed.inject(SaasAccountService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reste masqué tant que /saas/me n’a pas répondu', () => {
    account.load().subscribe();
    expect(account.commissionsEnabled()).toBe(false);
    http.expectOne((req) => req.url.endsWith('saas/me')).flush(me(true));
    expect(account.commissionsEnabled()).toBe(true);
  });

  it('reste masqué quand le module est désactivé (démo)', () => {
    account.load().subscribe();
    http.expectOne((req) => req.url.endsWith('saas/me')).flush(me(false));
    expect(account.commissionsEnabled()).toBe(false);
  });

  it('garde l’affichage historique si /saas/me échoue', () => {
    account.load().subscribe();
    http.expectOne((req) => req.url.endsWith('saas/me')).flush('erreur', { status: 500, statusText: 'Server Error' });
    expect(account.commissionsEnabled()).toBe(true);
  });

  it('masque à nouveau après la déconnexion', () => {
    account.load().subscribe();
    http.expectOne((req) => req.url.endsWith('saas/me')).flush(me(true));
    account.reset();
    expect(account.commissionsEnabled()).toBe(false);
  });
});
