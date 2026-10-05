#!/usr/bin/env bash
# =============================================================================
#  Déploie une version d'EDEN sur le serveur Hetzner via l'API de Portainer CE.
#
#  Usage :
#    bash Documentation/scripts/deployer-portainer.sh 1.4.2        # déployer la version 1.4.2
#    bash Documentation/scripts/deployer-portainer.sh --statut     # version actuellement déployée
#
#  Fonctionnement :
#    1. retrouve la stack Portainer (PORTAINER_STACK_NAME)
#    2. remplace UNIQUEMENT la variable EDEN_VERSION (le reste de la configuration est conservé)
#    3. redéploie la stack en forçant le téléchargement de l'image (« Re-pull image »)
#    4. attend que https://<domaine>/healthz annonce la nouvelle version
#    5. consigne l'opération dans historique-deploiements.log
#  Prérequis : deploiement.conf (voir deploiement.conf.example), curl, jq.
#  Le même script sert au retour arrière : rollback.sh l'appelle avec l'ancienne version.
# =============================================================================
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib-commun.sh"
charger_configuration
exiger_commandes curl jq

: "${PORTAINER_URL:?PORTAINER_URL manquant (deploiement.conf)}"
: "${PORTAINER_API_KEY:?PORTAINER_API_KEY manquant (deploiement.conf)}"
: "${PORTAINER_STACK_NAME:?PORTAINER_STACK_NAME manquant (deploiement.conf)}"
DEPLOY_TIMEOUT="${DEPLOY_TIMEOUT:-60}"
HISTORIQUE="${EDEN_SCRIPTS_DIR}/historique-deploiements.log"

CURL_OPTS=(-sS --fail-with-body --max-time 120 -H "X-API-Key: ${PORTAINER_API_KEY}")
[[ "${PORTAINER_INSECURE:-0}" == "1" ]] && CURL_OPTS+=(-k)

