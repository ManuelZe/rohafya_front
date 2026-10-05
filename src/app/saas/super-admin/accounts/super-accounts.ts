import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../../connexion/auth-service';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { Pager } from '../../shared/pager';
import { AccountView } from '../../saas.models';
import { SuperAdminService } from '../../super-admin.service';

const PAGE_SIZE = 25;
const ROLE_LABELS: Record<string, string> = {
  Patient: 'Patient',
  Doctor: 'Médecin',
  EstablishmentAdmin: 'Admin. établissement',
  SuperAdmin: 'Super-admin',
  Admin: 'Admin (historique)',
};

@Component({
  selector: 'app-super-accounts',
  imports: [PIcon, PageHeader, Pager],
  templateUrl: './super-accounts.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class SuperAccounts {
  private readonly service = inject(SuperAdminService);
  private readonly authService = inject(AuthService);

  readonly roleFilters = [
    { value: '', label: 'Tous' },
    { value: 'Patient', label: 'Patients' },
    { value: 'Doctor', label: 'Médecins' },
    { value: 'EstablishmentAdmin', label: 'Admins' },
    { value: 'SuperAdmin', label: 'Super-admins' },
  ];
  readonly pageSize = PAGE_SIZE;
  readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? null);

  readonly role = signal('');
  readonly query = signal('');
  readonly page = signal(1);
  readonly items = signal<AccountView[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<number | null>(null);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.load();
    }
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] ?? role;
  }

  setRole(role: string): void {
    this.role.set(role);
    this.page.set(1);
    this.load();
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

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.users({ q: this.query(), role: this.role(), page: this.page() }).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger les comptes.'));
        this.loading.set(false);
      },
    });
  }

  toggleActive(account: AccountView): void {
    this.update(account, this.service.setActive(account.id, !account.active));
  }

  toggleSuperAdmin(account: AccountView): void {
    this.update(account, this.service.setSuperAdmin(account.id, !account.roles.includes('SuperAdmin')));
  }

  private update(account: AccountView, request: ReturnType<SuperAdminService['setActive']>): void {
    if (this.busyId()) return;
    this.busyId.set(account.id);
    request.subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.items.update((list) => list.map((item) => (item.id === updated.id ? { ...updated, admin_of: item.admin_of } : item)));
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.error.set(extractErrorMessage(err, "L'opération a échoué."));
      },
    });
  }
}
