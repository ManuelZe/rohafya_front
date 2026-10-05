import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResource } from '../shared/api-resource';

/** GET /blog/ */
export interface Article {
  id: number;
  titre: string | null;
  date: string | null;
  description: string | null;
  url: string | null;
  is_visible: boolean | null;
}

@Service()
export class ActualitesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly articles = new ApiResource<Article[]>('Impossible de charger les actualités.');

  load(force = false): void {
    this.articles.load(
      'all',
      () =>
        this.http.get<Article[]>(`${this.baseUrl}blog/`).pipe(
          map((res) => (Array.isArray(res) ? res : []).filter((a) => a.is_visible !== false))
        ),
      force
    );
  }

  /** GET /blog/image/{id} — protégé par JWT, d'où un téléchargement en Blob plutôt qu'un <img src>. */
  getImage(articleId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}blog/image/${articleId}`, { responseType: 'blob' });
  }
}
