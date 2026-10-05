import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../connexion/auth-service';
import { ConsoleMenuLink, ConsoleShell } from '../shared/console-shell/console-shell';

const MENU: ConsoleMenuLink[] = [
  { label: "Vue d'ensemble", icon: 'chart-line', link: '/super-admin', exact: true },
  { label: 'Établissements', icon: 'building', link: '/super-admin/etablissements' },
  { label: 'Comptes', icon: 'users', link: '/super-admin/comptes' },
  { label: 'Journal', icon: 'history', link: '/super-admin/journal' },
];

/** Console du super-administrateur : /super-admin. */
@Component({
  selector: 'app-super-admin-shell',
  imports: [ConsoleShell],
  template: `
    <app-console-shell
      navLabel="Console super-administrateur"
      [menu]="menu"
      [userName]="userName()"
      roleLabel="Super-administrateur"
      [switchLink]="switchLink"
      (logoutRequested)="logout()"
    />
  `,
})
export class SuperAdminShell {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly menu = MENU;
  readonly switchLink = { label: 'Espace établissement', link: '/admin' };
  readonly userName = computed(() => this.authService.fullName() || 'Super-administrateur');

  logout(): void {
    this.authService.logout().subscribe(() => void this.router.navigateByUrl('/connexion'));
  }
}
