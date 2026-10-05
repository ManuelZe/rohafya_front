import { Component, input } from '@angular/core';
import { SidebarToggleButton } from '../sidebar-toggle-button/sidebar-toggle-button';

@Component({
  selector: 'app-page-header',
  imports: [SidebarToggleButton],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
