import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { DeletionRequestView } from '../shared/security/security.service';
import { BillingOverview, Invoice, InvoiceDetail, InvoiceStatus, SubscriptionUpdate, UsageSummary } from './billing.models';
import {
  AccountRightsUpdate,
  AccountView,
  AdminAccountRights,
  AuditEntry,
  NotificationAudience,
  NotificationCampaign,
  NotificationPayload,
  NotificationRecipient,
  Paged,
  SourceType,
  SuperStats,
  TenantAdminView,
  TenantSettings,
  TenantWithStats,
  TrialRequest,
  TrialRequestList,
  TrialStatus,
} from './saas.models';

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

  /** Droits d'un compte personnel : impression des comptes rendus, partage des résultats. */
  rights(userId: number): Observable<AdminAccountRights> {
    return this.http.get<AdminAccountRights>(`${this.baseUrl}/users/${userId}/rights`);
  }

  updateRights(userId: number, payload: AccountRightsUpdate): Observable<AdminAccountRights> {
    return this.http.put<AdminAccountRights>(`${this.baseUrl}/users/${userId}/rights`, payload);
  }

  /** Supprime la configuration : tout redevient disponible pour ce compte. */
  clearRights(userId: number): Observable<AdminAccountRights> {
    return this.http.delete<AdminAccountRights>(`${this.baseUrl}/users/${userId}/rights`);
  }

  audit(query: { page?: number; tenant_id?: number }): Observable<Paged<AuditEntry>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.tenant_id) params = params.set('tenant_id', query.tenant_id);
    return this.http.get<Paged<AuditEntry>>(`${this.baseUrl}/audit`, { params });
  }

  /** Toutes les notifications envoyées depuis les consoles (filtre facultatif par établissement). */
  notifications(query: { page?: number; tenant_id?: number }): Observable<Paged<NotificationCampaign>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.tenant_id) params = params.set('tenant_id', query.tenant_id);
    return this.http.get<Paged<NotificationCampaign>>(`${this.baseUrl}/notifications`, { params });
  }

  /** Notification (interface + e-mail) aux administrateurs, patients ou médecins d'un établissement. */
  sendNotification(tenantId: number, payload: NotificationPayload): Observable<NotificationCampaign> {
    return this.http.post<NotificationCampaign>(`${this.baseUrl}/tenants/${tenantId}/notifications`, payload);
  }

  notificationRecipients(tenantId: number, audience: NotificationAudience, q = ''): Observable<{ items: NotificationRecipient[]; total: number }> {
    const params = new HttpParams().set('audience', audience).set('q', q);
    return this.http.get<{ items: NotificationRecipient[]; total: number }>(`${this.baseUrl}/tenants/${tenantId}/notification-recipients`, { params });
  }

  /** Demandes d'essai reçues depuis le site de présentation (filtre facultatif par statut). */
  trialRequests(query: { status?: TrialStatus | ''; page?: number }): Observable<TrialRequestList> {
    let params = new HttpParams();
    if (query.status) params = params.set('status', query.status);
    if (query.page) params = params.set('page', query.page);
    return this.http.get<TrialRequestList>(`${this.baseUrl}/trial-requests`, { params });
  }

  updateTrialRequest(id: number, payload: { status?: TrialStatus; note?: string }): Observable<TrialRequest> {
    return this.http.put<TrialRequest>(`${this.baseUrl}/trial-requests/${id}`, payload);
  }

  /** Facturation : formule, volume du mois et impayés de chaque établissement. */
  billing(): Observable<BillingOverview> {
    return this.http.get<BillingOverview>(`${this.baseUrl}/billing`);
  }

  subscription(tenantId: number): Observable<UsageSummary> {
    return this.http.get<UsageSummary>(`${this.baseUrl}/tenants/${tenantId}/subscription`);
  }

  updateSubscription(tenantId: number, payload: SubscriptionUpdate): Observable<UsageSummary> {
    return this.http.put<UsageSummary>(`${this.baseUrl}/tenants/${tenantId}/subscription`, payload);
  }

  invoices(query: { status?: InvoiceStatus | 'overdue' | ''; tenant_id?: number; page?: number }): Observable<Paged<Invoice>> {
    let params = new HttpParams();
    if (query.status) params = params.set('status', query.status);
    if (query.tenant_id) params = params.set('tenant_id', query.tenant_id);
    if (query.page) params = params.set('page', query.page);
    return this.http.get<Paged<Invoice>>(`${this.baseUrl}/invoices`, { params });
  }

  invoice(invoiceId: number): Observable<InvoiceDetail> {
    return this.http.get<InvoiceDetail>(`${this.baseUrl}/invoices/${invoiceId}`);
  }

  updateInvoice(invoiceId: number, payload: { status: InvoiceStatus; payment_reference?: string; paid_on?: string; note?: string }): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.baseUrl}/invoices/${invoiceId}`, payload);
  }

  /** Émet les factures arrivées à échéance (toutes, ou celles d'un établissement). */
  issueInvoices(tenantId?: number): Observable<{ issued: Invoice[]; count: number }> {
    return this.http.post<{ issued: Invoice[]; count: number }>(`${this.baseUrl}/invoices/issue`, tenantId ? { tenant_id: tenantId } : {});
  }

  /** Téléphone perdu : supprime la double authentification du compte (à reconfigurer à la connexion). */
  resetMfa(userId: number): Observable<{ message: string; mfa_enabled: boolean }> {
    return this.http.put<{ message: string; mfa_enabled: boolean }>(`${this.baseUrl}/users/${userId}/mfa-reset`, {});
  }

  deletionRequests(query: { status?: string; page?: number }): Observable<Paged<DeletionRequestView>> {
    let params = new HttpParams();
    if (query.status) params = params.set('status', query.status);
    if (query.page) params = params.set('page', query.page);
    return this.http.get<Paged<DeletionRequestView>>(`${this.baseUrl}/deletion-requests`, { params });
  }

  processDeletion(requestId: number, decision: 'anonymize' | 'refuse', note: string): Observable<DeletionRequestView> {
    return this.http.post<DeletionRequestView>(`${this.baseUrl}/deletion-requests/${requestId}`, { decision, note });
  }
}
