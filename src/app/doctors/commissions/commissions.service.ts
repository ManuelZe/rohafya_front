import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResource, ApiSoftError, softErrorMessage } from '../shared/api-resource';
import { toApiDateTime } from '../shared/commission-cycle';
import {
  ApiActualSolde,
  ApiCommissionCalc,
  ApiCommissionsStatement,
  ApiMonthCommissions,
  ApiSoldeDetail,
  ApiTodayTransactions,
  ApiYearCommissions,
  CommissionsStatement,
  CycleSnapshot,
  InvoiceFilter,
  MonthCommissions,
  PeriodCommissions,
  SoldeDetail,
  TodayTransactions,
  YearCommissions,
  normalizeActualSolde,
  normalizeMonth,
  normalizePeriod,
  normalizeSoldeDetail,
  normalizeStatement,
  normalizeToday,
  normalizeYear,
} from './commissions.models';

/** Transforme une réponse 200 { message: "..." } en erreur exploitable par l'interface. */
function rejectSoftErrors<T>() {
  return map((res: T) => {
    const message = softErrorMessage(res);
    if (message) {
      throw new ApiSoftError(message);
    }
    return res;
  });
}

/**
 * Accès aux commissions du docteur connecté.
 * Permissions utilisées : doctors.calcul_commissions.* et doctors.gnudoctors.*
 */
@Service()
export class CommissionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** Solde non facturé du cycle en cours (prescriptions + réalisations). */
  readonly actualSolde = new ApiResource<CycleSnapshot>('Impossible de récupérer votre solde actuel.');
  /** Détail du cycle en cours : top examens, patients, lignes non facturées. */
  readonly cycleDetail = new ApiResource<SoldeDetail>('Impossible de récupérer le détail du cycle.');
  /** Cumul des commissions facturées depuis l'ouverture (21/10/2025). */
  readonly generalSolde = new ApiResource<SoldeDetail>('Impossible de récupérer votre cumul facturé.');
  readonly today = new ApiResource<TodayTransactions>("Impossible de récupérer l'activité du jour.");
  readonly statement = new ApiResource<CommissionsStatement>('Impossible de récupérer votre relevé de commissions.');
  readonly month = new ApiResource<MonthCommissions>('Impossible de récupérer les commissions du mois.');
  readonly year = new ApiResource<YearCommissions>("Impossible de récupérer les commissions de l'année.");
  readonly period = new ApiResource<PeriodCommissions>('Impossible de récupérer les commissions de la période.');

  loadActualSolde(doctorId: number, force = false): void {
    this.actualSolde.load(
      `${doctorId}`,
      () =>
        this.http
          .get<ApiActualSolde>(`${this.baseUrl}doctor_com/actual_solde/${doctorId}`)
          .pipe(rejectSoftErrors(), map(normalizeActualSolde)),
      force
    );
  }

  loadCycleDetail(doctorId: number, force = false): void {
    this.cycleDetail.load(
      `${doctorId}`,
      () =>
        this.http
          .get<ApiSoldeDetail>(`${this.baseUrl}doctor_com/solde/${doctorId}`)
          .pipe(rejectSoftErrors(), map(normalizeSoldeDetail)),
      force
    );
  }

  loadGeneralSolde(doctorId: number, force = false): void {
    this.generalSolde.load(
      `${doctorId}`,
      () =>
        this.http.get<ApiSoldeDetail>(`${this.baseUrl}doctor_com/general/${doctorId}`).pipe(
          rejectSoftErrors(),
          map(normalizeSoldeDetail),
          // L'API lève une erreur 500 lorsqu'aucune commission n'existe encore (Solde = None) :
          // pour un nouveau docteur, cela signifie simplement « 0 point facturé ».
          catchError((err: unknown) =>
            err instanceof HttpErrorResponse && err.status === 500 ? of(emptySoldeDetail()) : throwError(() => err)
          )
        ),
      force
    );
  }

  loadToday(doctorId: number, force = false): void {
    this.today.load(
      `${doctorId}`,
      () => this.http.get<ApiTodayTransactions>(`${this.baseUrl}gnu_doctor/${doctorId}/research/`).pipe(map(normalizeToday)),
      force
    );
  }

  loadStatement(doctorId: number, force = false): void {
    this.statement.load(
      `${doctorId}`,
      () =>
        this.http
          .get<ApiCommissionsStatement>(`${this.baseUrl}gnu_doctor/${doctorId}/commissions/`)
          .pipe(rejectSoftErrors(), map(normalizeStatement)),
      force
    );
  }

  loadMonth(doctorId: number, month: number, type: InvoiceFilter, force = false): void {
    this.month.load(
      `${doctorId}-${month}-${type}`,
      () =>
        this.http
          .get<ApiMonthCommissions>(`${this.baseUrl}doctor_com/invoiced_by_mounth/${doctorId}/${month}/${type}`)
          .pipe(rejectSoftErrors(), map(normalizeMonth)),
      force
    );
  }

  loadYear(doctorId: number, year: number, type: InvoiceFilter, force = false): void {
    this.year.load(
      `${doctorId}-${year}-${type}`,
      () =>
        this.http
          .get<ApiYearCommissions>(`${this.baseUrl}doctor_com/invoiced_by_year/${doctorId}/${year}/${type}`)
          .pipe(rejectSoftErrors(), map(normalizeYear)),
      force
    );
  }

  loadPeriod(doctorId: number, start: Date, end: Date): void {
    const from = encodeURIComponent(toApiDateTime(start));
    const to = encodeURIComponent(toApiDateTime(end, true));
    this.period.load(
      `${doctorId}-${from}-${to}`,
      (): Observable<PeriodCommissions> =>
        this.http
          .get<ApiCommissionCalc>(`${this.baseUrl}gnu_doctor/${doctorId}/research/${from}/${to}`)
          .pipe(rejectSoftErrors(), map(normalizePeriod)),
      true
    );
  }

  resetAll(): void {
    [this.actualSolde, this.cycleDetail, this.generalSolde, this.today, this.statement, this.month, this.year, this.period].forEach((r) =>
      r.reset()
    );
  }
}

function emptySoldeDetail(): SoldeDetail {
  return { total: 0, lines: [], invoiced: 0, notInvoiced: 0, topExams: [], patients: [], products: [] };
}
