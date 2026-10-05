import { Component, PLATFORM_ID, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { DoctorLinkView } from '../../saas.models';
import { TenantAdminService } from '../../tenant-admin.service';
import { TenantContext } from '../tenant-context.service';

@Component({
  selector: 'app-admin-doctors',
  imports: [DatePipe, FormField, FormRoot, PIcon, PageHeader],
  templateUrl: './admin-doctors.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class AdminDoctors {
  private readonly service = inject(TenantAdminService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly context = inject(TenantContext);

  readonly doctors = signal<DoctorLinkView[] | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly model = signal({ identifier: '' });
  readonly addForm = form(this.model, (f) => {
    required(f.identifier, { message: 'Indiquez le matricule ou l’e-mail du médecin' });
  });
  readonly adding = signal(false);
  readonly addError = signal<string | null>(null);
  readonly confirm = signal<DoctorLinkView | null>(null);
  readonly removing = signal(false);

  constructor() {
    effect(() => {
      const id = this.context.tenantId();
      if (!id || !isPlatformBrowser(this.platformId)) return;
      untracked(() => this.load());
    });
  }

  load(): void {
    const id = this.context.tenantId();
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.service.doctors(id).subscribe({
      next: (doctors) => {
        this.doctors.set(doctors);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger les médecins.'));
        this.loading.set(false);
      },
    });
  }

  add(): void {
    const id = this.context.tenantId();
    if (!id || this.addForm().invalid() || this.adding()) return;
    this.adding.set(true);
    this.addError.set(null);
    this.service.addDoctor(id, this.model().identifier.trim()).subscribe({
      next: () => {
        this.adding.set(false);
        this.addForm().reset({ identifier: '' });
        this.load();
      },
      error: (err: unknown) => {
        this.adding.set(false);
        this.addError.set(extractErrorMessage(err, "Le médecin n'a pas pu être ajouté."));
      },
    });
  }

  remove(): void {
    const id = this.context.tenantId();
    const doctor = this.confirm();
    if (!id || !doctor || this.removing()) return;
    this.removing.set(true);
    this.service.removeDoctor(id, doctor.id).subscribe({
      next: () => {
        this.removing.set(false);
        this.confirm.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.removing.set(false);
        this.confirm.set(null);
        this.error.set(extractErrorMessage(err, 'Le retrait a échoué.'));
      },
    });
  }
}
