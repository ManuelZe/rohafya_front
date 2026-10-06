import { HttpClient } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Establishment } from './submission.models';

/** Établissements actifs, destinataires possibles des prescriptions, pré-enregistrements et requêtes. */
@Service()
export class EstablishmentsService {
  private readonly http = inject(HttpClient);

  readonly list = signal<Establishment[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private loaded = false;

  /** Charge la liste une seule fois par session (route publique, sans connexion). */
  load(): void {
    if (this.loaded || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.http.get<Establishment[]>(`${environment.apiUrl}saas/public/establishments`).subscribe({
      next: (list) => {
        this.list.set(Array.isArray(list) ? list : []);
        this.loaded = true;
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger la liste des établissements.');
        this.loading.set(false);
      },
    });
  }
}
