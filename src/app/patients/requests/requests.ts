import { Component, OnInit, inject, input, signal, ViewChild, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RequestService } from './requests.service';
import { AuthService } from '../../connexion/auth-service';
import { UserRequest } from './requests.models';

// PrimeNG Imports
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule, ButtonDirective } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { SelectButtonModule } from 'primeng/selectbutton';
import { PanelModule } from 'primeng/panel';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { Trash } from '@primeicons/angular/trash';
import { Spinner } from '@primeicons/angular/spinner';
import { PageHeader } from '../shared/page-header/page-header';
import { StatusTag } from '../shared/status-tag/status-tag';
import { EstablishmentsService } from '../../shared/submission/establishments.service';
import { ListToolbar } from '../../shared/list/list-toolbar';
import { ShowMore } from '../../shared/list/show-more';
import { ListWindow } from '../../shared/list/list-window';
import { FilterOption, SortOrder, distinctValues, matchesText, sortByDate } from '../../shared/list/list-filters';
import { extractErrorMessage } from '../../shared/api-error';
import { SaasAccountService } from '../../saas/saas-account.service';
import { SubmissionInfoView } from '../../shared/submission/submission-info';
import { SUBMISSION_STATUS_SEVERITY, SubmissionAudience } from '../../shared/submission/submission.models';

