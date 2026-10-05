import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { form, required, FormField, FormRoot } from '@angular/forms/signals';
import { ButtonModule } from 'primeng/button';
import { ResultatsService } from './resultats.service';
import { AuthService } from '../../connexion/auth-service';
import { PageHeader } from '../shared/page-header/page-header';
import { StatusTag } from '../shared/status-tag/status-tag';
import { EXAM_TYPES, ExamResultDetail, ExamType, SendResult, SendResultCreatePayload } from './resultats.models';
import { LaboratoireService } from '../laboratoire/laboratoire.service';
import { ImagerieService } from '../imagerie/imagerie.service';
import { ExplorationService } from '../exploration/exploration.service';
import { DoctorSearchService } from './doctor-search.service';
import { DoctorInfo } from './doctor-search.models';
import { EdenLoader } from '../../shared/eden-loader/eden-loader';

interface SendResultFormModel {
  exam_type: ExamType;
  exam_code: string;
  envoi_email: boolean;
}

function emptyFormModel(): SendResultFormModel {
  return { exam_type: 'Laboratoire', exam_code: '', envoi_email: false };
}

interface EditFormModel {
  exam_type: ExamType;
  exam_code: string;
}

function emptyEditModel(): EditFormModel {
  return { exam_type: 'Laboratoire', exam_code: '' };
}

interface ExamOption {
  code: string;
  label: string;
}

/** Recherche d'un médecin par matricule, avec état indépendant par formulaire (ajout / édition). */
class DoctorSearchState {
  constructor(private readonly service: DoctorSearchService) {}

  readonly matricule = signal('');
  readonly searching = signal(false);
  readonly error = signal<string | null>(null);
  readonly doctor = signal<DoctorInfo | null>(null);

  setMatricule(value: string): void {
    this.matricule.set(value);
    this.doctor.set(null);
    this.error.set(null);
  }

  search(): void {
    const matricule = this.matricule().trim();
    if (!matricule) return;

    this.searching.set(true);
    this.error.set(null);

    this.service.getByMatricule(matricule).subscribe({
      next: (doctor) => {
        this.doctor.set(doctor);
        this.searching.set(false);
      },
      error: () => {
        this.doctor.set(null);
        this.error.set('Aucun médecin trouvé pour ce matricule.');
        this.searching.set(false);
      },
    });
  }

  prefillFromDoctorId(doctorId: number): void {
    this.searching.set(true);
    this.error.set(null);

    this.service.getById(doctorId).subscribe({
      next: (doctor) => {
        this.doctor.set(doctor);
        this.matricule.set(doctor.DoctorFederationID ?? '');
        this.searching.set(false);
      },
      error: () => {
        this.searching.set(false);
      },
    });
  }

  reset(): void {
    this.matricule.set('');
    this.searching.set(false);
    this.error.set(null);
    this.doctor.set(null);
  }
}

/** Options d'examens (du patient connecté) disponibles pour le partage, groupées par type d'examen. */
class ExamOptionsState {
  constructor(
    private readonly laboratoireService: LaboratoireService,
    private readonly imagerieService: ImagerieService,
    private readonly explorationService: ExplorationService
  ) {}

  private readonly labResults = signal<{ name: string; test: string }[]>([]);
  private readonly imagerieResults = signal<{ number: string; requested_test: string }[]>([]);
  private readonly explorationResults = signal<{ name: string; test: string }[]>([]);
  readonly loading = signal(false);

  private labLoaded = false;
  private imagerieLoaded = false;
  private explorationLoaded = false;

  optionsFor(type: ExamType): ExamOption[] {
    if (type === 'Laboratoire') {
      return this.labResults().map((r) => ({ code: r.name, label: `${r.name} — ${r.test}` }));
    }
    if (type === 'Imagerie') {
      return this.imagerieResults().map((r) => ({ code: r.number, label: `${r.number} — ${r.requested_test}` }));
    }
    return this.explorationResults().map((r) => ({ code: r.name, label: `${r.name} — ${r.test}` }));
  }

