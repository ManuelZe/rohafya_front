import { Component, PLATFORM_ID, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormField, FormRoot, email, form, max, min, pattern, required } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { TenantContext } from '../../admin/tenant-context.service';
import { SaasAccountService } from '../../saas-account.service';
import { SOURCE_LABELS, SourceType, TenantAdminView, TenantWithStats, quotaLabel } from '../../saas.models';
import { SuperAdminService } from '../../super-admin.service';

interface TenantModel {
  name: string;
  slug: string;
  source_type: SourceType;
  is_active: boolean;
  commissions_enabled: boolean;
  pdf_ai_enabled: boolean;
  pdf_quota_files: number;
  pdf_quota_days: number;
}

@Component({
  selector: 'app-super-tenant-detail',
  imports: [DatePipe, RouterLink, FormField, FormRoot, PIcon, PageHeader],
  templateUrl: './super-tenant-detail.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class SuperTenantDetail {
  private readonly service = inject(SuperAdminService);
  private readonly account = inject(SaasAccountService);
  private readonly tenantContext = inject(TenantContext);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  /** Identifiant de l'établissement (paramètre de route :id). */
  readonly id = input.required<string>();
  readonly tenantId = computed(() => Number(this.id()));

  readonly sourceLabels = SOURCE_LABELS;
  readonly tenant = signal<TenantWithStats | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isGnuHealth = computed(() => this.tenant()?.source_type === 'gnuhealth');
  readonly sources = computed<SourceType[]>(() => (this.isGnuHealth() ? ['gnuhealth'] : ['api', 'fhir', 'pdf']));

  readonly model = signal<TenantModel>({ name: '', slug: '', source_type: 'api', is_active: true, commissions_enabled: false, pdf_ai_enabled: false, pdf_quota_files: 10, pdf_quota_days: 1 });
  readonly tenantForm = form(this.model, (f) => {
    required(f.name, { message: 'Le nom est requis' });
    required(f.slug, { message: "L'identifiant est requis" });
    pattern(f.slug, /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/, { message: 'Minuscules, chiffres et tirets (3 caractères minimum)' });
    required(f.pdf_quota_files, { message: 'Nombre de fichiers requis' });
    min(f.pdf_quota_files, 1, { message: 'Au moins 1 fichier' });
    max(f.pdf_quota_files, 10000, { message: '10 000 fichiers au maximum' });
    required(f.pdf_quota_days, { message: 'Nombre de jours requis' });
    min(f.pdf_quota_days, 1, { message: 'Au moins 1 jour' });
    max(f.pdf_quota_days, 365, { message: '365 jours au maximum' });
  });
  readonly quotaPreview = computed(() => {
    const { pdf_quota_files, pdf_quota_days } = this.model();
    return pdf_quota_files >= 1 && pdf_quota_days >= 1 ? quotaLabel(pdf_quota_files, pdf_quota_days) : '';
  });
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly newKey = signal<string | null>(null);
  readonly confirmRotate = signal(false);
  readonly rotating = signal(false);

  readonly admins = signal<TenantAdminView[] | null>(null);
  readonly adminModel = signal({ email: '', first_name: '', last_name: '' });
  readonly adminForm = form(this.adminModel, (f) => {
    required(f.email, { message: "L'e-mail est requis" });
    email(f.email, { message: 'Adresse e-mail invalide' });
  });
  readonly addingAdmin = signal(false);
  readonly adminError = signal<string | null>(null);
  readonly adminNotice = signal<string | null>(null);
  readonly removeAdminTarget = signal<TenantAdminView | null>(null);

  readonly confirmDelete = signal(false);
  readonly deleteModel = signal({ confirm_slug: '' });
  readonly deleteForm = form(this.deleteModel, (f) => {
    required(f.confirm_slug, { message: "Saisissez l'identifiant de l'établissement" });
  });
  readonly slugMatches = computed(() => this.deleteModel().confirm_slug.trim() === this.tenant()?.slug);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.tenantId();
      if (!id || !isPlatformBrowser(this.platformId)) return;
      untracked(() => this.load(id));
    });
  }

  load(id = this.tenantId()): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.tenant(id).subscribe({
      next: (tenant) => {
        this.setTenant(tenant);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Établissement introuvable.'));
        this.loading.set(false);
      },
    });
    this.loadAdmins(id);
  }

  private setTenant(tenant: TenantWithStats): void {
    this.tenant.set(tenant);
    this.model.set({
      name: tenant.name,
      slug: tenant.slug,
      source_type: tenant.source_type,
      is_active: tenant.is_active,
      commissions_enabled: !!tenant.settings?.commissions_enabled,
      pdf_ai_enabled: !!tenant.settings?.pdf_ai_enabled,
      pdf_quota_files: tenant.settings?.pdf_quota_files ?? 10,
      pdf_quota_days: tenant.settings?.pdf_quota_days ?? 1,
    });
  }

  private loadAdmins(id: number): void {
    this.service.admins(id).subscribe({
      next: (admins) => this.admins.set(admins),
      error: () => this.admins.set([]),
    });
  }

  save(): void {
    if (this.tenantForm().invalid() || this.saving()) return;
    const value = this.model();
    this.saving.set(true);
    this.saved.set(false);
    this.saveError.set(null);
    this.service
      .updateTenant(this.tenantId(), {
        name: value.name.trim(),
        slug: value.slug.trim(),
        source_type: value.source_type,
        is_active: value.is_active,
        settings: {
          commissions_enabled: value.commissions_enabled,
          pdf_ai_enabled: value.pdf_ai_enabled,
          pdf_quota_files: Number(value.pdf_quota_files),
          pdf_quota_days: Number(value.pdf_quota_days),
        },
      })
      .subscribe({
        next: (tenant) => {
          this.saving.set(false);
          this.saved.set(true);
          this.setTenant(tenant);
          this.account.load(true).subscribe();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.saveError.set(extractErrorMessage(err, "L'enregistrement a échoué."));
        },
      });
  }

  rotate(): void {
    if (this.rotating()) return;
    this.rotating.set(true);
    this.service.rotateApiKey(this.tenantId()).subscribe({
      next: (result) => {
        this.rotating.set(false);
        this.confirmRotate.set(false);
        this.newKey.set(result.api_key);
        this.load();
      },
      error: (err: unknown) => {
        this.rotating.set(false);
        this.confirmRotate.set(false);
        this.saveError.set(extractErrorMessage(err, "Impossible de générer une clé."));
      },
    });
  }

  addAdmin(): void {
    if (this.adminForm().invalid() || this.addingAdmin()) return;
    const value = this.adminModel();
    this.addingAdmin.set(true);
    this.adminError.set(null);
    this.adminNotice.set(null);
    this.service
      .addAdmin(this.tenantId(), { email: value.email.trim(), first_name: value.first_name.trim(), last_name: value.last_name.trim() })
      .subscribe({
        next: (admin) => {
          this.addingAdmin.set(false);
          this.adminForm().reset({ email: '', first_name: '', last_name: '' });
          this.adminNotice.set(
            admin.email_sent
              ? `${admin.email} peut maintenant se connecter avec un code envoyé par e-mail. Une invitation lui a été envoyée.`
              : `${admin.email} est administrateur, mais l'e-mail d'invitation n'a pas pu partir : prévenez-le directement.`
          );
          this.loadAdmins(this.tenantId());
        },
        error: (err: unknown) => {
          this.addingAdmin.set(false);
          this.adminError.set(extractErrorMessage(err, "L'ajout a échoué."));
        },
      });
  }

  removeAdmin(): void {
    const admin = this.removeAdminTarget();
    if (!admin) return;
    this.service.removeAdmin(this.tenantId(), admin.user_id).subscribe({
      next: () => {
        this.removeAdminTarget.set(null);
        this.loadAdmins(this.tenantId());
      },
      error: (err: unknown) => {
        this.removeAdminTarget.set(null);
        this.adminError.set(extractErrorMessage(err, 'Le retrait a échoué.'));
      },
    });
  }

  openDelete(): void {
    this.deleteForm().reset({ confirm_slug: '' });
    this.deleteError.set(null);
    this.confirmDelete.set(true);
  }

  deleteTenant(): void {
    if (!this.slugMatches() || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    this.service.deleteTenant(this.tenantId(), this.deleteModel().confirm_slug.trim()).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmDelete.set(false);
        this.account.load(true).subscribe();
        void this.router.navigateByUrl('/super-admin/etablissements');
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.deleteError.set(extractErrorMessage(err, 'La suppression a échoué.'));
      },
    });
  }

  administer(): void {
    this.tenantContext.select(this.tenantId());
    void this.router.navigateByUrl('/admin');
  }

  copy(text: string): void {
    navigator.clipboard?.writeText(text);
  }
}
