import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { firstValueFrom } from 'rxjs';
import { FormField, FormRoot, form, maxLength } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { KpiTile } from '../../../shared/kpi-tile/kpi-tile';
import { I18n } from '../../../shared/i18n/i18n';
import { LocalDatePipe } from '../../../shared/i18n/ldate.pipe';
import { TranslatePipe } from '../../../shared/i18n/t.pipe';
import { logoDataUrl } from '../../../shared/pdf/pdf-engine';
import { PdfButton, PdfSource } from '../../../shared/pdf/pdf-button';
import {
  BillingOverview,
  INVOICE_STATUS_LABELS,
  Invoice,
  InvoiceStatus,
  SUBSCRIPTION_STATUS_LABELS,
  formatAmount,
} from '../../billing.models';
import { Paged } from '../../saas.models';
import { Pager } from '../../shared/pager';
import { UsageMeter } from '../../shared/billing/usage-meter';
import { invoiceFileName, invoicePdfDefinition } from '../../shared/billing/invoice-pdf';
import { SuperAdminService } from '../../super-admin.service';

type InvoiceFilter = InvoiceStatus | 'overdue' | '';
const PAGE_SIZE = 25;

/** Facturation des établissements : abonnements, volume du mois, factures et paiements. */
@Component({
  selector: 'app-super-billing',
  imports: [TranslatePipe, LocalDatePipe, RouterLink, CdkTrapFocus, FormRoot, FormField, PIcon, PageHeader, KpiTile, Pager, UsageMeter, PdfButton],
  templateUrl: './super-billing.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css', '../../admin/subscription/admin-subscription.css'],
  host: { '(document:keydown.escape)': 'closePayment()' },
})
export class SuperBilling {
  private readonly service = inject(SuperAdminService);
  private readonly i18n = inject(I18n);

  readonly pageSize = PAGE_SIZE;
  readonly statusLabels = SUBSCRIPTION_STATUS_LABELS;
  readonly invoiceLabels = INVOICE_STATUS_LABELS;
  readonly filters: { value: InvoiceFilter; label: string }[] = [
    { value: 'emise', label: 'À régler' },
    { value: 'overdue', label: 'En retard' },
    { value: 'payee', label: 'Payées' },
    { value: 'annulee', label: 'Annulées' },
    { value: '', label: 'Toutes' },
  ];

  readonly overview = signal<BillingOverview | null>(null);
  readonly invoices = signal<Paged<Invoice> | null>(null);
  readonly filter = signal<InvoiceFilter>('emise');
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly issuing = signal(false);
  readonly notice = signal<{ text: string; count: number } | null>(null);

  readonly paying = signal<Invoice | null>(null);
  readonly payModel = signal({ payment_reference: '', paid_on: '', note: '' });
  readonly payForm = form(this.payModel, (f) => {
    maxLength(f.payment_reference, 120, { message: '120 caractères au plus.' });
  });
  readonly payError = signal<string | null>(null);
  readonly saving = signal(false);

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) this.load();
  }

  money(amount: number): string {
    return formatAmount(amount, this.i18n.locale());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.billing().subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger la facturation.'));
        this.loading.set(false);
      },
    });
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.service.invoices({ status: this.filter(), page: this.page() }).subscribe({
      next: (page) => this.invoices.set(page),
      error: (err: unknown) => this.error.set(extractErrorMessage(err, 'Impossible de charger les factures.')),
    });
  }

  setFilter(value: InvoiceFilter): void {
    this.filter.set(value);
    this.page.set(1);
    this.loadInvoices();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.loadInvoices();
  }

  issue(): void {
    if (this.issuing()) return;
    this.issuing.set(true);
    this.notice.set(null);
    this.service.issueInvoices().subscribe({
      next: (result) => {
        this.issuing.set(false);
        this.notice.set({ text: result.count ? '{0} facture(s) émise(s).' : 'Aucune facture à émettre aujourd’hui.', count: result.count });
        this.load();
      },
      error: (err: unknown) => {
        this.issuing.set(false);
        this.notice.set({ text: extractErrorMessage(err, 'Les factures n’ont pas pu être émises.'), count: 0 });
      },
    });
  }

  openPayment(invoice: Invoice): void {
    this.paying.set(invoice);
    this.payError.set(null);
    this.payModel.set({ payment_reference: invoice.payment_reference ?? '', paid_on: new Date().toISOString().slice(0, 10), note: invoice.note ?? '' });
  }

  closePayment(): void {
    this.paying.set(null);
  }

  markPaid(): void {
    const invoice = this.paying();
    if (!invoice || this.saving() || this.payForm().invalid()) return;
    this.update(invoice, { status: 'payee', ...this.payModel() });
  }

  cancel(invoice: Invoice): void {
    this.update(invoice, { status: 'annulee' });
  }

  private update(invoice: Invoice, payload: { status: InvoiceStatus; payment_reference?: string; paid_on?: string; note?: string }): void {
    this.saving.set(true);
    this.payError.set(null);
    this.service.updateInvoice(invoice.id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.paying.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const message = extractErrorMessage(err, 'La facture n’a pas pu être modifiée.');
        if (this.paying()) this.payError.set(message);
        else this.error.set(message);
      },
    });
  }

  pdf(invoice: Invoice): PdfSource {
    return async () => {
      const [detail, logo] = await Promise.all([firstValueFrom(this.service.invoice(invoice.id)), logoDataUrl()]);
      return { definition: invoicePdfDefinition(detail, logo), fileName: invoiceFileName(detail) };
    };
  }
}
