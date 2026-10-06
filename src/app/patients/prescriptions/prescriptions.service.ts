import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Prescription, PrescriptionCreatePayload } from './prescriptions.models';
import { SubmissionAudience } from '../../shared/submission/submission.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PrescriptionService {
  private readonly http = inject(HttpClient);
  /** Se termine par « / » : les chemins ne commencent pas par « / ». */
  private readonly baseUrl = environment.apiUrl;

  /** GET /prescription/all_prescriptions/?audience= — prescriptions envoyées depuis cet espace. */
  getAllPrescriptions(audience: SubmissionAudience): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.baseUrl}prescription/all_prescriptions/`, { params: { audience } });
  }

  /** POST /prescription/add/ — multipart/form-data, envoyée à l'établissement `tenant_id`. */
  addPrescription(payload: PrescriptionCreatePayload): Observable<{ Prescription: Prescription }> {
    const formData = new FormData();
    formData.append('tenant_id', String(payload.tenant_id));
    formData.append('audience', payload.audience);
    if (payload.NameDoctor) formData.append('NameDoctor', payload.NameDoctor);
    if (payload.OrdreDoctor) formData.append('OrdreDoctor', payload.OrdreDoctor);
    if (payload.patient_name) formData.append('patient_name', payload.patient_name);
    if (payload.Description) formData.append('Description', payload.Description);
    if (payload.demande_devis !== undefined) formData.append('demande_devis', String(payload.demande_devis));
    if (payload.file) formData.append('file', payload.file, payload.file.name);

    return this.http.post<{ Prescription: Prescription }>(`${this.baseUrl}prescription/add/`, formData);
  }

  /** GET /prescription/image/{id} */
  getPrescriptionImage(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}prescription/image/${id}`, { responseType: 'blob' });
  }

  /** DELETE /prescription/del/{id} */
  deletePrescription(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}prescription/del/${id}`);
  }
}
