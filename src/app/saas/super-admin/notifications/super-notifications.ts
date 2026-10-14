import { Component, PLATFORM_ID, computed, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { extractErrorMessage } from '../../../shared/api-error';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { NotificationCampaign, TenantWithStats } from '../../saas.models';
import { NotificationComposer } from '../../shared/notifications/notification-composer';
import { NotificationHistory } from '../../shared/notifications/notification-history';
import { SuperAdminService } from '../../super-admin.service';

import { TranslatePipe } from '../../../shared/i18n/t.pipe';
/**
 * Notifications du super-administrateur : aux administrateurs, à tous les patients ou à tous les médecins
 * d'un établissement (ou à une sélection). Chaque destinataire reçoit une notification et un e-mail.
 */
@Component({
  selector: 'app-super-notifications',
  imports: [TranslatePipe, PageHeader, NotificationComposer, NotificationHistory],
  template: `
    <div class="page">
      <app-page-header [title]="'Notifications' | t" [subtitle]="'Écrivez aux administrateurs, aux patients ou aux médecins d\\'un établissement.' | t" />

      <section class="card">
        <div class="form-row tenant-row">
          <label for="notif-tenant">{{ 'Établissement *' | t }}</label>
          <select id="notif-tenant" class="field" (change)="onTenant($event)" [disabled]="tenantsLoading()">
            <option value="" [selected]="tenantId() === null">{{ 'Choisissez un établissement' | t }}</option>
            @for (t of activeTenants(); track t.id) {
              <option [value]="t.id" [selected]="t.id === tenantId()">{{ t.display_name }}</option>
            }
          </select>
        </div>
        @if (tenantId() !== null) {
          <app-notification-composer mode="super" [tenantId]="tenantId()" (sent)="onSent()" />
        } @else {
          <p class="form-hint">{{ 'Choisissez d\\'abord l\\'établissement dont vous voulez joindre les administrateurs, les patients ou les médecins.' | t }}</p>
        }
      </section>

      <section class="card" aria-labelledby="history-title">
        <h2 class="card-title" id="history-title">{{ 'Notifications envoyées' | t }}</h2>
        @if (error()) {
          <div class="banner banner-error" role="alert"><span>{{ error() | t }}</span></div>
        }
        <app-notification-history
          [items]="history()"
          [total]="total()"
          [page]="page()"
          [loading]="loading()"
          [showEstablishment]="true"
          (pageChange)="goTo($event)"
        />
      </section>
    </div>
  `,
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
  styles: `
    .tenant-row {
      max-width: 28rem;
      margin-bottom: 1rem;
    }
  `,
})
export class SuperNotifications {
  private readonly service = inject(SuperAdminService);

  /** ?etablissement=<id> : ouvre la page sur un établissement (lien de sa fiche). */
  readonly etablissement = input<string>();

  readonly tenants = signal<TenantWithStats[]>([]);
  readonly tenantsLoading = signal(true);
  readonly activeTenants = computed(() => this.tenants().filter((t) => t.is_active));
  private readonly chosen = signal<number | null>(null);
  readonly tenantId = computed(() => this.chosen() ?? (Number(this.etablissement()) || null));

  readonly history = signal<NotificationCampaign[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    this.service.tenants().subscribe({
      next: (list) => {
        this.tenants.set(list);
        this.tenantsLoading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger les établissements.'));
        this.tenantsLoading.set(false);
      },
    });
    this.load();
  }

  onTenant(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.chosen.set(value || null);
  }

  onSent(): void {
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service.notifications({ page: this.page() }).subscribe({
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
