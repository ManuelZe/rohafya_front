import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SavePatient, SavePatientCreatePayload } from './enregistrement.models';
import { SubmissionAudience } from '../../shared/submission/submission.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EnregistrementService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** GET /save_patient/all_save_patients/?audience= — pré-enregistrements envoyés depuis cet espace. */
  getMySaves(audience: SubmissionAudience): Observable<SavePatient[]> {
    return this.http.get<SavePatient[]>(`${this.baseUrl}save_patient/all_save_patients/`, { params: { audience } });
  }

  /** POST /save_patient/add/ — multipart/form-data, envoyé à l'établissement `tenant_id`. */
  addSavePatient(payload: SavePatientCreatePayload): Observable<SavePatient> {
    const formData = new FormData();
    formData.append('tenant_id', String(payload.tenant_id));
    formData.append('audience', payload.audience);
    formData.append('nom', payload.nom);
    formData.append('prenom', payload.prenom);

    if (payload.description) {
      formData.append('description', payload.description);
    }
    if (payload.file) {
      formData.append('file', payload.file, payload.file.name);
    }

    return this.http.post<SavePatient>(`${this.baseUrl}save_patient/add/`, formData);
  }

  /** GET /save_patient/get_image/{id}/ */
  getImage(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}save_patient/get_image/${id}/`, { responseType: 'blob' });
  }

  /** DELETE /save_patient/delete/{id}/ */
  deleteSavePatient(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}save_patient/delete/${id}/`);
  }

  /** GET /save_patient/get/{id}/ */
  getSavePatient(id: number): Observable<SavePatient> {
    return this.http.get<SavePatient>(`${this.baseUrl}save_patient/get/${id}/`);
  }
}