import { TranslatePipe } from '../../shared/i18n/t.pipe';
import { tr } from '../../shared/i18n/i18n';
@Component({
  selector: 'app-requests',
  imports: [TranslatePipe, ListToolbar, ShowMore, 
    CommonModule,
    FormsModule,
    DatePipe,
    ReactiveFormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    CardModule,
    Trash,
    Spinner,
    SkeletonModule,
    SelectButtonModule,
    ButtonDirective,
    PanelModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
    PageHeader,
    StatusTag,
    SelectModule,
    SubmissionInfoView,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './requests.html',
  styleUrl: './requests.css',
})
export class Requests implements OnInit {
  @ViewChild('dt') dt!: Table;

  private requestService = inject(RequestService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  readonly establishments = inject(EstablishmentsService);
  private readonly saasAccount = inject(SaasAccountService);
  readonly statusSeverity = SUBMISSION_STATUS_SEVERITY;
  searchTerm = signal<string>('');

  /** Visiteur non connecté (route publique /requests) : formulaire seul, réponse par e-mail. */
  readonly isAnonymous = computed(() => !this.authService.isLoggedIn());

  requests = signal<UserRequest[]>([]);
  isLoading = signal<boolean>(false);
  activeTab = signal<'list' | 'add'>('list');

  expandedCardId = signal<number | null>(null);

  /** id de la requête en cours de suppression (pour désactiver/spinner son bouton précisément) */
  deletingId = signal<number | null>(null);

  toggleCard(id: number | undefined): void {
    if (id === undefined) return;

    if (this.expandedCardId() === id) {
      this.expandedCardId.set(null);
    } else {
      this.expandedCardId.set(id);
    }
  }

  private readonly allTabs = [
    { label: 'Mes requêtes', value: 'list', icon: 'pi pi-list' },
    { label: 'Nouvelle requête', value: 'add', icon: 'pi pi-plus' }
  ];
  readonly tabOptions = computed(() =>
    (this.isAnonymous() ? this.allTabs.filter((t) => t.value === 'add') : this.allTabs).map((tab) => ({ ...tab, label: tr(tab.label) }))
  );

  readonly statusOptions: FilterOption[] = [
    { value: '', label: 'Toutes' },
    { value: 'recue', label: 'Reçues' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'traitee', label: 'Traitées' },
    { value: 'refusee', label: 'Refusées' },
  ];
  readonly statusFilter = signal('');
  readonly establishmentFilter = signal('');
  readonly sort = signal<SortOrder>('recent');

  /** Établissements destinataires présents dans la liste (filtre affiché à partir de deux). */
  readonly requestEstablishments = computed(() => distinctValues(this.requestList().map((r) => r.submission?.establishment)));

  private readonly requestList = computed(() => {
    const rawData = this.requests();
    return Array.isArray(rawData) ? rawData : [];
  });

  filteredRequests = computed(() => {
    const term = this.searchTerm();
    const status = this.statusFilter();
    const establishment = this.establishmentFilter();
    const items = this.requestList().filter(
      (r) =>
        (!status || r.submission?.status === status) &&
        (!establishment || r.submission?.establishment === establishment) &&
        matchesText(term, r.id, r.first_name, r.last_name, r.email, r.message, r.submission?.establishment)
    );
    return sortByDate(items, (r) => r.CreatedAt, this.sort());
  });

  /** Vue mobile : 10 requêtes, puis « Afficher plus » (le tableau desktop garde sa pagination). */
  readonly mobileList = new ListWindow(this.filteredRequests, 10, () => [this.searchTerm(), this.statusFilter(), this.establishmentFilter(), this.sort()]);

  /** Espace appelant, fourni par les données de route : les catégories proposées diffèrent. */
  readonly audience = input<SubmissionAudience>('patient');

  private readonly patientCategories = [
    { control: 'administration', label: 'Administration' },
    // { control: 'commission', label: 'Commission' },
    // { control: 'connection', label: 'Connexion' },
    { control: 'error', label: 'Erreur' },
    // { control: 'etat_patient', label: 'État Patient' },
    // { control: 'patient_request_connexion', label: 'Req. Connexion' },
    { control: 'patient_request_examen_out', label: 'Examen Externe' },
    { control: 'patient_request_other_administration', label: 'Autre Admin' },
    { control: 'patient_request_prix_examen', label: 'Prix Examen' },
    { control: 'revendication_examen', label: 'Revendication Examen' },
    { control: 'suggestion', label: 'Suggestion' },
    // { control: 'valide', label: 'Validé' }
  ];

  private readonly doctorCategories = [
    { control: 'commission', label: 'Commission' },
    { control: 'revendication_examen', label: 'Revendication Examen' },
    { control: 'etat_patient', label: 'État Patient' },
    { control: 'administration', label: 'Administration' },
    { control: 'error', label: 'Erreur' },
    { control: 'suggestion', label: 'Suggestion' },
  ];

  /** La catégorie « Commission » n'est proposée que si le module commissions est activé pour le médecin. */
  readonly categoryOptions = computed(() =>
    this.audience() === 'doctor'
      ? this.doctorCategories.filter((c) => c.control !== 'commission' || this.saasAccount.commissionsEnabled())
      : this.patientCategories
  );


  requestForm: FormGroup = this.fb.group({
    tenant_id: [null as number | null, Validators.required],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10)]],
    administration: [false],
    commission: [false],
    connection: [false],
    error: [false],
    etat_patient: [false],
    patient_request_connexion: [false],
    patient_request_examen_out: [false],
    patient_request_other_administration: [false],
    patient_request_prix_examen: [false],
    revendication_examen: [false],
    suggestion: [false],
    valide: [false]
  });

  ngOnInit(): void {
    this.establishments.load();
    this.initFormWithUserData();
    if (this.isAnonymous()) {
      this.activeTab.set('add');
      return;
    }
    this.fetchRequests();
  }

  private initFormWithUserData(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.requestForm.patchValue({
        first_name: user.prenom || '',
        last_name: user.nom || '',
        email: user.email || ''
      });
    }
  }

  fetchRequests(): void {
    const user = this.authService.currentUser();
    if (!user?.id) return;
    this.isLoading.set(true);

    this.requestService.getMyRequests(user.id, this.audience()).subscribe({
      next: (data: any) => {
        this.requests.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
      },
      error: () => {
        this.requests.set([]);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les requêtes.'
        });
      }
    });
  }

  onSubmit(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const payload: UserRequest = { ...this.requestForm.value, audience: this.audience() };
    this.requestService.createRequest(payload).subscribe({
      next: (created) => {
        const establishment = created.submission?.establishment ?? tr("l'établissement");
        this.messageService.add({
          severity: 'success',
          summary: tr('Requête envoyée'),
          detail: this.isAnonymous()
            ? tr('Votre requête a été envoyée à {establishment}. La réponse vous parviendra par e-mail.', { establishment })
            : tr('Votre requête a été envoyée à {establishment}.', { establishment })
        });
        this.requestForm.reset();
        this.initFormWithUserData();
        this.isLoading.set(false);
        if (!this.isAnonymous()) {
          this.activeTab.set('list');
          this.fetchRequests();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: tr('Erreur'),
          detail: extractErrorMessage(err, tr("Échec de l'envoi de la requête."))
        });
      }
    });
  }

  /** Ouvre la boîte de confirmation avant suppression. */
  confirmDelete(req: UserRequest, event?: Event): void {
    event?.stopPropagation();

    if (req.id === undefined) return;

    this.confirmationService.confirm({
      header: tr('Confirmer la suppression'),
      message: tr('Voulez-vous vraiment supprimer la requête #{id} de {name} ? Cette action est irréversible.', {
        id: req.id,
        name: `${req.first_name} ${req.last_name}`,
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: tr('Supprimer'),
      rejectLabel: tr('Annuler'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () => this.deleteRequest(req.id),
    });
  }

  private deleteRequest(id: number | undefined): void {
    if (id === undefined) return;

    this.deletingId.set(id);
    this.requestService.deleteRequest(id).subscribe({
      next: () => {
        this.requests.update((list) => (Array.isArray(list) ? list.filter((r) => r.id !== id) : []));
        if (this.expandedCardId() === id) {
          this.expandedCardId.set(null);
        }
        this.deletingId.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Supprimée',
          detail: 'La requête a été supprimée avec succès.'
        });
      },
      error: () => {
        this.deletingId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de supprimer la requête.'
        });
      }
    });
  }

  toggleCheckbox(controlName: string) {
    const control = this.requestForm.get(controlName);
    if (control) {
      control.setValue(!control.value);
    }
  }

  setTab(tab: 'list' | 'add'): void {
    this.activeTab.set(tab);
  }
}