import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DevisProductPayload, DevisResult, PriceList, ProductSearchResult } from './devis.models';

@Injectable({ providedIn: 'root' })
export class DevisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** GET /devis/liste_prix/ — toutes les listes de prix actives */
  getPriceLists(): Observable<PriceList[]> {
    return this.http.get<PriceList[]>(`${this.baseUrl}devis/liste_prix/`);
  }

  /** GET /devis/liste_prix/moi/ — la liste de prix associée à l'utilisateur connecté (ou null) */
  getMyPriceList(): Observable<PriceList | null> {
    return this.http
      .get<PriceList | { Message: string }>(`${this.baseUrl}devis/liste_prix/moi/`)
      .pipe(map((res) => ('id' in res ? res : null)));
  }

  /** GET /devis/produits/recherche/?q=&limit= — autocomplétion par nom/code */
  searchProducts(query: string, limit = 20): Observable<ProductSearchResult[]> {
    const params = new HttpParams().set('q', query).set('limit', limit);
    return this.http.get<ProductSearchResult[]>(`${this.baseUrl}devis/produits/recherche/`, { params });
  }

  /** POST /devis/calculer/{priceListId}/ */
  calculerDevis(priceListId: number, produits: DevisProductPayload[]): Observable<DevisResult> {
    return this.http.post<DevisResult>(`${this.baseUrl}devis/calculer/${priceListId}/`, { produits });
  }
}
