#!/usr/bin/env bash
# Deploys / updates the Liquid Auth service at https://liquid.biatec.io (see docs/LIQUID_AUTH.md).
set -euo pipefail

cd "$(dirname "$0")"
NAMESPACE="${NAMESPACE:-awallet}"

./liquid-auth-secrets.sh
kubectl apply -f deployment-liquid-auth.yaml -n "$NAMESPACE"
kubectl rollout status deployment/liquid-auth-mongo-deployment -n "$NAMESPACE"
kubectl rollout status deployment/liquid-auth-redis-deployment -n "$NAMESPACE"
kubectl rollout restart deployment/liquid-auth-deployment -n "$NAMESPACE"
kubectl rollout status deployment/liquid-auth-deployment -n "$NAMESPACE"

echo "smoke test:"
curl -fsS https://liquid.biatec.io/auth/session | head -c 300 && echo
