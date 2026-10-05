import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../connexion/auth-service';
import { ConsoleMenuLink, ConsoleShell } from '../shared/console-shell/console-shell';
import { PDF_IMPORT_ENABLED } from '../features';
import { TenantContext } from './tenant-context.service';

const MENU: ConsoleMenuLink[] = [
  { label: 'Tableau de bord', icon: 'home', link: '/admin', exact: true },
  { label: 'Patients', icon: 'users', link: '/admin/patients' },
  { label: 'Rattachements', icon: 'link', link: '/admin/rattachements' },
  { label: 'QR codes', icon: 'qrcode', link: '/admin/qr-codes' },
  { label: 'Médecins', icon: 'user-plus', link: '/admin/medecins' },
  { label: 'Données reçues', icon: 'database', link: '/admin/donnees' },
  { label: 'Imports PDF', icon: 'file-pdf', link: '/admin/imports-pdf', disabled: !PDF_IMPORT_ENABLED, hint: PDF_IMPORT_ENABLED ? undefined : 'Bientôt' },
  { label: 'Intégration', icon: 'server', link: '/admin/integration' },
  { label: 'Paramètres', icon: 'cog', link: '/admin/parametres' },
  { label: 'Journal', icon: 'history', link: '/admin/journal' },
];

/** Espace administrateur d'établissement : /admin. */
@Component({
  selector: 'app-admin-shell',
  imports: [ConsoleShell],
  template: `
    <app-console-shell
      navLabel="Administration de l'établissement"
      [menu]="menu"
      [userName]="userName()"
      [roleLabel]="roleLabel()"
      [tenants]="tenantOptions()"
      [selectedTenantId]="context.tenantId()"
      [switchLink]="switchLink()"
      (tenantChange)="context.select($event)"
      (logoutRequested)="logout()"
    />
  `,
})
export class AdminShell {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly context = inject(TenantContext);

  readonly menu = MENU;
  readonly userName = computed(() => this.authService.fullName() || 'Administrateur');
  readonly roleLabel = computed(() => (this.authService.isSuperAdmin() ? 'Super-administrateur' : 'Administrateur'));
  readonly tenantOptions = computed(() => this.context.tenants().map((t) => ({ id: t.id, name: t.display_name })));
  readonly switchLink = computed(() => (this.authService.isSuperAdmin() ? { label: 'Console super-admin', link: '/super-admin' } : null));

  logout(): void {
    this.authService.logout().subscribe(() => void this.router.navigateByUrl('/connexion'));
  }
}
