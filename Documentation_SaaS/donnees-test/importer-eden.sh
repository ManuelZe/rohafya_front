#!/usr/bin/env bash
# Envoie le jeu de test au format EDEN (dossier import-eden/) à l'API.
#
#   export EDEN_API_URL=https://api-preprod.exemple.com    # adresse de l'API EDEN
#   export EDEN_API_KEY=eden_xxxxxxxx                      # clé de l'établissement de test
#   ./importer-eden.sh
set -euo pipefail

: "${EDEN_API_URL:?Définissez EDEN_API_URL (adresse publique de votre API EDEN)}"
: "${EDEN_API_KEY:?Définissez EDEN_API_KEY (clé API de votre établissement de test)}"

API="${EDEN_API_URL%/}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/import-eden"

# appel MÉTHODE CHEMIN [FICHIER_JSON | JSON_EN_LIGNE]
appel() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -X "$method" "$API$path" -H "X-EDEN-API-Key: $EDEN_API_KEY" -w '\n   -> HTTP %{http_code}\n')
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
