import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { I18n, loadDictionary, normalizeKey, translateTo } from './i18n';
import { LocalDatePipe } from './ldate.pipe';
import { EN } from './en';

describe('translateTo', () => {
  beforeAll(() => loadDictionary('en'));

  it('laisse le français tel quel et remplace les paramètres', () => {
    expect(translateTo('fr', 'Payée')).toBe('Payée');
    expect(translateTo('fr', '{0} résultat expire bientôt', [1])).toBe('1 résultat expire bientôt');
  });

  it('traduit en anglais avec paramètres positionnels ou nommés', () => {
    expect(translateTo('en', 'Payée')).toBe('Paid');
    expect(translateTo('en', '{0} résultats expirent bientôt', [3])).toBe('3 results expire soon');
    expect(translateTo('en', '{n} à régler', { n: 2 })).toBe('2 to pay');
  });

  it('retrouve une clé écrite sur plusieurs lignes et garde les espaces de bord', () => {
    expect(translateTo('en', '\n   Payée  ')).toBe('\n   Paid  ');
    expect(normalizeKey('  Vous avez\n      tout lu. ')).toBe('Vous avez tout lu.');
    expect(translateTo('en', 'Vous avez\n   tout lu.')).toBe('You have read everything.');
  });

  it('revient au français pour un texte sans traduction et le signale', () => {
    const missing: string[] = [];
    expect(translateTo('en', 'Texte inconnu du dictionnaire', undefined, (key) => missing.push(key))).toBe('Texte inconnu du dictionnaire');
    expect(missing).toEqual(['Texte inconnu du dictionnaire']);
  });

  it('ne signale pas les valeurs sans lettre (nombres, tirets)', () => {
    const missing: string[] = [];
    translateTo('en', '12 750', undefined, (key) => missing.push(key));
    translateTo('en', '—', undefined, (key) => missing.push(key));
    expect(missing).toEqual([]);
  });
});

describe('dictionnaire anglais', () => {
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  it('n’a aucune traduction vide', () => {
    expect(Object.entries(EN).filter(([, value]) => !value.trim())).toEqual([]);
  });

  it('garde dans chaque traduction les paramètres du texte français', () => {
    const broken = Object.entries(EN).filter(([key, value]) => placeholders(key).join() !== placeholders(value).join());
    expect(broken).toEqual([]);
  });
});

describe('I18n', () => {
  let i18n: I18n;

  beforeEach(() => {
    localStorage.removeItem('rohafyaLang');
    TestBed.configureTestingModule({});
    i18n = TestBed.inject(I18n);
  });

  afterEach(() => localStorage.removeItem('rohafyaLang'));

  it('démarre en français', () => {
    expect(i18n.lang()).toBe('fr');
    expect(i18n.t('Payée')).toBe('Payée');
  });

  it('passe en anglais, le retient et met à jour l’attribut lang de la page', async () => {
    await i18n.use('en');
    TestBed.tick();
    expect(i18n.lang()).toBe('en');
    expect(i18n.locale()).toBe('en-GB');
    expect(i18n.t('Payée')).toBe('Paid');
    expect(localStorage.getItem('rohafyaLang')).toBe('en');
    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('en');
  });

  it('ne retient pas la langue quand persist vaut faux (page /en du site)', async () => {
    await i18n.use('en', false);
    expect(localStorage.getItem('rohafyaLang')).toBeNull();
  });

  it('formate les dates selon la langue', async () => {
    const pipe = TestBed.runInInjectionContext(() => new LocalDatePipe());
    const date = new Date(2026, 9, 12, 9, 15);
    expect(pipe.transform(date, 'datetime')).toBe('12/10/2026 à 09:15');
    expect(pipe.transform(date, 'month')).toBe('octobre 2026');
    await i18n.use('en', false);
    expect(pipe.transform(date, 'datetime')).toBe('12/10/2026 at 09:15');
    expect(pipe.transform(date, 'month')).toBe('October 2026');
    expect(pipe.transform(null)).toBe('');
  });
});
