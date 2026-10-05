import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, TimeoutError, timeout } from 'rxjs';
import { FacturesResponseApi, ExamensLab, ExamenImagerie, ExplorationLab, Prescriptions, Requetes } from './patients.models';
import { environment } from '../../environments/environment';

interface ResourceState<T> {
  data: T[] | null;
  loading: boolean;
  error: string | null;
  loadedAt: number | null;
}

function initialState<T>(): ResourceState<T> {
  return { data: null, loading: false, error: null, loadedAt: null };
}

/** Au-delà de ce délai sans réponse, on abandonne la requête plutôt que de laisser
 *  l'interface bloquée indéfiniment sur "Chargement...". Volontairement large : le backend
 *  (serveur de dev Flask, mono-thread) peut mettre plusieurs dizaines de secondes à répondre
 *  quand plusieurs requêtes arrivent en même temps — un délai trop court annule des requêtes
 *  qui auraient fini par aboutir (visible en "Canceled" dans l'onglet réseau). */
const REQUEST_TIMEOUT_MS = 45000;

/** Empêche de renvoyer un lot de requêtes forcées si les données viennent tout juste
 *  d'être chargées (ex. l'utilisateur quitte puis revient rapidement sur le tableau de bord).
 *  Réduit la charge simultanée envoyée au backend. */
const MIN_FORCE_REFRESH_INTERVAL_MS = 30000;

@Injectable({ providedIn: 'root' })
export class PatientsService {
  private http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;

  // ===================== FACTURES =====================
  readonly facturesState = signal<ResourceState<FacturesResponseApi>>(initialState<FacturesResponseApi>());

  factures = computed(() => this.facturesState().data ?? []);
  facturesLoading = computed(() => this.facturesState().loading);
  facturesError = computed(() => this.facturesState().error);
  facturesLoaded = computed(() => this.facturesState().data !== null);
  private facturesSub: Subscription | null = null;

