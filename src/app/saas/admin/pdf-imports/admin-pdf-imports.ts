import { Component, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormField, FormRoot, form, maxLength } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { Pager } from '../../shared/pager';
import { HttpErrorResponse } from '@angular/common/http';
import { PDF_STATUS_LABELS, PdfImport, PdfImportStatus, PdfQuota, quotaLabel } from '../../saas.models';
import { PDF_IMPORT_ENABLED } from '../../features';
import { TenantAdminService } from '../../tenant-admin.service';
import { TenantContext } from '../tenant-context.service';

const PAGE_SIZE = 25;
const MAX_BYTES = 10 * 1024 * 1024;

/** Dépôt de comptes rendus PDF et file de relecture de l'établissement. */
@Component({
  selector: 'app-admin-pdf-imports',
  imports: [DatePipe, RouterLink, FormField, FormRoot, PIcon, PageHeader, Pager],
  templateUrl: './admin-pdf-imports.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css', './admin-pdf-imports.css'],
})
export class AdminPdfImports {
  private readonly service = inject(TenantAdminService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  readonly context = inject(TenantContext);

  /** Faux : fonctionnalité affichée en aperçu, grisée et inactive. */
  readonly pdfEnabled = PDF_IMPORT_ENABLED;
  readonly statusLabels = PDF_STATUS_LABELS;
  readonly filters: { value: PdfImportStatus | ''; label: string }[] = [
    { value: 'a_relire', label: 'À relire' },
    { value: 'pret', label: 'Prêts' },
    { value: 'publie', label: 'Publiés' },
    { value: 'rejete', label: 'Rejetés' },
    { value: '', label: 'Tous' },
  ];
  readonly pageSize = PAGE_SIZE;

  readonly status = signal<PdfImportStatus | ''>('');
  readonly page = signal(1);
  readonly items = signal<PdfImport[]>([]);
  readonly total = signal(0);
  readonly counts = signal<Record<PdfImportStatus, number> | null>(null);
  readonly aiAvailable = signal(false);
  readonly quota = signal<PdfQuota | null>(null);
  /** Faux pour l'établissement GNU Health : ses résultats sont lus directement dans GNU Health. */
  readonly available = signal(true);
  readonly quotaText = computed(() => {
    const q = this.quota();
    return q ? quotaLabel(q.limit, q.days) : '';
  });
  readonly quotaReached = computed(() => (this.quota()?.remaining ?? 1) <= 0);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  readonly file = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly model = signal({ local_ref: '', exam_code: '', title: '' });
  readonly uploadForm = form(this.model, (f) => {
    maxLength(f.local_ref, 120, { message: '120 caractères maximum' });
    maxLength(f.exam_code, 120, { message: '120 caractères maximum' });
    maxLength(f.title, 200, { message: '200 caractères maximum' });
  });

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
    // Fonctionnalité fermée : l'API refuse ces appels, la page reste un aperçu vide.
    if (!id || !this.pdfEnabled) return;
    this.loading.set(true);
    this.error.set(null);
    this.service.pdfImports(id, { pdf_status: this.status(), page: this.page(), page_size: PAGE_SIZE }).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.counts.set(result.counts);
        this.aiAvailable.set(result.ai_available);
        this.quota.set(result.quota);
        this.available.set(result.available);
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger les comptes rendus.'));
        this.loading.set(false);
      },
    });
  }

  setStatus(value: PdfImportStatus | ''): void {
    this.status.set(value);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fileError.set(null);
    if (file && file.type && file.type !== 'application/pdf') {
      this.fileError.set('Choisissez un fichier PDF.');
      this.file.set(null);
      return;
    }
    if (file && file.size > MAX_BYTES) {
      this.fileError.set('Fichier trop volumineux (10 Mo au maximum).');
      this.file.set(null);
      return;
    }
    this.file.set(file);
  }

  upload(): void {
    const id = this.context.tenantId();
    const file = this.file();
    if (!id || !file || this.uploadForm().invalid() || this.uploading()) return;
    this.uploading.set(true);
    this.uploadError.set(null);
    this.service.uploadPdf(id, file, this.model()).subscribe({
      next: (created) => {
        this.uploading.set(false);
        void this.router.navigate(['/admin/imports-pdf', created.id]);
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        this.uploadError.set(extractErrorMessage(err, "Le dépôt a échoué."));
        // Quota atteint entre-temps (ex. dépôts du logiciel) : on affiche l'état à jour.
        const quota = err instanceof HttpErrorResponse ? (err.error as { quota?: PdfQuota } | null)?.quota : undefined;
        if (quota) this.quota.set(quota);
      },
    });
  }

  sizeLabel(bytes: number | null): string {
    if (!bytes) return '—';
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  }
}
