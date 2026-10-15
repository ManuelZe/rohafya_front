import { Component, PLATFORM_ID, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { FormField, FormRoot, form, maxLength, pattern } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { I18n } from '../../../shared/i18n/i18n';
import { LocalDatePipe } from '../../../shared/i18n/ldate.pipe';
import { TranslatePipe } from '../../../shared/i18n/t.pipe';
import { logoDataUrl } from '../../../shared/pdf/pdf-engine';
import { PdfButton, PdfSource } from '../../../shared/pdf/pdf-button';
import {
  BILLING_CYCLE_LABELS,
  BillingCycle,
  INVOICE_STATUS_LABELS,
  Invoice,
  PLAN_CODES,
  PLAN_LABELS,
  PlanCode,
  SUBSCRIPTION_STATUS_LABELS,
  SubscriptionStatus,
  UsageSummary,
  formatAmount,
} from '../../billing.models';
import { UsageHistory } from '../../shared/billing/usage-history';
import { UsageMeter } from '../../shared/billing/usage-meter';
import { invoiceFileName, invoicePdfDefinition } from '../../shared/billing/invoice-pdf';
import { SuperAdminService } from '../../super-admin.service';

interface SubscriptionModel {
  plan: PlanCode;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  billed: boolean;
  trial_ends_at: string;
  next_invoice_on: string;
  custom_quota: string;
  custom_monthly_price: string;
  custom_setup_fee: string;
  setup_fee_waived: boolean;
  free_months: string;
  note: string;
}

const DIGITS = /^\d*$/;

/** Abonnement d'un établissement, réglé par le super-administrateur (fiche établissement). */
@Component({
  selector: 'app-subscription-editor',
  imports: [TranslatePipe, LocalDatePipe, PIcon, FormRoot, FormField, UsageMeter, UsageHistory, PdfButton],
  templateUrl: './subscription-editor.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css', '../../admin/subscription/admin-subscription.css'],
})
export class SubscriptionEditor {
  private readonly service = inject(SuperAdminService);
  private readonly i18n = inject(I18n);
  private readonly platformId = inject(PLATFORM_ID);

  readonly tenantId = input.required<number>();

  readonly data = signal<UsageSummary | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly issuing = signal(false);
  readonly issueNotice = signal<{ text: string; count: number } | null>(null);

  readonly plans = PLAN_CODES;
  readonly planLabels = PLAN_LABELS;
  readonly statuses = Object.keys(SUBSCRIPTION_STATUS_LABELS) as SubscriptionStatus[];
  readonly statusLabels = SUBSCRIPTION_STATUS_LABELS;
  readonly cycles = Object.keys(BILLING_CYCLE_LABELS) as BillingCycle[];
  readonly cycleLabels = BILLING_CYCLE_LABELS;
  readonly invoiceLabels = INVOICE_STATUS_LABELS;

  readonly model = signal<SubscriptionModel>({
    plan: 'standard', status: 'essai', billing_cycle: 'mensuel', billed: true, trial_ends_at: '', next_invoice_on: '',
    custom_quota: '', custom_monthly_price: '', custom_setup_fee: '', setup_fee_waived: false, free_months: '0', note: '',
  });
  readonly subForm = form(this.model, (f) => {
    const digits = { message: 'Nombre entier attendu' };
    pattern(f.custom_quota, DIGITS, digits);
    pattern(f.custom_monthly_price, DIGITS, digits);
    pattern(f.custom_setup_fee, DIGITS, digits);
    pattern(f.free_months, DIGITS, digits);
    maxLength(f.note, 2000, { message: '2000 caractères au plus.' });
  });
  readonly isNetwork = computed(() => this.model().plan === 'reseau');

  constructor() {
    effect(() => {
      const id = this.tenantId();
      if (!id || !isPlatformBrowser(this.platformId)) return;
      untracked(() => this.load(id));
    });
  }

  money(amount: number): string {
    return formatAmount(amount, this.i18n.locale());
  }

  load(id = this.tenantId()): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.subscription(id).subscribe({
      next: (data) => this.apply(data),
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, "Impossible de charger l'abonnement."));
        this.loading.set(false);
      },
    });
  }

  private apply(data: UsageSummary): void {
    const s = data.subscription;
    const text = (value: number | null) => (value === null ? '' : String(value));
    this.data.set(data);
    this.loading.set(false);
    this.model.set({
      plan: s.plan, status: s.status, billing_cycle: s.billing_cycle, billed: s.billed,
      trial_ends_at: s.trial_ends_at ?? '', next_invoice_on: s.next_invoice_on ?? '',
      custom_quota: text(s.custom_quota), custom_monthly_price: text(s.custom_monthly_price), custom_setup_fee: text(s.custom_setup_fee),
      setup_fee_waived: s.setup_fee_waived, free_months: String(s.free_months), note: s.note ?? '',
    });
  }

  save(): void {
    if (this.saving() || this.subForm().invalid()) return;
    const m = this.model();
    const num = (value: string) => (value.trim() === '' ? '' : Number(value));
    this.saving.set(true);
    this.saved.set(false);
    this.saveError.set(null);
    this.service
      .updateSubscription(this.tenantId(), {
        plan: m.plan, status: m.status, billing_cycle: m.billing_cycle, billed: m.billed,
        trial_ends_at: m.trial_ends_at || null, next_invoice_on: m.next_invoice_on || null,
        custom_quota: num(m.custom_quota), custom_monthly_price: num(m.custom_monthly_price), custom_setup_fee: num(m.custom_setup_fee),
        setup_fee_waived: m.setup_fee_waived, free_months: Number(m.free_months || 0), note: m.note,
      })
      .subscribe({
        next: (data) => {
          this.apply(data);
          this.saving.set(false);
          this.saved.set(true);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.saveError.set(extractErrorMessage(err, "L'abonnement n'a pas pu être enregistré."));
        },
      });
  }

  issue(): void {
    if (this.issuing()) return;
    this.issuing.set(true);
    this.issueNotice.set(null);
    this.service.issueInvoices(this.tenantId()).subscribe({
      next: (result) => {
        this.issuing.set(false);
        this.issueNotice.set({ text: result.count ? '{0} facture(s) émise(s).' : 'Aucune facture à émettre aujourd’hui.', count: result.count });
        this.load();
      },
      error: (err: unknown) => {
        this.issuing.set(false);
        this.issueNotice.set({ text: extractErrorMessage(err, 'Les factures n’ont pas pu être émises.'), count: 0 });
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
