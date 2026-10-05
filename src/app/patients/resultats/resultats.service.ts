import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExamResultDetail, SendResult, SendResultCreatePayload, SendResultUpdatePayload } from './resultats.models';

@Injectable({ providedIn: 'root' })
export class ResultatsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** POST /send_result/ */
  sendResult(payload: SendResultCreatePayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}send_result/`, payload);
  }

  /** GET /send_result/patient/{patientId} */
  getResultsByPatient(patientId: number): Observable<SendResult[]> {
    return this.http.get<SendResult[]>(`${this.baseUrl}send_result/patient/${patientId}`);
  }

  /** DELETE /send_result/del/{resultId} */
  deleteResult(resultId: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}send_result/del/${resultId}`);
  }

  /** PUT /send_result/modify/{resultId} */
  modifyResult(resultId: number, payload: SendResultUpdatePayload): Observable<SendResult> {
    return this.http.put<SendResult>(`${this.baseUrl}send_result/modify/${resultId}`, payload);
  }

  /** GET /result/{examType}/{examCode}/{patientFederationId} */
  getExamResults(examType: string, examCode: string, patientFederationId: string): Observable<ExamResultDetail[]> {
    return this.http.get<ExamResultDetail[]>(`${this.baseUrl}result/${examType}/${examCode}/${patientFederationId}`);
  }

  /** GET /result/more_infos/{examType}/{examCode}/{patientFederationId} */
  getMoreInformations(
    examType: string,
    examCode: string,
    patientFederationId: string
  ): Observable<ExamResultDetail[]> {
    return this.http.get<ExamResultDetail[]>(
      `${this.baseUrl}result/more_infos/${examType}/${examCode}/${patientFederationId}`
    );
  }
}
