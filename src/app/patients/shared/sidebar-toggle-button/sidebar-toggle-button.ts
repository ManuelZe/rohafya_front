import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Bars } from '@primeicons/angular/bars';
import { SidebarService } from '../../sidebar-service';

@Component({
  selector: 'app-sidebar-toggle-button',
  imports: [ButtonModule, Bars],
  templateUrl: './sidebar-toggle-button.html',
  styleUrl: './sidebar-toggle-button.css',
})
export class SidebarToggleButton {
  private readonly sidebarService = inject(SidebarService);

  toggle(): void {
    this.sidebarService.toggle();
  }
}
