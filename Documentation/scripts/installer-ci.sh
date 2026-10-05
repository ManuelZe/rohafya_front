#!/usr/bin/env bash
# =============================================================================
#  Installe les workflows GitHub Actions d'EDEN.
#  GitHub n'exécute que les fichiers placés dans .github/workflows/ : ce script y copie
#  les modèles maintenus dans Documentation/ci/github-actions/ (source de vérité).
#  Usage : bash Documentation/scripts/installer-ci.sh   puis commit + push.
# =============================================================================
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib-commun.sh"
cd "$EDEN_ROOT"

etape "Copie des workflows"
mkdir -p .github/workflows
for f in Documentation/ci/github-actions/*.yml; do
  cp "$f" ".github/workflows/$(basename "$f")"
  ok ".github/workflows/$(basename "$f")"
done

etape "Étapes suivantes"
info "git add .github/workflows && git commit -m \"ci: ajouter les workflows CI et release\" && git push"
info "Puis configurer le dépôt GitHub : voir 01_VERSIONNAGE_GIT.txt (section 10)"
info "et 02_DEPLOIEMENT_HETZNER_PORTAINER.txt (étape 9)."
