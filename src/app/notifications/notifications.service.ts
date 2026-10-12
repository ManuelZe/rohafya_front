import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AppNotification } from './notifications.models';
import { environment } from '../../environments/environment';

/**
 * Notifications de l'utilisateur connecté (patient, médecin, administrateur d'établissement) :
 * GET/PUT/DELETE /saas/me/notifications — l'API ne renvoie que les siennes.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}saas/me/notifications`;

  /** Nombre de notifications non lues, partagé par toutes les cloches. */
  private readonly _unread = signal(0);
  readonly unread = this._unread.asReadonly();

  list(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(this.baseUrl).pipe(
      tap((list) => this._unread.set(Array.isArray(list) ? list.filter((n) => !n.is_read && n.user_id !== null).length : 0))
    );
  }

  markAsRead(notificationId: number): Observable<AppNotification> {
    return this.http.put<AppNotification>(`${this.baseUrl}/${notificationId}/read`, {}).pipe(tap(() => this.decrement()));
  }

  markAllAsRead(): Observable<{ message: string; count: number }> {
    return this.http.put<{ message: string; count: number }>(`${this.baseUrl}/read`, {}).pipe(tap(() => this._unread.set(0)));
  }

  /** Retire une notification de la liste de l'utilisateur (elle reste pour les autres destinataires). */
  hide(notification: AppNotification): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${notification.id}`).pipe(tap(() => !notification.is_read && this.decrement()));
  }

  hideAll(): Observable<unknown> {
    return this.http.delete(this.baseUrl).pipe(tap(() => this._unread.set(0)));
  }

  reset(): void {
    this._unread.set(0);
  }

  private decrement(): void {
    this._unread.update((n) => Math.max(0, n - 1));
  }
}
