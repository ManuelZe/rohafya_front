import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SubmissionAudience } from '../../shared/submission/submission.models';
import { UserRequest } from './requests.models';

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /** Requêtes envoyées par l'utilisateur depuis cet espace (patient ou médecin). */
  getMyRequests(userId: number, audience: SubmissionAudience): Observable<UserRequest[]> {
    return this.http
      .get<unknown>(`${this.baseUrl}requete/get_requests/${userId}`, { params: { audience } })
      .pipe(map((res) => (Array.isArray(res) ? (res as UserRequest[]) : [])));
  }

  /** Requête envoyée à l'établissement `tenant_id` (connecté ou non : sans compte, l'e-mail reçoit la réponse). */
  createRequest(request: UserRequest): Observable<UserRequest> {
    return this.http.post<UserRequest>(`${this.baseUrl}requete/add`, request);
  }

  deleteRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}requete/del/${id}`);
  }
}
