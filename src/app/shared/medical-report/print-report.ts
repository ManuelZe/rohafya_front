import { FLAG_LABELS, FLAG_SYMBOLS, MedicalReport, ReportFact, formatDate, isOutOfRange } from './medical-report';

/** Lecteur du compte rendu : la mention de prudence n'est destinée qu'au patient. */
export type ReportAudience = 'patient' | 'doctor';

const PATIENT_NOTICE =
  "Les valeurs de référence sont propres à l'établissement qui a réalisé l'examen. Un résultat en dehors de ces valeurs " +
  "n'est pas forcément anormal : seul votre médecin peut l'interpréter au regard de votre situation.";

function esc(value: string | null | undefined): string {
  return (value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function factRows(facts: ReportFact[]): string {
  return facts.map((f) => `<tr><th>${esc(f.label)}</th><td>${esc(f.date ? formatDate(f.value) : f.value)}</td></tr>`).join('');
}

/** Document HTML autonome du compte rendu, mis en page pour une feuille A4. */
export function reportDocument(report: MedicalReport, audience: ReportAudience, origin: string, editedAt = new Date()): string {
  const p = report.patient;
  const patientFacts: ReportFact[] = [
    { label: 'Nom', value: p.name },
    { label: 'Identifiant', value: p.identifier },
    { label: 'Date de naissance', value: p.birthDate ? `${formatDate(p.birthDate, false)}${p.age ? ` (${p.age})` : ''}` : '' },
    { label: 'Âge', value: p.birthDate ? '' : p.age },
    { label: 'Sexe', value: p.sex },
  ].filter((f) => f.value);
  const establishment = report.establishment || 'Établissement non communiqué';
  const examFacts: ReportFact[] = [{ label: 'Établissement', value: establishment }, { label: 'N° d’examen', value: report.code }, ...report.people.filter((f) => f.label === 'Prescripteur'), ...report.dates].filter(
    (f) => f.value
  );
  const outOfRange = report.measures.filter(isOutOfRange).length;

  const measures = report.measures.length
    ? `<section class="block">
        <h2>${esc(report.measuresTitle)}</h2>
        ${report.measuresFromReport ? '<p class="note">Valeurs reprises du compte rendu validé ; les valeurs de référence ne sont pas communiquées pour cet examen.</p>' : ''}
        <table class="results">
          <thead><tr><th>Paramètre</th><th class="num">Résultat</th><th>Unité</th><th>Valeurs de référence</th><th>Interprétation</th></tr></thead>
          <tbody>
            ${report.measures
              .map((m) => {
                const out = isOutOfRange(m);
                return `<tr class="${out ? 'out' : ''}">
                  <td>${esc(m.name)}${m.remarks ? `<div class="remark">${esc(m.remarks)}</div>` : ''}</td>
                  <td class="num value">${esc(m.value)}${out ? ` <span class="sym">${FLAG_SYMBOLS[m.flag]}</span>` : ''}</td>
                  <td>${esc(m.unit)}</td>
                  <td>${esc(m.range)}</td>
                  <td>${out ? `<strong>${FLAG_LABELS[m.flag]}</strong>` : m.flag === 'normal' ? 'Normal' : ''}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
        <p class="legend">${
          outOfRange
            ? `${outOfRange} valeur${outOfRange > 1 ? 's' : ''} en dehors des valeurs de référence (en gras). ↑ élevé · ↓ bas · ! signalé par l’établissement.`
            : 'Valeurs à comparer aux valeurs de référence indiquées.'
        }</p>
      </section>`
    : '';

  const studies = report.studies.length
    ? `<section class="block"><h2>Images de l'examen</h2><ul class="studies">${report.studies
        .map(
          (s) =>
            `<li><strong>${esc(s.description)}</strong>${[s.date ? formatDate(s.date) : '', s.institution, s.physician]
              .filter(Boolean)
              .map((v) => ` · ${esc(v)}`)
              .join('')}</li>`
        )
        .join('')}</ul></section>`
    : '';

  const sections = report.sections.map((s) => `<section class="block"><h2>${esc(s.title)}</h2><p class="text">${esc(s.text)}</p></section>`).join('');
  const validation = report.validatedBy || report.validatedAt
    ? `Compte rendu validé${report.validatedBy ? ` par <strong>${esc(report.validatedBy)}</strong>` : ''}${report.validatedAt ? ` le ${esc(formatDate(report.validatedAt))}` : ''}.`
    : '';
  // Le validateur est déjà nommé dans la phrase de validation.
  const others = report.people.filter((f) => f.label !== 'Prescripteur' && f.value !== report.validatedBy);

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${esc(`${report.documentTitle} — ${report.code}${p.name ? ` — ${p.name}` : ''}`)}</title>
<style>
  @page { size: A4; margin: 12mm 13mm 13mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 10pt; line-height: 1.38; color: #1f2937; }
  .top { display: flex; justify-content: space-between; align-items: center; gap: 12mm; padding-bottom: 4mm; border-bottom: 2px solid #0c4562; }
  .brand { display: flex; align-items: center; gap: 3mm; }
  .brand img { height: 10mm; width: auto; }
  .establishment { text-align: right; }
  .establishment strong { display: block; font-size: 12pt; color: #0c4562; }
  .establishment span { display: block; color: #4b5563; font-size: 9pt; }
  .establishment .label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; }
  h1 { margin: 4mm 0 0.5mm; font-size: 15pt; color: #0c4562; }
  .exam { margin: 0 0 3.5mm; font-size: 11pt; }
  .exam span { color: #4b5563; }
  .ids { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 3.5mm; }
  .card { border: 1px solid #c5d7e2; border-radius: 2mm; padding: 2.5mm 3.5mm; break-inside: avoid; }
  .card h2 { margin: 0 0 2mm; font-size: 9pt; text-transform: uppercase; letter-spacing: .04em; color: #0c4562; }
  .facts { width: 100%; border-collapse: collapse; }
  .facts th { text-align: left; font-weight: 600; color: #4b5563; padding: .4mm 3mm .4mm 0; width: 46%; vertical-align: top; white-space: nowrap; }
  .facts td { padding: .4mm 0; }
  .conclusion { border-left: 4px solid #047857; background: #ecfdf5; padding: 2.5mm 4mm; margin-bottom: 4mm; break-inside: avoid; }
  .conclusion h2 { margin: 0 0 1mm; font-size: 10pt; color: #065f46; text-transform: uppercase; letter-spacing: .04em; }
  .conclusion p { margin: 0; font-weight: 600; white-space: pre-line; }
  .block { margin-bottom: 3.5mm; }
  .block > h2 { margin: 0 0 2mm; font-size: 11pt; color: #0c4562; border-bottom: 1px solid #e5e7eb; padding-bottom: 1mm; }
  .text { margin: 0; white-space: pre-line; }
  .results { width: 100%; border-collapse: collapse; }
  .results thead { display: table-header-group; }
  .results th { background: #e5eef3; color: #0c4562; text-align: left; font-size: 8.5pt; padding: 1.2mm 2mm; }
  .results td { padding: 1.2mm 2mm; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  .results tr { break-inside: avoid; }
  .results .num { text-align: right; white-space: nowrap; }
  .results .value { font-weight: 600; }
  .results tr.out td { font-weight: 700; background: #fdf2f2; }
  .results .sym { color: #b91c1c; }
  .remark { font-weight: 400; font-size: 8.5pt; color: #4b5563; }
  .legend, .note { font-size: 8.5pt; color: #4b5563; margin: 1.5mm 0 0; }
  .note { margin: 0 0 2mm; }
  .studies { margin: 0; padding-left: 5mm; }
  .validation { margin-top: 4mm; padding-top: 2.5mm; border-top: 1px solid #c5d7e2; break-inside: avoid; }
  .validation p { margin: 0 0 1mm; }
  .notice { margin-top: 3mm; font-size: 8.5pt; color: #4b5563; border: 1px dashed #c5d7e2; padding: 2mm 3mm; border-radius: 2mm; }
  footer { margin-top: 4mm; font-size: 8pt; color: #6b7280; display: flex; justify-content: space-between; gap: 6mm; }
</style>
</head>
<body>
  <header class="top">
    <div class="brand"><img src="${esc(origin)}/rohafya-emblem.png" alt="ROHAFYA"></div>
    <div class="establishment">
      <span class="label">Établissement</span>
      <strong>${esc(establishment)}</strong>
      <span>${esc(report.discipline)}</span>
    </div>
  </header>

  <h1>${esc(report.documentTitle)}</h1>
  <p class="exam"><strong>${esc(report.title)}</strong>${report.code ? ` <span>· N° ${esc(report.code)}</span>` : ''}</p>

  <div class="ids">
    <section class="card"><h2>Patient</h2><table class="facts">${factRows(patientFacts)}</table></section>
    <section class="card"><h2>Examen</h2><table class="facts">${factRows(examFacts)}</table></section>
  </div>

  ${report.conclusion ? `<section class="conclusion"><h2>${esc(report.conclusion.title)}</h2><p>${esc(report.conclusion.text)}</p></section>` : ''}
  ${measures}
  ${studies}
  ${sections}

  <section class="validation">
    ${validation ? `<p>${validation}</p>` : ''}
    ${others.length ? `<p>${others.map((f) => `${esc(f.label)} : ${esc(f.value)}`).join(' · ')}</p>` : ''}
  </section>

  ${audience === 'patient' ? `<p class="notice">${PATIENT_NOTICE}</p>` : ''}

  <footer>
    <span>Édité le ${esc(formatDate(editedAt.toISOString()))} depuis ROHAFYA, à partir du compte rendu validé par ${esc(report.establishment || "l'établissement")}.</span>
    <span>${esc(report.code)}</span>
  </footer>
</body>
</html>`;
}

/**
 * Imprime le compte rendu (ou l'enregistre en PDF depuis la boîte d'impression) sans quitter la page :
 * le document est chargé dans une iframe invisible, retirée après l'impression.
 */
export function printReport(report: MedicalReport, audience: ReportAudience): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('tabindex', '-1');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.srcdoc = reportDocument(report, audience, window.location.origin);
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return frame.remove();
    win.addEventListener('afterprint', () => frame.remove(), { once: true });
    win.focus();
    win.print();
    // Filet de sécurité si « afterprint » n'est pas émis par le navigateur.
    setTimeout(() => frame.isConnected && frame.remove(), 60_000);
  };
  document.body.appendChild(frame);
}

export { PATIENT_NOTICE };
