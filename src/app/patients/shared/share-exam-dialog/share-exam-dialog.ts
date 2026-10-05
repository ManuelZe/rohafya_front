import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResultatsService } from '../../resultats/resultats.service';
import { DoctorSearchService } from '../../resultats/doctor-search.service';
import { DoctorInfo } from '../../resultats/doctor-search.models';
import { ExamType } from '../../resultats/resultats.models';

@Component({
  selector: 'app-share-exam-dialog',
  imports: [CommonModule],
  templateUrl: './share-exam-dialog.html',
  styleUrl: './share-exam-dialog.css',
  host: {
    '(document:keydown.escape)': 'handleEscapeKey()',
  },
})
export class ShareExamDialog {
  private readonly resultatsService = inject(ResultatsService);
  private readonly doctorSearchService = inject(DoctorSearchService);

  readonly open = input.required<boolean>();
  readonly examType = input.required<ExamType>();
  readonly examCode = input.required<string>();
  readonly examLabel = input<string>('');
  readonly closed = output<void>();

  matricule = signal('');
  searching = signal(false);
  searchError = signal<string | null>(null);
  doctor = signal<DoctorInfo | null>(null);

  envoiEmail = signal(false);
  submitting = signal(false);
  submitError = signal<string | null>(null);
  success = signal(false);

  constructor() {
    let wasOpen = false;
    effect(() => {
      const isOpen = this.open();
      if (isOpen && !wasOpen) {
        this.resetState();
      }
      wasOpen = isOpen;
    });
  }

  private resetState(): void {
    this.matricule.set('');
    this.searching.set(false);
    this.searchError.set(null);
    this.doctor.set(null);
    this.envoiEmail.set(false);
    this.submitting.set(false);
    this.submitError.set(null);
    this.success.set(false);
  }

  handleEscapeKey(): void {
    if (this.open()) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  onMatriculeInput(event: Event): void {
    this.matricule.set((event.target as HTMLInputElement).value);
    this.doctor.set(null);
    this.searchError.set(null);
  }

  search(): void {
    const matricule = this.matricule().trim();
    if (!matricule) return;

    this.searching.set(true);
    this.searchError.set(null);

    this.doctorSearchService.getByMatricule(matricule).subscribe({
      next: (doctor) => {
        this.doctor.set(doctor);
        this.searching.set(false);
      },
      error: () => {
        this.doctor.set(null);
        this.searchError.set('Aucun médecin trouvé pour ce matricule.');
        this.searching.set(false);
      },
    });
  }

  toggleEnvoiEmail(): void {
    this.envoiEmail.update((v) => !v);
  }

  submit(): void {
    const doctor = this.doctor();
    if (!doctor) {
      this.submitError.set('Veuillez rechercher et sélectionner un médecin valide.');
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    this.resultatsService
      .sendResult({
        doctor_id: doctor.id,
        exam_type: this.examType(),
        exam_code: this.examCode(),
        envoi_email: this.envoiEmail(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.success.set(true);
        },
        error: (err) => {
          this.submitting.set(false);
          this.submitError.set('Échec du partage du résultat.');
          console.error(err);
        },
      });
  }
}
