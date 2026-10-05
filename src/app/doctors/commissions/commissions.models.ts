import { API_MONTH_KEYS } from '../shared/commission-cycle';
import { toNumber } from '../shared/points';

// =====================================================================
// Formats bruts renvoyés par l'API Flask
// =====================================================================

/** Une entrée de `data_patients` : { "Nom Patient": [examen, montant_net, date_creation] } */
export type ApiPatientEntry = Record<string, [string, number, string | null]>;

/** Résultat de calcul_commission() côté API. */
export interface ApiCommissionCalc {
  data_patients: ApiPatientEntry[];
  commission: number;
}

/** GET /doctor_com/actual_solde/{id} */
export interface ApiActualSolde {
  montant_prescription: number;
  montant_realisation: number;
  montant_total: number;
  commission_non_facturee: number;
  nombre_patient: number;
  list_patient_name: string[];
}

/** GET /doctor_com/solde/{id} et /doctor_com/general/{id} */
export interface ApiSoldeDetail {
  Solde: ApiCommissionCalc | null;
  Nombre_Commissions?: number;
  Factured: number;
  Not_Factured: number;
  number_of_registered_patients: number;
  Patient_nbr_examen: Record<string, number>;
  All_Exam: Record<string, number>;
  Top_3: Record<string, number>;
  Commission_product: Record<string, number>;
}

/** GET /gnu_doctor/{id}/research/ */
export interface ApiTodayTransactions {
  Data?: ApiCommissionCalc;
  number?: number;
  message?: string;
}

/** GET /doctor_com/invoiced_by_mounth/{id}/{mois}/{type} */
export interface ApiMonthCommissions {
  montant_prescription: number;
  montant_realisation: number;
  montant_total: number;
  nb_total_commission: number;
  nb_total_patient: number;
  list_patient_name: string[];
  element_prescription: ApiCommissionCalc | unknown[];
  element_realisation: ApiCommissionCalc | unknown[];
}

/** Valeur d'un mois dans GET /doctor_com/invoiced_by_year/{id}/{annee}/{type} */
export interface ApiYearMonth {
  elements_prescription: ApiCommissionCalc;
  elements_realisation: ApiCommissionCalc;
  [monthKey: string]: number | ApiCommissionCalc;
}

export type ApiYearCommissions = Record<string, ApiYearMonth | number>;

/** Ligne de GET /gnu_doctor/{id}/commissions/ */
export interface ApiCommissionRow {
  Date: string | null;
  Produit: string | null;
  Montant: number | string | null;
  Patient: string | null;
  Examen: string | null;
  Validé: boolean | null;
  Facturé: string | null;
}

export interface ApiCommissionsStatement {
  prescription: { data_prescription: ApiCommissionRow[]; montant_prescription: number };
  realisation: { data_realisation: ApiCommissionRow[]; montant_realisation: number };
  montant_total: number;
}

// =====================================================================
// Modèles normalisés utilisés par l'interface
// =====================================================================

/** CP V01 = prescription, CP V02 = réalisation. */
export type CommissionKind = 'prescription' | 'realisation';

/** États du champ invoice_state d'une commission ('' = pas encore facturée ; l'API renvoie 'invoiced' une fois facturée). */
export type CommissionState = '' | 'invoiced' | 'pending' | 'paid' | 'cancelled';

export type InvoiceFilter = 'invoiced' | 'not_invoiced';

/** Retenue appliquée par l'API sur chaque commission (calcul_commission : montant - 11 %). */
export const COMMISSION_WITHHOLDING_RATE = 0.11;

export interface CommissionLine {
  patient: string;
  examen: string;
  points: number;
  date: string | null;
  kind?: CommissionKind;
}

export interface StatementRow {
  id: string;
  kind: CommissionKind;
  date: string | null;
  produit: string;
  patient: string;
  examen: string;
  /** Montant net (après retenue) : cohérent avec les totaux calculés par l'API. */
  points: number;
  validated: boolean;
  state: CommissionState;
}

export interface CommissionsStatement {
  rows: StatementRow[];
  totalPrescription: number;
  totalRealisation: number;
  total: number;
}

export interface CycleSnapshot {
  total: number;
  prescription: number;
  realisation: number;
  commissions: number;
  patients: number;
  patientNames: string[];
}

export interface RankedItem {
  label: string;
  count: number;
}

export interface SoldeDetail {
  total: number;
  lines: CommissionLine[];
  invoiced: number;
  notInvoiced: number;
  topExams: RankedItem[];
  patients: RankedItem[];
  products: RankedItem[];
}

export interface TodayTransactions {
  total: number;
  count: number;
  lines: CommissionLine[];
}

export interface MonthCommissions {
  total: number;
  prescription: number;
  realisation: number;
  commissions: number;
  patients: number;
  patientNames: string[];
  lines: CommissionLine[];
}

export interface YearMonthPoint {
  month: number; // 1-12
  prescription: number;
  realisation: number;
  total: number;
  count: number;
}

export interface YearCommissions {
  months: YearMonthPoint[];
  total: number;
}

export interface PeriodCommissions {
  total: number;
  lines: CommissionLine[];
}

