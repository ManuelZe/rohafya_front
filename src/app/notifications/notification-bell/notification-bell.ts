import { Component, PLATFORM_ID, computed, effect, inject, input, signal } from '@angular/core';
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

  private readonly unreadCount = signal(0);

  readonly badgeLabel = computed(() => {
    const count = this.unreadCount();
    return count > 99 ? '99+' : count > 0 ? String(count) : '';
  });

  readonly hasUnread = computed(() => this.unreadCount() > 0);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (!isPlatformBrowser(this.platformId) || !user) {
        this.unreadCount.set(0);
        return;
      }

      this.notificationsService.getUserNotifications(user.id).subscribe({
        next: (notifications) => {
          this.unreadCount.set(notifications.filter((n) => !n.is_read).length);
        },
        error: () => {
          this.unreadCount.set(0);
        },
      });
    });
  }
}
