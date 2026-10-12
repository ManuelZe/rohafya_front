import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { DetailsFactures } from './factures.models';
import { environment } from '../../../environments/environment';
import { extractErrorMessage } from '../../shared/api-error';

interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * URL des produits d'une facture : la référence est transmise telle quelle (FAC-CLB-5002, FAC/2026/0105…),
 * chaque segment encodé, sans double barre oblique après l'adresse de l'API.
 */
export function invoiceDetailsUrl(apiUrl: string, reference: string): string {
  const base = apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;
  const ref = reference.trim().split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return `${base}patient/factures/products/${ref}`;
}

@Injectable({ providedIn: 'root' })
export class FacturesService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly detailsState = signal<ResourceState<DetailsFactures>>({
    data: null,
    loading: false,
    error: null,
  });

  readonly detailsfactures = computed(() => this.detailsState().data);
  readonly isLoading = computed(() => this.detailsState().loading);
  readonly error = computed(() => this.detailsState().error);

  getDetailsFactures(reference: string): void {
    this.detailsState.set({ data: null, loading: true, error: null });

    this.http
      .get<DetailsFactures>(invoiceDetailsUrl(this.baseUrl, reference))
      .subscribe({
        next: (data) => {
          this.detailsState.set({ data, loading: false, error: null });
        },
        error: (err: HttpErrorResponse) => {
          this.detailsState.set({
            data: null,
            loading: false,
            error: this.extractErrorMessage(err),
          });
        },
      });
  }

  /** Réinitialise l'état des détails (ex: quand aucune facture n'est sélectionnée). */
  resetDetails(): void {
    this.detailsState.set({ data: null, loading: false, error: null });
  }

  private extractErrorMessage(err: HttpErrorResponse): string {
    return extractErrorMessage(err, 'Aucune facture trouvée pour cette référence.');
  }
}