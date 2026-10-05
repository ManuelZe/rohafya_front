import { Component, DestroyRef, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import { PageHeader } from '../../patients/shared/page-header/page-header';
import { dateValue } from '../commissions/commissions.models';
import { ActualitesService, Article } from './actualites.service';

const EXCERPT_LENGTH = 220;

@Component({
  selector: 'app-actualites',
  imports: [DatePipe, PIcon, PageHeader],
  templateUrl: './actualites.html',
  styleUrls: ['../shared/doctor-ui.css', './actualites.css'],
})
export class Actualites {
  private readonly service = inject(ActualitesService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly articles = this.service.articles;
  readonly expanded = signal<number[]>([]);
  /** URL locale (blob:) de l'image de chaque article ; null = pas d'image. */
  readonly images = signal<Record<number, string | null>>({});

  private readonly requestedImages = new Set<number>();
  private readonly objectUrls: string[] = [];

  readonly sorted = computed(() => [...(this.articles.data() ?? [])].sort((a, b) => dateValue(b.date) - dateValue(a.date)));

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.service.load();
    }

    effect(() => {
      const list = this.sorted();
      untracked(() => list.forEach((a) => this.loadImage(a.id)));
    });

    inject(DestroyRef).onDestroy(() => this.objectUrls.forEach((url) => URL.revokeObjectURL(url)));
  }

  refresh(): void {
    this.service.load(true);
  }

  isExpanded(id: number): boolean {
    return this.expanded().includes(id);
  }

  toggle(id: number): void {
    this.expanded.update((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  isLong(article: Article): boolean {
    return (article.description ?? '').length > EXCERPT_LENGTH;
  }

  text(article: Article): string {
    const description = article.description ?? '';
    if (this.isExpanded(article.id) || description.length <= EXCERPT_LENGTH) return description;
    return `${description.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
  }

  safeUrl(article: Article): string | null {
    return article.url && /^https?:\/\//i.test(article.url) ? article.url : null;
  }

  private loadImage(id: number): void {
    if (this.requestedImages.has(id)) return;
    this.requestedImages.add(id);

    this.service.getImage(id).subscribe({
      next: (blob) => {
        // Sans image, l'API répond en JSON ({ message }) plutôt qu'avec un fichier.
        if (!blob.type.startsWith('image/')) {
          this.images.update((m) => ({ ...m, [id]: null }));
          return;
        }
        const url = URL.createObjectURL(blob);
        this.objectUrls.push(url);
        this.images.update((m) => ({ ...m, [id]: url }));
      },
      error: () => this.images.update((m) => ({ ...m, [id]: null })),
    });
  }
}
