#!/bin/bash
# Envoie une mise à jour à distance (EAS Update) aux applications de test, sans nouvelle construction.
# Seuls les changements JavaScript (écrans, textes, couleurs) passent ainsi ; un changement natif
# (nouveau module, permissions, icône) demande toujours une construction EAS Build.
# Usage : bash scripts/publish-update.sh "Nouvelle rubrique Compte"
set -euo pipefail
cd "$(dirname "$0")/.."
MESSAGE="${1:?Indiquez un message, ex. : bash scripts/publish-update.sh \"Correction du compte\"}"
export PATH="$HOME/.local/node/bin:$PATH"
# Le .env local pointe vers le serveur de développement : on impose le serveur de test, comme les constructions.
export EXPO_PUBLIC_API_URL="https://api-test.ollisante.com"
EAS_NO_VCS=1 npx eas-cli@latest update --channel testflight --environment production --message "$MESSAGE" --non-interactive
# Contrôle : le paquet envoyé doit viser le serveur de test, jamais localhost.
if grep -rqs "localhost:8088" dist/; then
  echo "ATTENTION : le paquet contient l'adresse locale. Vérifiez EXPO_PUBLIC_API_URL." >&2
  exit 1
fi
echo "Mise à jour publiée : elle s'appliquera au deuxième lancement de l'application."
