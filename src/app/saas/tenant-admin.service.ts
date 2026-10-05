import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AuditEntry,
  DoctorLinkView,
  IssuedLinkToken,
  LinkStatus,
  LinkTokenView,
  Paged,
  PatientDetail,
  PatientLinkView,
  PdfImport,
  PdfImportList,
  PdfImportStatus,
  PdfValue,
  RecordKind,
  RecordSummary,
  Tenant,
  TenantDashboard,
  TenantPatientRow,
  TenantSettings,
} from './saas.models';

export interface PageQuery {
  page?: number;
  page_size?: number;
  q?: string;
  status?: LinkStatus | '';
  kind?: RecordKind | '';
  pdf_status?: PdfImportStatus | '';
}

export interface PdfCorrection {
  local_ref?: string;
  exam_code?: string;
  title?: string;
  validation_date?: string;
  details?: Array<Omit<PdfValue, 'result' | 'lower_limit' | 'upper_limit'> & { result: string; lower_limit: string; upper_limit: string }>;
}

function toParams(query: PageQuery = {}): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/** Back-office d'un établissement : /saas/admin/tenants/{id}/… */
@Service()
export class TenantAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private url(tenantId: number, path = ''): string {
    return `${this.baseUrl}saas/admin/tenants/${tenantId}${path}`;
  }

  tenant(tenantId: number): Observable<Tenant> {
    return this.http.get<Tenant>(this.url(tenantId));
  }

  dashboard(tenantId: number): Observable<TenantDashboard> {
    return this.http.get<TenantDashboard>(this.url(tenantId, '/dashboard'));
  }

  updateSettings(tenantId: number, settings: Partial<TenantSettings>): Observable<Tenant> {
    return this.http.put<Tenant>(this.url(tenantId, '/settings'), settings);
  }

  rotateApiKey(tenantId: number): Observable<{ api_key: string; message: string }> {
    return this.http.post<{ api_key: string; message: string }>(this.url(tenantId, '/api-key'), {});
  }

  patients(tenantId: number, query: PageQuery): Observable<Paged<TenantPatientRow>> {
    return this.http.get<Paged<TenantPatientRow>>(this.url(tenantId, '/patients'), { params: toParams(query) });
  }

  patient(tenantId: number, localRef: string): Observable<PatientDetail> {
    return this.http.get<PatientDetail>(this.url(tenantId, `/patients/${encodeURIComponent(localRef)}`));
  }

  savePatient(tenantId: number, patient: Partial<TenantPatientRow>): Observable<unknown> {
    return this.http.post(this.url(tenantId, '/patients'), patient);
  }

  links(tenantId: number, query: PageQuery): Observable<Paged<PatientLinkView>> {
    return this.http.get<Paged<PatientLinkView>>(this.url(tenantId, '/links'), { params: toParams(query) });
  }

  approveLink(tenantId: number, linkId: number): Observable<PatientLinkView> {
    return this.http.post<PatientLinkView>(this.url(tenantId, `/links/${linkId}/approve`), {});
  }

  revokeLink(tenantId: number, linkId: number): Observable<PatientLinkView> {
    return this.http.post<PatientLinkView>(this.url(tenantId, `/links/${linkId}/revoke`), {});
  }

  issueToken(tenantId: number, localRef: string, email?: string): Observable<IssuedLinkToken> {
    return this.http.post<IssuedLinkToken>(this.url(tenantId, '/link-tokens'), { local_ref: localRef, email: email || undefined });
  }

  tokens(tenantId: number, query: PageQuery): Observable<Paged<LinkTokenView>> {
    return this.http.get<Paged<LinkTokenView>>(this.url(tenantId, '/link-tokens'), { params: toParams(query) });
  }

  revokeToken(tenantId: number, tokenId: number): Observable<LinkTokenView> {
    return this.http.delete<LinkTokenView>(this.url(tenantId, `/link-tokens/${tokenId}`));
  }

  doctors(tenantId: number): Observable<DoctorLinkView[]> {
    return this.http.get<DoctorLinkView[]>(this.url(tenantId, '/doctors'));
  }

  addDoctor(tenantId: number, identifier: string): Observable<DoctorLinkView> {
    const body = identifier.includes('@') ? { email: identifier } : { matricule: identifier };
    return this.http.post<DoctorLinkView>(this.url(tenantId, '/doctors'), body);
  }

  removeDoctor(tenantId: number, linkId: number): Observable<unknown> {
    return this.http.delete(this.url(tenantId, `/doctors/${linkId}`));
  }

  records(tenantId: number, query: PageQuery): Observable<Paged<RecordSummary>> {
    return this.http.get<Paged<RecordSummary>>(this.url(tenantId, '/records'), { params: toParams(query) });
  }

  // ----- Comptes rendus PDF -------------------------------------------------

  pdfImports(tenantId: number, query: PageQuery): Observable<PdfImportList> {
    const { pdf_status, ...rest } = query;
    let params = toParams(rest);
    if (pdf_status) params = params.set('status', pdf_status);
    return this.http.get<PdfImportList>(this.url(tenantId, '/pdf-imports'), { params });
  }

  uploadPdf(tenantId: number, file: File, fields: { local_ref?: string; exam_code?: string; title?: string }): Observable<PdfImport> {
    const body = new FormData();
    body.append('file', file, file.name);
    for (const [key, value] of Object.entries(fields)) {
      if (value?.trim()) body.append(key, value.trim());
    }
    return this.http.post<PdfImport>(this.url(tenantId, '/pdf-imports'), body);
  }

  pdfImport(tenantId: number, importId: number): Observable<PdfImport> {
    return this.http.get<PdfImport>(this.url(tenantId, `/pdf-imports/${importId}`));
  }

  pdfFile(tenantId: number, importId: number): Observable<Blob> {
    return this.http.get(this.url(tenantId, `/pdf-imports/${importId}/fichier`), { responseType: 'blob' });
  }

  correctPdf(tenantId: number, importId: number, correction: PdfCorrection): Observable<PdfImport> {
    return this.http.put<PdfImport>(this.url(tenantId, `/pdf-imports/${importId}`), correction);
  }

  reanalysePdf(tenantId: number, importId: number, useAi: boolean): Observable<PdfImport> {
    return this.http.post<PdfImport>(this.url(tenantId, `/pdf-imports/${importId}/reanalyse`), { use_ai: useAi });
  }

  publishPdf(tenantId: number, importId: number, confirmWarnings = false): Observable<PdfImport> {
    return this.http.post<PdfImport>(this.url(tenantId, `/pdf-imports/${importId}/publier`), { confirm_warnings: confirmWarnings });
  }

  rejectPdf(tenantId: number, importId: number): Observable<PdfImport> {
    return this.http.post<PdfImport>(this.url(tenantId, `/pdf-imports/${importId}/rejeter`), {});
  }

  deletePdf(tenantId: number, importId: number): Observable<unknown> {
    return this.http.delete(this.url(tenantId, `/pdf-imports/${importId}`));
  }

  audit(tenantId: number, query: PageQuery): Observable<Paged<AuditEntry>> {
    return this.http.get<Paged<AuditEntry>>(this.url(tenantId, '/audit'), { params: toParams(query) });
  }
}
