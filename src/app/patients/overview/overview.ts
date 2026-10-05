import { Component, computed, effect, inject, PLATFORM_ID, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../connexion/auth-service';
import { PatientsService } from '../patients-service';
import { PatientProfileService } from '../patient-profile-service';
import { PageHeader } from '../shared/page-header/page-header';
import { StatusTag } from '../shared/status-tag/status-tag';
import { KpiTile } from '../../shared/kpi-tile/kpi-tile';
import { EdenMark } from '../../shared/eden-mark/eden-mark';

type ExamKind = 'Laboratoire' | 'Imagerie' | 'Exploration';

interface TimelineItem {
  key: string;
  kind: ExamKind;
  title: string;
  requestor: string;
  date: string | null;
  link: string;
  expired: boolean;
  daysLeft: number | null;
}

const ACCESS_DENIED_MESSAGE = 'L’UTILISATEUR NE PEUT PAS AVOIR ACCÈS À CES DONNÉES.';
/** Un résultat est signalé « bientôt expiré » en dessous de ce nombre de jours. */
const EXPIRY_WARNING_DAYS = 7;

const FCFA = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function time(value: string | null | undefined): number {
  const t = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
}

/** L'API renvoie parfois un objet ({ Message: "…" }) au lieu d'une liste : aucun résultat, accès bloqué… */
function asList<T>(value: T[]): T[] {
  return Array.isArray(value) ? value : [];
}

export function formatFcfa(value: unknown): string {
  return `${FCFA.format(Math.round(toNumber(value)))} FCFA`;
}

@Component({
  selector: 'app-overview',
  imports: [DatePipe, RouterLink, ButtonModule, SkeletonModule, PIcon, PageHeader, StatusTag, KpiTile, EdenMark],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview {
  private readonly authService = inject(AuthService);
  private readonly patientService = inject(PatientsService);
  private readonly profileService = inject(PatientProfileService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly accessDeniedMessage = ACCESS_DENIED_MESSAGE;
  readonly formatFcfa = formatFcfa;

  readonly accessDenied = computed(() => {
    const user = this.authService.currentUser();
    if (!isPlatformBrowser(this.platformId)) return true;
    return !user || !this.authService.isPatient() || user.patient_id === null;
  });

  // ===================== Identité & salutation =====================

  readonly firstName = computed(
    () => this.profileService.profile()?.PatientName || this.authService.currentUser()?.prenom || ''
  );

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  });

  readonly today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ===================== Données =====================

  readonly factures = computed(() => asList(this.patientService.factures()));
  readonly facturesLoading = this.patientService.facturesLoading;
  readonly facturesError = this.patientService.facturesError;

  readonly lab = computed(() => asList(this.patientService.examens_lab()));
  readonly labLoading = this.patientService.examens_lab_loading;
  readonly imagerie = computed(() => asList(this.patientService.imagerie()));
  readonly imagerieLoading = this.patientService.imagerieLoading;
  readonly exploration = computed(() => asList(this.patientService.exploration()));
  readonly explorationLoading = this.patientService.explorationLoading;

  readonly prescriptions = computed(() => asList(this.patientService.prescriptions()));
  readonly prescriptionsLoading = this.patientService.prescriptionsLoading;
  readonly prescriptionsError = this.patientService.prescriptionsError;

  readonly requetes = computed(() => asList(this.patientService.requete()));
  readonly requetesLoading = this.patientService.requeteLoading;
  readonly requetesError = this.patientService.requeteError;

  readonly examsLoading = computed(() => this.labLoading() || this.imagerieLoading() || this.explorationLoading());
  readonly examErrors = computed(() =>
    [this.patientService.examens_lab_error(), this.patientService.imagerieError(), this.patientService.explorationError()].filter(
      (e): e is string => !!e
    )
  );

  /** Premier affichage : rien n'est encore arrivé du serveur. */
  readonly firstLoad = computed(
    () => this.facturesLoading() && this.examsLoading() && this.factures().length === 0 && this.lab().length === 0
  );

  // ===================== Factures =====================

  readonly unpaid = computed(() =>
    this.factures().filter((f) => f.state !== 'paid' && f.state !== 'cancel' && toNumber(f.amount_to_pay) > 0)
  );
  readonly unpaidTotal = computed(() => this.unpaid().reduce((sum, f) => sum + toNumber(f.amount_to_pay), 0));
  readonly recentInvoices = computed(() => [...this.factures()].sort((a, b) => time(b.date) - time(a.date)).slice(0, 4));

  // ===================== Examens =====================

  readonly timeline = computed<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...this.lab().map((r) => ({
        key: `lab-${r.id}`,
        kind: 'Laboratoire' as const,
        title: r.test,
        requestor: r.requestor,
        date: r.validation_date || r.date_requested,
        link: '/patients/laboratoire',
        expired: !!r.statut_expiration,
        daysLeft: r.nbr_days_before_expiration ?? null,
      })),
      ...this.imagerie().map((r) => ({
        key: `img-${r.id}`,
        kind: 'Imagerie' as const,
        title: r.requested_test,
        requestor: r.requestor,
        date: r.validation_date || r.request_date,
        link: '/patients/imagerie',
        expired: !!r.statut_expiration,
        daysLeft: r.nbr_days_before_expiration ?? null,
      })),
      ...this.exploration().map((r) => ({
        key: `exp-${r.id}`,
        kind: 'Exploration' as const,
        title: r.test,
        requestor: r.requestor,
        date: r.validation_date || r.date_requested,
        link: '/patients/exploration',
        expired: !!r.statut_expiration,
        daysLeft: r.nbr_days_before_expiration ?? null,
      })),
    ];
    return items.sort((a, b) => time(b.date) - time(a.date));
  });

  readonly latestResults = computed(() => this.timeline().slice(0, 5));
  readonly availableResults = computed(() => this.timeline().filter((r) => !r.expired).length);
  readonly expiringSoon = computed(
    () => this.timeline().filter((r) => !r.expired && r.daysLeft !== null && r.daysLeft <= EXPIRY_WARNING_DAYS).length
  );

  readonly recentPrescriptions = computed(() =>
    [...this.prescriptions()].sort((a, b) => time(b.Create_date) - time(a.Create_date)).slice(0, 3)
  );
  readonly recentRequetes = computed(() => [...this.requetes()].sort((a, b) => time(b.CreatedAt) - time(a.CreatedAt)).slice(0, 3));

  // ===================== Tuiles =====================

  readonly tiles = computed(() => [
    {
      label: 'Factures',
      icon: 'receipt',
      accent: '#b45309',
      link: '/patients/factures',
      value: String(this.factures().length),
      hint: this.unpaid().length ? `${this.unpaid().length} à régler` : 'Toutes réglées',
      loading: this.facturesLoading() && this.factures().length === 0,
    },
    this.examTile('Laboratoire', 'filter', '#db1d1d', '/patients/laboratoire', this.lab(), this.labLoading()),
    this.examTile('Imagerie', 'image', '#1a7edb', '/patients/imagerie', this.imagerie(), this.imagerieLoading()),
    this.examTile('Exploration', 'wave-pulse', '#0d9488', '/patients/exploration', this.exploration(), this.explorationLoading()),
  ]);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (!isPlatformBrowser(this.platformId) || !user || !this.authService.isPatient() || user.patient_id === null) return;
      const patientId = user.patient_id;
      const userId = user.id;
      untracked(() => this.load(patientId, userId));
    });
  }

  refresh(): void {
    const user = this.authService.currentUser();
    if (user && user.patient_id !== null) {
      this.load(user.patient_id, user.id);
    }
  }

  expiryLabel(item: TimelineItem): string | null {
    if (item.expired) return 'Expiré';
    if (item.daysLeft !== null && item.daysLeft <= EXPIRY_WARNING_DAYS) {
      return item.daysLeft <= 0 ? "Expire aujourd'hui" : `Expire dans ${item.daysLeft} j`;
    }
    return null;
  }

  /** Rechargement systématique : le tableau de bord doit refléter l'état courant
   *  (PatientsService ignore les rechargements trop rapprochés). */
  private load(patientId: number, userId: number): void {
    this.patientService.getFactures(patientId, true);
    this.patientService.getExamensLab(true);
    this.patientService.getImagerie(true);
    this.patientService.getExploration(true);
    this.patientService.getPrescriptions(true);
    this.patientService.getRequetes(userId, true);
  }

  private examTile(label: string, icon: string, accent: string, link: string, list: { statut_expiration: boolean }[], loading: boolean) {
    const available = list.filter((r) => !r.statut_expiration).length;
    return {
      label,
      icon,
      accent,
      link,
      value: String(list.length),
      hint: list.length ? `${available} disponible${available > 1 ? 's' : ''}` : 'Aucun examen',
      loading: loading && list.length === 0,
    };
  }
}
