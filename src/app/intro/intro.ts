import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PRIMENG_MODULES } from '../../others/shared-import';
import { PIcon } from '@primeicons/angular/p-icon';
import { DemoLauncher } from '../demo/demo-launcher/demo-launcher';


interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-intro',
  imports: [PIcon, PRIMENG_MODULES, CommonModule, RouterLink, DemoLauncher],
  templateUrl: './intro.html',
  styleUrl: './intro.css',
})
export class Intro {

  router = inject(Router)
  
  features: FeatureCard[] = [
    {
      icon: 'file',
      title: 'Consulter vos résultats',
      description: 'Accédez à vos résultats de laboratoire en ligne, en toute sécurité et à tout moment.'
    },
    {
      icon: 'wave-pulse',
      title: 'Suivre vos tendances santé',
      description: 'Visualisez l\'évolution de vos indicateurs de santé grâce à un suivi clair et accessible.'
    },
    {
      icon: 'address-book',
      title: 'Planifier un rendez-vous',
      description: 'Localisez facilement un professionnel de santé proche de chez vous.'
    },
    {
      icon: 'arrow-up-right',
      title: 'Partager mes Résultats',
      description: 'Partagez vos rapports médicaux en toute sécurité avec vos proches ou vos médecins.'
    }
  ];
 
}
