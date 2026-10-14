import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { SidebarToggleButton } from '../sidebar-toggle-button/sidebar-toggle-button';
import { NotificationBell } from '../../../notifications/notification-bell/notification-bell';

import { TranslatePipe } from '../../../shared/i18n/t.pipe';
@Component({
  selector: 'app-page-header',
  imports: [TranslatePipe, SidebarToggleButton, NotificationBell],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();

  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  /**
   * Cloche des notifications à côté du titre : espace médecin et console d'établissement (toujours),
   * espace patient (téléphone seulement : sur grand écran, elle figure déjà dans la carte d'identité).
   */
  protected readonly bell = computed<{ link: string; mobileOnly: boolean } | null>(() => {
    const url = this.url();
    if (url.startsWith('/doctors')) return { link: '/doctors/notifications', mobileOnly: false };
    if (url.startsWith('/patients')) return { link: '/notifications', mobileOnly: true };
    // Console d'établissement : notifications de l'équipe ROHAFYA (le super-administrateur n'en reçoit pas).
    if (url.startsWith('/admin')) return { link: '/admin/notifications', mobileOnly: false };
    return null;
  });
}
