import { InvoiceDetail, InvoiceLine, Invoice, Subscription, UsagePoint, UsageSummary } from '../saas/billing.models';
import { TenantRow, db, displayName, fail } from './demo-store';

/**
 * Abonnement de démonstration, calculé (rien n'est enregistré) : le premier établissement est
 * abonné en formule Standard avec trois factures ; les autres sont en essai.
 */

const ISSUER = { name: 'ROHAFYA (démonstration)', address: 'Yaoundé, Cameroun', tax_id: '', registry: '', contact: 'contact@rohafya.com', payment: 'MTN MoMo ou Orange Money — données fictives' };

function iso(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

function monthStart(offset: number): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + offset, 1);
}

function isFirstTenant(t: TenantRow): boolean {
  return Math.min(...db().tenants.map((x) => x.id)) === t.id;
}

function subscription(t: TenantRow): Subscription {
  const subscribed = isFirstTenant(t);
  const plan = subscribed ? 'standard' : 'essentiel';
  const monthly = subscribed ? 50_000 : 25_000;
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 23);
  return {
    tenant_id: t.id,
    plan,
    plan_label: subscribed ? 'Standard' : 'Essentiel',
    status: subscribed ? 'actif' : 'essai',
    billing_cycle: 'mensuel',
    billed: true,
    trial_ends_at: subscribed ? null : iso(trialEnd),
    trial_days_left: subscribed ? null : 23,
    next_invoice_on: subscribed ? iso(monthStart(1)) : null,
    quota: subscribed ? 2_000 : 500,
    monthly_price: monthly,
    setup_fee: subscribed ? 150_000 : 75_000,
    cycle_months: 1,
    cycle_price: monthly,
    custom_quota: null,
    custom_monthly_price: null,
    custom_setup_fee: null,
    setup_fee_waived: subscribed,
    setup_invoiced: subscribed,
    free_months: 0,
    note: null,
  };
}

function history(t: TenantRow, quota: number): UsagePoint[] {
  const today = new Date();
  const results = db().records.filter((r) => r.tenant_id === t.id && r.kind !== 'facture').length;
  return Array.from({ length: 12 }, (_, i) => {
    const start = monthStart(i - 11);
    const period = iso(start).slice(0, 7);
    // Volume fictif régulier, autour de 70 % de la formule.
    let count = Math.round(quota * (0.55 + ((i * 37 + t.id * 11) % 30) / 100));
    if (i === 11) {
      const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      count = Math.round((count * today.getDate()) / days) + results;
    }
    return { period, count };
  });
}

function invoices(t: TenantRow, sub: Subscription): Invoice[] {
  if (sub.status !== 'actif') return [];
  return [-2, -1, 0].map((offset, index) => {
    const start = monthStart(offset);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const due = new Date(start);
    due.setDate(due.getDate() + 15);
    const lines: InvoiceLine[] = [{ type: 'subscription', plan: sub.plan, cycle: 'mensuel', months: 1, quantity: 1, unit_price: sub.monthly_price, amount: sub.monthly_price }];
    if (index === 0) lines.push({ type: 'setup_waived', quantity: 1, unit_price: 0, amount: 0 });
    const paid = offset < 0;
    return {
      id: t.id * 100 + index + 1,
      number: `ROH-${iso(start).slice(0, 7).replace('-', '')}-${String(t.id).padStart(4, '0')}`,
      tenant_id: t.id,
      establishment: displayName(t),
      plan: sub.plan,
      plan_label: sub.plan_label,
      billing_cycle: 'mensuel',
      period_start: iso(start),
      period_end: iso(end),
      lines,
      total: sub.monthly_price,
      status: paid ? 'payee' : 'emise',
      overdue: false,
      issued_on: iso(start),
      due_on: iso(due),
      paid_on: paid ? iso(new Date(start.getFullYear(), start.getMonth(), 6)) : null,
      payment_reference: paid ? `MOMO-${start.getMonth() + 1}${t.id}482` : null,
      note: null,
    } satisfies Invoice;
  }).reverse();
}

export function demoUsageSummary(t: TenantRow): UsageSummary {
  const sub = subscription(t);
  const points = history(t, sub.quota ?? 0);
  const current = points[points.length - 1];
  return {
    subscription: sub,
    current: { ...current, quota: sub.quota, percent: sub.quota ? Math.round((current.count * 100) / sub.quota) : null },
    history: points,
    recommendation: null,
    invoices: invoices(t, sub),
  };
}

export function demoInvoice(t: TenantRow, invoiceId: number): InvoiceDetail {
  const invoice = demoUsageSummary(t).invoices.find((i) => i.id === invoiceId) ?? fail(404, 'Facture introuvable.');
  return { ...invoice, issuer: ISSUER };
}
