import { Component, computed, inject } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../../connexion/auth-service';
import { NotificationBell } from '../../../notifications/notification-bell/notification-bell';
import { StatusTag } from '../../../patients/shared/status-tag/status-tag';
import { DoctorProfileService } from '../../doctor-profile.service';
import { stripDoctorTitle } from '../doctor-name';

@Component({
  selector: 'app-doctor-info-card',
  imports: [PIcon, NotificationBell, StatusTag],
  template: `
    <section class="info-card" aria-label="Votre profil">
      <div class="avatar" aria-hidden="true">{{ initials() }}</div>
      <div class="identity">
        <div class="name-row">
          <h2 class="name">Dr {{ fullName() }}</h2>
          <app-status-tag kind="account" [status]="isConfirmed() ? 'true' : 'false'" />
        </div>
        <p class="meta">
          @if (speciality()) {
            <span class="meta-item"><svg [pIcon]="'briefcase'" [size]="14"></svg>{{ speciality() }}</span>
          }
          @if (matricule()) {
            <span class="meta-item"><svg [pIcon]="'id-card'" [size]="14"></svg>Matricule {{ matricule() }}</span>
          }
        </p>
      </div>
      <div class="bell">
        <app-notification-bell link="/doctors/notifications" />
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .info-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #fff;
      border-radius: 10px;
      border-left: 4px solid #1a54c9;
      padding: 1.1rem 1.5rem;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
    }
    .avatar {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      flex-shrink: 0;
      background: linear-gradient(135deg, #1a54c9, #15359e);
      color: #fff;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .identity {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .name-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }
    .name {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
      color: #1f2937;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 1rem;
      font-size: 0.85rem;
      color: #545d6b;
    }
    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .bell {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #1a54c9;
      flex-shrink: 0;
    }
    @media (max-width: 640px) {
      .info-card {
        display: none;
      }
    }
  `,
})
export class DoctorInfoCard {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(DoctorProfileService);

  private readonly profile = this.profileService.profile;

  readonly firstName = computed(() => stripDoctorTitle(this.profile()?.DoctorName || this.authService.currentUser()?.prenom));
  readonly lastName = computed(() => (this.profile()?.DoctorLastname || this.authService.currentUser()?.nom || '').trim());
  readonly fullName = computed(() => `${this.firstName()} ${this.lastName()}`.trim() || '—');
  readonly speciality = computed(() => {
    const s = this.profile()?.Speciality;
    return s && s !== 'Nothing' ? s : '';
  });
  readonly matricule = computed(() => this.profile()?.DoctorFederationID ?? '');
  readonly isConfirmed = this.profileService.isConfirmed;

  readonly initials = computed(
    () => `${this.firstName().charAt(0)}${this.lastName().charAt(0)}`.toUpperCase().replace(/[^A-ZÀ-ÖØ-Þ]/g, '') || 'DR'
  );
}
