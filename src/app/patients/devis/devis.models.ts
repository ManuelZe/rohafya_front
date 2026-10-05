export interface PriceList {
  id: number;
  name: string;
}

export interface ProductSearchResult {
  id: number;
  code: string;
  name: string;
  list_price: number;
}

export interface DevisLine {
  product_id: number;
  code?: string;
  name?: string;
  list_price?: number;
  unit_price?: number;
  quantity?: number;
  amount?: number;
  Message?: string;
}

export interface DevisResult {
  price_list: { id: number; name: string };
  lignes: DevisLine[];
  montant_total: number;
}

export interface DevisProductPayload {
  product_id: number;
  quantity: number;
}

export interface CartItem {
  product: ProductSearchResult;
  quantity: number;
}