  ensureLoaded(type: ExamType): void {
    if (type === 'Laboratoire' && !this.labLoaded) {
      this.labLoaded = true;
      this.loading.set(true);
      this.laboratoireService.getAllResults().subscribe({
        next: (data) => {
          this.labResults.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else if (type === 'Imagerie' && !this.imagerieLoaded) {
      this.imagerieLoaded = true;
      this.loading.set(true);
      this.imagerieService.getAllResults().subscribe({
        next: (data) => {
          this.imagerieResults.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else if (type === 'Exploration' && !this.explorationLoaded) {
      this.explorationLoaded = true;
      this.loading.set(true);
      this.explorationService.getAllResults().subscribe({
        next: (data) => {
          this.explorationResults.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }
}

const ACCESS_DENIED_MESSAGE = 'L’UTILISATEUR NE PEUT PAS AVOIR ACCÈS À CES DONNÉES.';

type DetailTab = 'summary' | 'more';

@Component({
  selector: 'app-resultats',
  imports: [EdenLoader, CommonModule, ButtonModule, FormField, FormRoot, PageHeader, StatusTag],
  templateUrl: './resultats.html',
  styleUrl: './resultats.css',
  host: {
    '(document:keydown.escape)': 'handleEscapeKey()',
  },
})
export class Resultats {
  private readonly resultatsService = inject(ResultatsService);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doctorSearchService = inject(DoctorSearchService);
  private readonly route = inject(ActivatedRoute);

  readonly accessDeniedMessage = ACCESS_DENIED_MESSAGE;
  readonly examTypes = EXAM_TYPES;

  readonly examOptions = new ExamOptionsState(
    inject(LaboratoireService),
    inject(ImagerieService),
    inject(ExplorationService)
  );

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

  results = signal<SendResult[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  showAddForm = signal(false);
  submitting = signal(false);

  readonly formModel = signal<SendResultFormModel>(emptyFormModel());
  readonly sendForm = form(this.formModel, (f) => {
    required(f.exam_code, { message: "Le résultat à partager est requis." });
  });

  readonly addDoctorSearch = new DoctorSearchState(this.doctorSearchService);
  readonly addExamOptions = computed(() => this.examOptions.optionsFor(this.formModel().exam_type));

  resultToDelete = signal<SendResult | null>(null);
  deleting = signal(false);

  resultToEdit = signal<SendResult | null>(null);
  savingEdit = signal(false);
  readonly editModel = signal<EditFormModel>(emptyEditModel());
  readonly editForm = form(this.editModel, (f) => {
    required(f.exam_code, { message: "Le résultat à partager est requis." });
  });

  readonly editDoctorSearch = new DoctorSearchState(this.doctorSearchService);
  readonly editExamOptions = computed(() => this.examOptions.optionsFor(this.editModel().exam_type));

  selectedResult = signal<SendResult | null>(null);
  activeTab = signal<DetailTab>('summary');

  examDetails = signal<ExamResultDetail[] | null>(null);
  examDetailsLoading = signal(false);
  examDetailsError = signal<string | null>(null);

  moreInfo = signal<ExamResultDetail[] | null>(null);
  moreInfoLoading = signal(false);
  moreInfoError = signal<string | null>(null);
  private moreInfoRequestedFor: number | null = null;

  constructor() {
    const user = this.authService.currentUser();
    if (isPlatformBrowser(this.platformId) && user && this.authService.isPatient() && user.patient_id !== null) {
      this.loadResults(user.patient_id);
    }

    if (isPlatformBrowser(this.platformId)) {
      this.prefillFromQueryParams();
    }
  }

  /** Pré-remplit et ouvre le formulaire de partage quand on arrive via le bouton "Partager" d'un examen. */
  private prefillFromQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const examType = params.get('examType') as ExamType | null;
    const examCode = params.get('examCode');

    if (!examType || !examCode || !EXAM_TYPES.includes(examType)) {
      return;
    }

    this.formModel.set({ exam_type: examType, exam_code: examCode, envoi_email: false });
    this.showAddForm.set(true);
    this.examOptions.ensureLoaded(examType);
  }

  handleEscapeKey(): void {
    if (this.selectedResult()) {
      this.closeViewer();
    } else if (this.resultToEdit()) {
      this.cancelEdit();
    } else if (this.resultToDelete()) {
      this.cancelDelete();
    }
  }

  loadResults(patientId: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.resultatsService.getResultsByPatient(patientId).subscribe({
      next: (data) => {
        this.results.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Impossible de charger les résultats partagés.');
        this.loading.set(false);
        console.error(err);
      },
    });
  }

  toggleAddForm(): void {
    this.showAddForm.update((v) => !v);
    if (this.showAddForm()) {
      this.examOptions.ensureLoaded(this.formModel().exam_type);
    } else {
      this.formModel.set(emptyFormModel());
      this.addDoctorSearch.reset();
    }
  }

  onAddExamTypeChange(): void {
    this.formModel.update((m) => ({ ...m, exam_code: '' }));
    this.examOptions.ensureLoaded(this.formModel().exam_type);
  }

  onAddMatriculeInput(event: Event): void {
    this.addDoctorSearch.setMatricule((event.target as HTMLInputElement).value);
  }

  submitSend(): void {
    const doctor = this.addDoctorSearch.doctor();

    if (this.sendForm().invalid() || !doctor) {
      this.errorMessage.set(!doctor ? 'Veuillez rechercher et sélectionner un médecin valide.' : 'Vérifiez les informations du formulaire.');
      return;
    }

    const user = this.authService.currentUser();
    if (!user || user.patient_id === null) {
      return;
    }

    const model = this.formModel();
    const payload: SendResultCreatePayload = {
      doctor_id: doctor.id,
      exam_type: model.exam_type,
      exam_code: model.exam_code,
      envoi_email: model.envoi_email,
    };

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.resultatsService.sendResult(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAddForm.set(false);
        this.formModel.set(emptyFormModel());
        this.addDoctorSearch.reset();
        this.loadResults(user.patient_id!);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set('Échec du partage du résultat.');
        console.error(err);
      },
    });
  }

  confirmDelete(result: SendResult): void {
    this.resultToDelete.set(result);
  }

  cancelDelete(): void {
    this.resultToDelete.set(null);
  }

  executeDelete(): void {
    const result = this.resultToDelete();
    if (!result) return;

    this.deleting.set(true);

    this.resultatsService.deleteResult(result.id).subscribe({
      next: () => {
        this.results.update((list) => list.filter((r) => r.id !== result.id));
        this.deleting.set(false);
        this.resultToDelete.set(null);
      },
      error: (err) => {
        this.errorMessage.set('Échec de la suppression.');
        this.deleting.set(false);
        this.resultToDelete.set(null);
        console.error(err);
      },
    });
  }

  openEdit(result: SendResult): void {
    this.editModel.set({
      exam_type: result.exam_type,
      exam_code: result.exam_code,
    });
    this.editDoctorSearch.reset();
    this.editDoctorSearch.prefillFromDoctorId(result.doctor_id);
    this.examOptions.ensureLoaded(result.exam_type);
    this.resultToEdit.set(result);
  }

  onEditExamTypeChange(): void {
    this.editModel.update((m) => ({ ...m, exam_code: '' }));
    this.examOptions.ensureLoaded(this.editModel().exam_type);
  }

  onEditMatriculeInput(event: Event): void {
    this.editDoctorSearch.setMatricule((event.target as HTMLInputElement).value);
  }

  cancelEdit(): void {
    this.resultToEdit.set(null);
  }

  submitEdit(): void {
    const result = this.resultToEdit();
    const doctor = this.editDoctorSearch.doctor();

    if (!result || this.editForm().invalid() || !doctor) {
      if (!doctor) {
        this.errorMessage.set('Veuillez rechercher et sélectionner un médecin valide.');
      }
      return;
    }

    const model = this.editModel();
    this.savingEdit.set(true);

    this.resultatsService
      .modifyResult(result.id, {
        doctor_id: doctor.id,
        exam_type: model.exam_type,
        exam_code: model.exam_code,
      })
      .subscribe({
        next: (updated) => {
          this.results.update((list) => list.map((r) => (r.id === result.id ? updated : r)));
          this.savingEdit.set(false);
          this.resultToEdit.set(null);
        },
        error: (err) => {
          this.errorMessage.set('Échec de la modification.');
          this.savingEdit.set(false);
          console.error(err);
        },
      });
  }

  openViewer(result: SendResult): void {
    this.selectedResult.set(result);
    this.activeTab.set('summary');
    this.moreInfoRequestedFor = null;
    this.moreInfo.set(null);
    this.moreInfoError.set(null);
    this.loadExamDetails(result);
  }

  closeViewer(): void {
    this.selectedResult.set(null);
    this.examDetails.set(null);
    this.examDetailsError.set(null);
  }

  setActiveTab(tab: DetailTab): void {
    this.activeTab.set(tab);
    const result = this.selectedResult();
    if (tab === 'more' && result && this.moreInfoRequestedFor !== result.id) {
      this.loadMoreInfo(result);
    }
  }

  private loadExamDetails(result: SendResult): void {
    this.examDetailsLoading.set(true);
    this.examDetailsError.set(null);

    this.resultatsService.getExamResults(result.exam_type, result.exam_code, result.patient_federation_id).subscribe({
      next: (data) => {
        this.examDetails.set(data);
        this.examDetailsLoading.set(false);
      },
      error: (err) => {
        this.examDetailsError.set("Impossible de récupérer le résultat de l'examen.");
        this.examDetailsLoading.set(false);
        console.error(err);
      },
    });
  }

  private loadMoreInfo(result: SendResult): void {
    this.moreInfoRequestedFor = result.id;
    this.moreInfoLoading.set(true);
    this.moreInfoError.set(null);

    this.resultatsService
      .getMoreInformations(result.exam_type, result.exam_code, result.patient_federation_id)
      .subscribe({
        next: (data) => {
          this.moreInfo.set(data);
          this.moreInfoLoading.set(false);
        },
        error: (err) => {
          this.moreInfoError.set('Impossible de récupérer les informations complémentaires.');
          this.moreInfoLoading.set(false);
          console.error(err);
        },
      });
  }

  detailEntries(record: ExamResultDetail): Array<{ label: string; value: string }> {
    return Object.entries(record)
      .filter(([, value]) => value !== null && value !== '' && value !== undefined)
      .map(([key, value]) => ({ label: this.formatDetailKey(key), value: this.formatDetailValue(value) }));
  }

  private formatDetailKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private formatDetailValue(value: string | number | boolean | null): string {
    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non';
    }
    return String(value);
  }
}
