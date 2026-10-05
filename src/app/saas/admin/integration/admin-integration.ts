import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { environment } from '../../../../environments/environment';
import { extractErrorMessage } from '../../../doctors/shared/api-resource';
import { PageHeader } from '../../../patients/shared/page-header/page-header';
import { SaasAccountService } from '../../saas-account.service';
import { PDF_IMPORT_ENABLED } from '../../features';
import { SOURCE_LABELS } from '../../saas.models';
import { TenantAdminService } from '../../tenant-admin.service';
import { TenantContext } from '../tenant-context.service';

type Method = 'api' | 'fhir' | 'pdf';

/** Exemples d'envoi : même format que les données de la démo (src/app/demo/data/patient.json). */
const EDEN_EXAMPLES = (base: string) => `# 1. Le patient (dossier local de l'établissement)
curl -X POST ${base}ingest/v1/patients \\
  -H "X-EDEN-API-Key: VOTRE_CLE" -H "Content-Type: application/json" \\
  -d '[{"local_ref": "P-88-17", "first_name": "Aïcha", "last_name": "Ngono",
        "email": "aicha@exemple.com", "birth_date": "1988-04-12", "gender": "F"}]'

# 2. Un résultat de laboratoire (champs identiques à la démo) et ses valeurs
curl -X POST ${base}ingest/v1/laboratoire \\
  -H "X-EDEN-API-Key: VOTRE_CLE" -H "Content-Type: application/json" \\
  -d '[{"local_ref": "P-88-17", "name": "LAB-0412", "test": "Numération Formule Sanguine",
        "validation_date": "2026-09-27T09:00:00", "requestor": "Dr Paul Ekané",
        "validated_by": "Dr Martin Owona", "diagnosis": "Anémie légère",
        "details": [{"name": "Hémoglobine", "result": 11.4, "units": "g/dl",
                     "normal_range": "12 – 16", "warning": true}]}]'

# 3. Une facture et ses lignes
curl -X POST ${base}ingest/v1/factures \\
  -H "X-EDEN-API-Key: VOTRE_CLE" -H "Content-Type: application/json" \\
  -d '[{"local_ref": "P-88-17", "reference": "FAC-2026-0105", "date": "2026-09-27",
        "state": "posted", "total_amount2": 42500, "untaxed_amount": 42500,
        "amount_to_pay_today": 12750, "montant_patient": 12750, "montant_assurance": "29750",
        "products": [{"product_name": "NFS", "quantity": "1"}]}]'

# 4. Le QR code à imprimer sur la facture (url + code court ; ?qr=1 ajoute l'image PNG)
curl -X POST "${base}ingest/v1/link-tokens?qr=1" \\
  -H "X-EDEN-API-Key: VOTRE_CLE" -H "Content-Type: application/json" \\
  -d '{"local_ref": "P-88-17"}'

# Autres types : imagerie (clé « number »), exploration (clé « name »).
# Retirer un envoi erroné : DELETE ${base}ingest/v1/laboratoire/LAB-0412`;

const PDF_EXAMPLE = (base: string) => `curl -X POST ${base}ingest/v1/pdf \\
  -H "X-EDEN-API-Key: VOTRE_CLE" \\
  -F "file=@compte-rendu.pdf" -F "local_ref=P-88-17"`;

