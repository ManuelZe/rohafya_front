#!/usr/bin/env bash
# =============================================================================
#  Installe les outils Git de l'équipe dans le clone local (à lancer une fois par poste).
#   - hook commit-msg (Conventional Commits) versionné dans Documentation/git/hooks
#   - modèle de message de commit
#   - réglages recommandés (tags suivis au push, rebase au pull)
#  Usage : bash Documentation/scripts/installer-outils-git.sh
# =============================================================================
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib-commun.sh"

exiger_commandes git
cd "$EDEN_ROOT"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || erreur "Ce dossier n'est pas un dépôt Git."

etape "Hooks Git versionnés"
chmod +x Documentation/git/hooks/*
git config core.hooksPath Documentation/git/hooks
ok "core.hooksPath = Documentation/git/hooks"

etape "Modèle de message de commit"
git config commit.template Documentation/git/gitmessage.txt
ok "commit.template = Documentation/git/gitmessage.txt"

etape "Réglages recommandés"
git config pull.rebase true          # historique linéaire, pas de commits de fusion parasites
git config fetch.prune true          # nettoie les branches distantes supprimées
git config push.followTags true      # pousse les tags annotés avec les commits
git config tag.sort version:refname  # « git tag » trié par numéro de version
ok "pull.rebase, fetch.prune, push.followTags, tag.sort configurés"

etape "Identité"
if [[ -z "$(git config user.name || true)" || -z "$(git config user.email || true)" ]]; then
  alerte "Identité Git absente. Exécutez :"
  info 'git config --global user.name  "Prénom Nom"'
  info 'git config --global user.email "prenom.nom@pdmdsante.com"'
else
  ok "$(git config user.name) <$(git config user.email)>"
fi

etape "Terminé"
info "Testez : git commit --allow-empty -m \"test\"   (doit être refusé)"
