import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ListWindow } from './list-window';
import { distinctValues, matchesText, sortByDate } from './list-filters';

describe('outils de liste', () => {
  it('recherche sans tenir compte des accents ni de la casse', () => {
    expect(matchesText('hemoglobine', 'Hémoglobine')).toBe(true);
    expect(matchesText('', null)).toBe(true);
    expect(matchesText('clinique', 'LAB-1', null, 'Centre')).toBe(false);
  });

  it('liste les établissements distincts', () => {
    expect(distinctValues(['B', 'A', null, ' A ', ''])).toEqual(['A', 'B']);
  });

  it('trie par date, les éléments sans date à la fin', () => {
    const items = [{ d: '2026-01-02' }, { d: null }, { d: '2026-03-01' }];
    expect(sortByDate(items, (i) => i.d, 'recent').map((i) => i.d)).toEqual(['2026-03-01', '2026-01-02', null]);
    expect(sortByDate(items, (i) => i.d, 'oldest').map((i) => i.d)).toEqual(['2026-01-02', '2026-03-01', null]);
  });

  it('affiche la liste par tranches et repart du début quand elle change', () => {
    TestBed.runInInjectionContext(() => {
      const source = signal(Array.from({ length: 25 }, (_, i) => i));
      const list = new ListWindow(source, 10);
      expect(list.visible().length).toBe(10);
      list.showMore();
      expect(list.shown()).toBe(20);
      expect(list.remaining()).toBe(5);
      list.showAll();
      expect(list.remaining()).toBe(0);
      source.set([1, 2, 3]);
      expect(list.shown()).toBe(3);
      source.set(Array.from({ length: 30 }, (_, i) => i));
      expect(list.shown()).toBe(10);
    });
  });

  it('ne se replie pas quand seules les données changent (images chargées en différé)', () => {
    TestBed.runInInjectionContext(() => {
      const source = signal(Array.from({ length: 25 }, (_, i) => ({ id: i })));
      const filter = signal('');
      const list = new ListWindow(source, 10, () => filter());
      list.showMore();
      source.set(source().map((item) => ({ ...item })));
      expect(list.shown()).toBe(20);
      filter.set('x');
      expect(list.shown()).toBe(10);
    });
  });
});
