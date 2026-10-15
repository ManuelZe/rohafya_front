import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WHATSAPP_DISPLAY } from '../intro/intro.content';
import { LangSwitch } from '../shared/i18n/lang-switch';
import { TranslatePipe } from '../shared/i18n/t.pipe';

interface PolicySection {
  title: string;
  paragraphs: string[];
  items?: string[];
}

/** Texte de la politique (français, traduit par le dictionnaire anglais). À faire valider par un juriste. */
const SECTIONS: PolicySection[] = [
  {
    title: 'Qui est responsable de vos données',
    paragraphs: [
      'ROHAFYA est une plateforme qui permet aux établissements de santé (laboratoires, centres d’imagerie, cliniques, centres médicaux) de remettre en ligne à leurs patients leurs résultats et leurs factures.',
      'Chaque établissement reste responsable des données médicales qu’il publie : ROHAFYA les héberge et les affiche pour son compte. ROHAFYA est responsable des données de votre compte (nom, adresse e-mail, téléphone, préférences) et du journal des accès.',
    ],
  },
  {
    title: 'Les données traitées',
    paragraphs: [],
    items: [
      'Votre compte : nom, prénom, adresse e-mail, téléphones, langue, date de naissance et sexe si vous les indiquez.',
      'Vos rattachements : les établissements reliés à votre compte et le numéro de dossier qu’ils vous ont attribué.',
      'Les résultats d’examens et les factures que vos établissements publient pour vous.',
      'Ce que vous faites dans ROHAFYA : partages de résultats avec un médecin, prescriptions, pré-enregistrements et requêtes envoyés à un établissement.',
      'Le journal des accès : qui a consulté votre dossier ou un résultat partagé, et quand.',
    ],
  },
  {
    title: 'Pourquoi nous les utilisons',
    paragraphs: [
      'Uniquement pour vous donner accès à vos résultats et à vos factures, permettre les partages que vous choisissez, transmettre vos demandes aux établissements, sécuriser les comptes et tracer les accès. Vos données ne sont ni vendues, ni utilisées pour de la publicité.',
    ],
  },
  {
    title: 'Qui peut les voir',
    paragraphs: [],
    items: [
      'Les établissements auxquels votre compte est rattaché, pour les données de leur établissement uniquement.',
      'Les médecins avec qui vous partagez un résultat, pour ce résultat uniquement.',
      'Les prestataires techniques de ROHAFYA, tenus à la confidentialité : hébergement des serveurs chez Hetzner Online, hors du Cameroun, et envoi des e-mails.',
    ],
  },
  {
    title: 'Combien de temps nous les gardons',
    paragraphs: [
      'Les données de votre compte sont conservées tant que vous l’utilisez. Sur demande, le compte est désactivé et vos informations personnelles effacées de ROHAFYA sous 30 jours. Les résultats et factures restent conservés par les établissements qui les ont produits, selon leurs propres obligations. Le journal des accès est conservé pour la sécurité et la traçabilité.',
    ],
  },
  {
    title: 'Comment nous les protégeons',
    paragraphs: [],
    items: [
      'Échanges chiffrés (HTTPS) entre votre appareil et nos serveurs.',
      'Double authentification obligatoire pour les administrateurs, et possible pour tous les comptes.',
      'Chaque établissement ne voit que ses propres patients ; chaque accès sensible est inscrit au journal.',
      'Les résultats restent chez l’établissement : il ne dépend pas de ROHAFYA pour travailler.',
    ],
  },
  {
    title: 'Vos droits',
    paragraphs: [
      'Conformément à la loi n° 2024/017 du 23 décembre 2024 relative à la protection des données à caractère personnel, vous pouvez accéder à vos données, les faire rectifier, vous opposer à un traitement, les récupérer et demander leur suppression.',
      'Depuis votre espace, page « Confidentialité » : historique des accès, export de vos données, demande de suppression. Vos coordonnées se corrigent depuis « Paramètres ». Vous pouvez aussi adresser une réclamation à l’Autorité de protection des données à caractère personnel (APDP).',
    ],
  },
];

@Component({
  selector: 'app-privacy-policy',
  imports: [TranslatePipe, RouterLink, LangSwitch],
  template: `
    <main class="policy" id="main">
      <div class="policy-top">
        <a routerLink="/intro" class="policy-brand">ROHAFYA</a>
        <app-lang-switch />
      </div>
      <h1>{{ 'Politique de confidentialité' | t }}</h1>
      <p class="policy-date">{{ 'Dernière mise à jour : 15 octobre 2026' | t }}</p>
      @for (section of sections; track section.title) {
        <section>
          <h2>{{ section.title | t }}</h2>
          @for (paragraph of section.paragraphs; track paragraph) {
            <p>{{ paragraph | t }}</p>
          }
          @if (section.items) {
            <ul>
              @for (item of section.items; track item) {
                <li>{{ item | t }}</li>
              }
            </ul>
          }
        </section>
      }
      <section>
        <h2>{{ 'Nous contacter' | t }}</h2>
        <p>{{ 'Pour toute question sur vos données : WhatsApp {0}, ou depuis votre espace.' | t: [whatsapp] }}</p>
      </section>
      <p><button type="button" class="policy-back" (click)="back()">{{ 'Retour' | t }}</button></p>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: #f8fafb;
    }
    .policy {
      max-width: 46rem;
      margin: 0 auto;
      padding: 1.5rem 1rem 3rem;
      color: #1f2937;
      line-height: 1.65;
    }
    .policy-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .policy-brand {
      font-weight: 800;
      font-size: 1.2rem;
      color: #047857;
      text-decoration: none;
    }
    h1 {
      margin: 0;
      font-size: 1.8rem;
      color: #0c4562;
    }
    h2 {
      margin: 1.75rem 0 0.5rem;
      font-size: 1.15rem;
      color: #0c4562;
    }
    .policy-date {
      color: #4b5563;
      font-size: 0.9rem;
    }
    li + li {
      margin-top: 0.35rem;
    }
    .policy-back {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      border: 1px solid #047857;
      border-radius: 0.5rem;
      background: #ffffff;
      color: #047857;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .policy-back:focus-visible,
    .policy-brand:focus-visible {
      outline: 3px solid #059669;
      outline-offset: 2px;
    }
  `,
})
export class PrivacyPolicy {
  private readonly location = inject(Location);
  readonly sections = SECTIONS;
  readonly whatsapp = WHATSAPP_DISPLAY;

  back(): void {
    this.location.back();
  }
}
