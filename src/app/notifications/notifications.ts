import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../connexion/auth-service';
import { NotificationsService } from './notifications.service';
import { AppNotification } from './notifications.models';

type NotificationsFilter = 'all' | 'unread';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule, RouterLink, ButtonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class Notifications {
  private readonly authService = inject(AuthService);
  private readonly notificationsService = inject(NotificationsService);

  /** Lien « Retour » : fourni par les données de route (ex. /doctors pour l'espace docteur). */
  readonly homeLink = input<string>();

  /** withComponentInputBinding() remet l'input à undefined quand la route ne fournit pas `homeLink` :
   *  on retombe alors sur l'espace de l'utilisateur (patient en priorité, sinon docteur). */
  readonly backLink = computed(() => {
    const fromRoute = this.homeLink();
    if (fromRoute) return fromRoute;
    const user = this.authService.currentUser();
    if (user && this.authService.isPatient() && user.patient_id !== null) return '/patients';
    if (user && this.authService.isDoctor() && user.doctor_id !== null) return '/doctors';
    return '/connexion';
  });

  notifications = signal<AppNotification[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  deletingAll = signal(false);

  filter = signal<NotificationsFilter>('all');

  filteredNotifications = computed(() => {
    const list = this.notifications();
    return this.filter() === 'unread' ? list.filter((n) => !n.is_read) : list;
  });

  unreadCount = computed(() => this.notifications().filter((n) => !n.is_read).length);

  constructor() {
    this.loadNotifications();
  }

  setFilter(filter: NotificationsFilter): void {
    this.filter.set(filter);
  }

  loadNotifications(): void {
    const user = this.authService.currentUser();
    if (!user) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.notificationsService.getUserNotifications(user.id).subscribe({
      next: (data) => {
        this.notifications.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Impossible de charger les notifications.');
        this.loading.set(false);
        console.error(err);
      },
    });
  }

  markAsRead(notification: AppNotification): void {
    if (notification.is_read) return;

    this.notificationsService.markAsRead(notification.id).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => (n.id === notification.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
        );
      },
      error: (err) => {
        this.errorMessage.set('Impossible de marquer cette notification comme lue.');
        console.error(err);
      },
    });
  }

  deleteNotification(notification: AppNotification, event?: Event): void {
    event?.stopPropagation();

    const user = this.authService.currentUser();
    if (!user) return;

    this.notificationsService.deleteUserNotification(user.id, notification.id).subscribe({
      next: () => {
        this.notifications.update((list) => list.filter((n) => n.id !== notification.id));
      },
      error: (err) => {
        this.errorMessage.set('Échec de la suppression de la notification.');
        console.error(err);
      },
    });
  }

  deleteAll(): void {
    const user = this.authService.currentUser();
    if (!user || this.notifications().length === 0) return;

    this.deletingAll.set(true);

    this.notificationsService.deleteAllUserNotifications(user.id).subscribe({
      next: () => {
        this.notifications.set([]);
        this.deletingAll.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Échec de la suppression des notifications.');
        this.deletingAll.set(false);
        console.error(err);
      },
    });
  }
}
