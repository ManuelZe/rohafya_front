import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../connexion/auth-service';
import { PatientProfileService } from '../../patient-profile-service';
import { NotificationBell } from '../../../notifications/notification-bell/notification-bell';
import { StatusTag } from '../status-tag/status-tag';

@Component({
  selector: 'app-user-info-card',
  imports: [CommonModule, NotificationBell, StatusTag],
  templateUrl: './user-info-card.html',
  styleUrl: './user-info-card.css',
})
export class UserInfoCard {
  private readonly authService = inject(AuthService);
  private readonly patientProfileService = inject(PatientProfileService);

  readonly visible = computed(() => this.authService.isPatient());

  private readonly profile = computed(() => this.patientProfileService.profile());

  readonly nom = computed(() => this.profile()?.PatientLastname || this.authService.currentUser()?.nom || '—');
  readonly prenom = computed(() => this.profile()?.PatientName || this.authService.currentUser()?.prenom || '—');
  readonly email = computed(() => this.profile()?.PatientEmail || this.authService.currentUser()?.email || '—');

  readonly initials = computed(() => {
    const p = this.prenom().charAt(0);
    const n = this.nom().charAt(0);
    return `${p}${n}`.toUpperCase().replace(/[^A-ZÀ-ÖØ-Þ]/g, '') || '?';
  });

  readonly isConfirmed = computed(() => this.patientProfileService.isConfirmed());
}
