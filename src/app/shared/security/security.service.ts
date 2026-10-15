import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { SecurityStatus } from '../../saas/saas.models';

export interface MfaSetup {
  secret: string;
  otpauth_uri: string;
  /** QR code PNG en base64. */
  qr_png: string;
}

export interface AccessLogEntry {
  id: number;
  action: string;
  created_at: string;
  establishment: string | null;
  actor_role: 'establishment' | 'doctor' | 'patient' | 'other';
  actor_name: string | null;
  target: string | null;
}

export interface DeletionRequestView {
  id: number;
  user_id: number | null;
  email: string;
  name: string | null;
  reason: string | null;
  status: 'demandee' | 'traitee' | 'refusee' | 'annulee';
  note: string | null;
  created_at: string;
  processed_at: string | null;
}

/** Sécurité et données personnelles du compte connecté : /saas/me/… */
@Service()
export class SecurityService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}saas/me`;

  status(): Observable<SecurityStatus> {
    return this.http.get<SecurityStatus>(`${this.url}/security`);
  }

  setup(): Observable<MfaSetup> {
    return this.http.post<MfaSetup>(`${this.url}/mfa/setup`, {});
  }

  enable(code: string): Observable<{ recovery_codes: string[]; access_token: string; security: SecurityStatus }> {
    return this.http.post<{ recovery_codes: string[]; access_token: string; security: SecurityStatus }>(`${this.url}/mfa/enable`, { code });
  }

  renewRecoveryCodes(code: string): Observable<{ recovery_codes: string[]; security: SecurityStatus }> {
    return this.http.post<{ recovery_codes: string[]; security: SecurityStatus }>(`${this.url}/mfa/recovery-codes`, { code });
  }

  disable(code: string): Observable<{ security: SecurityStatus }> {
    return this.http.post<{ security: SecurityStatus }>(`${this.url}/mfa/disable`, { code });
  }

  accessLog(): Observable<{ items: AccessLogEntry[] }> {
    return this.http.get<{ items: AccessLogEntry[] }>(`${this.url}/access-log`);
  }

  exportData(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.url}/export`);
  }

  deletionRequest(): Observable<DeletionRequestView | null> {
    return this.http.get<DeletionRequestView | null>(`${this.url}/deletion-request`);
  }

  requestDeletion(reason: string): Observable<DeletionRequestView> {
    return this.http.post<DeletionRequestView>(`${this.url}/deletion-request`, { reason });
  }

  cancelDeletion(): Observable<DeletionRequestView> {
    return this.http.delete<DeletionRequestView>(`${this.url}/deletion-request`);
  }
}