// =====================================================================
// Normalisation
// =====================================================================

function isCalc(value: unknown): value is ApiCommissionCalc {
  return !!value && typeof value === 'object' && Array.isArray((value as ApiCommissionCalc).data_patients);
}

export function toLines(calc: unknown, kind?: CommissionKind): CommissionLine[] {
  if (!isCalc(calc)) return [];
  return calc.data_patients.flatMap((entry) =>
    Object.entries(entry).map(([patient, values]) => ({
      patient: patient || 'Patient inconnu',
      examen: values?.[0] ?? '—',
      points: toNumber(values?.[1]),
      date: values?.[2] ?? null,
      kind,
    }))
  );
}

export function calcTotal(calc: unknown): number {
  return isCalc(calc) ? toNumber(calc.commission) : 0;
}

function ranked(record: Record<string, number> | null | undefined): RankedItem[] {
  return Object.entries(record ?? {})
    .map(([label, count]) => ({ label, count: toNumber(count) }))
    .sort((a, b) => b.count - a.count);
}

export function normalizeActualSolde(api: ApiActualSolde): CycleSnapshot {
  return {
    total: toNumber(api.montant_total),
    prescription: toNumber(api.montant_prescription),
    realisation: toNumber(api.montant_realisation),
    commissions: toNumber(api.commission_non_facturee),
    patients: toNumber(api.nombre_patient),
    patientNames: Array.isArray(api.list_patient_name) ? api.list_patient_name : [],
  };
}

export function normalizeSoldeDetail(api: ApiSoldeDetail): SoldeDetail {
  return {
    total: calcTotal(api.Solde),
    lines: toLines(api.Solde),
    invoiced: toNumber(api.Factured),
    notInvoiced: toNumber(api.Not_Factured),
    topExams: ranked(api.Top_3),
    patients: ranked(api.Patient_nbr_examen),
    products: ranked(api.Commission_product),
  };
}

export function normalizeToday(api: ApiTodayTransactions): TodayTransactions {
  if (!api.Data) {
    return { total: 0, count: 0, lines: [] };
  }
  return { total: calcTotal(api.Data), count: toNumber(api.number), lines: toLines(api.Data) };
}

export function normalizeMonth(api: ApiMonthCommissions): MonthCommissions {
  return {
    total: toNumber(api.montant_total),
    prescription: toNumber(api.montant_prescription),
    realisation: toNumber(api.montant_realisation),
    commissions: toNumber(api.nb_total_commission),
    patients: toNumber(api.nb_total_patient),
    patientNames: Array.isArray(api.list_patient_name) ? api.list_patient_name : [],
    lines: [...toLines(api.element_prescription, 'prescription'), ...toLines(api.element_realisation, 'realisation')],
  };
}

export function normalizeYear(api: ApiYearCommissions): YearCommissions {
  const months: YearMonthPoint[] = [];
  API_MONTH_KEYS.forEach((key, index) => {
    const value = api[key];
    if (!value || typeof value !== 'object') return;
    const prescription = calcTotal(value.elements_prescription);
    const realisation = calcTotal(value.elements_realisation);
    months.push({
      month: index + 1,
      prescription,
      realisation,
      total: toNumber(value[key]),
      count: toLines(value.elements_prescription).length + toLines(value.elements_realisation).length,
    });
  });
  return { months, total: toNumber(api['Total']) };
}

function toState(value: string | null | undefined): CommissionState {
  if (!value) return '';
  return value === 'pending' || value === 'paid' || value === 'cancelled' ? value : 'invoiced';
}

function toRows(rows: ApiCommissionRow[] | undefined, kind: CommissionKind): StatementRow[] {
  return (rows ?? []).map((row, index) => ({
    id: `${kind}-${index}`,
    kind,
    date: row.Date,
    produit: row.Produit ?? '—',
    patient: row.Patient || 'Patient inconnu',
    examen: row.Examen ?? '—',
    points: Math.round(toNumber(row.Montant) * (1 - COMMISSION_WITHHOLDING_RATE) * 100) / 100,
    validated: !!row.Validé,
    state: toState(row.Facturé),
  }));
}

export function normalizeStatement(api: ApiCommissionsStatement): CommissionsStatement {
  const rows = [
    ...toRows(api.prescription?.data_prescription, 'prescription'),
    ...toRows(api.realisation?.data_realisation, 'realisation'),
  ].sort((a, b) => dateValue(b.date) - dateValue(a.date));

  return {
    rows,
    totalPrescription: toNumber(api.prescription?.montant_prescription),
    totalRealisation: toNumber(api.realisation?.montant_realisation),
    total: toNumber(api.montant_total),
  };
}

export function normalizePeriod(api: ApiCommissionCalc): PeriodCommissions {
  return { total: calcTotal(api), lines: toLines(api) };
}

/** Les dates Flask arrivent en RFC 1123 ('Mon, 07 Sep 2026 00:00:00 GMT') ou ISO. */
export function dateValue(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function sortLinesByDate(lines: CommissionLine[]): CommissionLine[] {
  return [...lines].sort((a, b) => dateValue(b.date) - dateValue(a.date));
}
