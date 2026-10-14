import { API } from './en/api';
import { COMMON } from './en/common';
import { DEMO } from './en/demo';
import { DOCTORS } from './en/doctors';
import { INTRO } from './en/intro';
import { PATIENTS } from './en/patients';
import { SAAS } from './en/saas';

/**
 * Dictionnaire anglais : texte français (espaces normalisés) → traduction.
 * Chargé seulement si l'anglais est choisi (import dynamique dans i18n.ts).
 * Un texte absent reste affiché en français.
 */
const SOURCES = [API, DEMO, COMMON, PATIENTS, DOCTORS, SAAS, INTRO];

export const EN: Readonly<Record<string, string>> = Object.fromEntries(
  SOURCES.flatMap((source) => Object.entries(source)).map(([fr, en]) => [fr.replace(/\s+/g, ' ').trim(), en])
);
