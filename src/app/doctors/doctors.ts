import { Component, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../connexion/auth-service';
import { SidebarService } from '../patients/sidebar-service';
import { SuggestionDialog } from '../patients/suggestion-box/suggestion-dialog/suggestion-dialog';
import { DoctorProfileService } from './doctor-profile.service';
import { CommissionsService } from './commissions/commissions.service';
import { DoctorResultatsService } from './resultats/doctor-resultats.service';
import { DoctorInfoCard } from './shared/doctor-info-card/doctor-info-card';
import { PointsPipe } from './shared/points';
import { stripDoctorTitle } from './shared/doctor-name';
import { SaasAccountService } from '../saas/saas-account.service';

interface MenuLink {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
}

interface MenuGroup {
  label: string;
  icon: string;
  items: MenuLink[];
}

type MenuEntry = MenuLink | MenuGroup;

const HELP_CONTACTS = [
  { label: 'Relations publiques', phone: '+237 675 478 110', whatsapp: 'https://wa.me/237675478110' },
  { label: 'Service technique', phone: '+237 690 425 467', whatsapp: 'https://wa.me/237690425467' },
];

const SETTINGS_LINK = '/doctors/parametres';

@Component({
  selector: 'app-doctors',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, DrawerModule, PIcon, DoctorInfoCard, SuggestionDialog, PointsPipe],
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
  host: {
    '(document:keydown.escape)': 'closeHelp()',
  },
})
export class Doctors {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(DoctorProfileService);
  private readonly commissionsService = inject(CommissionsService);
  private readonly resultatsService = inject(DoctorResultatsService);
  private readonly saasAccount = inject(SaasAccountService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  readonly sidebarService = inject(SidebarService);
  readonly helpContacts = HELP_CONTACTS;

  readonly menu: MenuEntry[] = [
    { label: 'Tableau de bord', icon: 'home', link: '/doctors', exact: true },
    {
      label: 'Commissions',
      icon: 'wallet',
      items: [
        { label: 'Relevé', icon: 'list', link: '/doctors/commissions', exact: true },
        { label: 'Par mois', icon: 'calendar', link: '/doctors/commissions/mois' },
        { label: 'Par année', icon: 'chart-bar', link: '/doctors/commissions/annee' },
        { label: 'Par période', icon: 'search', link: '/doctors/commissions/periode' },
      ],
    },
    { label: 'Résultats reçus', icon: 'inbox', link: '/doctors/resultats' },
    { label: 'Actualités', icon: 'sparkles', link: '/doctors/actualites' },
    { label: 'Requêtes', icon: 'send', link: '/doctors/requests' },
    { label: 'Notifications', icon: 'bell', link: '/doctors/notifications' },
    { label: 'Paramètres', icon: 'cog', link: SETTINGS_LINK },
  ];

  /** Le groupe Commissions n'apparaît que si un établissement GNU Health du médecin l'active. */
  readonly visibleMenu = computed(() =>
    this.saasAccount.commissionsEnabled() ? this.menu : this.menu.filter((entry) => !(this.isGroup(entry) && entry.label === 'Commissions'))
  );

  readonly collapsedGroups = signal<string[]>([]);
  readonly helpDialogOpen = signal(false);
  readonly suggestionDialogOpen = signal(false);

  readonly userName = computed(() => {
    const name = this.profileService.displayName() || stripDoctorTitle(this.authService.fullName());
    return name ? `Dr ${name}` : 'Docteur';
  });

  readonly isConfirmed = this.profileService.isConfirmed;
  readonly sidebarLocked = computed(() => !this.profileService.isConfirmed());

  /** Solde du cycle en cours, affiché en permanence dans le profil de la barre latérale. */
  readonly cycleBalance = this.commissionsService.actualSolde.data;

  /** Un compte peut être à la fois docteur et patient (cf. /doctors/extract/<onmc>). */
  readonly canSwitchToPatient = computed(() => {
    const user = this.authService.currentUser();
    return this.authService.isPatient() && !!user && user.patient_id !== null;
  });

  readonly currentDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      const confirmed = this.profileService.isConfirmed();
      const settled = this.saasAccount.settled();
      const commissions = this.saasAccount.commissionsEnabled();
      if (!isPlatformBrowser(this.platformId) || !user || user.doctor_id === null) return;
      const doctorId = user.doctor_id;
      untracked(() => {
        this.profileService.loadProfile(doctorId).subscribe();
        if (!settled) {
          this.saasAccount.load().subscribe();
        } else if (confirmed && commissions) {
          this.commissionsService.loadActualSolde(doctorId);
        }
      });
    });
  }

  isGroup(entry: MenuEntry): entry is MenuGroup {
    return 'items' in entry;
  }

  isLocked(link?: string): boolean {
    return this.sidebarLocked() && link !== SETTINGS_LINK;
  }

  isExpanded(label: string): boolean {
    return !this.collapsedGroups().includes(label);
  }

  toggleGroup(label: string): void {
    this.collapsedGroups.update((list) => (list.includes(label) ? list.filter((l) => l !== label) : [...list, label]));
  }

  groupId(label: string): string {
    return `menu-group-${label.toLowerCase().replace(/[^a-z]/g, '')}`;
  }

  onNavigate(link: string): void {
    if (!this.isLocked(link)) {
      this.sidebarService.close();
    }
  }

  openHelp(): void {
    this.helpDialogOpen.set(true);
  }

  closeHelp(): void {
    this.helpDialogOpen.set(false);
  }

  openSuggestion(): void {
    this.suggestionDialogOpen.set(true);
  }

  closeSuggestion(): void {
    this.suggestionDialogOpen.set(false);
  }

  switchToPatient(): void {
    this.sidebarService.close();
    void this.router.navigateByUrl('/patients');
  }

  logout(): void {
    this.commissionsService.resetAll();
    this.resultatsService.reset();
    this.profileService.reset();
    this.sidebarService.close();
    this.authService.logout().subscribe(() => {
      void this.router.navigateByUrl('/connexion');
    });
  }
}
