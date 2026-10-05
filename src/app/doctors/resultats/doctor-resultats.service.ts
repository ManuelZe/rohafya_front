import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExamResultDetail, SendResult } from '../../patients/resultats/resultats.models';
import { ApiResource, extractErrorMessage, softErrorMessage } from '../shared/api-resource';

export interface ExamDetailsResult {
  items: ExamResultDetail[];
  /** Message de l'API quand aucune donnée n'est exploitable (résultat introuvable, accès refusé…). */
  message: string | null;
}

function toDetails(res: unknown): ExamDetailsResult {
  if (Array.isArray(res)) {
    return { items: res as ExamResultDetail[], message: null };
  }
  // L'API renvoie parfois la clé "Message " (avec espace final).
  const record = (res ?? {}) as Record<string, unknown>;
  const message = softErrorMessage(res) ?? Object.values(record).find((v): v is string => typeof v === 'string') ?? null;
  return { items: [], message: message ?? 'Aucune donnée disponible pour ce résultat.' };
}

function toDetailsError(err: unknown): Observable<ExamDetailsResult> {
  const message =
    err instanceof HttpErrorResponse && err.status === 403
      ? "Votre compte n'a pas encore l'autorisation de consulter ce niveau de détail. Contactez l'administration."
      : extractErrorMessage(err, "Impossible de récupérer le résultat de l'examen.");
  return of({ items: [], message });
}

/** Résultats d'examens partagés par les patients avec le docteur connecté. */
@Service()
export class DoctorResultatsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly received = new ApiResource<SendResult[]>('Impossible de charger les résultats reçus.');

  /** GET /send_result/doctor/{doctorId} */
  loadReceived(doctorId: number, force = false): void {
    this.received.load(
      `${doctorId}`,
      () => this.http.get<SendResult[]>(`${this.baseUrl}send_result/doctor/${doctorId}`).pipe(map((res) => (Array.isArray(res) ? res : []))),
      force
    );
  }

  /** GET /result/{examType}/{examCode}/{patientFederationId} */
  getExamResults(examType: string, examCode: string, patientFederationId: string): Observable<ExamDetailsResult> {
    return this.http
      .get<unknown>(`${this.baseUrl}result/${examType}/${encodeURIComponent(examCode)}/${encodeURIComponent(patientFederationId)}`)
      .pipe(map(toDetails), catchError(toDetailsError));
  }

  /** GET /result/more_infos/{examType}/{examCode}/{patientFederationId} */
  getMoreInformations(examType: string, examCode: string, patientFederationId: string): Observable<ExamDetailsResult> {
    return this.http
      .get<unknown>(
        `${this.baseUrl}result/more_infos/${examType}/${encodeURIComponent(examCode)}/${encodeURIComponent(patientFederationId)}`
      )
      .pipe(map(toDetails), catchError(toDetailsError));
  }

  reset(): void {
    this.received.reset();
  }
}
