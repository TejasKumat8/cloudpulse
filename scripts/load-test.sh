#!/usr/bin/env bash
# CloudPulse HPA Load Generator Script
# Generates HTTP traffic to trigger Horizontal Pod Autoscaler (HPA) CPU threshold scaling

set -euo pipefail

TARGET_URL="${URL:-http://localhost:8000/api/incidents}"
CONCURRENCY="${CONCURRENCY:-10}"
REQUESTS="${REQUESTS:-1000}"

echo "=========================================================="
echo " Starting CloudPulse Load Test on: $TARGET_URL"
echo " Total Requests: $REQUESTS"
echo " Concurrency:    $CONCURRENCY"
echo "=========================================================="

if command -v hey &> /dev/null; then
    hey -n "$REQUESTS" -c "$CONCURRENCY" -m GET "$TARGET_URL"
elif command -v ab &> /dev/null; then
    ab -n "$REQUESTS" -c "$CONCURRENCY" "$TARGET_URL"
else
    echo "Using curl parallel batch loop..."
    for i in $(seq 1 "$REQUESTS"); do
        curl -s -o /dev/null "$TARGET_URL" &
        if [ $((i % CONCURRENCY)) -eq 0 ]; then
            wait
        fi
    done
    wait
fi

echo "=========================================================="
echo " Load test completed. Inspect HPA with:"
echo " kubectl get hpa -n cloudpulse --watch"
echo "=========================================================="
