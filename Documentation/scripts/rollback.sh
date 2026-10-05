#!/usr/bin/env bash
# =============================================================================
#  Retour arrière (rollback) d'EDEN vers une version précédente.
#
#  Usage :
#    bash Documentation/scripts/rollback.sh            # revient à la version précédant celle déployée
#    bash Documentation/scripts/rollback.sh 1.3.0      # revient à une version précise
#
#  Principe : aucune reconstruction. L'image de chaque version publiée reste disponible
#  sur le registre ; il suffit de redéployer l'ancienne étiquette (quelques secondes).
#  La version précédente est déduite des tags Git (git tag --sort=version:refname).
# =============================================================================
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib-commun.sh"
charger_configuration
exiger_commandes git curl jq

cible="${1:-}"

if [[ -z "$cible" ]]; then
  etape "Recherche de la version précédente"
  statut="$(OUI=1 bash "${EDEN_SCRIPTS_DIR}/deployer-portainer.sh" --statut)"
  actuelle="$(sed -n 's/.*Version actuellement configurée : \([^ ]*\).*/\1/p' <<<"$statut" | sed 's/\x1b\[[0-9;]*m//g')"
  est_semver "$actuelle" || erreur "Version actuelle introuvable dans Portainer : précisez la version cible."
  git -C "$EDEN_ROOT" fetch --quiet --tags origin 2>/dev/null || true
  cible="$(git -C "$EDEN_ROOT" tag --list 'v[0-9]*' --sort=version:refname \
    | sed 's/^v//' | grep -vE -- '-' \
    | awk -v a="$actuelle" '$0 == a { print prev; exit } { prev = $0 }')"
  [[ -n "$cible" ]] || erreur "Aucune version antérieure à ${actuelle} trouvée dans les tags Git."
  info "Version déployée : ${actuelle}  ->  retour à : ${C_GRAS}${cible}${C_RESET}"
fi

cible="${cible#v}"
est_semver "$cible" || erreur "Version invalide : ${cible}"

alerte "ROLLBACK vers ${cible}. Pensez à ouvrir un ticket expliquant l'incident."
bash "${EDEN_SCRIPTS_DIR}/deployer-portainer.sh" "$cible"
