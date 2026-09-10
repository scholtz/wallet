#!/usr/bin/env bash
# Creates the `liquid-auth-secrets` Secret used by k8s/deployment-liquid-auth.yaml.
# Idempotent: does nothing if the secret already exists (rotating SESSION_SECRET logs every
# wallet out of the service; changing DB_PASSWORD after MongoDB initialised its root user
# requires a manual password change inside MongoDB as well).
set -euo pipefail

NAMESPACE="${NAMESPACE:-awallet}"

if kubectl get secret liquid-auth-secrets -n "$NAMESPACE" >/dev/null 2>&1; then
  echo "liquid-auth-secrets already exists in namespace $NAMESPACE - leaving it untouched"
  exit 0
fi

kubectl create secret generic liquid-auth-secrets -n "$NAMESPACE" \
  --from-literal=SESSION_SECRET="$(openssl rand -hex 32)" \
  --from-literal=DB_USERNAME="${DB_USERNAME:-algorand}" \
  --from-literal=DB_PASSWORD="$(openssl rand -hex 24)"

echo "created liquid-auth-secrets in namespace $NAMESPACE"
