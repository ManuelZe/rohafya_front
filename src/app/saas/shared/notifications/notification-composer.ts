import { Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormField, FormRoot, form, maxLength, required } from '@angular/forms/signals';
import { Observable, Subject, debounceTime, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { extractErrorMessage } from '../../../shared/api-error';
import { AUDIENCE_LABELS, NotificationAudience, NotificationCampaign, NotificationRecipient } from '../../saas.models';
import { SuperAdminService } from '../../super-admin.service';
import { TenantAdminService } from '../../tenant-admin.service';

export const TITLE_MAX = 150;
export const MESSAGE_MAX = 2000;

type Scope = 'all' | 'selected';

interface ComposerModel {
  title: string;
  message: string;
}

/** Libellé du groupe destinataire : « tous les patients (248) ». */
export function groupLabel(audience: NotificationAudience, total: number | null): string {
  const label = AUDIENCE_LABELS[audience].toLowerCase();
  return total === null ? `Tous les ${label}` : `Tous les ${label} (${total})`;
}

let nextId = 0;

/**
 * Rédaction d'une notification depuis une console : destinataires (groupe entier ou sélection),
 * objet et message. Chaque destinataire reçoit une notification dans son espace et un e-mail.
 * - super-administrateur : administrateurs, patients ou médecins de l'établissement choisi ;
 * - administrateur d'établissement : patients ou médecins de son établissement.
 */
@Component({
  selector: 'app-notification-composer',
  imports: [FormField, FormRoot],
  templateUrl: './notification-composer.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../console-ui.css', './notifications.css'],
})
export class NotificationComposer {
  private readonly superService = inject(SuperAdminService);
  private readonly tenantService = inject(TenantAdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = input.required<'super' | 'admin'>();
  readonly tenantId = input.required<number | null>();
  readonly sent = output<NotificationCampaign>();

  protected readonly id = `notification-composer-${nextId++}`;
  protected readonly titleMax = TITLE_MAX;
  protected readonly messageMax = MESSAGE_MAX;
  protected readonly labels = AUDIENCE_LABELS;
  protected readonly groupLabel = groupLabel;

  protected readonly audiences = computed<NotificationAudience[]>(() =>
    this.mode() === 'super' ? ['admins', 'patients', 'doctors'] : ['patients', 'doctors']
  );
  protected readonly audience = signal<NotificationAudience>('patients');
  protected readonly scope = signal<Scope>('all');
  protected readonly groupTotal = signal<number | null>(null);

  protected readonly query = signal('');
  protected readonly results = signal<NotificationRecipient[]>([]);
  protected readonly resultsTotal = signal(0);
  protected readonly searching = signal(false);
  protected readonly selected = signal<NotificationRecipient[]>([]);
  protected readonly selectedIds = computed(() => new Set(this.selected().map((r) => r.user_id)));

  protected readonly model = signal<ComposerModel>({ title: '', message: '' });
  protected readonly composerForm = form(this.model, (f) => {
    required(f.title, { message: "Indiquez l'objet." });
    maxLength(f.title, TITLE_MAX, { message: `${TITLE_MAX} caractères au plus.` });
    required(f.message, { message: 'Écrivez le message.' });
    maxLength(f.message, MESSAGE_MAX, { message: `${MESSAGE_MAX} caractères au plus.` });
  });

  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  /** Nombre de destinataires de l'envoi, affiché sur le bouton. */
  protected readonly recipientCount = computed(() => (this.scope() === 'all' ? this.groupTotal() : this.selected().length));
  protected readonly submitLabel = computed(() => {
    const count = this.recipientCount();
    if (count === null) return 'Envoyer';
    return `Envoyer à ${count} destinataire${count > 1 ? 's' : ''}`;
  });

  private readonly search$ = new Subject<void>();

  constructor() {
    // Le super-administrateur ouvre sur les administrateurs, l'établissement sur ses patients.
    effect(() => {
      const first = this.audiences()[0];
      untracked(() => this.audience.set(first));
    });

    // Effectif du groupe et première page de destinataires, à chaque changement d'établissement ou de groupe.
    effect(() => {
      const tenantId = this.tenantId();
      const audience = this.audience();
      untracked(() => {
        this.selected.set([]);
        this.query.set('');
        this.groupTotal.set(null);
        if (tenantId === null) return;
        this.fetch(tenantId, audience, '').subscribe({
          next: (res) => {
            this.groupTotal.set(res.total);
            this.results.set(res.items);
            this.resultsTotal.set(res.total);
          },
          error: () => this.groupTotal.set(null),
        });
      });
    });

    this.search$
      .pipe(
        debounceTime(300),
        switchMap(() => {
          this.searching.set(true);
          return this.fetch(this.tenantId() ?? 0, this.audience(), this.query());
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this.searching.set(false);
          this.results.set(res.items);
          this.resultsTotal.set(res.total);
        },
        error: () => this.searching.set(false),
      });
  }

  private fetch(tenantId: number, audience: NotificationAudience, q: string): Observable<{ items: NotificationRecipient[]; total: number }> {
    return this.mode() === 'super'
      ? this.superService.notificationRecipients(tenantId, audience, q)
      : this.tenantService.notificationRecipients(tenantId, audience, q);
  }

  protected setAudience(audience: NotificationAudience): void {
    this.audience.set(audience);
    this.success.set(null);
  }

  protected setScope(scope: Scope): void {
    this.scope.set(scope);
    this.success.set(null);
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.search$.next();
  }

  protected toggle(recipient: NotificationRecipient): void {
    this.selected.update((list) =>
      list.some((r) => r.user_id === recipient.user_id) ? list.filter((r) => r.user_id !== recipient.user_id) : [...list, recipient]
    );
  }

  protected remove(recipient: NotificationRecipient): void {
    this.selected.update((list) => list.filter((r) => r.user_id !== recipient.user_id));
  }

  protected send(): void {
    const tenantId = this.tenantId();
    if (this.sending() || tenantId === null) return;
    this.success.set(null);
    if (this.composerForm().invalid()) {
      this.composerForm.title().markAsTouched();
      this.composerForm.message().markAsTouched();
      this.error.set('Complétez l’objet et le message.');
      return;
    }
    if (this.scope() === 'selected' && this.selected().length === 0) {
      this.error.set('Choisissez au moins un destinataire.');
      return;
    }
    const { title, message } = this.model();
    const payload = {
      audience: this.audience(),
      user_ids: this.scope() === 'selected' ? this.selected().map((r) => r.user_id) : [],
      title: title.trim(),
      message: message.trim(),
    };
    this.sending.set(true);
    this.error.set(null);
    const request =
      this.mode() === 'super' ? this.superService.sendNotification(tenantId, payload) : this.tenantService.sendNotification(tenantId, payload);
    request.subscribe({
      next: (campaign) => {
        this.sending.set(false);
        const n = campaign.recipients_count;
        this.success.set(
          `Notification envoyée à ${n} destinataire${n > 1 ? 's' : ''}. ` +
            (campaign.emails_count ? `${campaign.emails_count} e-mail${campaign.emails_count > 1 ? 's' : ''} en cours d’envoi.` : 'Aucune adresse e-mail connue.')
        );
        this.model.set({ title: '', message: '' });
        this.composerForm().reset({ title: '', message: '' });
        this.selected.set([]);
        this.sent.emit(campaign);
      },
      error: (err: unknown) => {
        this.sending.set(false);
        this.error.set(extractErrorMessage(err, "L'envoi a échoué."));
      },
    });
  }
}
