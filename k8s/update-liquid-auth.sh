#!/usr/bin/env bash
# Manual deploy of the Liquid Auth service; the normal path is the GitHub workflow
# .github/workflows/liquid-auth.yml (see k8s/README.md → "Liquid Auth service").
#
# Usage: ./update-liquid-auth.sh stage|stable
set -euo pipefail

cd "$(dirname "$0")"
ENV_NAME="${1:-stable}"
NAMESPACE="${NAMESPACE:-awallet}"
case "$ENV_NAME" in
  stage)
    MANIFEST=deployment-liquid-auth-stage.yaml
    PREFIX=liquid-auth-stage
    URL=https://stage.liquid.biatec.io
    ;;
  stable)
    MANIFEST=deployment-liquid-auth-stable.yaml
    PREFIX=liquid-auth
    URL=https://liquid.biatec.io
    ;;
  *) echo "usage: $0 stage|stable" >&2; exit 2 ;;
esac

./liquid-auth-secrets.sh "$ENV_NAME"
kubectl apply -f "$MANIFEST" -n "$NAMESPACE"
kubectl rollout status "deployment/$PREFIX-mongo-deployment" -n "$NAMESPACE"
kubectl rollout status "deployment/$PREFIX-redis-deployment" -n "$NAMESPACE"
kubectl rollout restart "deployment/$PREFIX-deployment" -n "$NAMESPACE"
kubectl rollout status "deployment/$PREFIX-deployment" -n "$NAMESPACE"

echo "smoke test:"
curl -fsS "$URL/auth/session" | head -c 300 && echo
