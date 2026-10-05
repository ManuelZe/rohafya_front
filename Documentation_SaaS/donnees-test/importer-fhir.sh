#!/usr/bin/env bash
# Envoie le jeu de test HL7 FHIR R4 (dossier import-fhir/) à l'API.
#
#   export ROHAFYA_API_URL=https://api-preprod.exemple.com    # adresse de l'API ROHAFYA
#   export ROHAFYA_API_KEY=rohafya_xxxxxxxx                      # clé de l'établissement de test
#   ./importer-fhir.sh
set -euo pipefail

: "${ROHAFYA_API_URL:?Définissez ROHAFYA_API_URL (adresse publique de votre API ROHAFYA)}"
: "${ROHAFYA_API_KEY:?Définissez ROHAFYA_API_KEY (clé API de votre établissement de test)}"

API="${ROHAFYA_API_URL%/}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/import-fhir"

envoi() {
  curl -sS -X POST "$API$1" \
    -H "X-ROHAFYA-API-Key: $ROHAFYA_API_KEY" \
    -H "Content-Type: application/fhir+json" \
    --data-binary "@$2" \
    -w '\n   -> HTTP %{http_code}\n'
}

echo "== Ressources prises en charge"
curl -sS "$API/fhir/r4/metadata" -w '\n   -> HTTP %{http_code}\n'

echo "== Bundle complet (2 patients, laboratoire, imagerie, exploration, 2 factures)"
envoi /fhir/r4 "$DIR/01_bundle_complet.json"

echo "== Ressource Patient seule"
envoi /fhir/r4/Patient "$DIR/02_patient_seul.json"
