#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-}"

if [[ -z "$ENV" ]]; then
  echo "Usage: $0 <test|prod>"
  exit 1
fi

case "$ENV" in
  test)
    NAMESPACE="sporthub-test"
    HOST_SUFFIX="test"
    ;;
  prod)
    NAMESPACE="sporthub-prod"
    HOST_SUFFIX=""     # для prod хост оставляем sporthub.local
    ;;
  *)
    echo "Unknown environment: $ENV (expected test or prod)"
    exit 1
    ;;
esac

# Находим корень репозитория относительно расположения скрипта
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SRC_DIR="$ROOT_DIR/k8s"
DST_DIR="$ROOT_DIR/k8s/$ENV"

echo "=== Sync environment: $ENV ==="
echo "Root dir:    $ROOT_DIR"
echo "Namespace:   $NAMESPACE"
echo "Source dir:  $SRC_DIR"
echo "Target dir:  $DST_DIR"

mkdir -p "$DST_DIR"

echo ">> Ensure namespace exists"
kubectl create namespace "$NAMESPACE" 2>/dev/null || echo "Namespace $NAMESPACE already exists"

echo ">> Generate manifests for $ENV"

for SRC in "$SRC_DIR"/*.yaml; do
  if [[ ! -f "$SRC" ]]; then
    continue
  fi

  BASENAME=$(basename "$SRC")
  DST="$DST_DIR/$BASENAME"

  echo "  - $SRC -> $DST"

  # Базовая замена namespace
  TMP_FILE="$(mktemp)"
  sed "s/namespace: sporthub/namespace: $NAMESPACE/g" "$SRC" > "$TMP_FILE"

  # Замена host-а только для test (для prod оставляем sporthub.local)
  if [[ "$ENV" == "test" && -n "$HOST_SUFFIX" ]]; then
    sed "s/host: sporthub.local/host: $HOST_SUFFIX.sporthub.local/g" "$TMP_FILE" > "$DST"
    rm -f "$TMP_FILE"
  else
    mv "$TMP_FILE" "$DST"
  fi
done

echo ">> Apply manifests to namespace $NAMESPACE"
kubectl apply -f "$DST_DIR" -n "$NAMESPACE"

echo "=== Done for $ENV ==="