api() { # api METHODE CHEMIN [CORPS_JSON]
  local methode="$1" chemin="$2"
  if [[ $# -ge 3 ]]; then
    curl "${CURL_OPTS[@]}" -X "$methode" -H 'Content-Type: application/json' --data-binary @- "${PORTAINER_URL%/}/api${chemin}" <<<"$3"
  else
    curl "${CURL_OPTS[@]}" -X "$methode" "${PORTAINER_URL%/}/api${chemin}"
  fi
}

# -----------------------------------------------------------------------------
etape "1. Connexion à Portainer (${PORTAINER_URL})"
# -----------------------------------------------------------------------------
stacks="$(api GET /stacks 2>&1)" \
  || erreur "Accès à Portainer impossible (${PORTAINER_URL}) : ${stacks:-aucune réponse}. Tunnel SSH ouvert ? Jeton d'API valide ?"
stack="$(jq -c --arg n "$PORTAINER_STACK_NAME" '.[] | select(.Name == $n)' <<<"$stacks")"
[[ -n "$stack" ]] || erreur "Stack « ${PORTAINER_STACK_NAME} » introuvable. Stacks disponibles : $(jq -r '[.[].Name] | join(", ")' <<<"$stacks")"
stack_id="$(jq -r '.Id' <<<"$stack")"
endpoint_id="$(jq -r '.EndpointId' <<<"$stack")"
version_actuelle="$(jq -r '(.Env // [])[] | select(.name == "EDEN_VERSION") | .value' <<<"$stack")"
ok "Stack « ${PORTAINER_STACK_NAME} » (id ${stack_id}, environnement ${endpoint_id})"
info "Version actuellement configurée : ${C_GRAS}${version_actuelle:-inconnue}${C_RESET}"

info "Variables d'environnement de la stack : $(jq -r '(.Env // []) | map("\(.name)=\(.value)") | join(", ")' <<<"$stack")"
info "${EDEN_PUBLIC_URL:-} -- {statut} : $(curl -fsS --max-time 10 "${EDEN_PUBLIC_URL%/}/healthz" 2>/dev/null || echo 'injoignable')"
if [[ "${1:-}" == "--statut" ]]; then
  [[ -n "${EDEN_PUBLIC_URL:-}" ]] && info "Réponse publique /healthz : $(curl -fsS --max-time 10 "${EDEN_PUBLIC_URL%/}/healthz" 2>/dev/null || echo 'injoignable')"
  exit 0
fi

version="${1:-}"
[[ -n "$version" ]] || erreur "Précisez la version à déployer, ex. : deployer-portainer.sh 1.4.2"
version="${version#v}"
est_semver "$version" || erreur "Version invalide : ${version} (attendu : X.Y.Z)"

if [[ "$version" == "$version_actuelle" ]]; then
  alerte "La version ${version} est déjà configurée : la stack sera simplement redéployée."
fi

# Contrôle facultatif : la version doit correspondre à un tag Git existant.
if git -C "$EDEN_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  git -C "$EDEN_ROOT" rev-parse -q --verify "refs/tags/v${version}" >/dev/null \
    || alerte "Aucun tag Git v${version} en local (git fetch --tags ?). Vérifiez que l'image existe bien."
fi

# Le fichier de la stack reste en JSON d'un bout à l'autre : renvoyé à Portainer à l'octet près.
fichier_json="$(api GET "/stacks/${stack_id}/file")" || erreur "Impossible de lire le fichier de la stack : ${fichier_json}"
contenu_stack="$(jq -r '.StackFileContent // empty' <<<"$fichier_json")"
[[ -n "$contenu_stack" ]] || erreur "Fichier de stack vide ou illisible."
# Sans ${EDEN_VERSION} dans la ligne image:, changer la variable ne déploie rien (version écrite en dur).
grep -Eq '^[[:space:]]*image:.*\$\{EDEN_VERSION' <<<"$contenu_stack" \
  || erreur "La ligne image: de la stack n'utilise pas \${EDEN_VERSION} : $(grep -E '^[[:space:]]*image:' <<<"$contenu_stack" | xargs)
       Modifier EDEN_VERSION n'aurait aucun effet. Dans Portainer, remplacez la version écrite en dur par
       \${EDEN_VERSION} (modèle : Documentation/portainer/eden-stack.yml), puis relancez ce script."

confirmer "Déployer EDEN ${version} sur « ${PORTAINER_STACK_NAME} » (actuellement ${version_actuelle:-?}) ?"

# -----------------------------------------------------------------------------
etape "2. Préparation de la nouvelle configuration"
# -----------------------------------------------------------------------------

nouvel_env="$(jq -c --arg v "$version" '
  (.Env // []) as $env
  | if any($env[]; .name == "EDEN_VERSION")
    then [$env[] | if .name == "EDEN_VERSION" then .value = $v else . end]
    else $env + [{"name": "EDEN_VERSION", "value": $v}]
    end' <<<"$stack")"
ok "EDEN_VERSION : ${version_actuelle:-?} -> ${version} (autres variables inchangées)"

corps="$(jq -c --argjson e "$nouvel_env" \
  '{stackFileContent: .StackFileContent, env: $e, prune: false, pullImage: true}' <<<"$fichier_json")"

# -----------------------------------------------------------------------------
etape "3. Redéploiement de la stack (téléchargement de l'image ${version})"
# -----------------------------------------------------------------------------
debut=$(date +%s)
reponse="$(api PUT "/stacks/${stack_id}?endpointId=${endpoint_id}" "$corps")" \
  || erreur "Portainer a refusé la mise à jour : ${reponse:-voir les journaux de Portainer}. L'image ${version} existe-t-elle sur le registre ?"
ok "Stack mise à jour par Portainer"

# -----------------------------------------------------------------------------
etape "4. Vérification de la nouvelle version"
# -----------------------------------------------------------------------------
statut="ÉCHEC"
if [[ -n "${EDEN_PUBLIC_URL:-}" ]]; then
  limite=$((debut + DEPLOY_TIMEOUT))
  while (( $(date +%s) < limite )); do
    sante="$(curl -fsS --max-time 5 "${EDEN_PUBLIC_URL%/}/healthz" 2>/dev/null || true)"
    if [[ "$sante" == *"\"version\":\"${version}\""* ]]; then
      statut="SUCCÈS"
      break
    fi
    sleep 5
  done
  if [[ "$statut" == "SUCCÈS" ]]; then
    ok "${EDEN_PUBLIC_URL}/healthz répond : ${sante}"
  else
    alerte "La version ${version} n'est pas visible après ${DEPLOY_TIMEOUT}s (dernière réponse : ${sante:-aucune, ${EDEN_PUBLIC_URL} injoignable depuis ce poste : port publié sur 127.0.0.1 ou pare-feu ?})."
    alerte "Consultez Portainer > Containers > eden-app-* > Logs, puis envisagez : rollback.sh ${version_actuelle}"
  fi
else
  statut="NON VÉRIFIÉ"
  alerte "EDEN_PUBLIC_URL non défini : vérification publique ignorée."
fi

printf '%s | %-11s | %s -> %s | stack=%s | par=%s\n' \
  "$(date '+%Y-%m-%d %H:%M:%S')" "$statut" "${version_actuelle:-?}" "$version" \
  "$PORTAINER_STACK_NAME" "$(git -C "$EDEN_ROOT" config user.name 2>/dev/null || whoami)" >> "$HISTORIQUE"
info "Consigné dans $(basename "$HISTORIQUE")"

[[ "$statut" != "ÉCHEC" ]] || exit 2
etape "Déploiement de EDEN ${version} terminé (${statut})"
