import { DOCUMENT, Injector, PLATFORM_ID, Service, computed, effect, inject, isDevMode, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Traduction de l'interface : le français est la langue source, l'anglais une traduction.
 *
 * Les textes restent écrits en français dans les gabarits et le code ; ils passent par `t()`
 * (ou la pipe `| t`), qui renvoie la traduction anglaise quand l'anglais est choisi.
 * Un texte sans traduction reste en français (jamais de clé technique à l'écran).
 * Le dictionnaire anglais (`en.ts`) n'est chargé que si l'anglais est demandé.
 */
export type Lang = 'fr' | 'en';
export const LANGS: readonly Lang[] = ['fr', 'en'];
export const LANG_LABELS: Record<Lang, string> = { fr: 'Français', en: 'English' };

/** Paramètres d'un texte : « {n} résultats » avec { n: 3 }, ou « {0} » avec [3]. */
export type TranslationParams = Record<string, unknown> | readonly unknown[];

const STORAGE_KEY = 'rohafyaLang';

let enDictionary: Readonly<Record<string, string>> | null = null;
let enLoading: Promise<void> | null = null;

/** Charge le dictionnaire anglais (une seule fois, partagé : il ne change jamais). */
export function loadDictionary(lang: Lang): Promise<void> {
  if (lang === 'fr' || enDictionary) return Promise.resolve();
  enLoading ??= import('./en').then((m) => {
    enDictionary = m.EN;
  });
  return enLoading;
}

/** Espaces normalisés : un texte de gabarit sur plusieurs lignes et sa clé se correspondent. */
export function normalizeKey(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function interpolate(text: string, params?: TranslationParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (token, name: string) => {
    const value = Array.isArray(params) ? params[Number(name)] : (params as Record<string, unknown>)[name];
    return value === undefined || value === null ? token : String(value);
  });
}

/** Traduction pure, utilisable sans injection (tests, fonctions utilitaires). */
export function translateTo(lang: Lang, text: unknown, params?: TranslationParams, onMissing?: (key: string) => void): string {
  if (text === null || text === undefined) return '';
  const source = String(text);
  if (lang === 'fr' || !source) return interpolate(source, params);
  const key = normalizeKey(source);
  const found = enDictionary?.[key];
  if (found === undefined) {
    if (onMissing && /\p{L}/u.test(key)) onMissing(key);
    return interpolate(source, params);
  }
  // Les espaces de bord du texte source sont conservés (« … » + « et … » restent séparés).
  const [lead, trail] = [/^\s*/.exec(source)![0], /\s*$/.exec(source)![0]];
  return interpolate(lead + found + trail, params);
}

/**
 * Traducteur des fonctions sans injection (ex. messages d'erreur de l'API) : il suit la langue
 * de l'application dans le navigateur ; côté serveur, il reste en français.
 */
let globalTranslator: (text: unknown, params?: TranslationParams) => string = (text, params) => translateTo('fr', text, params);

export function t(text: unknown, params?: TranslationParams): string {
  return globalTranslator(text, params);
}

function readStored(): Lang | null {
  try {
    const value = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    return value === 'en' || value === 'fr' ? value : null;
  } catch {
    return null;
  }
}

/** Langue de l'interface pour cette application (une instance par rendu serveur, une dans le navigateur). */
@Service()
export class I18n {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);
  private readonly _lang = signal<Lang>(this.browser ? (readStored() ?? 'fr') : 'fr');
  /** Textes sans traduction rencontrés (développement) : relevés par le contrôle des traductions. */
  private readonly missing = new Set<string>();

  readonly lang = this._lang.asReadonly();
  /** Locale des dates et nombres : « fr-FR » ou « en-GB » (jour/mois/année dans les deux cas). */
  readonly locale = computed(() => (this._lang() === 'en' ? 'en-GB' : 'fr-FR'));
  /** Langue enregistrée sur cet appareil, s'il y en a une. */
  readonly stored = signal<Lang | null>(this.browser ? readStored() : null);

  constructor() {
    if (this.browser) {
      globalTranslator = (text, params) => this.t(text, params);
      bindGlobalLang(() => this._lang());
    }
    // Attribut lang de la page (WCAG 3.1.1) : les lecteurs d'écran prononcent dans la bonne langue.
    effect(() => {
      this.document.documentElement.lang = this._lang();
    });
  }

  /** Traduction d'un texte français dans la langue courante (lit le signal : se recalcule au changement). */
  t(text: unknown, params?: TranslationParams): string {
    const lang = this._lang();
    return translateTo(lang, text, params, this.browser && isDevMode() ? (key) => this.reportMissing(key) : undefined);
  }

  /** Charge la langue (dictionnaire) puis l'applique. `persist` : retenue sur cet appareil. */
  async use(lang: Lang, persist = true): Promise<void> {
    await loadDictionary(lang);
    this._lang.set(lang);
    if (persist && this.browser) {
      this.stored.set(lang);
      try {
        window.localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        /* stockage indisponible : la langue vaut pour la session */
      }
    }
    this.refreshTitle();
  }

  /** Au démarrage : charge le dictionnaire de la langue retenue avant le premier affichage. */
  init(): Promise<void> {
    return loadDictionary(this._lang());
  }

  private refreshTitle(): void {
    void import('./i18n-title')
      .then(({ refreshTranslatedTitle }) => refreshTranslatedTitle(this.injector))
      .catch(() => undefined); // application déjà détruite (tests, rendu serveur terminé) : rien à retraduire
  }

  private reportMissing(key: string): void {
    if (this.missing.has(key)) return;
    this.missing.add(key);
    const w = window as unknown as { __rohafyaMissing?: string[] };
    (w.__rohafyaMissing ??= []).push(key);
  }
}

/** Alias de `t` pour le code TypeScript (évite l'ombre d'une variable locale nommée `t`). */
export { t as tr };

/** Langue courante pour les fonctions sans injection (dates des comptes rendus, PDF). */
export function currentLang(): Lang {
  return globalLangReader();
}
let globalLangReader: () => Lang = () => 'fr';
export function bindGlobalLang(reader: () => Lang): void {
  globalLangReader = reader;
}
