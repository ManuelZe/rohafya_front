#!/usr/bin/env bash
# Envoie le jeu de test au format ROHAFYA (dossier import-rohafya/) à l'API.
#
#   export ROHAFYA_API_URL=https://api-preprod.exemple.com    # adresse de l'API ROHAFYA
#   export ROHAFYA_API_KEY=rohafya_xxxxxxxx                      # clé de l'établissement de test
#   ./importer-rohafya.sh
set -euo pipefail

: "${ROHAFYA_API_URL:?Définissez ROHAFYA_API_URL (adresse publique de votre API ROHAFYA)}"
: "${ROHAFYA_API_KEY:?Définissez ROHAFYA_API_KEY (clé API de votre établissement de test)}"

API="${ROHAFYA_API_URL%/}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/import-rohafya"

# appel MÉTHODE CHEMIN [FICHIER_JSON | JSON_EN_LIGNE]
appel() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -X "$method" "$API$path" -H "X-ROHAFYA-API-Key: $ROHAFYA_API_KEY" -w '\n   -> HTTP %{http_code}\n')
  if [[ -n "$body" && -f "$body" ]]; then
    args+=(-H "Content-Type: application/json" --data-binary "@$body")
  elif [[ -n "$body" ]]; then
    args+=(-H "Content-Type: application/json" --data "$body")
  fi
  curl "${args[@]}"
}

echo "== Vérification de la clé"
appel GET /ingest/v1/ping

for etape in patients:01_patients laboratoire:02_laboratoire imagerie:03_imagerie \
             exploration:04_exploration factures:05_factures; do
  type="${etape%%:*}"
  fichier="$DIR/${etape#*:}.json"
  echo "== Envoi : $type ($(basename "$fichier"))"
  appel POST "/ingest/v1/$type" "$fichier"
done

echo "== QR code de rattachement pour le dossier CLB-0001 (URL + code court)"
appel POST /ingest/v1/link-tokens '{"local_ref": "CLB-0001"}'
