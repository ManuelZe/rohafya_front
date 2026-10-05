export type StatusKind =
  | 'facture'
  | 'requete'
  | 'devis'
  | 'validation'
  | 'examType'
  | 'expiration'
  | 'account'
  | 'commission'
  | 'commissionKind';
export type StatusSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

const FACTURE_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  open: 'Ouverte',
  posted: 'Validée',
  paid: 'Payée',
  partial: 'Partiellement payée',
  cancel: 'Annulée',
};

const FACTURE_SEVERITIES: Record<string, StatusSeverity> = {
  draft: 'secondary',
  open: 'info',
  posted: 'info',
  paid: 'success',
  partial: 'warn',
  cancel: 'danger',
};

const REQUETE_LABELS: Record<string, string> = {
  true: 'Validé',
  false: 'En attente',
};

const REQUETE_SEVERITIES: Record<string, StatusSeverity> = {
  true: 'success',
  false: 'secondary',
};

const DEVIS_LABELS: Record<string, string> = {
  true: 'Devis demandé',
  false: '',
};

const DEVIS_SEVERITIES: Record<string, StatusSeverity> = {
  true: 'info',
  false: 'secondary',
};

const VALIDATION_LABELS: Record<string, string> = {
  true: 'Validé',
  false: 'En attente de validation',
};

const VALIDATION_SEVERITIES: Record<string, StatusSeverity> = {
  true: 'success',
  false: 'warn',
};

const EXAM_TYPE_LABELS: Record<string, string> = {
  Laboratoire: 'Laboratoire',
  Imagerie: 'Imagerie',
  Exploration: 'Exploration Fonctionnelle',
};

const EXAM_TYPE_SEVERITIES: Record<string, StatusSeverity> = {
  Laboratoire: 'warn',
  Imagerie: 'info',
  Exploration: 'success',
};

const EXPIRATION_LABELS: Record<string, string> = {
  true: 'Expiré',
  false: 'Disponible',
};

const EXPIRATION_SEVERITIES: Record<string, StatusSeverity> = {
  true: 'danger',
  false: 'success',
};

const ACCOUNT_LABELS: Record<string, string> = {
  true: 'Compte confirmé',
  false: 'Compte non confirmé',
};

const ACCOUNT_SEVERITIES: Record<string, StatusSeverity> = {
  true: 'success',
  false: 'warn',
};

/** invoice_state d'une commission Tryton ('' = pas encore facturée). */
const COMMISSION_LABELS: Record<string, string> = {
  '': 'En attente',
  invoiced: 'Facturée',
  pending: 'Facturée',
  paid: 'Payée',
  cancelled: 'Annulée',
};

const COMMISSION_SEVERITIES: Record<string, StatusSeverity> = {
  '': 'warn',
  invoiced: 'success',
  pending: 'info',
  paid: 'success',
  cancelled: 'danger',
};

const COMMISSION_KIND_LABELS: Record<string, string> = {
  prescription: 'Prescription',
  realisation: 'Réalisation',
};

const COMMISSION_KIND_SEVERITIES: Record<string, StatusSeverity> = {
  prescription: 'info',
  realisation: 'secondary',
};

function tableFor(kind: StatusKind): { labels: Record<string, string>; severities: Record<string, StatusSeverity> } {
  switch (kind) {
    case 'facture':
      return { labels: FACTURE_LABELS, severities: FACTURE_SEVERITIES };
    case 'requete':
      return { labels: REQUETE_LABELS, severities: REQUETE_SEVERITIES };
    case 'devis':
      return { labels: DEVIS_LABELS, severities: DEVIS_SEVERITIES };
    case 'validation':
      return { labels: VALIDATION_LABELS, severities: VALIDATION_SEVERITIES };
    case 'examType':
      return { labels: EXAM_TYPE_LABELS, severities: EXAM_TYPE_SEVERITIES };
    case 'expiration':
      return { labels: EXPIRATION_LABELS, severities: EXPIRATION_SEVERITIES };
    case 'account':
      return { labels: ACCOUNT_LABELS, severities: ACCOUNT_SEVERITIES };
    case 'commission':
      return { labels: COMMISSION_LABELS, severities: COMMISSION_SEVERITIES };
    case 'commissionKind':
      return { labels: COMMISSION_KIND_LABELS, severities: COMMISSION_KIND_SEVERITIES };
  }
}

export function getStatusLabel(kind: StatusKind, status: string): string {
  const { labels } = tableFor(kind);
  return labels[status] ?? status;
}

export function getStatusSeverity(kind: StatusKind, status: string): StatusSeverity {
  const { severities } = tableFor(kind);
  return severities[status] ?? 'secondary';
}
