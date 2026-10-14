import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { FLAG_LABELS, MedicalReport, ReportFact, formatDate, isOutOfRange } from './medical-report';
import { PATIENT_NOTICE, ReportAudience } from './print-report';
import { tr } from '../i18n/i18n';

const NAVY = '#0c4562';
const GREEN_DARK = '#065f46';
const MUTED = '#4b5563';
const BORDER = '#c5d7e2';

function facts(list: ReportFact[]): TableCell[][] {
  return list.map((f) => [
    { text: tr(f.label), color: MUTED, bold: true, fontSize: 8.5 },
    { text: f.date ? formatDate(f.value) : f.value, fontSize: 9 },
  ]);
}

function card(title: string, rows: TableCell[][]): Content {
  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            stack: [
              { text: tr(title).toUpperCase(), color: NAVY, bold: true, fontSize: 8, characterSpacing: 0.5, margin: [0, 0, 0, 4] },
              rows.length
                ? { table: { widths: [78, '*'], body: rows }, layout: 'noBorders' }
                : { text: '—', color: MUTED },
            ],
          },
        ],
      ],
    },
    layout: { hLineColor: () => BORDER, vLineColor: () => BORDER, paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6 },
  };
}

function heading(text: string): Content {
  return { text: tr(text), style: 'h2', margin: [0, 10, 0, 4] };
}

/** Nom de fichier lisible : compte-rendu-LAB-0412-2026-10-12.pdf */
export function reportFileName(report: MedicalReport, editedAt = new Date()): string {
  const code = (report.code || 'examen').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
  return `compte-rendu-${code}-${editedAt.toISOString().slice(0, 10)}.pdf`;
}

/**
 * Compte rendu au format PDF (A4), même contenu que la version imprimée.
 * `logo` : image en data URL (facultative).
 */
