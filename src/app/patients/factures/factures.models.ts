/**
 * Une ligne de produit appartenant à une facture.
 * Correspond à un élément de la réponse de GET /patient/factures/products/:reference
 * (une facture peut contenir plusieurs produits → réponse = tableau)
 */
export interface FactureProduct {
    product_name: string;
    quantity: string;
}
 
export type DetailsFactures = FactureProduct[];
 
