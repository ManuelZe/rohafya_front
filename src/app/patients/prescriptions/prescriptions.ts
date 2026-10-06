import { Component, computed, inject, input, signal, OnDestroy, OnInit, AfterViewInit, ElementRef } from '@angular/core';
import { form, required, maxLength, FormField, FormRoot } from '@angular/forms/signals';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { PrescriptionService } from './prescriptions.service';
import { PrescriptionCreatePayload, PrescriptionWithImage } from './prescriptions.models';
import { PageHeader } from '../shared/page-header/page-header';
import { StatusTag } from '../shared/status-tag/status-tag';
import { RohafyaLoader } from '../../shared/rohafya-loader/rohafya-loader';
import { EstablishmentsService } from '../../shared/submission/establishments.service';
import { SubmissionInfoView } from '../../shared/submission/submission-info';
import { SubmissionAudience, formatFcfa } from '../../shared/submission/submission.models';

interface PrescriptionFormModel {
  /** Établissement destinataire (id, sous forme de texte pour la liste déroulante). */
  tenant_id: string;
  NameDoctor: string;
  OrdreDoctor: string;
  /** Patient concerné (espace médecin). */
  patient_name: string;
  Description: string;
  demande_devis: boolean;
}

function emptyFormModel(): PrescriptionFormModel {
  return {
    tenant_id: '',
    NameDoctor: '',
    OrdreDoctor: '',
    patient_name: '',
    Description: '',
    demande_devis: false,
  };
}

@Component({
  selector: 'app-prescriptions',
  imports: [RohafyaLoader, CommonModule, ButtonModule, FormField, FormRoot, PageHeader, StatusTag, SubmissionInfoView],
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
  readonly establishments = inject(EstablishmentsService);

  /** Espace appelant, fourni par les données de route : un médecin prescrit pour un patient. */
  readonly audience = input<SubmissionAudience>('patient');
  readonly isDoctor = computed(() => this.audience() === 'doctor');
  readonly subtitle = computed(() =>
    this.isDoctor()
      ? 'Envoyez vos prescriptions à un établissement et suivez sa réponse'
      : 'Envoyez vos ordonnances à un établissement et suivez sa réponse'
  );

  prescriptions = signal<PrescriptionWithImage[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // État du formulaire d'ajout
  showAddForm = signal(false);
  submitting = signal(false);

  readonly formModel = signal<PrescriptionFormModel>(emptyFormModel());
  readonly prescriptionForm = form(this.formModel, (f) => {
    required(f.tenant_id, { message: "Choisissez l'établissement destinataire." });
    maxLength(f.Description, 500);
    maxLength(f.patient_name, 200);
  });

  selectedFile = signal<File | null>(null);
  selectedFilePreviewUrl = signal<SafeUrl | string | null>(null);
  private selectedFileObjectUrl: string | null = null;

  // Panneau « devis » : réponse de l'établissement à la demande de devis
  devisPrescription = signal<PrescriptionWithImage | null>(null);

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
    this.establishments.load();
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
    } else if (this.devisPrescription()) {
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

    this.prescriptionService.getAllPrescriptions(this.audience()).subscribe({
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
    const model = this.formModel();
    if (this.prescriptionForm().invalid() || !model.tenant_id) {
      this.errorMessage.set("Choisissez l'établissement destinataire.");
      return;
    }
    if (this.isDoctor() && !model.patient_name.trim()) {
      this.errorMessage.set('Indiquez le patient concerné par la prescription.');
      return;
    }
    if (!this.isDoctor() && !model.NameDoctor.trim()) {
      this.errorMessage.set('Le nom du médecin prescripteur est obligatoire.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const payload: PrescriptionCreatePayload = {
      tenant_id: Number(model.tenant_id),
      audience: this.audience(),
      Description: model.Description,
      demande_devis: model.demande_devis,
      file: this.selectedFile(),
      ...(this.isDoctor()
        ? { patient_name: model.patient_name.trim() }
        : { NameDoctor: model.NameDoctor.trim(), OrdreDoctor: model.OrdreDoctor.trim() }),
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
        this.errorMessage.set(err?.error?.message ?? "Échec de l'envoi de la prescription.");
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
    this.devisPrescription.set(prescription);
  }

  closeDevis(): void {
    this.devisPrescription.set(null);
  }

  /** Montant du devis en FCFA, ou chaîne vide s'il n'est pas encore fixé. */
  quoteLabel(prescription: PrescriptionWithImage): string {
    const amount = prescription.submission?.quote_amount;
    return amount === null || amount === undefined ? '' : formatFcfa(amount);
  }
}
