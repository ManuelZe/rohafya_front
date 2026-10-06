/** Images générées pour la démonstration : aucun fichier binaire à maintenir. */

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function svg(content: string, width = 600, height = 400): Blob {
  return new Blob(
    [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`],
    { type: 'image/svg+xml' }
  );
}

/** Document scanné fictif (ordonnance, pièce jointe d'un pré-enregistrement). */
export function documentImage(title: string, subtitle: string): Blob {
  const lines = [0, 1, 2, 3, 4, 5].map((i) => `<rect x="60" y="${170 + i * 30}" width="${i % 2 ? 380 : 480}" height="10" rx="5" fill="#cbd5e1"/>`).join('');
  return svg(
    `<rect width="600" height="400" fill="#f8fafc"/>
     <rect x="30" y="20" width="540" height="360" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
     <text x="60" y="80" font-family="sans-serif" font-size="28" font-weight="700" fill="#0c4562">${escapeXml(title)}</text>
     <text x="60" y="115" font-family="sans-serif" font-size="16" fill="#475569">${escapeXml(subtitle)}</text>
     <text x="60" y="140" font-family="sans-serif" font-size="13" fill="#94a3b8">Document fictif — mode démonstration ROHAFYA</text>
     ${lines}`
  );
}

export function signatureImage(): Blob {
  return svg(
    `<rect width="400" height="160" fill="#ffffff"/>
     <path d="M30 110 C 70 40, 110 140, 150 80 S 230 50, 260 100 S 330 120, 370 60" fill="none" stroke="#0c4562" stroke-width="4" stroke-linecap="round"/>
     <text x="30" y="148" font-family="sans-serif" font-size="12" fill="#94a3b8">Signature fictive (démo)</text>`,
    400,
    160
  );
}

const ARTICLE_COLORS = ['#0c4562', '#047857', '#b45309'];

export function articleImage(title: string, index: number): Blob {
  const color = ARTICLE_COLORS[index % ARTICLE_COLORS.length];
  return svg(
    `<rect width="600" height="400" fill="${color}"/>
     <circle cx="500" cy="80" r="140" fill="#ffffff" opacity="0.12"/>
     <circle cx="80" cy="360" r="110" fill="#ffffff" opacity="0.10"/>
     <text x="40" y="200" font-family="sans-serif" font-size="26" font-weight="700" fill="#ffffff">${escapeXml(title)}</text>
     <text x="40" y="240" font-family="sans-serif" font-size="16" fill="#ffffff" opacity="0.85">ROHAFYA · Actualité de démonstration</text>`
  );
}
