import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private readonly _visible = signal<boolean>(false);

  readonly visible = this._visible.asReadonly();

  open(): void {
    this._visible.set(true);
  }

  close(): void {
    this._visible.set(false);
  }

  toggle(): void {
    this._visible.update((v) => !v);
  }

  set(value: boolean): void {
    this._visible.set(value);
  }
}