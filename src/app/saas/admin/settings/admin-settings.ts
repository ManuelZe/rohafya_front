import { Component, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { FormField, FormRoot, email, form, max, min, required } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { SaasAccountService } from '../../saas-account.service';
import { PdfQuota, TenantSettings, quotaLabel } from '../../saas.models';
import { PDF_IMPORT_ENABLED } from '../../features';
import { TenantAdminService } from '../../tenant-admin.service';
import { TenantContext } from '../tenant-context.service';

interface SettingsModel {
  display_name: string;
  contact_email: string;
  contact_phone: string;
  result_access_days: number;
  link_token_days: number;
  block_unpaid_results: boolean;
  primary_color: string;
}

function emptyModel(): SettingsModel {
  return {
    display_name: '',
    contact_email: '',
    contact_phone: '',
    result_access_days: 90,
    link_token_days: 30,
    block_unpaid_results: true,
    primary_color: '#1a54c9',
  };
}

@Component({
  selector: 'app-admin-settings',
  imports: [DatePipe, FormField, FormRoot, PIcon, PageHeader],
  templateUrl: './admin-settings.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class AdminSettings {
  private readonly service = inject(TenantAdminService);
  private readonly account = inject(SaasAccountService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly context = inject(TenantContext);

  readonly model = signal<SettingsModel>(emptyModel());
  readonly settingsForm = form(this.model, (f) => {
    required(f.display_name, { message: "Le nom affiché est requis" });
    email(f.contact_email, { message: 'Adresse e-mail invalide' });
    required(f.result_access_days, { message: 'Durée requise' });
    min(f.result_access_days, 1, { message: '1 jour minimum' });
    max(f.result_access_days, 3650, { message: '3650 jours maximum' });
    required(f.link_token_days, { message: 'Durée requise' });
    min(f.link_token_days, 1, { message: '1 jour minimum' });
    max(f.link_token_days, 365, { message: '365 jours maximum' });
  });

  readonly loading = signal(false);
  /** Réglages fixés par le super-administrateur : affichés ici, non modifiables. */
  readonly managed = signal<TenantSettings | null>(null);
  /** Faux : réglages PDF affichés grisés (fonctionnalité disponible prochainement). */
  readonly pdfEnabled = PDF_IMPORT_ENABLED;
  readonly pdfQuota = signal<PdfQuota | null>(null);
  readonly pdfAvailable = signal(true);
  readonly quotaText = computed(() => {
    const s = this.managed();
    return s ? quotaLabel(s.pdf_quota_files, s.pdf_quota_days) : '—';
  });
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saved = signal(false);

  constructor() {
    effect(() => {
      const id = this.context.tenantId();
      if (!id || !isPlatformBrowser(this.platformId)) return;
      untracked(() => this.load(id));
    });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.saved.set(false);
    this.service.tenant(id).subscribe({
      next: (tenant) => {
        this.model.set(this.toModel(tenant.settings));
        this.managed.set(tenant.settings ?? null);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger les paramètres.'));
        this.loading.set(false);
      },
    });
    if (!this.pdfEnabled) return;
    this.service.pdfImports(id, { page: 1, page_size: 1 }).subscribe({
      next: (list) => {
        this.pdfQuota.set(list.quota);
        this.pdfAvailable.set(list.available);
      },
      error: () => this.pdfQuota.set(null),
    });
  }

  save(): void {
    const id = this.context.tenantId();
    if (!id || this.settingsForm().invalid() || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.saved.set(false);
    const value = this.model();
    this.service
      .updateSettings(id, { ...value, result_access_days: Number(value.result_access_days), link_token_days: Number(value.link_token_days) })
      .subscribe({
        next: (tenant) => {
          this.saving.set(false);
          this.saved.set(true);
          this.model.set(this.toModel(tenant.settings));
          this.account.load(true).subscribe();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(extractErrorMessage(err, "L'enregistrement a échoué."));
        },
      });
  }

  private toModel(settings: TenantSettings | undefined): SettingsModel {
    const base = emptyModel();
    if (!settings) return base;
    return {
      display_name: settings.display_name ?? base.display_name,
      contact_email: settings.contact_email ?? '',
      contact_phone: settings.contact_phone ?? '',
      result_access_days: settings.result_access_days ?? base.result_access_days,
      link_token_days: settings.link_token_days ?? base.link_token_days,
      block_unpaid_results: settings.block_unpaid_results ?? base.block_unpaid_results,
      primary_color: settings.primary_color || base.primary_color,
    };
  }
}
