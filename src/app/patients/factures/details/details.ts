import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DetailsFactures } from '../factures.models';
import { FacturesResponseApi } from '../../patients.models';
import { StatusTag } from '../../shared/status-tag/status-tag';

@Component({
  selector: 'app-details',
  imports: [CommonModule, TableModule, ProgressSpinnerModule, StatusTag],
  templateUrl: './details.html',
  styleUrls: ['./details.css'],
})
export class Details {
  /** En-tête de la facture sélectionnée (date, référence, montant, statut). */
  selectedFacture = input<FacturesResponseApi | null>(null);

  /** Liste des produits de la facture, récupérée via l'API. */
  details = input<DetailsFactures | null>(null);

  /** Etat de chargement de la requête de détails. */
  loading = input<boolean>(false);

  /** Message d'erreur éventuel de la requête de détails. */
  error = input<string | null>(null);

  // [] est "truthy" en JS -> on vérifie explicitement la longueur
  hasProducts = computed(() => (this.details()?.length ?? 0) > 0);
}