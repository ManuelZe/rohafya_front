import { Service, computed, inject, signal } from '@angular/core';
import { SaasAccountService } from '../saas-account.service';

const STORAGE_KEY = 'edenAdminTenant';

function readStored(): number | null {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    const id = raw ? Number(raw) : NaN;
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}

/** Établissement en cours d'administration (mémorisé sur ce navigateur). */
@Service()
export class TenantContext {
  private readonly account = inject(SaasAccountService);
  private readonly chosen = signal<number | null>(readStored());

  readonly tenants = this.account.adminTenants;

  readonly tenant = computed(() => {
    const list = this.tenants();
    return list.find((t) => t.id === this.chosen()) ?? list[0] ?? null;
  });

  readonly tenantId = computed(() => this.tenant()?.id ?? null);

  select(id: number): void {
    this.chosen.set(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* stockage indisponible (navigation privée) : le choix vaut pour la session */
    }
  }
}
