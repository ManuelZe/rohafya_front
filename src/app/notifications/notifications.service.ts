import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppNotification } from './notifications.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** GET /notifications/user/{userId}/ */
  getUserNotifications(userId: number): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${this.baseUrl}notifications/user/${userId}/`);
  }

  /** DELETE /notifications/user/del/{notificationId} */
  deleteNotification(notificationId: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}notifications/user/del/${notificationId}`);
  }

  /** DELETE /notifications/user/{userId}/del/{notificationId} */
  deleteUserNotification(userId: number, notificationId: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}notifications/user/${userId}/del/${notificationId}`);
  }

  /** DELETE /notifications/user/{userId}/del_all */
  deleteAllUserNotifications(userId: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}notifications/user/${userId}/del_all`);
  }

  /** PUT /notifications/mark_read/{notificationId} */
  markAsRead(notificationId: number): Observable<unknown> {
    return this.http.put(`${this.baseUrl}notifications/mark_read/${notificationId}`, {});
  }

  /** GET /notifications/type/{typeId} */
  getByType(typeId: number): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${this.baseUrl}notifications/type/${typeId}`);
  }

  /** GET /notifications/etiquette/{etiquetteId} */
  getByEtiquette(etiquetteId: number): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${this.baseUrl}notifications/etiquette/${etiquetteId}`);
  }
}
