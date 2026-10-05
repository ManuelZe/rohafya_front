#!/usr/bin/env bash
# =============================================================================
#  Vérifie qu'EDEN fonctionne réellement en production (tests de fumée).
#
#  Usage :
#    bash Documentation/scripts/verifier-deploiement.sh                 # URL de deploiement.conf
#    bash Documentation/scripts/verifier-deploiement.sh https://eden.pdmdsante.com 1.4.2
#      (2e argument facultatif : version attendue)
#
#  Contrôles : certificat HTTPS, redirection HTTP->HTTPS, /healthz et version,
#  configuration d'exécution (/env.js), pages principales, en-têtes de sécurité,
#  accès à l'API Flask depuis le navigateur (contenu mixte, CORS).
#  Code retour : 0 si tout est bon, 1 sinon (utilisable en CI).
# =============================================================================
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib-commun.sh"
charger_configuration
exiger_commandes curl jq

URL="${1:-${EDEN_PUBLIC_URL:-}}"
URL="${URL%/}"
VERSION_ATTENDUE="${2:-}"
[[ -n "$URL" ]] || erreur "Précisez l'URL publique (argument ou EDEN_PUBLIC_URL dans deploiement.conf)."

echecs=0
echec() { printf '%s    ✖ %s%s\n' "${C_ROUGE}" "$*" "${C_RESET}" >&2; echecs=$((echecs + 1)); }

etape "1. HTTPS"
if [[ "$URL" == https://* ]]; then
  if curl -sS -o /dev/null --max-time 15 "$URL/healthz"; then ok "Certificat TLS valide"; else echec "Certificat TLS invalide ou site injoignable"; fi
  hote="${URL#https://}"
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "http://${hote}/")"
  [[ "$code" =~ ^30[1278]$ ]] && ok "http:// redirige vers https:// (${code})" || echec "Pas de redirection HTTP -> HTTPS (code ${code}) : activer « Force SSL » dans Nginx Proxy Manager"
else
  alerte "URL en HTTP : acceptable uniquement pour un test"
fi

etape "2. Santé et version"
sante="$(curl -fsS --max-time 10 "$URL/healthz" 2>/dev/null || true)"
if [[ "$(jq -r '.status' <<<"$sante" 2>/dev/null)" == "ok" ]]; then
  version="$(jq -r '.version' <<<"$sante")"
  ok "/healthz : ok — version ${version}, démarré le $(jq -r '.startedAt' <<<"$sante")"
  if [[ -n "$VERSION_ATTENDUE" && "$version" != "${VERSION_ATTENDUE#v}" ]]; then
    echec "Version déployée ${version} ≠ version attendue ${VERSION_ATTENDUE#v}"
  fi
else
  echec "/healthz ne répond pas correctement : ${sante:-aucune réponse}"
fi

etape "3. Configuration d'exécution (/env.js)"
envjs="$(curl -fsS --max-time 10 "$URL/env.js" 2>/dev/null || true)"
api_url="$(sed -n 's/.*"apiUrl":"\([^"]*\)".*/\1/p' <<<"$envjs")"
if [[ -n "$api_url" ]]; then
  ok "API configurée : ${api_url}"
  if [[ "$URL" == https://* && "$api_url" != https://* ]]; then
    echec "CONTENU MIXTE : EDEN est en HTTPS mais l'API est en HTTP (${api_url}) — le navigateur bloquera tous les appels."
  fi
else
  echec "/env.js ne contient pas d'apiUrl (variable API_URL absente de la stack ?) : ${envjs:-vide}"
fi

etape "4. Pages principales"
for page in /intro /connexion /patients /doctors; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$URL$page")"
  [[ "$code" == "200" ]] && ok "${page} -> 200" || echec "${page} -> ${code}"
done

etape "5. En-têtes de sécurité"
entetes="$(curl -sSI --max-time 10 "$URL/intro" 2>/dev/null)"
for h in X-Content-Type-Options X-Frame-Options Referrer-Policy; do
  grep -qi "^${h}:" <<<"$entetes" && ok "$h présent" || echec "$h absent"
done
grep -qi '^Strict-Transport-Security:' <<<"$entetes" && ok "HSTS présent" || alerte "HSTS absent : activer « HSTS Enabled » dans Nginx Proxy Manager (onglet SSL)"
grep -qi '^X-Powered-By:' <<<"$entetes" && echec "X-Powered-By exposé" || ok "X-Powered-By masqué"

if [[ -n "$api_url" ]]; then
  etape "6. Accès à l'API Flask depuis le navigateur"
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${api_url%/}/hello")"
  [[ "$code" == "200" ]] && ok "API joignable (${api_url%/}/hello -> 200)" || echec "API injoignable (${api_url%/}/hello -> ${code})"

  cors="$(curl -sS -o /dev/null -D - --max-time 15 -X OPTIONS \
    -H "Origin: ${URL}" -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: content-type,authorization' \
    "${api_url%/}/user/login" 2>/dev/null | tr -d '\r')"
  origine="$(sed -n 's/^[Aa]ccess-[Cc]ontrol-[Aa]llow-[Oo]rigin: //p' <<<"$cors")"
  if [[ "$origine" == "$URL" || "$origine" == "*" ]]; then
    ok "CORS : l'API accepte l'origine ${URL}"
  else
    echec "CORS : l'API n'autorise pas ${URL} (reçu : « ${origine:-aucun} »). Ajouter ce domaine dans CORS(origins=[...]) de DoctorAPI/__init__.py"
  fi
fi

etape "Bilan"
if (( echecs == 0 )); then
  ok "Tous les contrôles sont passés"
  exit 0
fi
printf '%s    %d contrôle(s) en échec%s\n' "${C_ROUGE}" "$echecs" "${C_RESET}"
exit 1
