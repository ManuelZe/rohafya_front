import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormField, FormRoot, form, pattern, required } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { SaasAccountService } from '../../saas-account.service';
import { SOURCE_LABELS, SourceType, TenantWithStats } from '../../saas.models';
import { SuperAdminService } from '../../super-admin.service';

@Component({
  selector: 'app-super-tenants',
  imports: [RouterLink, FormField, FormRoot, PIcon, PageHeader],
  templateUrl: './super-tenants.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class SuperTenants {
  private readonly service = inject(SuperAdminService);
  private readonly account = inject(SaasAccountService);
  private readonly router = inject(Router);

  readonly sourceLabels = SOURCE_LABELS;
  /** GNU Health est réservé à l'établissement historique : on ne propose que l'API EDEN et FHIR. */
  readonly sources: SourceType[] = ['api', 'fhir', 'pdf'];

  readonly tenants = signal<TenantWithStats[] | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly showCreate = signal(false);
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly created = signal<TenantWithStats | null>(null);
  readonly model = signal({ name: '', slug: '', source_type: 'api' as SourceType });
  readonly createForm = form(this.model, (f) => {
    required(f.name, { message: "Le nom de l'établissement est requis" });
    pattern(f.slug, /^([a-z0-9][a-z0-9-]{1,78}[a-z0-9])?$/, { message: 'Minuscules, chiffres et tirets (3 caractères minimum)' });
  });

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.tenants().subscribe({
      next: (tenants) => {
        this.tenants.set(tenants);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger les établissements.'));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.model.set({ name: '', slug: '', source_type: 'api' });
    this.createError.set(null);
    this.showCreate.set(true);
  }

  create(): void {
    if (this.createForm().invalid() || this.creating()) return;
    const { name, slug, source_type } = this.model();
    this.creating.set(true);
    this.createError.set(null);
    this.service.createTenant({ name: name.trim(), slug: slug.trim() || undefined, source_type }).subscribe({
      next: (tenant) => {
        this.creating.set(false);
        this.showCreate.set(false);
        this.created.set(tenant);
        this.account.load(true).subscribe();
        this.load();
      },
      error: (err: unknown) => {
        this.creating.set(false);
        this.createError.set(extractErrorMessage(err, "La création a échoué."));
      },
    });
  }

  copy(text: string): void {
    navigator.clipboard?.writeText(text);
  }

  openCreated(): void {
    const tenant = this.created();
    this.created.set(null);
    if (tenant) void this.router.navigate(['/super-admin/etablissements', tenant.id]);
  }
}
