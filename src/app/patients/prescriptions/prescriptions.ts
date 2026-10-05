import { Component, inject, signal, OnDestroy, OnInit, AfterViewInit, ElementRef } from '@angular/core';
import { form, required, min, maxLength, FormField, FormRoot } from '@angular/forms/signals';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { PrescriptionService } from './prescriptions.service';
import { PrescriptionCreatePayload, PrescriptionDevis, PrescriptionWithImage } from './prescriptions.models';
import { PageHeader } from '../shared/page-header/page-header';
import { StatusTag } from '../shared/status-tag/status-tag';
import { EdenLoader } from '../../shared/eden-loader/eden-loader';

interface PrescriptionFormModel {
  NameDoctor: string;
  OrdreDoctor: string;
  Description: string;
  patient_id: number;
  demande_devis: boolean;
}

function emptyFormModel(): PrescriptionFormModel {
  return {
    NameDoctor: '',
    OrdreDoctor: '',
    Description: '',
    patient_id: 0,
    demande_devis: false,
  };
}

@Component({
  selector: 'app-prescriptions',
  imports: [EdenLoader, CommonModule, ButtonModule, FormField, FormRoot, PageHeader, StatusTag],
  templateUrl: './prescriptions.html',
  styleUrl: './prescriptions.css',
  host: {
    '(document:keydown.escape)': 'handleEscapeKey()',
  },
})
export class Prescriptions implements OnInit, OnDestroy, AfterViewInit {
  private readonly prescriptionService = inject(PrescriptionService);
  private readonly elRef = inject(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);

  prescriptions = signal<PrescriptionWithImage[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // État du formulaire d'ajout
  showAddForm = signal(false);
  submitting = signal(false);

  readonly formModel = signal<PrescriptionFormModel>(emptyFormModel());
  readonly prescriptionForm = form(this.formModel, (f) => {
    required(f.NameDoctor, { message: 'Le nom du médecin est requis.' });
    maxLength(f.Description, 500);
  });

  selectedFile = signal<File | null>(null);
  selectedFilePreviewUrl = signal<SafeUrl | string | null>(null);
  private selectedFileObjectUrl: string | null = null;

  // État du panneau devis
  devisPrescriptionId = signal<number | null>(null);
  devisData = signal<PrescriptionDevis | null>(null);
  devisLoading = signal(false);
  devisError = signal<string | null>(null);

  // État du pop-up modal de suppression
  prescriptionToDelete = signal<PrescriptionWithImage | null>(null);
  deleting = signal(false);

  // État du visualiseur d'image grand format (Lightbox)
  previewPrescription = signal<PrescriptionWithImage | null>(null);

  // Révocation des Blobs
  private objectUrls: string[] = [];

  // Observer pour le chargement paresseux des images
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    this.loadPrescriptions();
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
    if (this.previewPrescription()) {
      this.closeImagePreview();
    } else if (this.prescriptionToDelete()) {
      this.cancelDelete();
    } else if (this.devisPrescriptionId() !== null) {
      this.closeDevis();
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
                const p = this.prescriptions().find((item) => item.id === id);
                if (p && !p.imageUrl && !p.imageLoading && !p.imageError) {
                  this.loadImage(p);
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
        this.prescriptions().forEach((p) => this.loadImage(p));
        return;
      }
      const cards = this.elRef.nativeElement.querySelectorAll('.prescription-card[data-id]');
      cards.forEach((card: HTMLElement) => this.observer?.observe(card));
    }, 50);
  }

  loadPrescriptions(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.prescriptionService.getAllPrescriptions().subscribe({
      next: (data) => {
        this.prescriptions.set(
          data.map((p) => ({
            ...p,
            imageUrl: null,
            imageLoading: false,
            imageError: false,
          }))
        );
        this.loading.set(false);
        this.observeCards();
      },
      error: (err) => {
        this.errorMessage.set('Impossible de charger les prescriptions.');
        this.loading.set(false);
        console.error(err);
      },
    });
  }

  loadImage(prescription: PrescriptionWithImage): void {
    if (prescription.imageUrl || prescription.imageLoading) return;

    this.patchPrescription(prescription.id, { imageLoading: true, imageError: false });

    this.prescriptionService.getPrescriptionImage(prescription.id).subscribe({
      next: (blob) => {
        const rawUrl = URL.createObjectURL(blob);
        this.objectUrls.push(rawUrl);
        this.patchPrescription(prescription.id, {
          imageUrl: this.sanitizer.bypassSecurityTrustUrl(rawUrl),
          imageLoading: false,
        });
      },
      error: () => {
        this.patchPrescription(prescription.id, { imageLoading: false, imageError: true });
      },
    });
  }

  private patchPrescription(id: number, patch: Partial<PrescriptionWithImage>): void {
    this.prescriptions.update((list) =>
      list.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  openImagePreview(prescription: PrescriptionWithImage): void {
    if (!prescription.imageUrl && !prescription.imageLoading && !prescription.imageError) {
      this.loadImage(prescription);
    }
    this.previewPrescription.set(prescription);
  }

  closeImagePreview(): void {
    this.previewPrescription.set(null);
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

  submitPrescription(): void {
    if (this.prescriptionForm().invalid()) {
      this.errorMessage.set('NameDoctor est obligatoire.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const model = this.formModel();
    const payload: PrescriptionCreatePayload = {
      ...model,
      file: this.selectedFile(),
    };

    this.prescriptionService.addPrescription(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAddForm.set(false);
        this.formModel.set(emptyFormModel());
        this.clearSelectedFile();
        this.loadPrescriptions();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set("Échec de l'ajout de la prescription.");
        console.error(err);
      },
    });
  }

  confirmDelete(prescription: PrescriptionWithImage): void {
    this.prescriptionToDelete.set(prescription);
  }

  cancelDelete(): void {
    this.prescriptionToDelete.set(null);
  }

  executeDelete(): void {
    const prescription = this.prescriptionToDelete();
    if (!prescription) return;

    this.deleting.set(true);

    this.prescriptionService.deletePrescription(prescription.id).subscribe({
      next: () => {
        this.prescriptions.update((list) => list.filter((p) => p.id !== prescription.id));
        this.deleting.set(false);
        this.prescriptionToDelete.set(null);
      },
      error: (err) => {
        this.errorMessage.set('Échec de la suppression.');
        this.deleting.set(false);
        this.prescriptionToDelete.set(null);
        console.error(err);
      },
    });
  }

  openDevis(prescription: PrescriptionWithImage): void {
    this.devisPrescriptionId.set(prescription.id);
    this.devisData.set(null);
    this.devisError.set(null);
    this.devisLoading.set(true);

    this.prescriptionService.getDevis(prescription.id).subscribe({
      next: (data) => {
        this.devisData.set(data);
        this.devisLoading.set(false);
      },
      error: (err) => {
        this.devisError.set('Impossible de récupérer le devis.');
        this.devisLoading.set(false);
        console.error(err);
      },
    });
  }

  closeDevis(): void {
    this.devisPrescriptionId.set(null);
    this.devisData.set(null);
    this.devisError.set(null);
  }
}
