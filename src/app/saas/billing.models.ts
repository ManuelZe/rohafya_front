import { tr } from '../shared/i18n/i18n';

/** Abonnements des établissements : formules, volume publié, factures (voir Rohafya/saas/billing.py). */

export type PlanCode = 'essentiel' | 'standard' | 'avance' | 'reseau';
export type SubscriptionStatus = 'essai' | 'actif' | 'suspendu' | 'resilie';
export type BillingCycle = 'mensuel' | 'trimestriel' | 'annuel';
export type InvoiceStatus = 'emise' | 'payee' | 'annulee';

export const PLAN_CODES: PlanCode[] = ['essentiel', 'standard', 'avance', 'reseau'];
export const PLAN_LABELS: Record<PlanCode, string> = {
  essentiel: 'Essentiel',
  standard: 'Standard',
  avance: 'Avancé',
  reseau: 'Réseau ou hôpital',
};
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  essai: 'Essai',
  actif: 'Abonné',
  suspendu: 'Suspendu',
  resilie: 'Résilié',
};
export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  annuel: 'Annuel (2 mois offerts)',
};
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  emise: 'À régler',
  payee: 'Payée',
  annulee: 'Annulée',
};

export interface Subscription {
  tenant_id: number;
  plan: PlanCode;
  plan_label: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  billed: boolean;
  trial_ends_at: string | null;
  trial_days_left: number | null;
  next_invoice_on: string | null;
  quota: number | null;
  monthly_price: number;
  setup_fee: number;
  cycle_months: number;
  cycle_price: number;
  custom_quota: number | null;
  custom_monthly_price: number | null;
  custom_setup_fee: number | null;
  setup_fee_waived: boolean;
  setup_invoiced: boolean;
  free_months: number;
  note: string | null;
}

export interface UsagePoint {
  period: string;
  count: number;
}

export interface UsageCurrent extends UsagePoint {
  quota: number | null;
  percent: number | null;
}

export interface PlanRecommendation {
  plan: PlanCode;
  plan_label: string;
  direction: 'up' | 'down';
  months: UsagePoint[];
  applies_from: string;
}

export type InvoiceLineType = 'subscription' | 'free_month' | 'setup' | 'setup_waived';

export interface InvoiceLine {
  type: InvoiceLineType;
  plan?: PlanCode;
  cycle?: BillingCycle;
  months?: number;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: number;
  number: string;
  tenant_id: number | null;
  establishment: string;
  plan: PlanCode | null;
  plan_label: string | null;
  billing_cycle: BillingCycle | null;
  period_start: string | null;
  period_end: string | null;
  lines: InvoiceLine[];
  total: number;
  status: InvoiceStatus;
  overdue: boolean;
  issued_on: string;
  due_on: string;
  paid_on: string | null;
  payment_reference: string | null;
  note: string | null;
}

export interface InvoiceIssuer {
  name: string;
  address: string;
  tax_id: string;
  registry: string;
  contact: string;
  payment: string;
}

export interface InvoiceDetail extends Invoice {
  issuer: InvoiceIssuer;
}

export interface UsageSummary {
  subscription: Subscription;
  current: UsageCurrent;
  history: UsagePoint[];
  recommendation: PlanRecommendation | null;
  invoices: Invoice[];
}

/** Volume affiché au tableau de bord de l'établissement. */
export interface DashboardUsage extends UsageCurrent {
  subscription: Subscription;
}

export interface BillingOverviewRow {
  tenant_id: number;
  establishment: string;
  is_active: boolean;
  subscription: Subscription;
  usage: UsageCurrent;
  unpaid: { count: number; amount: number; overdue: number };
}

export interface BillingOverview {
  tenants: BillingOverviewRow[];
  totals: { monthly_recurring: number; trials: number; trials_ending: number; unpaid_amount: number; overdue: number };
}

export interface SubscriptionUpdate {
  plan?: PlanCode;
  status?: SubscriptionStatus;
  billing_cycle?: BillingCycle;
  billed?: boolean;
  trial_ends_at?: string | null;
  next_invoice_on?: string | null;
  custom_quota?: number | '' | null;
  custom_monthly_price?: number | '' | null;
  custom_setup_fee?: number | '' | null;
  setup_fee_waived?: boolean;
  free_months?: number;
  note?: string;
}

/** Libellé d'une ligne de facture, dans la langue de l'interface. */
export function invoiceLineLabel(line: InvoiceLine): string {
  switch (line.type) {
    case 'subscription':
      return tr('Abonnement {plan} · {cycle}', {
        plan: tr(PLAN_LABELS[line.plan ?? 'standard']),
        cycle: tr(line.cycle === 'annuel' ? '12 mois, dont 2 offerts' : line.cycle === 'trimestriel' ? '3 mois' : '1 mois'),
      });
    case 'free_month':
      return tr('Mois offert (parrainage)');
    case 'setup':
      return tr('Frais de mise en service');
    case 'setup_waived':
      return tr('Mise en service offerte (programme fondateurs)');
  }
}

/** « 2026-10 » → 1er octobre 2026 (date locale, pour les libellés de mois). */
export function periodDate(period: string): Date {
  const [year, month] = period.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

/** Nombre selon la langue : « 2 000 » ou « 2,000 ». */
export function formatCount(value: number | null | undefined, locale: string): string {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

/** Montant en FCFA selon la langue : « 12 750 FCFA » ou « 12,750 FCFA ». */
export function formatAmount(amount: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)} FCFA`;
}
