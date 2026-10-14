import { Component, computed, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { PIcon } from '@primeicons/angular/p-icon';
import { SidebarService } from '../../../patients/sidebar-service';
import { tenantPalette } from '../../../shared/theme/tenant-theme';

import { TranslatePipe } from '../../../shared/i18n/t.pipe';
import { I18n } from '../../../shared/i18n/i18n';
import { LangSwitch } from '../../../shared/i18n/lang-switch';
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
  imports: [LangSwitch, TranslatePipe, RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, DrawerModule, PIcon],
  templateUrl: './console-shell.html',
  styleUrls: ['../../../doctors/doctors.css', './console-shell.css'],
  host: {
    // Couleur de l'établissement : héritée par toutes les pages de la console.
    '[style.--tenant-primary]': 'palette()?.primary',
    '[style.--tenant-primary-hover]': 'palette()?.hover',
    '[style.--tenant-primary-soft]': 'palette()?.soft',
    '[style.--color-primary]': 'palette()?.primary',
    '[style.--color-primary-hover]': 'palette()?.hover',
    '[style.--color-primary-light]': 'palette()?.soft',
  },
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
  /** Couleur principale de l'établissement administré (#rrggbb) ; sinon les couleurs ROHAFYA. */
  readonly accent = input<string | null | undefined>(null);
  readonly palette = computed(() => tenantPalette(this.accent()));

  readonly tenantChange = output<number>();
  readonly logoutRequested = output<void>();

  private readonly i18n = inject(I18n);
  /** Date du jour, dans la langue de l'interface. */
  readonly currentDate = computed(() => new Date().toLocaleDateString(this.i18n.locale(), { day: '2-digit', month: 'long', year: 'numeric' }));
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
