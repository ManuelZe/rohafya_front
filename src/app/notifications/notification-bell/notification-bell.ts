import { Component, PLATFORM_ID, computed, effect, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Bell } from '@primeicons/angular/bell';
import { AuthService } from '../../connexion/auth-service';
import { NotificationsService } from '../notifications.service';

@Component({
  selector: 'app-notification-bell',
  imports: [RouterLink, Bell],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell {
  private readonly authService = inject(AuthService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly platformId = inject(PLATFORM_ID);

  /** Page de destination : /notifications (patient) ou /doctors/notifications (docteur). */
  readonly link = input('/notifications');

  private readonly unreadCount = this.notificationsService.unread;

  readonly badgeLabel = computed(() => {
    const count = this.unreadCount();
    return count > 99 ? '99+' : count > 0 ? String(count) : '';
  });

  readonly hasUnread = computed(() => this.unreadCount() > 0);

  /** Le nombre de non-lues est annoncé aux lecteurs d'écran (le badge seul ne l'est pas). */
  readonly ariaLabel = computed(() => {
    const count = this.unreadCount();
    return count > 0 ? `Voir les notifications (${this.badgeLabel()} non lue${count > 1 ? 's' : ''})` : 'Voir les notifications';
  });

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (!isPlatformBrowser(this.platformId) || !user) {
        this.notificationsService.reset();
        return;
      }

      this.notificationsService.list().subscribe({ error: () => this.notificationsService.reset() });
    });
  }
}
