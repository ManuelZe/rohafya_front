import { Component, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { PIcon } from '@primeicons/angular/p-icon';
import { SidebarService } from '../../../patients/sidebar-service';

export interface ConsoleMenuLink {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
  /** Entrée visible mais grisée et inactive (fonctionnalité pas encore ouverte). */
  disabled?: boolean;
  /** Mention courte affichée à droite, ex. « Bientôt ». */
  hint?: string;
}

export interface ConsoleTenantOption {
  id: number;
  name: string;
}

/**
 * Mise en page des espaces d'administration (établissement et super-administrateur) :
 * même barre latérale, même tiroir mobile et même zone de contenu que l'espace docteur.
 */
@Component({
  selector: 'app-console-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, DrawerModule, PIcon],
  templateUrl: './console-shell.html',
  styleUrls: ['../../../doctors/doctors.css', './console-shell.css'],
})
export class ConsoleShell {
  readonly sidebarService = inject(SidebarService);

  readonly menu = input.required<ConsoleMenuLink[]>();
  readonly navLabel = input.required<string>();
  readonly userName = input.required<string>();
  readonly roleLabel = input.required<string>();
  /** Établissements proposés dans le sélecteur (masqué s'il n'y en a qu'un ou aucun). */
  readonly tenants = input<ConsoleTenantOption[]>([]);
  readonly selectedTenantId = input<number | null>(null);
  readonly switchLink = input<{ label: string; link: string } | null>(null);

  readonly tenantChange = output<number>();
  readonly logoutRequested = output<void>();

  readonly currentDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  readonly tenantSelectId = 'console-tenant-select';

  onTenantChange(event: Event, mobile: boolean): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!Number.isNaN(value)) {
      this.tenantChange.emit(value);
      if (mobile) this.sidebarService.close();
    }
  }

  onNavigate(): void {
    this.sidebarService.close();
  }

  logout(): void {
    this.sidebarService.close();
    this.logoutRequested.emit();
  }
}