  getFactures(patientId: number, forceRefresh = false): void {
    const state = this.facturesState();
    // Une requête est déjà en vol : ne pas en empiler une seconde sur le backend.
    if (state.loading) return;
    if (!forceRefresh && state.data !== null) return;
    if (forceRefresh && state.loadedAt !== null && Date.now() - state.loadedAt < MIN_FORCE_REFRESH_INTERVAL_MS) return;

    this.facturesState.update((s) => ({ ...s, loading: true, error: null }));

    this.facturesSub = this.http
      .get<FacturesResponseApi[]>(`${this.baseUrl}/patient/factures/${patientId}`)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (data) => {
          this.facturesState.set({ data, loading: false, error: null, loadedAt: Date.now() });
        },
        error: (err: unknown) => {
          this.facturesState.update((s) => ({
            ...s,
            loading: false,
            error: this.extractErrorMessage(err),
          }));
        },
      });
  }

  clearFactures(): void {
    this.facturesState.set(initialState<FacturesResponseApi>());
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof TimeoutError) {
      return 'Le serveur met trop de temps à répondre. Réessayez plus tard.';
    }
    if (err instanceof HttpErrorResponse) {
      const backendMessage = (err.error as { message?: string } | null)?.message;
      return backendMessage ?? 'Impossible de récupérer les éléments. Réessayez plus tard.';
    }
    return 'Impossible de récupérer les éléments. Réessayez plus tard.';
  }

  // ===================== EXAMENS LABORATOIRES =====================
  readonly examsLabState = signal<ResourceState<ExamensLab>>(initialState<ExamensLab>());

  examens_lab = computed(() => this.examsLabState().data ?? []);
  examens_lab_loading = computed(() => this.examsLabState().loading);
  examens_lab_error = computed(() => this.examsLabState().error);
  examens_lab_loaded = computed(() => this.examsLabState().data !== null);
  private examsLabSub: Subscription | null = null;

  getExamensLab(forceRefresh = false): void {
    const state = this.examsLabState();
    if (state.loading) return;
    if (!forceRefresh && state.data !== null) return;
    if (forceRefresh && state.loadedAt !== null && Date.now() - state.loadedAt < MIN_FORCE_REFRESH_INTERVAL_MS) return;

    this.examsLabState.update((s) => ({ ...s, loading: true, error: null }));

    this.examsLabSub = this.http
      .get<ExamensLab[]>(`${this.baseUrl}/laboratoire/all_results/`)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (data) => {
          this.examsLabState.set({ data, loading: false, error: null, loadedAt: Date.now() });
        },
        error: (err: unknown) => {
          this.examsLabState.update((s) => ({
            ...s,
            loading: false,
            error: this.extractErrorMessage(err),
          }));
        },
      });
  }

  clearExamsLabo(): void {
    this.examsLabState.set(initialState<ExamensLab>());
  }

  // ===================== IMAGERIE =====================
  readonly examsImgState = signal<ResourceState<ExamenImagerie>>(initialState<ExamenImagerie>());

  imagerie = computed(() => this.examsImgState().data ?? []);
  imagerieLoading = computed(() => this.examsImgState().loading);
  imagerieError = computed(() => this.examsImgState().error);
  imagerieLoaded = computed(() => this.examsImgState().data !== null);
  private examsImgSub: Subscription | null = null;

  getImagerie(forceRefresh = false): void {
    const state = this.examsImgState();
    if (state.loading) return;
    if (!forceRefresh && state.data !== null) return;
    if (forceRefresh && state.loadedAt !== null && Date.now() - state.loadedAt < MIN_FORCE_REFRESH_INTERVAL_MS) return;

    this.examsImgState.update((s) => ({ ...s, loading: true, error: null }));

    this.examsImgSub = this.http
      .get<ExamenImagerie[]>(`${this.baseUrl}imagerie/all_results/`)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (data) => {
          this.examsImgState.set({ data, loading: false, error: null, loadedAt: Date.now() });
        },
        error: (err: unknown) => {
          this.examsImgState.update((s) => ({
            ...s,
            loading: false,
            error: this.extractErrorMessage(err),
          }));
        },
      });
  }

  clearImagerie(): void {
    this.examsImgState.set(initialState<ExamenImagerie>());
  }

  // ===================== EXPLORATION FONCTIONNELLE =====================
  readonly examsExpState = signal<ResourceState<ExplorationLab>>(initialState<ExplorationLab>());

  exploration = computed(() => this.examsExpState().data ?? []);
  explorationLoading = computed(() => this.examsExpState().loading);
  explorationError = computed(() => this.examsExpState().error);
  explorationLoaded = computed(() => this.examsExpState().data !== null);
  private examsExpSub: Subscription | null = null;

  getExploration(forceRefresh = false): void {
    const state = this.examsExpState();
    if (state.loading) return;
    if (!forceRefresh && state.data !== null) return;
    if (forceRefresh && state.loadedAt !== null && Date.now() - state.loadedAt < MIN_FORCE_REFRESH_INTERVAL_MS) return;

    this.examsExpState.update((s) => ({ ...s, loading: true, error: null }));

    this.examsExpSub = this.http
      .get<ExplorationLab[]>(`${this.baseUrl}exploration/all_results/`)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (data) => {
          this.examsExpState.set({ data, loading: false, error: null, loadedAt: Date.now() });
        },
        error: (err: unknown) => {
          this.examsExpState.update((s) => ({
            ...s,
            loading: false,
            error: this.extractErrorMessage(err),
          }));
        },
      });
  }

  clearExploration(): void {
    this.examsExpState.set(initialState<ExplorationLab>());
  }

  // ===================== PRESCRIPTIONS =====================
  readonly prescriptionState = signal<ResourceState<Prescriptions>>(initialState<Prescriptions>());

  prescriptions = computed(() => this.prescriptionState().data ?? []);
  prescriptionsLoading = computed(() => this.prescriptionState().loading);
  prescriptionsError = computed(() => this.prescriptionState().error);
  prescriptionsLoaded = computed(() => this.prescriptionState().data !== null);
  private prescriptionSub: Subscription | null = null;

  getPrescriptions(forceRefresh = false): void {
    const state = this.prescriptionState();
    if (state.loading) return;
    if (!forceRefresh && state.data !== null) return;
    if (forceRefresh && state.loadedAt !== null && Date.now() - state.loadedAt < MIN_FORCE_REFRESH_INTERVAL_MS) return;

    this.prescriptionState.update((s) => ({ ...s, loading: true, error: null }));

    this.prescriptionSub = this.http
      .get<Prescriptions[]>(`${this.baseUrl}prescription/all_prescriptions/`)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (data) => {
          this.prescriptionState.set({ data, loading: false, error: null, loadedAt: Date.now() });
        },
        error: (err: unknown) => {
          this.prescriptionState.update((s) => ({
            ...s,
            loading: false,
            error: this.extractErrorMessage(err),
          }));
        },
      });
  }

  clearPrescriptions(): void {
    this.prescriptionState.set(initialState<Prescriptions>());
  }

  // ===================== REQUETES =====================
  readonly requeteState = signal<ResourceState<Requetes>>(initialState<Requetes>());

  requete = computed(() => this.requeteState().data ?? []);
  requeteLoading = computed(() => this.requeteState().loading);
  requeteError = computed(() => this.requeteState().error);
  requeteLoaded = computed(() => this.requeteState().data !== null);
  private requeteSub: Subscription | null = null;

  getRequetes(userId: number, forceRefresh = false): void {
    const state = this.requeteState();
    if (state.loading) return;
    if (!forceRefresh && state.data !== null) return;
    if (forceRefresh && state.loadedAt !== null && Date.now() - state.loadedAt < MIN_FORCE_REFRESH_INTERVAL_MS) return;

    this.requeteState.update((s) => ({ ...s, loading: true, error: null }));

    this.requeteSub = this.http
      .get<Requetes[]>(`${this.baseUrl}requete/get_requests/${userId}`)
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (data) => {
          this.requeteState.set({ data, loading: false, error: null, loadedAt: Date.now() });
        },
        error: (err: unknown) => {
          this.requeteState.update((s) => ({
            ...s,
            loading: false,
            error: this.extractErrorMessage(err),
          }));
        },
      });
  }

  clearRequete(): void {
    this.requeteState.set(initialState<Requetes>());
  }

  // ===================== RESET GLOBAL (déconnexion) =====================
  resetAll(): void {
    this.facturesSub?.unsubscribe();
    this.examsLabSub?.unsubscribe();
    this.examsImgSub?.unsubscribe();
    this.examsExpSub?.unsubscribe();
    this.prescriptionSub?.unsubscribe();
    this.requeteSub?.unsubscribe();

    this.clearFactures();
    this.clearExamsLabo();
    this.clearImagerie();
    this.clearExploration();
    this.clearPrescriptions();
    this.clearRequete();
  }
}