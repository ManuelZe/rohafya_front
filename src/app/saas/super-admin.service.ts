import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccountView, AuditEntry, Paged, SourceType, SuperStats, TenantAdminView, TenantSettings, TenantWithStats } from './saas.models';

export interface TenantPayload {
  name?: string;
  slug?: string;
  source_type?: SourceType;
  is_active?: boolean;
  settings?: Partial<TenantSettings>;
}

/** Console du super-administrateur : /saas/super/… */
@Service()
export class SuperAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}saas/super`;

  stats(): Observable<SuperStats> {
    return this.http.get<SuperStats>(`${this.baseUrl}/stats`);
  }

  tenants(): Observable<TenantWithStats[]> {
    return this.http.get<TenantWithStats[]>(`${this.baseUrl}/tenants`);
  }

  tenant(id: number): Observable<TenantWithStats> {
    return this.http.get<TenantWithStats>(`${this.baseUrl}/tenants/${id}`);
  }

  createTenant(payload: TenantPayload): Observable<TenantWithStats> {
    return this.http.post<TenantWithStats>(`${this.baseUrl}/tenants`, payload);
  }

  updateTenant(id: number, payload: TenantPayload): Observable<TenantWithStats> {
    return this.http.put<TenantWithStats>(`${this.baseUrl}/tenants/${id}`, payload);
  }

  /** Suppression définitive : l'identifiant (slug) doit être rappelé en confirmation. */
  deleteTenant(id: number, confirmSlug: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/tenants/${id}`, { body: { confirm_slug: confirmSlug } });
  }

  rotateApiKey(id: number): Observable<{ api_key: string; message: string }> {
    return this.http.post<{ api_key: string; message: string }>(`${this.baseUrl}/tenants/${id}/api-key`, {});
  }

  admins(tenantId: number): Observable<TenantAdminView[]> {
    return this.http.get<TenantAdminView[]>(`${this.baseUrl}/tenants/${tenantId}/admins`);
  }

  addAdmin(tenantId: number, admin: { email: string; first_name: string; last_name: string }): Observable<TenantAdminView> {
    return this.http.post<TenantAdminView>(`${this.baseUrl}/tenants/${tenantId}/admins`, admin);
  }

  removeAdmin(tenantId: number, userId: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/tenants/${tenantId}/admins/${userId}`);
  }

  users(query: { q?: string; role?: string; page?: number }): Observable<Paged<AccountView>> {
    let params = new HttpParams();
    if (query.q) params = params.set('q', query.q);
    if (query.role) params = params.set('role', query.role);
    if (query.page) params = params.set('page', query.page);
    return this.http.get<Paged<AccountView>>(`${this.baseUrl}/users`, { params });
  }

  setActive(userId: number, active: boolean): Observable<AccountView> {
    return this.http.put<AccountView>(`${this.baseUrl}/users/${userId}/active`, { active });
  }

  setSuperAdmin(userId: number, enabled: boolean): Observable<AccountView> {
    return this.http.put<AccountView>(`${this.baseUrl}/users/${userId}/super-admin`, { enabled });
  }

  audit(query: { page?: number; tenant_id?: number }): Observable<Paged<AuditEntry>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.tenant_id) params = params.set('tenant_id', query.tenant_id);
    return this.http.get<Paged<AuditEntry>>(`${this.baseUrl}/audit`, { params });
  }
}
