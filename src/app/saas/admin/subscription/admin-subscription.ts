import { Component, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { I18n } from '../../../shared/i18n/i18n';
import { LocalDatePipe } from '../../../shared/i18n/ldate.pipe';
import { TranslatePipe } from '../../../shared/i18n/t.pipe';
import { logoDataUrl } from '../../../shared/pdf/pdf-engine';
import { PdfButton, PdfSource } from '../../../shared/pdf/pdf-button';
import {
  BILLING_CYCLE_LABELS,
  INVOICE_STATUS_LABELS,
  Invoice,
  PLAN_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  UsageSummary,
  formatAmount,
  formatCount,
} from '../../billing.models';
import { UsageHistory } from '../../shared/billing/usage-history';
import { UsageMeter } from '../../shared/billing/usage-meter';
import { invoiceFileName, invoicePdfDefinition } from '../../shared/billing/invoice-pdf';
import { TenantAdminService } from '../../tenant-admin.service';
import { TenantContext } from '../tenant-context.service';

/** Abonnement de l'établissement : formule, volume publié, factures (lecture seule). */
@Component({
  selector: 'app-admin-subscription',
  imports: [TranslatePipe, LocalDatePipe, PIcon, PageHeader, UsageMeter, UsageHistory, PdfButton],
  templateUrl: './admin-subscription.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css', './admin-subscription.css'],
})
export class AdminSubscription {
  private readonly service = inject(TenantAdminService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly i18n = inject(I18n);
  readonly context = inject(TenantContext);

  readonly data = signal<UsageSummary | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly planLabels = PLAN_LABELS;
  readonly statusLabels = SUBSCRIPTION_STATUS_LABELS;
  readonly cycleLabels = BILLING_CYCLE_LABELS;
  readonly invoiceLabels = INVOICE_STATUS_LABELS;
  readonly sub = computed(() => this.data()?.subscription ?? null);

  constructor() {
    effect(() => {
      const id = this.context.tenantId();
      if (!id || !isPlatformBrowser(this.platformId)) return;
      untracked(() => this.load(id));
    });
  }

  count(value: number | null): string {
    return formatCount(value, this.i18n.locale());
  }

  money(amount: number): string {
    return formatAmount(amount, this.i18n.locale());
  }

  load(id = this.context.tenantId()): void {
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.service.subscription(id).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, "Impossible de charger l'abonnement."));
        this.loading.set(false);
      },
    });
  }

  pdf(invoice: Invoice): PdfSource {
    return async () => {
      const id = this.context.tenantId()!;
      const [detail, logo] = await Promise.all([firstValueFrom(this.service.invoice(id, invoice.id)), logoDataUrl()]);
      return { definition: invoicePdfDefinition(detail, logo), fileName: invoiceFileName(detail) };
    };
  }
}
