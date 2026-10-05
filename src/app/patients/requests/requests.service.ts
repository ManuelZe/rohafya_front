import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserRequest } from './requests.models';

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getAllRequests(): Observable<UserRequest[]> {
    return this.http.get<any>(`${this.baseUrl}requete/`).pipe(
      map((res) => (Array.isArray(res) ? res : []))
    );
  }

  getRequestsByUserId(userId: number): Observable<UserRequest[]> {
    return this.http.get<any>(`${this.baseUrl}requete/get_requests/${userId}`).pipe(
      map((res) => (Array.isArray(res) ? res : []))
    );
  }

  createRequest(request: UserRequest): Observable<UserRequest> {
    return this.http.post<UserRequest>(`${this.baseUrl}requete/add`, request);
  }

  deleteRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}requete/del/${id}`);
  }
}