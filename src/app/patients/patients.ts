import { Component, computed, effect, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PRIMENG_MODULES } from '../../others/shared-import';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../connexion/auth-service';
import { PatientsService } from './patients-service';
import { SidebarService } from '../patients/sidebar-service'; // adapte le chemin
import { PatientProfileService } from './patient-profile-service';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from "@angular/router";
import { UserInfoCard } from './shared/user-info-card/user-info-card';
import { SuggestionDialog } from './suggestion-box/suggestion-dialog/suggestion-dialog';

const HELP_CONTACTS = [
  {
    label: 'Relations publiques',
    phone: '+237 695 995 842',
    whatsapp: 'https://wa.me/695995842',
  },
  {
    label: 'Service technique',
    phone: '+237 690 425 467',
    whatsapp: 'https://wa.me/237690425467',
  },
];

const ACCESS_DENIED_MESSAGE = 'L\u2019UTILISATEUR NE PEUT PAS AVOIR ACCÈS À CES DONNÉES.';

@Component({
  selector: 'app-patients',
  imports: [
    CommonModule,
    PRIMENG_MODULES,
    PIcon,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    UserInfoCard,
    SuggestionDialog,
  ],
  templateUrl: './patients.html',
  styleUrl: './patients.css',
})
export class Patients {
  private authService = inject(AuthService);
  private patientService = inject(PatientsService);
  private patientProfileService = inject(PatientProfileService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  // Le sidebar partagé, plus de model() local
  readonly sidebarService = inject(SidebarService);

  readonly helpContacts = HELP_CONTACTS;
  helpDialogOpen = signal(false);
  suggestionDialogOpen = signal(false);

  sidebarLocked = computed(() => this.authService.isPatient() && !this.patientProfileService.isConfirmed());

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (isPlatformBrowser(this.platformId) && user && this.authService.isPatient() && user.patient_id !== null) {
        this.patientProfileService.loadProfile(user.patient_id).subscribe();
      }
    });
  }

  isMenuItemLocked(link?: string): boolean {
    return this.sidebarLocked() && link !== '/patients/parametres';
  }

  /** Ferme le side-bar mobile après un clic de navigation (pas pour un lien verrouillé, qui ne navigue pas). */
  closeMobileSidebar(link?: string): void {
    if (!this.isMenuItemLocked(link)) {
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

  currentDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  userName = computed(() => this.authService.fullName() || 'Utilisateur');

  /** Pour un patient : reflète la confirmation du profil. Sinon : reflète l'état de connexion. */
  sidebarStatusLabel = computed(() => {
    if (this.authService.isPatient()) {
      return this.patientProfileService.isConfirmed() ? 'Compte confirmé' : 'Compte non confirmé';
    }
    return this.authService.isLoggedIn() ? 'Compte actif' : 'Compte inactif';
  });

  sidebarStatusInactive = computed(() => {
    if (this.authService.isPatient()) {
      return !this.patientProfileService.isConfirmed();
    }
    return !this.authService.isLoggedIn();
  });

  menuItems = [
    { label: 'Tableau de Bord', icon: 'home', link: '/patients' },
    { label: 'Factures', icon: 'file', link: '/patients/factures' },
    // { label: 'Devis', icon: 'calculator', link: '/patients/devis' },
    {
      label: 'Examens',
      icon: 'folder',
      items: [
        { label: 'Laboratoire', icon: 'filter', link: '/patients/laboratoire' },
        { label: 'Imagerie', icon: 'image', link: '/patients/imagerie' },
        { label: 'Exploration Fonctionnelle', icon: 'video', link: '/patients/exploration' },
      ],
    },
    { label: 'Prescriptions', icon: 'briefcase', link: '/patients/prescriptions' },
    { label: 'Résultats Partagés', icon: 'share-alt', link: '/patients/resultats' },
    { label: 'Mes établissements', icon: 'building', link: '/patients/etablissements' },
    { label: 'Requêtes', icon: 'send', link: '/patients/requests' },
    { label: 'Pré-enregistrements', icon: 'check-circle', link: '/patients/enregistrement' },
    { label: 'Notifications', icon: 'bell', link: '/notifications' },
    { label: 'Paramètres', icon: 'cog', link: '/patients/parametres' },
  ];

  expandedMenuItems = signal<string[]>([]);

  toggleMenu(label: string): void {
    const expanded = this.expandedMenuItems();
    if (expanded.includes(label)) {
      this.expandedMenuItems.set(expanded.filter((item) => item !== label));
    } else {
      this.expandedMenuItems.set([...expanded, label]);
    }
  }

  isExpanded(label: string): boolean {
    return this.expandedMenuItems().includes(label);
  }

  logout(): void {
    this.patientService.resetAll();
    this.patientProfileService.reset();
    this.sidebarService.close();
    this.authService.logout().subscribe(() => {
      this.router.navigateByUrl('/connexion');
    });
  }

  readonly accessDeniedMessage = ACCESS_DENIED_MESSAGE;

  facturesAccessDenied = computed(() => {
    const user = this.authService.currentUser();

    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }
    if (!user || !this.authService.isPatient() || user.patient_id === null) {
      return true;
    }
    return false;
  });
}