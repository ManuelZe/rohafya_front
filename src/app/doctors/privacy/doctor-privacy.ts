import { Component } from '@angular/core';
import { PrivacyCenter } from '../../shared/security/privacy-center';

/** Confidentialité du médecin : export, double authentification, suppression (pas d'historique de dossier). */
@Component({
  selector: 'app-doctor-privacy',
  imports: [PrivacyCenter],
  template: `<app-privacy-center [showAccessLog]="false" />`,
})
export class DoctorPrivacy {}
