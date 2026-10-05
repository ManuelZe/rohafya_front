import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { DetailsFactures } from './factures.models';
import { environment } from '../../../environments/environment';

interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class FacturesService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;;

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
      .get<DetailsFactures>(`${this.baseUrl}/patient/factures/products/${reference}`)
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
    return (
      (err.error as { message?: string })?.message ??
      'Aucune facture trouvée pour cette référence.'
    );
  }
}