import type { TDocumentDefinitions } from 'pdfmake/interfaces';

/** pdfmake et ses polices, chargés à la demande (ils pèsent plusieurs centaines de Ko). */
async function loadPdfMake() {
  const [pdfModule, vfsModule] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]);
  // Construction UMD : selon l'empaquetage, l'API est exposée directement ou sous `default`.
  const pdfMake = (pdfModule as unknown as { default?: typeof pdfModule }).default ?? pdfModule;
  const fonts = (vfsModule as unknown as { default?: Record<string, string> }).default ?? (vfsModule as unknown as Record<string, string>);
  pdfMake.addVirtualFileSystem(fonts);
  return pdfMake;
}

/** Emblème ROHAFYA en data URL (en-tête des documents), ou null s'il est introuvable. */
export async function logoDataUrl(): Promise<string | null> {
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

export async function pdfBlob(definition: TDocumentDefinitions): Promise<Blob> {
  return (await loadPdfMake()).createPdf(definition).getBlob();
}

/**
 * Téléchargement direct (ordinateur). Sur téléphone, préparer le fichier avec pdfBlob puis le
 * proposer par un vrai lien : un téléchargement lancé après la génération, une fois le geste de
 * l'utilisateur expiré, est ignoré sans message par Safari, Chrome sur iPhone et plusieurs navigateurs Android.
 */
export async function downloadPdf(definition: TDocumentDefinitions, fileName: string): Promise<void> {
  await (await loadPdfMake()).createPdf(definition).download(fileName);
}

/** Écran tactile (téléphone, tablette). */
export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
}
