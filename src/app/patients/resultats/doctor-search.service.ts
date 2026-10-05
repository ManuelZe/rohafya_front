import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DoctorInfo } from './doctor-search.models';

@Injectable({ providedIn: 'root' })
export class DoctorSearchService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** GET /doctors/informations/matricule/{matricule} */
  getByMatricule(matricule: string): Observable<DoctorInfo> {
    return this.http.get<DoctorInfo>(`${this.baseUrl}doctors/informations/matricule/${matricule}`);
  }

  /** GET /doctors/informations/{id} */
  getById(id: number): Observable<DoctorInfo> {
    return this.http.get<DoctorInfo>(`${this.baseUrl}doctors/informations/${id}`);
  }
}
