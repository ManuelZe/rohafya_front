import { Component } from '@angular/core';
import { PrivacyCenter } from '../../shared/security/privacy-center';

/** Confidentialité du patient : historique des accès à son dossier, export, double authentification, suppression. */
@Component({
  selector: 'app-patient-privacy',
  imports: [PrivacyCenter],
  template: `<app-privacy-center [showAccessLog]="true" />`,
})
export class PatientPrivacy {}