const FHIR_EXAMPLE = (base: string) => `curl -X POST ${base}fhir/r4 \\
  -H "X-EDEN-API-Key: VOTRE_CLE" -H "Content-Type: application/fhir+json" \\
  -d '{
  "resourceType": "Bundle", "type": "transaction",
  "entry": [
    {"fullUrl": "urn:uuid:p1", "resource": {"resourceType": "Patient",
      "identifier": [{"value": "P-88-17"}], "name": [{"family": "Ngono", "given": ["Aïcha"]}],
      "telecom": [{"system": "email", "value": "aicha@exemple.com"}], "birthDate": "1988-04-12"}},
    {"fullUrl": "urn:uuid:o1", "resource": {"resourceType": "Observation",
      "code": {"text": "Hémoglobine"}, "valueQuantity": {"value": 11.4, "unit": "g/dl"},
      "interpretation": [{"coding": [{"code": "L"}]}],
      "referenceRange": [{"low": {"value": 12}, "high": {"value": 16}}]}},
    {"resource": {"resourceType": "DiagnosticReport", "identifier": [{"value": "LAB-0412"}],
      "status": "final", "category": [{"coding": [{"code": "LAB"}]}],
      "code": {"text": "Numération Formule Sanguine"}, "subject": {"reference": "urn:uuid:p1"},
      "issued": "2026-09-27T09:00:00Z", "result": [{"reference": "urn:uuid:o1"}],
      "conclusion": "Anémie légère"}},
    {"resource": {"resourceType": "Invoice", "identifier": [{"value": "FAC-2026-0105"}],
      "status": "issued", "subject": {"reference": "urn:uuid:p1"}, "date": "2026-09-27",
      "totalGross": {"value": 42500, "currency": "XAF"},
      "lineItem": [{"chargeItemCodeableConcept": {"text": "NFS"}}]}}
  ]}'

# Catégorie du DiagnosticReport : LAB → laboratoire, RAD / IMG → imagerie, autre → exploration.
# Invoice.status : issued → à régler, balanced → payée, cancelled → annulée.`;

@Component({
  selector: 'app-admin-integration',
  imports: [PIcon, PageHeader, RouterLink],
  templateUrl: './admin-integration.html',
  styleUrls: ['../../../doctors/shared/doctor-ui.css', '../../shared/console-ui.css'],
})
export class AdminIntegration {
  private readonly service = inject(TenantAdminService);
  private readonly account = inject(SaasAccountService);
  readonly context = inject(TenantContext);

  readonly apiBase = environment.apiUrl;
  /** Faux : méthode PDF grisée (fonctionnalité disponible prochainement). */
  readonly pdfEnabled = PDF_IMPORT_ENABLED;
  /** Onglet ouvert par défaut : la méthode prévue pour l'établissement. */
  readonly method = linkedSignal<Method>(() => {
    const source = this.context.tenant()?.source_type;
    return source === 'fhir' || source === 'pdf' ? source : 'api';
  });
  readonly edenExample = EDEN_EXAMPLES(environment.apiUrl);
  readonly fhirExample = FHIR_EXAMPLE(environment.apiUrl);
  readonly pdfExample = PDF_EXAMPLE(environment.apiUrl);

  readonly sourceLabel = computed(() => {
    const source = this.context.tenant()?.source_type;
    if (source === 'pdf' && !this.pdfEnabled) return `${SOURCE_LABELS.pdf} (disponible prochainement)`;
    return source ? SOURCE_LABELS[source] : '';
  });
  readonly isGnuHealth = computed(() => this.context.tenant()?.source_type === 'gnuhealth');

  readonly newKey = signal<string | null>(null);
  readonly confirmRotate = signal(false);
  readonly rotating = signal(false);
  readonly error = signal<string | null>(null);
  readonly copied = signal(false);

  rotate(): void {
    const id = this.context.tenantId();
    if (!id || this.rotating()) return;
    this.rotating.set(true);
    this.error.set(null);
    this.service.rotateApiKey(id).subscribe({
      next: (result) => {
        this.rotating.set(false);
        this.confirmRotate.set(false);
        this.newKey.set(result.api_key);
        this.copied.set(false);
        this.account.load(true).subscribe();
      },
      error: (err: unknown) => {
        this.rotating.set(false);
        this.confirmRotate.set(false);
        this.error.set(extractErrorMessage(err, "Impossible de générer une nouvelle clé."));
      },
    });
  }

  copyKey(): void {
    const key = this.newKey();
    if (!key) return;
    navigator.clipboard?.writeText(key).then(() => this.copied.set(true));
  }
}
