import { Component, computed, inject, signal, PLATFORM_ID, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { TableModule, TableRowSelectEvent } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { PRIMENG_MODULES } from '../../../others/shared-import';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { PIcon } from '@primeicons/angular/p-icon';
import { Details } from './details/details';
import { PatientsService } from '../patients-service';
import { AuthService } from '../../connexion/auth-service';
import { FacturesService } from './factures-service';
import { FacturesResponseApi } from '../patients.models';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { PageHeader } from '../shared/page-header/page-header';
import { StatusTag } from '../shared/status-tag/status-tag';

@Component({
  selector: 'app-factures',
  imports: [
    CommonModule,
    FormField,
    TableModule,
    InputTextModule,
    ButtonModule,
    TagModule,
    Details,
    PRIMENG_MODULES,
    PIcon,
    SelectModule,
    IconFieldModule,
    InputIconModule,
    PageHeader,
    StatusTag,
  ],
  templateUrl: './factures.html',
  styleUrls: ['./factures.css'],
})
export class Factures {
  readonly searchModel = signal({ query: '' });
  readonly searchForm = form(this.searchModel);

  private patientsService = inject(PatientsService);
  private facturesService = inject(FacturesService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  factures = this.patientsService.factures;
  detailsFacture = this.facturesService.detailsfactures;
  isLoadingDetails = this.facturesService.isLoading;
  errorDetails = this.facturesService.error;

  // La facture actuellement sélectionnée (en-tête complet : date, référence, montant, statut...)
  selectedFacture = signal<FacturesResponseApi | null>(null);

  facturesFirst = signal(0);
  facturesRows = 5;

  // ===================== KPI - calculés à partir de factures() =====================
  // Sémantique métier : draft = non payée, posted = partiellement payée, paid = payée

  /** Nombre de factures partiellement payées (state = "posted") */
  partiallyPaidCount = computed(
    () => this.factures().filter((f) => f.state === 'posted').length
  );

  /** Nombre de factures totalement payées (state = "paid") */
  paidCount = computed(
    () => this.factures().filter((f) => f.state === 'paid').length
  );

  /** Nombre de factures non payées (state = "draft") */
  unpaidCount = computed(
    () => this.factures().filter((f) => f.state === 'draft').length
  );

  onFacturesPageChange(event: { first: number; rows: number }): void {
    this.facturesFirst.set(event.first);
  }

  onFactureSelect(event: TableRowSelectEvent<FacturesResponseApi>): void {
    if (!event.data) return;

    const selected = Array.isArray(event.data) ? event.data[0] : event.data;
    if (!selected) return;

    if (!selected.invoice_number) {
      console.warn('Facture sélectionnée sans invoice_number, impossible de charger les détails.', selected);
      this.facturesService.resetDetails();
      this.selectedFacture.set(null);
      return;
    }

    this.selectedFacture.set(selected);
    this.facturesService.getDetailsFactures(selected.invoice_number);
  }

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const user = this.authService.currentUser();
        if (user && this.authService.isPatient() && user.patient_id !== null) {
          this.patientsService.getFactures(user.patient_id);
          this.patientsService.getExamensLab();
          this.patientsService.getImagerie();
          this.patientsService.getExploration();
          this.patientsService.getPrescriptions();
          this.patientsService.getRequetes(user.id);
        }
      }
    });
  }
}