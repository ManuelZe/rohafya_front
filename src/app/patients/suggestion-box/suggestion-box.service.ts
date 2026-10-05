import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Suggestion, SuggestionCreatePayload, SuggestionUpdatePayload } from './suggestion-box.models';

@Injectable({ providedIn: 'root' })
export class SuggestionBoxService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** GET /suggestions/for_user/ — suggestions créées par l'utilisateur connecté */
  getForUser(): Observable<Suggestion[]> {
    return this.http.get<Suggestion[]>(`${this.baseUrl}suggestions/for_user/`);
  }

  /** POST /suggestions/add */
  create(payload: SuggestionCreatePayload): Observable<{ message: string; suggestion: Suggestion }> {
    return this.http.post<{ message: string; suggestion: Suggestion }>(`${this.baseUrl}suggestions/add`, payload);
  }

  /** PUT /suggestions/update/{id} */
  update(id: number, payload: SuggestionUpdatePayload): Observable<Suggestion> {
    return this.http.put<Suggestion>(`${this.baseUrl}suggestions/update/${id}`, payload);
  }

  /** DELETE /suggestions/delete/{id} */
  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}suggestions/delete/${id}`);
  }
}
