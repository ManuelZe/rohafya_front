import { Component, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { Pager } from '../../shared/pager';
import { IssuedLinkToken, LINK_STATUS_LABELS, TenantPatientRow } from '../../saas.models';
import { TenantAdminService } from '../../tenant-admin.service';
import { QrTicket } from '../shared/qr-ticket';
import { TenantContext } from '../tenant-context.service';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-admin-patients',
  imports: [RouterLink, FormField, FormRoot, PIcon, PageHeader, Pager, QrTicket],
  templateUrl: './admin-patients.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class AdminPatients {
  private readonly service = inject(TenantAdminService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly context = inject(TenantContext);

  readonly statusLabels = LINK_STATUS_LABELS;
  readonly pageSize = PAGE_SIZE;
  readonly rows = signal<TenantPatientRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly query = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly loaded = signal(false);

  readonly ticket = signal<IssuedLinkToken | null>(null);
  readonly issuing = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly isGnuHealth = computed(() => this.context.tenant()?.source_type === 'gnuhealth');

  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly model = signal({ local_ref: '', last_name: '', first_name: '', email: '' });
  readonly patientForm = form(this.model, (f) => {
    required(f.local_ref, { message: 'Le numéro de dossier est requis' });
    required(f.last_name, { message: 'Le nom est requis' });
    email(f.email, { message: 'Adresse e-mail invalide' });
  });

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const id = this.context.tenantId();
      if (!id || !isPlatformBrowser(this.platformId)) return;
      untracked(() => {
        this.page.set(1);
        this.load();
      });
    });
  }

  load(): void {
    const id = this.context.tenantId();
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.service.patients(id, { page: this.page(), page_size: PAGE_SIZE, q: this.query() }).subscribe({
      next: (result) => {
        this.rows.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger les patients.'));
        this.loading.set(false);
      },
    });
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 300);
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  issueQr(row: TenantPatientRow): void {
    const id = this.context.tenantId();
    if (!id || this.issuing()) return;
    this.issuing.set(row.local_ref);
    this.notice.set(null);
    this.service.issueToken(id, row.local_ref, row.email ?? undefined).subscribe({
      next: (token) => {
        this.issuing.set(null);
        if (token.already_linked) {
          this.notice.set(`Le dossier ${row.local_ref} est déjà rattaché à un compte EDEN : aucun QR code n'est nécessaire.`);
        } else {
          this.ticket.set(token);
        }
      },
      error: (err: unknown) => {
        this.issuing.set(null);
        this.error.set(extractErrorMessage(err, 'Impossible de générer le QR code.'));
      },
    });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    this.formError.set(null);
  }

  savePatient(): void {
    const id = this.context.tenantId();
    if (!id || this.patientForm().invalid() || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    this.service.savePatient(id, this.model()).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.notice.set(`Dossier ${this.model().local_ref} enregistré.`);
        this.patientForm().reset({ local_ref: '', last_name: '', first_name: '', email: '' });
        this.load();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.formError.set(extractErrorMessage(err, "L'enregistrement a échoué."));
      },
    });
  }

  fullName(row: TenantPatientRow): string {
    return [row.last_name, row.first_name].filter(Boolean).join(' ') || '—';
  }
}
