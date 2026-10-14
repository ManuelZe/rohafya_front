import { Pipe, PipeTransform, inject } from '@angular/core';
import { formatDate, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeEnGb from '@angular/common/locales/en-GB';
import { I18n } from './i18n';

registerLocaleData(localeFr, 'fr-FR');
registerLocaleData(localeEnGb, 'en-GB');

/** Formats de date de l'interface, identiques en français et en anglais sauf les mots. */
export type DateStyle = 'date' | 'datetime' | 'time' | 'long' | 'month';

const FORMATS: Record<DateStyle, { fr: string; en: string }> = {
  date: { fr: 'dd/MM/yyyy', en: 'dd/MM/yyyy' },
  datetime: { fr: "dd/MM/yyyy 'à' HH:mm", en: "dd/MM/yyyy 'at' HH:mm" },
  time: { fr: 'HH:mm', en: 'HH:mm' },
  long: { fr: 'd MMMM yyyy', en: 'd MMMM yyyy' },
  month: { fr: 'MMMM yyyy', en: 'MMMM yyyy' },
};

/** `{{ date | ldate: 'datetime' }}` : « 12/10/2026 à 09:15 » ou « 12/10/2026 at 09:15 ». */
@Pipe({ name: 'ldate', pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(value: string | number | Date | null | undefined, style: DateStyle = 'date'): string {
    if (value === null || value === undefined || value === '') return '';
    const lang = this.i18n.lang();
    try {
      return formatDate(value, FORMATS[style][lang], lang === 'en' ? 'en-GB' : 'fr-FR');
    } catch {
      return String(value);
    }
  }
}