export function reportPdfDefinition(report: MedicalReport, audience: ReportAudience, logo: string | null = null, editedAt = new Date()): TDocumentDefinitions {
  const p = report.patient;
  const establishment = report.establishment || tr('Établissement non communiqué');
  const patientFacts = facts(
    [
      { label: 'Nom complet', value: p.name },
      { label: 'Identifiant', value: p.identifier },
      { label: 'Né(e) le', value: p.birthDate ? `${formatDate(p.birthDate, false)}${p.age ? ` (${p.age})` : ''}` : '' },
      { label: 'Âge', value: p.birthDate ? '' : p.age },
      { label: 'Sexe', value: p.sex },
    ].filter((f) => f.value)
  );
  const examFacts = facts(
    [
      { label: 'Établissement', value: establishment },
      { label: 'N° d’examen', value: report.code },
      ...report.people.filter((f) => f.label === 'Prescripteur'),
      ...report.dates,
    ].filter((f) => f.value)
  );

  const content: Content[] = [
    {
      columns: [
        logo ? { image: logo, fit: [110, 34] } : { text: 'ROHAFYA', bold: true, fontSize: 16, color: NAVY },
        {
          stack: [
            { text: tr('Établissement').toUpperCase(), fontSize: 7, color: MUTED, characterSpacing: 0.6 },
            { text: establishment, bold: true, fontSize: 12, color: NAVY },
            { text: tr(report.discipline), fontSize: 8.5, color: MUTED },
          ],
          alignment: 'right',
        },
      ],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 6, x2: 515, y2: 6, lineWidth: 1.5, lineColor: NAVY }] },
    { text: tr(report.documentTitle), style: 'h1', margin: [0, 12, 0, 2] },
    { text: [{ text: report.title, bold: true }, report.code ? { text: `  ·  ${tr('N° {code}', { code: report.code })}`, color: MUTED } : ''], fontSize: 11, margin: [0, 0, 0, 10] },
    { columns: [card('Patient', patientFacts), card('Examen', examFacts)], columnGap: 12 },
  ];

  if (report.conclusion) {
    content.push({
      table: {
        widths: ['*'],
        body: [[{ stack: [{ text: tr(report.conclusion.title).toUpperCase(), bold: true, fontSize: 8.5, color: GREEN_DARK, margin: [0, 0, 0, 2] }, { text: report.conclusion.text, bold: true }] }]],
      },
      layout: {
        fillColor: () => '#ecfdf5',
        hLineWidth: () => 0,
        vLineWidth: (i: number) => (i === 0 ? 3 : 0),
        vLineColor: () => '#047857',
        paddingLeft: () => 10,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
      margin: [0, 12, 0, 0],
    });
  }

  if (report.measures.length) {
    content.push(heading(report.measuresTitle));
    if (report.measuresFromReport) {
      content.push({ text: tr('Valeurs reprises du compte rendu validé ; les valeurs de référence ne sont pas communiquées pour cet examen.'), style: 'note' });
    }
    const header = ['Paramètre', 'Résultat', 'Unité', 'Valeurs de référence', 'Interprétation'].map((label, i) => ({
      text: tr(label),
      bold: true,
      color: NAVY,
      fontSize: 8.5,
      fillColor: '#e5eef3',
      alignment: i === 1 ? ('right' as const) : ('left' as const),
    }));
    const rows: TableCell[][] = report.measures.map((m) => {
      const out = isOutOfRange(m);
      const fill = out ? '#fdf2f2' : undefined;
      return [
        m.remarks
          ? { stack: [{ text: m.name, bold: out }, { text: m.remarks, fontSize: 8, color: MUTED }], fillColor: fill }
          : { text: m.name, bold: out, fillColor: fill },
        { text: m.value, bold: true, alignment: 'right', fillColor: fill },
        { text: m.unit, fillColor: fill },
        { text: m.range, fillColor: fill },
        { text: out ? tr(FLAG_LABELS[m.flag]) : m.flag === 'normal' ? tr('Normal') : '', bold: out, color: out ? '#b91c1c' : undefined, fillColor: fill },
      ];
    });
    content.push({
      table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto'], body: [header, ...rows], dontBreakRows: true },
      layout: { hLineColor: () => '#e5e7eb', vLineWidth: () => 0, paddingTop: () => 4, paddingBottom: () => 4 },
    });
    const outCount = report.measures.filter(isOutOfRange).length;
    content.push({
      text: outCount
        ? outCount > 1
          ? tr('{n} valeurs en dehors des valeurs de référence (en gras).', { n: outCount })
          : tr('{n} valeur en dehors des valeurs de référence (en gras).', { n: outCount })
        : tr('Valeurs à comparer aux valeurs de référence indiquées.'),
      style: 'note',
      margin: [0, 4, 0, 0],
    });
  }

  if (report.studies.length) {
    content.push(heading("Images de l'examen"));
    content.push({
      ul: report.studies.map((s) => ({
        text: [{ text: s.description, bold: true }, [s.date ? formatDate(s.date) : '', s.institution, s.physician].filter(Boolean).map((v) => ` · ${v}`).join('')],
      })),
    });
  }

  for (const section of report.sections) {
    content.push(heading(section.title), { text: section.text });
  }

  const validation =
    report.validatedBy || report.validatedAt
      ? report.validatedBy && report.validatedAt
        ? tr('Compte rendu validé par {name} le {date}.', { name: report.validatedBy, date: formatDate(report.validatedAt) })
        : report.validatedBy
          ? tr('Compte rendu validé par {name}.', { name: report.validatedBy })
          : tr('Compte rendu validé le {date}.', { date: formatDate(report.validatedAt) })
      : '';
  const others = report.people.filter((f) => f.label !== 'Prescripteur' && f.value !== report.validatedBy);
  content.push({ canvas: [{ type: 'line', x1: 0, y1: 8, x2: 515, y2: 8, lineWidth: 0.7, lineColor: BORDER }] });
  if (validation) content.push({ text: validation, margin: [0, 6, 0, 0] });
  if (others.length) content.push({ text: others.map((f) => tr('{label} : {value}', { label: tr(f.label), value: f.value })).join(' · '), margin: [0, 2, 0, 0] });
  if (audience === 'patient') {
    content.push({ text: tr(PATIENT_NOTICE), style: 'note', margin: [0, 10, 0, 0] });
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 36, 40, 44],
    info: { title: `${tr(report.documentTitle)} — ${report.code}`, author: establishment, creator: 'ROHAFYA' },
    defaultStyle: { font: 'Roboto', fontSize: 9.5, lineHeight: 1.2, color: '#1f2937' },
    styles: {
      h1: { fontSize: 16, bold: true, color: NAVY },
      h2: { fontSize: 11, bold: true, color: NAVY },
      note: { fontSize: 8, color: MUTED },
    },
    content,
    footer: (page: number, pages: number) => ({
      columns: [
        {
          text: tr('Édité le {date} depuis ROHAFYA, à partir du compte rendu validé par {establishment}.', {
            date: formatDate(editedAt.toISOString()),
            establishment: report.establishment || tr("l'établissement"),
          }),
          width: '*',
        },
        { text: `${report.code} · ${page}/${pages}`, alignment: 'right', width: 'auto' },
      ],
      fontSize: 7.5,
      color: '#6b7280',
      margin: [40, 12, 40, 0],
    }),
  };
}

function loadEngine() {
  return Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]);
}

async function logoDataUrl(): Promise<string | null> {
  try {
    const blob = await (await fetch('/rohafya-emblem.png')).blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function createReportPdf(report: MedicalReport, audience: ReportAudience) {
  const [[pdfModule, vfsModule], logo] = await Promise.all([loadEngine(), logoDataUrl()]);
  // Construction UMD : selon l'empaquetage, l'API est exposée directement ou sous `default`.
  const pdfMake = (pdfModule as unknown as { default?: typeof pdfModule }).default ?? pdfModule;
  const fonts = (vfsModule as unknown as { default?: Record<string, string> }).default ?? (vfsModule as unknown as Record<string, string>);
  pdfMake.addVirtualFileSystem(fonts);
  return pdfMake.createPdf(reportPdfDefinition(report, audience, logo));
}

/**
 * Prépare le PDF sans le télécharger (téléphone). Le téléchargement se fait ensuite par un vrai lien
 * touché par l'utilisateur : un téléchargement déclenché après la génération, une fois le geste
 * expiré, est ignoré sans message par Safari, Chrome sur iPhone et plusieurs navigateurs Android.
 */
export async function prepareReportPdf(report: MedicalReport, audience: ReportAudience): Promise<{ blob: Blob; name: string }> {
  const blob = await (await createReportPdf(report, audience)).getBlob();
  return { blob, name: reportFileName(report) };
}

/** Télécharge le compte rendu en PDF (ordinateur). pdfmake n'est chargé qu'à ce moment. */
export async function downloadReportPdf(report: MedicalReport, audience: ReportAudience): Promise<void> {
  await (await createReportPdf(report, audience)).download(reportFileName(report));
}
