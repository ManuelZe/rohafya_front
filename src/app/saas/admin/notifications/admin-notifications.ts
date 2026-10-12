import { Component, PLATFORM_ID, effect, inject, input, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { extractErrorMessage } from '../../../shared/api-error';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { Notifications } from '../../../notifications/notifications';
import { NotificationCampaign } from '../../saas.models';
import { NotificationComposer } from '../../shared/notifications/notification-composer';
import { NotificationHistory } from '../../shared/notifications/notification-history';
import { TenantAdminService } from '../../tenant-admin.service';
import { TenantContext } from '../tenant-context.service';

type Tab = 'recues' | 'envoyer' | 'envoyees';

/**
 * Notifications de l'administrateur d'établissement :
 * celles qu'il reçoit (de l'équipe ROHAFYA), l'envoi à ses patients et médecins, et l'historique des envois.
 */
@Component({
  selector: 'app-admin-notifications',
  imports: [PageHeader, Notifications, NotificationComposer, NotificationHistory],
  template: `
    <div class="page">
      <app-page-header title="Notifications" subtitle="Écrivez à vos patients et médecins : notification dans leur espace et e-mail." />

      <div class="segmented tabs" role="group" aria-label="Rubrique">
        <button type="button" [attr.aria-pressed]="tab() === 'recues'" (click)="tab.set('recues')">Reçues</button>
        <button type="button" [attr.aria-pressed]="tab() === 'envoyer'" (click)="tab.set('envoyer')">Envoyer</button>
        <button type="button" [attr.aria-pressed]="tab() === 'envoyees'" (click)="openHistory()">Envoyées</button>
      </div>

      @switch (tab()) {
        @case ('recues') {
          <section class="card" aria-label="Notifications reçues">
            <app-notifications [embedded]="true" />
          </section>
        }
        @case ('envoyer') {
          <section class="card">
            <app-notification-composer mode="admin" [tenantId]="context.tenantId()" (sent)="onSent()" />
          </section>
        }
        @case ('envoyees') {
          <section class="card" aria-label="Notifications envoyées">
            @if (error()) {
              <div class="banner banner-error" role="alert"><span>{{ error() }}</span></div>
            }
            <app-notification-history
              [items]="history()"
              [total]="total()"
              [page]="page()"
              [loading]="loading()"
              (pageChange)="goTo($event)"
            />
          </section>
        }
      }
    </div>
  `,
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
  styles: `
    .tabs {
      align-self: flex-start;
    }
  `,
})
export class AdminNotifications {
  private readonly service = inject(TenantAdminService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly context = inject(TenantContext);

  /** ?onglet=envoyer|envoyees (lien du tableau de bord) ; par défaut, les notifications reçues. */
  readonly onglet = input<string>();
  readonly tab = signal<Tab>('recues');
  readonly history = signal<NotificationCampaign[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const wanted = this.onglet();
      if (wanted === 'envoyer' || wanted === 'envoyees') untracked(() => (wanted === 'envoyees' ? this.openHistory() : this.tab.set(wanted)));
    });
    // Changement d'établissement : l'historique affiché est rechargé.
    effect(() => {
      this.context.tenantId();
      untracked(() => {
        if (this.tab() === 'envoyees') this.load();
      });
    });
  }

  openHistory(): void {
    this.tab.set('envoyees');
    this.page.set(1);
    this.load();
  }

  onSent(): void {
    this.page.set(1);
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  private load(): void {
    const id = this.context.tenantId();
    if (!id || !isPlatformBrowser(this.platformId)) return;
    this.loading.set(true);
    this.error.set(null);
    this.service.notifications(id, this.page()).subscribe({
      next: (res) => {
        this.history.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, "Impossible de charger l'historique."));
        this.loading.set(false);
      },
    });
  }
}
