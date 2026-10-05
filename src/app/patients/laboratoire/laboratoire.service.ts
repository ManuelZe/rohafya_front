import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExamensLab } from '../patients.models';

export interface MoreInfoResult {
  /** true si le résultat n'est plus accessible (expiré ou factures impayées) */
  blocked: boolean;
  message?: string;
  items: Record<string, string | number | boolean | null>[];
}

@Injectable({ providedIn: 'root' })
export class LaboratoireService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** GET /laboratoire/all_results/ — scopé automatiquement au patient connecté (JWT) */
  getAllResults(): Observable<ExamensLab[]> {
    return this.http.get<ExamensLab[] | Record<string, unknown>>(`${this.baseUrl}laboratoire/all_results/`).pipe(
      map((res) => (Array.isArray(res) ? res : []))
    );
  }

  /** GET /laboratoire/more_infos/{name}/result/ */
  getMoreInfos(name: string): Observable<MoreInfoResult> {
    return this.http.get<unknown>(`${this.baseUrl}laboratoire/more_infos/${name}/result/`).pipe(
      map((res) => {
        if (Array.isArray(res)) {
          return { blocked: false, items: res as MoreInfoResult['items'] };
        }
        const message = (res as Record<string, string>)?.['Message'] ?? 'Ce résultat n\'est plus accessible.';
        return { blocked: true, message, items: [] };
      }),
      catchError((err: HttpErrorResponse) => {
        const message = (err.error as { message?: string } | null)?.message ?? 'Impossible de récupérer les informations complémentaires.';
        return of({ blocked: true, message, items: [] });
      })
    );
  }
}
