import { HttpErrorResponse } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { Observable, Subscription, TimeoutError, timeout } from 'rxjs';

/** Même logique que PatientsService : le backend Flask (mono-thread, requêtes Tryton lourdes)
 *  peut mettre plusieurs dizaines de secondes à répondre. */
export const REQUEST_TIMEOUT_MS = 45000;

/** Évite de renvoyer une rafale de requêtes forcées si les données viennent d'être chargées. */
const MIN_FORCE_REFRESH_INTERVAL_MS = 30000;

interface ResourceState<T> {
  key: string | null;
  data: T | null;
  loading: boolean;
  error: string | null;
  loadedAt: number | null;
}

/** L'API renvoie parfois un statut 200 avec { message: "..." } au lieu d'une erreur HTTP. */
export class ApiSoftError extends Error {}

export function extractErrorMessage(err: unknown, fallback = 'Impossible de récupérer les éléments. Réessayez plus tard.'): string {
  if (err instanceof TimeoutError) {
    return 'Le serveur met trop de temps à répondre. Réessayez plus tard.';
  }
  if (err instanceof ApiSoftError) {
    return err.message;
  }
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Serveur injoignable. Vérifiez votre connexion internet.';
    }
    if (err.status === 403) {
      return "Vous n'avez pas les droits nécessaires pour consulter ces données.";
    }
    const body = err.error as { message?: string; Message?: string; error?: string } | null;
    return body?.message ?? body?.Message ?? fallback;
  }
  return fallback;
}

/** Renvoie le message d'une réponse « erreur douce » ({ message } / { Message }) ou null. */
export function softErrorMessage(res: unknown): string | null {
  if (!res || typeof res !== 'object' || Array.isArray(res)) return null;
  const record = res as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 1) return null;
  const value = record['message'] ?? record['Message'];
  return typeof value === 'string' ? value : null;
}

/**
 * Ressource HTTP mise en cache, exposée sous forme de signaux.
 * `key` identifie les paramètres (docteur, mois, type…) : changer de clé relance le chargement.
 */
export class ApiResource<T> {
  private readonly state = signal<ResourceState<T>>({ key: null, data: null, loading: false, error: null, loadedAt: null });
  private sub: Subscription | null = null;

  readonly data = computed(() => this.state().data);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly loaded = computed(() => this.state().data !== null);
  /** Rechargement en cours alors que des données sont déjà affichées (on garde l'affichage). */
  readonly refreshing = computed(() => this.state().loading && this.state().data !== null);

  constructor(private readonly fallbackError?: string) {}

  load(key: string, request: () => Observable<T>, forceRefresh = false): void {
    const s = this.state();
    const sameKey = s.key === key;

    if (sameKey && s.loading) return;
    if (sameKey && !forceRefresh && s.data !== null) return;
    if (sameKey && forceRefresh && s.loadedAt !== null && Date.now() - s.loadedAt < MIN_FORCE_REFRESH_INTERVAL_MS) return;

    this.sub?.unsubscribe();
    this.state.set({ key, data: sameKey ? s.data : null, loading: true, error: null, loadedAt: sameKey ? s.loadedAt : null });

    this.sub = request()
      .pipe(timeout(REQUEST_TIMEOUT_MS))
      .subscribe({
        next: (data) => this.state.set({ key, data, loading: false, error: null, loadedAt: Date.now() }),
        error: (err: unknown) =>
          this.state.update((current) => ({ ...current, loading: false, error: extractErrorMessage(err, this.fallbackError) })),
      });
  }

  reset(): void {
    this.sub?.unsubscribe();
    this.sub = null;
    this.state.set({ key: null, data: null, loading: false, error: null, loadedAt: null });
  }
}
