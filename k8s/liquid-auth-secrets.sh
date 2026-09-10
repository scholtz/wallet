#!/usr/bin/env bash
# Creates the Secret used by k8s/deployment-liquid-auth-<env>.yaml for a MANUAL deploy.
# The GitHub workflow (.github/workflows/liquid-auth.yml) does the same from the
# LIQUID_AUTH_* environment secrets, so normally you don't need this script.
#
# Usage: ./liquid-auth-secrets.sh stage|stable
#
# Idempotent: does nothing if the secret already exists. Rotating SESSION_SECRET logs every
# wallet out of the service; DB_PASSWORD only applies to a fresh MongoDB volume (MongoDB keeps
# the root password it was initialised with).
set -euo pipefail

ENV_NAME="${1:-stable}"
NAMESPACE="${NAMESPACE:-awallet}"
case "$ENV_NAME" in
  stage) SECRET_NAME=liquid-auth-stage-secrets ;;
  stable) SECRET_NAME=liquid-auth-secrets ;;
  *) echo "usage: $0 stage|stable" >&2; exit 2 ;;
esac

if kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" >/dev/null 2>&1; then
  echo "$SECRET_NAME already exists in namespace $NAMESPACE - leaving it untouched"
  exit 0
fi

kubectl create secret generic "$SECRET_NAME" -n "$NAMESPACE" \
  --from-literal=SESSION_SECRET="$(openssl rand -hex 32)" \
  --from-literal=DB_USERNAME="${DB_USERNAME:-algorand}" \
  --from-literal=DB_PASSWORD="$(openssl rand -hex 24)"

echo "created $SECRET_NAME in namespace $NAMESPACE"
