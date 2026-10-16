#!/usr/bin/env bash
# Seeds sample production incidents into CloudPulse API

API_URL="${1:-http://localhost:8000/api/incidents}"

echo "Seeding sample incident data into CloudPulse at $API_URL..."

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"title": "EKS Worker Node Out of Memory (OOMKilled)", "description": "Prometheus agent pod evicted on worker-node-2 due to high memory usage.", "service_name": "k8s-cluster", "severity": "HIGH", "status": "INVESTIGATING", "assignee": "Alex Rivera"}'

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"title": "High P99 Latency on Payment Gateway", "description": "Payment authorization response times spiking over 4200ms.", "service_name": "billing-svc", "severity": "CRITICAL", "status": "OPEN", "assignee": "Sarah Chen"}'

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"title": "Database Connection Pool Exhaustion", "description": "PostgreSQL max_connections limit approached during flash sale.", "service_name": "postgres-db", "severity": "HIGH", "status": "MITIGATED", "assignee": "David Kim"}'

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"title": "Ingress TLS Certificate Expired", "description": "Staging wildcard TLS cert renewed and verified with cert-manager.", "service_name": "ingress-controller", "severity": "LOW", "status": "RESOLVED", "assignee": "Elena Rostova"}'

echo -e "\nSample incidents seeded successfully!"
