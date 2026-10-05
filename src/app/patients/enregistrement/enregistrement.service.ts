import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SavePatient, SavePatientCreatePayload } from './enregistrement.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EnregistrementService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** GET /save_patient/all_save_patients/ */
  getAllSavePatients(): Observable<SavePatient[]> {
    return this.http.get<SavePatient[]>(`${this.baseUrl}save_patient/all_save_patients/`);
  }

  /** GET /save_patient/get_patient_saves/{patientId}/ */
  getPatientSaves(patientId: number): Observable<SavePatient[]> {
    return this.http.get<SavePatient[]>(`${this.baseUrl}save_patient/get_patient_saves/${patientId}/`);
  }

  /** POST /save_patient/add/ — multipart/form-data */
  addSavePatient(payload: SavePatientCreatePayload): Observable<SavePatient> {
    const formData = new FormData();
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
  getValidatedSavePatient(id: number): Observable<SavePatient> {
    return this.http.get<SavePatient>(`${this.baseUrl}save_patient/get/${id}/`);
  }
}
