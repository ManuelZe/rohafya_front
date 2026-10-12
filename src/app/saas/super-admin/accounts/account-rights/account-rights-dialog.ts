import { Component, ElementRef, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, form, validate } from '@angular/forms/signals';
import { extractErrorMessage } from '../../../../shared/api-error';
import { AccountRightsUpdate, AccountView, AdminAccountRights } from '../../../saas.models';
import { SuperAdminService } from '../../../super-admin.service';

type PrintMode = 'none' | 'window' | 'blocked';
type ShareMode = 'unlimited' | 'limited';

interface RightsModel {
  printMode: PrintMode;
  printFrom: string;
  printUntil: string;
  shareMode: ShareMode;
  shareLimit: number;
  resetCount: boolean;
}

/** Date renvoyée par l'API (ISO ou RFC 1123, heure du serveur) → valeur d'un <input type="datetime-local">. */
export function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value.slice(0, 16);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

/** Configuration de la fenêtre → corps de PUT /saas/super/users/{id}/rights. */
export function rightsPayload(model: RightsModel): AccountRightsUpdate {
  return {
    print_mode: model.printMode === 'none' ? null : model.printMode,
    print_from: model.printMode === 'window' ? model.printFrom || null : null,
    print_until: model.printMode === 'window' ? model.printUntil || null : null,
    share_limit: model.shareMode === 'limited' ? Number(model.shareLimit) : null,
    reset_share_count: model.shareMode === 'limited' && model.resetCount,
  };
}

let nextId = 0;

/**
 * Droits d'un compte personnel, réglés par le super-administrateur :
 * impression des comptes rendus pendant une période, nombre de partages de résultats.
 * Sans configuration, tout est disponible pour le compte.
 */
@Component({
  selector: 'app-account-rights-dialog',
  imports: [FormField, FormRoot],
  templateUrl: './account-rights-dialog.html',
  styleUrls: ['../../../../doctors/shared/doctor-ui.css', '../../../shared/console-ui.css', './account-rights-dialog.css'],
})
export class AccountRightsDialog {
  private readonly service = inject(SuperAdminService);

  readonly account = input.required<AccountView>();
  /** Émis à la fermeture ; `true` si la configuration a changé. */
  readonly closed = output<boolean>();

  protected readonly id = `account-rights-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly current = signal<AdminAccountRights | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  private changed = false;

  protected readonly model = signal<RightsModel>({
    printMode: 'none',
    printFrom: '',
    printUntil: '',
    shareMode: 'unlimited',
    shareLimit: 3,
    resetCount: false,
  });

  protected readonly rightsForm = form(this.model, (f) => {
    validate(f.printUntil, ({ value, valueOf }) => {
      if (valueOf(f.printMode) !== 'window') return undefined;
      if (!value()) return { kind: 'required', message: 'Indiquez la fin de l’accès.' };
      const from = valueOf(f.printFrom);
      return from && value() <= from ? { kind: 'order', message: 'La fin doit être postérieure au début.' } : undefined;
    });
    validate(f.shareLimit, ({ value, valueOf }) => {
      if (valueOf(f.shareMode) !== 'limited') return undefined;
      const n = Number(value());
      return Number.isInteger(n) && n >= 0 && n <= 10000 ? undefined : { kind: 'range', message: 'Nombre entier entre 0 et 10 000.' };
    });
  });

  protected readonly name = computed(() => {
    const a = this.account();
    return `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || a.email || a.username;
  });
  protected readonly isPatient = computed(() => this.account().roles.includes('Patient'));
  protected readonly share = computed(() => this.current()?.effective.share ?? null);
  protected readonly print = computed(() => this.current()?.effective.print ?? null);

  constructor() {
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
      this.load();
    });
  }

  private load(): void {
    this.service.rights(this.account().id).subscribe({
      next: (rights) => {
        this.apply(rights);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Impossible de charger les droits de ce compte.'));
        this.loading.set(false);
      },
    });
  }

  private apply(rights: AdminAccountRights): void {
    this.current.set(rights);
    this.model.set({
      printMode: rights.print_mode ?? 'none',
      printFrom: toDateTimeLocal(rights.print_from),
      printUntil: toDateTimeLocal(rights.print_until),
      shareMode: rights.share_limit === null ? 'unlimited' : 'limited',
      shareLimit: rights.share_limit ?? 3,
      resetCount: false,
    });
  }

  protected setPrintMode(mode: PrintMode): void {
    this.model.update((m) => ({ ...m, printMode: mode }));
  }

  protected setShareMode(mode: ShareMode): void {
    this.model.update((m) => ({ ...m, shareMode: mode }));
  }

  protected save(): void {
    if (this.saving()) return;
    if (this.rightsForm().invalid()) {
      this.rightsForm.printUntil().markAsTouched();
      this.rightsForm.shareLimit().markAsTouched();
      return;
    }
    this.run(this.service.updateRights(this.account().id, rightsPayload(this.model())));
  }

  protected clear(): void {
    if (this.saving()) return;
    this.run(this.service.clearRights(this.account().id));
  }

  private run(request: ReturnType<SuperAdminService['clearRights']>): void {
    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: (rights) => {
        this.saving.set(false);
        this.changed = true;
        this.apply(rights);
        this.close();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err, "L'enregistrement a échoué."));
      },
    });
  }

  protected close(): void {
    const dialog = this.dialog().nativeElement;
    if (dialog.open) dialog.close();
  }

  /** Événement « close » du <dialog> (bouton, Échap) : la fenêtre est retirée par le parent. */
  protected onClosed(): void {
    this.closed.emit(this.changed);
  }
}
