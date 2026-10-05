import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { PatientLinkView, SaasMe } from './saas.models';

export interface RedeemResponse {
  message: string;
  link: PatientLinkView;
}

export interface PublicTokenInfo {
  establishment: string;
  status: 'active' | 'used' | 'expired' | 'revoked';
  expires_at: string;
}

/** Profil SaaS de l'utilisateur connecté : établissements administrés, rattachements, fonctions actives. */
@Service()
export class SaasAccountService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private readonly _me = signal<SaasMe | null>(null);
  private readonly _settled = signal(false);
  readonly me = this._me.asReadonly();
  /** Vrai dès que /saas/me a répondu (succès ou échec). */
  readonly settled = this._settled.asReadonly();

  readonly adminTenants = computed(() => this._me()?.admin_tenants ?? []);
  readonly isSuperAdmin = computed(() => !!this._me()?.is_super_admin);
  /** Tant que le profil n'est pas chargé, on conserve l'affichage historique (commissions visibles). */
  readonly commissionsEnabled = computed(() => this._me()?.features.commissions ?? true);

  /** GET /saas/me — mis en cache jusqu'à la déconnexion. */
  load(force = false): Observable<SaasMe | null> {
    const cached = this._me();
    if (cached && !force) return of(cached);
    return this.http.get<SaasMe>(`${this.baseUrl}saas/me`).pipe(
      tap((me) => {
        this._me.set(me);
        this._settled.set(true);
      }),
      catchError(() => {
        this._settled.set(true);
        return of(null);
      })
    );
  }

  links(): Observable<PatientLinkView[]> {
    return this.http.get<PatientLinkView[]>(`${this.baseUrl}saas/me/links`);
  }

  redeem(code: string): Observable<RedeemResponse> {
    return this.http.post<RedeemResponse>(`${this.baseUrl}saas/me/links/redeem`, { code });
  }

  /** Un lien sans identifiant est le lien historique GNU Health (implicite, par matricule). */
  revoke(link: PatientLinkView): Observable<{ message: string }> {
    const path = link.id === null ? 'legacy' : String(link.id);
    return this.http.delete<{ message: string }>(`${this.baseUrl}saas/me/links/${path}`);
  }

  publicTokenInfo(token: string): Observable<PublicTokenInfo> {
    return this.http.get<PublicTokenInfo>(`${this.baseUrl}saas/public/link-tokens/${encodeURIComponent(token)}`);
  }

  reset(): void {
    this._me.set(null);
    this._settled.set(false);
  }
}
