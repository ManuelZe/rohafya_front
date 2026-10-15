import { InvoiceDetail, formatAmount, formatCount, invoiceLineLabel } from '../../billing.models';
import { invoiceFileName, invoicePdfDefinition } from './invoice-pdf';

describe('facture d’établissement', () => {
  const invoice: InvoiceDetail = {
    id: 1,
    number: 'ROH-202610-0001',
    tenant_id: 3,
    establishment: 'Laboratoire Horizon',
    plan: 'standard',
    plan_label: 'Standard',
    billing_cycle: 'annuel',
    period_start: '2026-10-01',
    period_end: '2027-09-30',
    lines: [
      { type: 'subscription', plan: 'standard', cycle: 'annuel', months: 12, quantity: 10, unit_price: 50000, amount: 500000 },
      { type: 'free_month', quantity: 1, unit_price: -50000, amount: -50000 },
      { type: 'setup_waived', quantity: 1, unit_price: 0, amount: 0 },
    ],
    total: 450000,
    status: 'emise',
    overdue: false,
    issued_on: '2026-10-01',
    due_on: '2026-10-16',
    paid_on: null,
    payment_reference: null,
    note: null,
    issuer: { name: 'ROHAFYA', address: 'Yaoundé', tax_id: 'M0123', registry: 'RC/YAO/2026/B/1', contact: '', payment: 'MTN MoMo 6 95 99 58 42' },
  };

  it('nomme chaque ligne selon son type', () => {
    expect(invoiceLineLabel(invoice.lines[0])).toBe('Abonnement Standard · 12 mois, dont 2 offerts');
    expect(invoiceLineLabel(invoice.lines[1])).toBe('Mois offert (parrainage)');
    expect(invoiceLineLabel(invoice.lines[2])).toBe('Mise en service offerte (programme fondateurs)');
  });

  it('formate montants et volumes selon la langue', () => {
    expect(formatAmount(450000, 'en-GB')).toBe('450,000 FCFA');
    expect(formatAmount(450000, 'fr-FR').replace(/\s/g, ' ')).toBe('450 000 FCFA');
    expect(formatCount(2000, 'en-GB')).toBe('2,000');
    expect(formatCount(null, 'fr-FR')).toBe('—');
  });

  it('reprend l’établissement, les lignes, le total et les mentions de l’émetteur', () => {
    const text = JSON.stringify(invoicePdfDefinition(invoice));
    expect(text).toContain('Laboratoire Horizon');
    expect(text).toContain('ROH-202610-0001');
    expect(text).toContain('450 000 FCFA');
    expect(text).not.toMatch(/ /);
    expect(text).toContain('À régler avant le 16/10/2026');
    expect(text).toContain('RCCM : RC/YAO/2026/B/1');
    expect(text).toContain('MTN MoMo');
    expect(invoiceFileName(invoice)).toBe('facture-ROH-202610-0001.pdf');
  });
});
