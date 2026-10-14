import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { FormField, FormRoot, form, maxLength } from '@angular/forms/signals';
import { PIcon } from '@primeicons/angular/p-icon';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { TRIAL_KINDS, TRIAL_VOLUMES } from '../../../intro/intro.content';
import { LocalDatePipe } from '../../../shared/i18n/ldate.pipe';
import { TranslatePipe } from '../../../shared/i18n/t.pipe';
import { Pager } from '../../shared/pager';
import { TRIAL_STATUS_LABELS, TrialRequest, TrialRequestList, TrialStatus } from '../../saas.models';
import { SuperAdminService } from '../../super-admin.service';

const PAGE_SIZE = 25;
const STATUSES: TrialStatus[] = ['nouvelle', 'contactee', 'essai', 'close'];
const toLabels = (options: { value: string; label: string }[]) => Object.fromEntries(options.map((o) => [o.value, o.label]));

interface FollowUpModel {
  status: TrialStatus;
  note: string;
}

/** Demandes d'essai envoyées par les établissements depuis le site de présentation. */
@Component({
  selector: 'app-super-trials',
  imports: [TranslatePipe, LocalDatePipe, PIcon, PageHeader, Pager, FormRoot, FormField, CdkTrapFocus],
  templateUrl: './super-trials.html',
  styleUrls: [
    '../../../doctors/shared/doctor-ui.css',
    '../../shared/console-ui.css',
    '../../admin/submissions/admin-submissions.css',
    './super-trials.css',
  ],
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class SuperTrials {
  private readonly service = inject(SuperAdminService);

  readonly pageSize = PAGE_SIZE;
  readonly statuses = STATUSES;
  readonly statusLabels = TRIAL_STATUS_LABELS;
  readonly kindLabels = toLabels(TRIAL_KINDS);
  readonly volumeLabels = toLabels(TRIAL_VOLUMES);

  readonly status = signal<TrialStatus | ''>('nouvelle');
  readonly page = signal(1);
  readonly list = signal<TrialRequestList | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly items = computed(() => this.list()?.items ?? []);
  readonly total = computed(() => this.list()?.total ?? 0);
  readonly counts = computed(() => this.list()?.counts ?? {});
  readonly countAll = computed(() => Object.values(this.counts()).reduce((sum, n) => sum + (n ?? 0), 0));

  /** Demande ouverte dans la fenêtre de suivi. */
  readonly selected = signal<TrialRequest | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saved = signal(false);

  readonly followUp = signal<FollowUpModel>({ status: 'nouvelle', note: '' });
  readonly followUpForm = form(this.followUp, (f) => {
    maxLength(f.note, 2000, { message: 'La note ne doit pas dépasser 2000 caractères.' });
  });

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) this.load();
  }

  setStatus(status: TrialStatus | ''): void {
    this.status.set(status);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.trialRequests({ status: this.status(), page: this.page() }).subscribe({
      next: (list) => {
        this.list.set(list);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger les demandes d’essai.'));
        this.loading.set(false);
      },
    });
  }

  open(trial: TrialRequest): void {
    this.selected.set(trial);
    this.saveError.set(null);
    this.saved.set(false);
    this.followUp.set({ status: trial.status === 'nouvelle' ? 'contactee' : trial.status, note: trial.note ?? '' });
  }

  close(): void {
    this.selected.set(null);
  }

  save(): void {
    const trial = this.selected();
    if (!trial || this.saving() || this.followUpForm().invalid()) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.service.updateTrialRequest(trial.id, this.followUp()).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.saved.set(true);
        this.selected.set(updated);
        this.load();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.saveError.set(extractErrorMessage(err, 'Le suivi n’a pas pu être enregistré.'));
      },
    });
  }
}
