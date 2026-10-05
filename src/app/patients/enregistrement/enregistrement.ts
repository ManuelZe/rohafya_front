import {
  Component,
  inject,
  signal,
  computed,
  effect,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { form, required, FormField, FormRoot } from '@angular/forms/signals';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EnregistrementService } from './enregistrement.service';
import { SavePatientCreatePayload, SavePatientWithImage } from './enregistrement.models';
import { AuthService } from '../../connexion/auth-service';
import { PageHeader } from '../shared/page-header/page-header';
import { StatusTag } from '../shared/status-tag/status-tag';
import { EdenLoader } from '../../shared/eden-loader/eden-loader';

interface SavePatientFormModel {
  nom: string;
  prenom: string;
  description: string;
}

function emptyFormModel(): SavePatientFormModel {
  return { nom: '', prenom: '', description: '' };
}

const ACCESS_DENIED_MESSAGE = 'L’UTILISATEUR NE PEUT PAS AVOIR ACCÈS À CES DONNÉES.';

@Component({
  selector: 'app-enregistrement',
  imports: [EdenLoader, CommonModule, ButtonModule, FormField, FormRoot, PageHeader, StatusTag],
  templateUrl: './enregistrement.html',
  styleUrl: './enregistrement.css',
  host: {
    '(document:keydown.escape)': 'handleEscapeKey()',
  },
})
export class Enregistrement implements AfterViewInit, OnDestroy {
  private readonly enregistrementService = inject(EnregistrementService);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly elRef = inject(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);

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

  saves = signal<SavePatientWithImage[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  showAddForm = signal(false);
  submitting = signal(false);

  readonly formModel = signal<SavePatientFormModel>(emptyFormModel());
  readonly saveForm = form(this.formModel, (f) => {
    required(f.nom, { message: 'Le nom est requis.' });
    required(f.prenom, { message: 'Le prénom est requis.' });
  });

  selectedFile = signal<File | null>(null);
  selectedFilePreviewUrl = signal<SafeUrl | string | null>(null);
  private selectedFileObjectUrl: string | null = null;

  saveToDelete = signal<SavePatientWithImage | null>(null);
  deleting = signal(false);

  previewSave = signal<SavePatientWithImage | null>(null);

  private objectUrls: string[] = [];
  private observer: IntersectionObserver | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (isPlatformBrowser(this.platformId) && user && this.authService.isPatient() && user.patient_id !== null) {
        this.loadSaves(user.patient_id);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initIntersectionObserver();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.clearSelectedFile();
  }

  handleEscapeKey(): void {
    if (this.previewSave()) {
      this.closePreview();
    } else if (this.saveToDelete()) {
      this.cancelDelete();
    }
  }

  private initIntersectionObserver(): void {
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const card = entry.target as HTMLElement;
              const id = Number(card.getAttribute('data-id'));
              if (id) {
                const s = this.saves().find((item) => item.id === id);
                if (s && !s.imageUrl && !s.imageLoading && !s.imageError) {
                  this.loadImage(s);
                  this.observer?.unobserve(card);
                }
              }
            }
          });
        },
        { rootMargin: '200px 0px' }
      );
    }
  }

  private observeCards(): void {
    setTimeout(() => {
      if (!this.observer) {
        this.saves().forEach((s) => this.loadImage(s));
        return;
      }
      const cards = this.elRef.nativeElement.querySelectorAll('.save-card[data-id]');
      cards.forEach((card: HTMLElement) => this.observer?.observe(card));
    }, 50);
  }

  loadSaves(patientId: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.enregistrementService.getPatientSaves(patientId).subscribe({
      next: (data) => {
        this.saves.set(
          data.map((s) => ({
            ...s,
            imageUrl: null,
            imageLoading: false,
            imageError: false,
          }))
        );
        this.loading.set(false);
        this.observeCards();
      },
      error: (err) => {
        this.errorMessage.set('Impossible de charger les pré-enregistrements.');
        this.loading.set(false);
        console.error(err);
      },
    });
  }

  loadImage(save: SavePatientWithImage): void {
    if (save.imageUrl || save.imageLoading) return;

    this.patchSave(save.id, { imageLoading: true, imageError: false });

    this.enregistrementService.getImage(save.id).subscribe({
      next: (blob) => {
        const rawUrl = URL.createObjectURL(blob);
        this.objectUrls.push(rawUrl);
        this.patchSave(save.id, {
          imageUrl: this.sanitizer.bypassSecurityTrustUrl(rawUrl),
          imageLoading: false,
        });
      },
      error: () => {
        this.patchSave(save.id, { imageLoading: false, imageError: true });
      },
    });
  }

  private patchSave(id: number, patch: Partial<SavePatientWithImage>): void {
    this.saves.update((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  openPreview(save: SavePatientWithImage): void {
    if (!save.imageUrl && !save.imageLoading && !save.imageError) {
      this.loadImage(save);
    }
    this.previewSave.set(save);
  }

  closePreview(): void {
    this.previewSave.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);

      if (this.selectedFileObjectUrl) {
        URL.revokeObjectURL(this.selectedFileObjectUrl);
      }

      this.selectedFileObjectUrl = URL.createObjectURL(file);
      this.selectedFilePreviewUrl.set(this.sanitizer.bypassSecurityTrustUrl(this.selectedFileObjectUrl));
    } else {
      this.clearSelectedFile();
    }
  }

  clearSelectedFile(): void {
    if (this.selectedFileObjectUrl) {
      URL.revokeObjectURL(this.selectedFileObjectUrl);
      this.selectedFileObjectUrl = null;
    }
    this.selectedFile.set(null);
    this.selectedFilePreviewUrl.set(null);
  }

  toggleAddForm(): void {
    this.showAddForm.update((v) => !v);
    if (!this.showAddForm()) {
      this.formModel.set(emptyFormModel());
      this.clearSelectedFile();
    }
  }

  submitSave(): void {
    if (this.saveForm().invalid()) {
      this.errorMessage.set('Le nom et le prénom sont obligatoires.');
      return;
    }

    const user = this.authService.currentUser();
    if (!user || user.patient_id === null) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const model = this.formModel();
    const payload: SavePatientCreatePayload = {
      ...model,
      file: this.selectedFile(),
    };

    this.enregistrementService.addSavePatient(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAddForm.set(false);
        this.formModel.set(emptyFormModel());
        this.clearSelectedFile();
        this.loadSaves(user.patient_id!);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set("Échec de l'enregistrement.");
        console.error(err);
      },
    });
  }

  confirmDelete(save: SavePatientWithImage): void {
    this.saveToDelete.set(save);
  }

  cancelDelete(): void {
    this.saveToDelete.set(null);
  }

  executeDelete(): void {
    const save = this.saveToDelete();
    if (!save) return;

    this.deleting.set(true);

    this.enregistrementService.deleteSavePatient(save.id).subscribe({
      next: () => {
        this.saves.update((list) => list.filter((s) => s.id !== save.id));
        this.deleting.set(false);
        this.saveToDelete.set(null);
      },
      error: (err) => {
        this.errorMessage.set('Échec de la suppression.');
        this.deleting.set(false);
        this.saveToDelete.set(null);
        console.error(err);
      },
    });
  }
}
