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
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { SelectButtonModule } from 'primeng/selectbutton';
import { PanelModule } from 'primeng/panel';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Trash } from '@primeicons/angular/trash';
import { Spinner } from '@primeicons/angular/spinner';
import { PageHeader } from '../shared/page-header/page-header';
import { StatusTag } from '../shared/status-tag/status-tag';

@Component({
  selector: 'app-requests',
  imports: [
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
    IconFieldModule,
    InputIconModule,
    SkeletonModule,
    SelectButtonModule,
    ButtonDirective,
    PanelModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
    PageHeader,
    StatusTag,
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
  searchTerm = signal<string>('');

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

  tabOptions = [
    { label: 'Liste des requêtes', value: 'list', icon: 'pi pi-list' },
    { label: 'Nouvelle requête', value: 'add', icon: 'pi pi-plus' }
  ];

  filteredRequests = computed(() => {
    const rawData = this.requests();
    const list = Array.isArray(rawData) ? rawData : [];
    const term = this.searchTerm().toLowerCase();

    if (!term) return list;

    return list.filter(r => 
      r.first_name?.toLowerCase().includes(term) ||
      r.last_name?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.message?.toLowerCase().includes(term)
    );
  });

  /** Espace appelant, fourni par les données de route : les catégories proposées diffèrent. */
  readonly audience = input<'patient' | 'doctor'>('patient');

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

  readonly categoryOptions = computed(() => (this.audience() === 'doctor' ? this.doctorCategories : this.patientCategories));


  requestForm: FormGroup = this.fb.group({
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
    this.initFormWithUserData();
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
    this.isLoading.set(true);

    const request$ = (user && user.id) 
      ? this.requestService.getRequestsByUserId(user.id)
      : this.requestService.getAllRequests();

    request$.subscribe({
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
    this.requestService.createRequest(this.requestForm.value).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Requête enregistrée avec succès.'
        });
        this.requestForm.reset();
        this.initFormWithUserData();
        this.activeTab.set('list');
        this.fetchRequests();
      },
      error: () => {
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: "Échec lors de l'enregistrement de la requête."
        });
      }
    });
  }

  /** Ouvre la boîte de confirmation avant suppression. */
  confirmDelete(req: UserRequest, event?: Event): void {
    event?.stopPropagation();

    if (req.id === undefined) return;

    this.confirmationService.confirm({
      header: 'Confirmer la suppression',
      message: `Voulez-vous vraiment supprimer la requête #${req.id} de ${req.first_name} ${req.last_name} ? Cette action est irréversible.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
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

  filterMobile(value: string) {
    this.searchTerm.set(value);
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