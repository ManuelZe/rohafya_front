import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, required, FormField, FormRoot } from '@angular/forms/signals';
import { SuggestionBoxService } from '../suggestion-box.service';
import { Suggestion } from '../suggestion-box.models';
import { EdenLoader } from '../../../shared/eden-loader/eden-loader';

interface SuggestionFormModel {
  content: string;
}

function emptyFormModel(): SuggestionFormModel {
  return { content: '' };
}

@Component({
  selector: 'app-suggestion-dialog',
  imports: [EdenLoader, CommonModule, FormField, FormRoot],
  templateUrl: './suggestion-dialog.html',
  styleUrl: './suggestion-dialog.css',
  host: {
    '(document:keydown.escape)': 'handleEscapeKey()',
  },
})
export class SuggestionDialog {
  private readonly service = inject(SuggestionBoxService);

  readonly open = input.required<boolean>();
  readonly closed = output<void>();

  readonly stars = [1, 2, 3, 4, 5];

  suggestions = signal<Suggestion[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  submitting = signal(false);

  editingId = signal<number | null>(null);
  rating = signal<number | null>(null);

  readonly formModel = signal<SuggestionFormModel>(emptyFormModel());
  readonly suggestionForm = form(this.formModel, (f) => {
    required(f.content, { message: 'Merci de renseigner votre suggestion.' });
  });

  suggestionToDelete = signal<Suggestion | null>(null);
  deleting = signal(false);

  constructor() {
    let wasOpen = false;
    effect(() => {
      const isOpen = this.open();
      if (isOpen && !wasOpen) {
        this.loadSuggestions();
      }
      if (!isOpen && wasOpen) {
        this.resetForm();
        this.suggestionToDelete.set(null);
        this.errorMessage.set(null);
      }
      wasOpen = isOpen;
    });
  }

  handleEscapeKey(): void {
    if (!this.open()) return;
    if (this.suggestionToDelete()) {
      this.cancelDelete();
    } else {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  loadSuggestions(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.getForUser().subscribe({
      next: (data) => {
        this.suggestions.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Impossible de charger vos suggestions.');
        this.loading.set(false);
        console.error(err);
      },
    });
  }

  setRating(value: number): void {
    this.rating.set(this.rating() === value ? null : value);
  }

  startEdit(suggestion: Suggestion): void {
    this.editingId.set(suggestion.id);
    this.formModel.set({ content: suggestion.content });
    this.rating.set(suggestion.Note ?? null);
  }

  resetForm(): void {
    this.editingId.set(null);
    this.formModel.set(emptyFormModel());
    this.rating.set(null);
  }

  submit(): void {
    if (this.suggestionForm().invalid()) {
      this.errorMessage.set('Merci de renseigner votre suggestion.');
      return;
    }

    const content = this.formModel().content;
    const note = this.rating();
    const editingId = this.editingId();

    this.submitting.set(true);
    this.errorMessage.set(null);

    if (editingId !== null) {
      this.service.update(editingId, { content, note }).subscribe({
        next: (updated) => {
          this.suggestions.update((list) => list.map((s) => (s.id === editingId ? updated : s)));
          this.submitting.set(false);
          this.resetForm();
        },
        error: (err) => {
          this.errorMessage.set('Échec de la modification de la suggestion.');
          this.submitting.set(false);
          console.error(err);
        },
      });
    } else {
      this.service.create({ content, note }).subscribe({
        next: (res) => {
          this.suggestions.update((list) => [res.suggestion, ...list]);
          this.submitting.set(false);
          this.resetForm();
        },
        error: (err) => {
          this.errorMessage.set("Échec de l'envoi de la suggestion.");
          this.submitting.set(false);
          console.error(err);
        },
      });
    }
  }

  confirmDelete(suggestion: Suggestion): void {
    this.suggestionToDelete.set(suggestion);
  }

  cancelDelete(): void {
    this.suggestionToDelete.set(null);
  }

  executeDelete(): void {
    const suggestion = this.suggestionToDelete();
    if (!suggestion) return;

    this.deleting.set(true);

    this.service.delete(suggestion.id).subscribe({
      next: () => {
        this.suggestions.update((list) => list.filter((s) => s.id !== suggestion.id));
        this.deleting.set(false);
        this.suggestionToDelete.set(null);
        if (this.editingId() === suggestion.id) {
          this.resetForm();
        }
      },
      error: (err) => {
        this.errorMessage.set('Échec de la suppression de la suggestion.');
        this.deleting.set(false);
        this.suggestionToDelete.set(null);
        console.error(err);
      },
    });
  }
}
