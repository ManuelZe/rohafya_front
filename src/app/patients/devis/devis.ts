import { Component, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { DevisService } from './devis.service';
import { AuthService } from '../../connexion/auth-service';
import { PageHeader } from '../shared/page-header/page-header';
import { CartItem, DevisResult, PriceList, ProductSearchResult } from './devis.models';
import { EdenLoader } from '../../shared/eden-loader/eden-loader';

const ACCESS_DENIED_MESSAGE = 'L’UTILISATEUR NE PEUT PAS AVOIR ACCÈS À CES DONNÉES.';
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;

@Component({
  selector: 'app-devis',
  imports: [EdenLoader, CommonModule, PageHeader],
  templateUrl: './devis.html',
  styleUrl: './devis.css',
  host: {
    '(document:keydown.escape)': 'closeSearchResults()',
    '(document:click)': 'closeSearchResults()',
  },
})
export class Devis {
  private readonly devisService = inject(DevisService);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly accessDeniedMessage = ACCESS_DENIED_MESSAGE;

  accessDenied = computed(() => {
    const user = this.authService.currentUser();

    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }
    if (!user || !this.authService.isPatient() || user.patient_id === null) {
      return true;
    }
    return false;
  });

  priceLists = signal<PriceList[]>([]);
  priceListsLoading = signal(false);
  priceListsError = signal<string | null>(null);
  myPriceList = signal<PriceList | null>(null);
  selectedPriceListId = signal<number | null>(null);

  searchTerm = signal('');
  searchResults = signal<ProductSearchResult[]>([]);
  searching = signal(false);
  searchOpen = signal(false);
  searchUnavailable = signal(false);
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  cart = signal<CartItem[]>([]);

  cartEstimate = computed(() =>
    this.cart().reduce((sum, item) => sum + item.product.list_price * item.quantity, 0)
  );

  devisResult = signal<DevisResult | null>(null);
  resultDirty = signal(false);
  calculating = signal(false);
  calcError = signal<string | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId) && !this.accessDenied()) {
      this.loadPriceLists();
    }
  }

  private loadPriceLists(): void {
    this.priceListsLoading.set(true);
    this.priceListsError.set(null);

    this.devisService.getPriceLists().subscribe({
      next: (lists) => {
        this.priceLists.set(lists);
        this.priceListsLoading.set(false);
        this.applyDefaultPriceList();
      },
      error: (err) => {
        this.priceListsError.set('Impossible de charger les listes de prix.');
        this.priceListsLoading.set(false);
        console.error(err);
      },
    });

    this.devisService.getMyPriceList().subscribe({
      next: (list) => {
        this.myPriceList.set(list);
        this.applyDefaultPriceList();
      },
      error: () => {
        this.myPriceList.set(null);
      },
    });
  }

  private applyDefaultPriceList(): void {
    if (this.selectedPriceListId() !== null) return;

    const mine = this.myPriceList();
    const lists = this.priceLists();

    if (mine && lists.some((l) => l.id === mine.id)) {
      this.selectedPriceListId.set(mine.id);
    } else if (lists.length > 0) {
      this.selectedPriceListId.set(lists[0].id);
    }
  }

  onPriceListChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedPriceListId.set(value ? Number(value) : null);
    this.markResultDirty();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.searchOpen.set(true);

    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }

    const term = value.trim();
    if (term.length < SEARCH_MIN_LENGTH) {
      this.searchResults.set([]);
      this.searching.set(false);
      return;
    }

    this.searchDebounceHandle = setTimeout(() => this.runSearch(term), SEARCH_DEBOUNCE_MS);
  }

  private runSearch(term: string): void {
    this.searching.set(true);

    this.devisService.searchProducts(term).subscribe({
      next: (results) => {
        this.searchResults.set(results);
        this.searchUnavailable.set(false);
        this.searching.set(false);
      },
      error: (err) => {
        this.searchResults.set([]);
        // Un 404 signifie que la route de recherche n'est pas (encore) déployée côté API —
        // à distinguer d'une recherche sans résultat, qui n'est pas une erreur.
        this.searchUnavailable.set(err?.status === 404);
        this.searching.set(false);
        console.error(err);
      },
    });
  }

  closeSearchResults(): void {
    this.searchOpen.set(false);
  }

  addToCart(product: ProductSearchResult): void {
    this.cart.update((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...items, { product, quantity: 1 }];
    });

    this.searchTerm.set('');
    this.searchResults.set([]);
    this.searchOpen.set(false);
    this.markResultDirty();
  }

  removeFromCart(productId: number): void {
    this.cart.update((items) => items.filter((item) => item.product.id !== productId));
    this.markResultDirty();
  }

  updateQuantity(productId: number, event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    const quantity = Number.isFinite(raw) && raw > 0 ? raw : 1;

    this.cart.update((items) =>
      items.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
    this.markResultDirty();
  }

  private markResultDirty(): void {
    if (this.devisResult()) {
      this.resultDirty.set(true);
    }
  }

  calculate(): void {
    const priceListId = this.selectedPriceListId();
    const cart = this.cart();

    if (!priceListId || cart.length === 0) {
      this.calcError.set('Sélectionnez une liste de prix et au moins un examen.');
      return;
    }

    this.calculating.set(true);
    this.calcError.set(null);

    const produits = cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity }));

    this.devisService.calculerDevis(priceListId, produits).subscribe({
      next: (result) => {
        this.devisResult.set(result);
        this.resultDirty.set(false);
        this.calculating.set(false);
      },
      error: (err) => {
        this.calcError.set('Impossible de calculer le devis.');
        this.calculating.set(false);
        console.error(err);
      },
    });
  }

  clearCart(): void {
    this.cart.set([]);
    this.devisResult.set(null);
    this.resultDirty.set(false);
    this.calcError.set(null);
  }
}
