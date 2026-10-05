import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Prescription,
  PrescriptionCreatePayload,
  PrescriptionDevis,
} from './prescriptions.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PrescriptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** GET /prescription/all_prescriptions/ */
  getAllPrescriptions(): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.baseUrl}/prescription/all_prescriptions/`);
  }

  /** POST /prescription/add/ — multipart/form-data */
  addPrescription(payload: PrescriptionCreatePayload): Observable<Prescription> {
    const formData = new FormData();
    formData.append('NameDoctor', payload.NameDoctor);
    formData.append('OrdreDoctor', payload.OrdreDoctor);
    // formData.append('patient_id', String(payload.patient_id));

    if (payload.Description) {
      formData.append('Description', payload.Description);
    }
    if (payload.demande_devis !== undefined) {
      formData.append('demande_devis', String(payload.demande_devis));
    }
    if (payload.file) {
      formData.append('file', payload.file, payload.file.name);
    }

    return this.http.post<Prescription>(`${this.baseUrl}/prescription/add/`, formData);
  }

  /** GET /prescription/image/{id} */
  getPrescriptionImage(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/prescription/image/${id}`, { responseType: 'blob' });
  }

  /** DELETE /prescription/del/{id} */
  deletePrescription(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/prescription/del/${id}`);
  }

  /** GET /prescription/devis/{id} */
  getDevis(id: number): Observable<PrescriptionDevis> {
    return this.http.get<PrescriptionDevis>(`${this.baseUrl}/prescription/devis/${id}`);
  }
}