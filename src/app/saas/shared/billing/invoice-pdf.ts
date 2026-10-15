import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { currentLang, tr } from '../../../shared/i18n/i18n';
import { BILLING_CYCLE_LABELS, InvoiceDetail, formatAmount, invoiceLineLabel } from '../../billing.models';

const NAVY = '#0c4562';
const MUTED = '#6b7280';

function locale(): string {
  return currentLang() === 'en' ? 'en-GB' : 'fr-FR';
}

function date(value: string | null): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Les espaces insécables du format français n'existent pas dans la police du PDF : espaces simples. */
function money(amount: number): string {
  return formatAmount(amount, locale()).replace(/[\u202f\u00a0]/g, ' ');
}

export function invoiceFileName(invoice: InvoiceDetail): string {
  return `facture-${invoice.number}.pdf`;
}

/** Facture A4 d'un établissement, dans la langue de l'interface. */
export function invoicePdfDefinition(invoice: InvoiceDetail, logo: string | null = null): TDocumentDefinitions {
  const issuer = invoice.issuer;
  const issuerLines = [issuer.address, issuer.contact].filter((v) => !!v);
  const legal = [issuer.registry ? `RCCM : ${issuer.registry}` : '', issuer.tax_id ? `NIU : ${issuer.tax_id}` : ''].filter((v) => !!v).join(' · ');
  const status =
    invoice.status === 'payee'
      ? tr('Payée le {date}', { date: date(invoice.paid_on) }) + (invoice.payment_reference ? ` · ${invoice.payment_reference}` : '')
      : invoice.status === 'annulee'
        ? tr('Facture annulée')
        : tr('À régler avant le {date}', { date: date(invoice.due_on) });

  const header: Content = {
    columns: [
      {
        width: '*',
        stack: [
          logo ? { image: logo, width: 46, margin: [0, 0, 0, 6] } : { text: '' },
          { text: issuer.name || 'ROHAFYA', bold: true, fontSize: 13, color: NAVY },
          ...issuerLines.map((line) => ({ text: line, fontSize: 8.5, color: MUTED })),
          legal ? { text: legal, fontSize: 8.5, color: MUTED } : { text: '' },
        ],
      },
      {
        width: 'auto',
        alignment: 'right',
        stack: [
          { text: tr('FACTURE'), bold: true, fontSize: 18, color: NAVY },
          { text: invoice.number, fontSize: 11, margin: [0, 2, 0, 8] },
          { text: tr('Émise le {date}', { date: date(invoice.issued_on) }), fontSize: 9 },
          { text: status, fontSize: 9, bold: true, color: invoice.status === 'emise' && invoice.overdue ? '#b91c1c' : NAVY },
        ],
      },
    ],
  };

  const rows = invoice.lines.map((line) => [
    { text: invoiceLineLabel(line) },
    { text: String(line.quantity), alignment: 'center' as const },
    { text: money(line.unit_price), alignment: 'right' as const },
    { text: money(line.amount), alignment: 'right' as const },
  ]);

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 60],
    info: { title: `${tr('Facture')} ${invoice.number}` },
    defaultStyle: { fontSize: 10, color: '#1f2937' },
    content: [
      header,
      {
        margin: [0, 24, 0, 16],
        columns: [
          {
            width: '*',
            stack: [
              { text: tr('Facturé à'), fontSize: 8.5, color: MUTED },
              { text: invoice.establishment, bold: true, fontSize: 12 },
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: tr('Période'), fontSize: 8.5, color: MUTED },
              { text: `${date(invoice.period_start)} – ${date(invoice.period_end)}` },
              invoice.billing_cycle ? { text: tr(BILLING_CYCLE_LABELS[invoice.billing_cycle]), fontSize: 8.5, color: MUTED } : { text: '' },
            ],
          },
        ],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 40, 90, 90],
          body: [
            [
              { text: tr('Désignation'), bold: true, color: '#ffffff', fillColor: NAVY },
              { text: tr('Qté'), bold: true, color: '#ffffff', fillColor: NAVY, alignment: 'center' },
              { text: tr('Prix unitaire'), bold: true, color: '#ffffff', fillColor: NAVY, alignment: 'right' },
              { text: tr('Montant'), bold: true, color: '#ffffff', fillColor: NAVY, alignment: 'right' },
            ],
            ...rows,
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => '#d1d5db',
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
      },
      {
        margin: [0, 12, 0, 0],
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            table: {
              body: [[{ text: tr('Total à payer'), bold: true, margin: [0, 4, 16, 4] }, { text: money(invoice.total), bold: true, fontSize: 13, color: NAVY, margin: [0, 2, 0, 2] }]],
            },
            layout: 'noBorders',
          },
        ],
      },
      { text: tr('Abonnement payé d’avance, en FCFA. Aucune TVA facturée sauf mention contraire.'), fontSize: 8.5, color: MUTED, margin: [0, 18, 0, 0] },
      issuer.payment ? { text: [{ text: tr('Paiement : '), bold: true }, issuer.payment], fontSize: 9, margin: [0, 8, 0, 0] } : { text: '' },
      invoice.note ? { text: invoice.note, fontSize: 9, margin: [0, 8, 0, 0] } : { text: '' },
    ],
    footer: (page: number, pages: number) => ({
      columns: [
        { text: [issuer.name || 'ROHAFYA', legal ? ` · ${legal}` : ''].join(''), width: '*' },
        { text: `${invoice.number} · ${page}/${pages}`, alignment: 'right', width: 'auto' },
      ],
      fontSize: 7.5,
      color: MUTED,
      margin: [40, 20, 40, 0],
    }),
  };
}
