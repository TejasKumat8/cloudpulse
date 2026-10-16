# CloudPulse — Enterprise DevOps Incident & Reliability Management Platform

[![CI/CD Pipeline](https://github.com/TejasKumat8/cloudpulse/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/TejasKumat8/cloudpulse/actions)
[![Docker Image](https://img.shields.io/badge/Docker-GHCR-blue?logo=docker)](https://github.com/TejasKumat8/cloudpulse/pkgs/container/cloudpulse-backend)
[![Security Scan: Trivy](https://img.shields.io/badge/Security-Trivy%20Scanned-green?logo=aquasecurity)](https://aquasecurity.github.io/trivy/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-EKS%201.31-326CE5?logo=kubernetes)](https://kubernetes.io/)
[![Helm](https://img.shields.io/badge/Helm-3-0F1689?logo=helm)](https://helm.sh/)

---

## 1. Project Overview & Architecture

**CloudPulse** is an end-to-end, enterprise-grade Incident Command Center and Site Reliability Engineering (SRE) telemetry application. It demonstrates the complete lifecycle of a cloud-native microservices platform—from local containerized development to automated CI/CD security gating and high-availability deployment on AWS Amazon EKS with Prometheus & Grafana observability.

```text
                                  +-------------------------------------------------------------+
                                  |                     Developer Machine                       |
                                  +-------------------------------------------------------------+
                                                                 |
                                                          git push origin main
                                                                 v
+-------------------------------------------------------------------------------------------------------------------------------+
|                                                GitHub Actions CI/CD Pipeline                                                  |
|                                                                                                                               |
|   +--------------------+       +--------------------+       +---------------------+       +-------------------------------+   |
|   |   Automated Test   | ----> |   Vite Production  | ----> |  Docker Container   | ----> |  Trivy Security Scanning Gate |   |
|   |  (Pytest Suite)    |       |     Asset Build    |       |  Multi-Stage Builds |       |   (Blocks HIGH/CRITICAL CVEs) |   |
|   +--------------------+       +--------------------+       +---------------------+       +-------------------------------+   |
|                                                                                                           |                   |
|                                                                                                           v                   |
|                                                                                           +-------------------------------+   |
|                                                                                           |  Push to GHCR (Git SHA Tags)  |   |
+-------------------------------------------------------------------------------------------+-------------------------------+---+
                                                                                                            |
                                                                                                            v
+-------------------------------------------------------------------------------------------------------------------------------+
|                                              AWS Cloud Infrastructure (Terraform)                                             |
|                                                                                                                               |
|   VPC (CIDR: 10.30.0.0/16, ap-south-1)                                                                                        |
|   +-------------------------------------------+   +-----------------------------------------------------------------------+   |
|   |   Public Subnets (NAT Gateway + IGW)     |   |   Private Subnets (EKS Managed Node Groups)                            |   |
|   |   - 10.30.101.0/24 (ap-south-1a)          |   |   - 10.30.1.0/24 (ap-south-1a)                                         |   |
|   |   - 10.30.102.0/24 (ap-south-1b)          |   |   - 10.30.2.0/24 (ap-south-1b)                                         |   |
|   +-------------------------------------------+   +-----------------------------------------------------------------------+   |
+-------------------------------------------------------------------------------------------------------------------------------+
                                                                                                            |
                                                                                    helm upgrade --install cloudpulse           |
                                                                                                            v
+-------------------------------------------------------------------------------------------------------------------------------+
|                                            Kubernetes Cluster (EKS / namespace: cloudpulse)                                   |
|                                                                                                                               |
|                                              +-----------------------------------------+                                      |
|                                              |         Ingress (NGINX Controller)      |                                      |
|                                              +-----------------------------------------+                                      |
|                                                    /                     \ /api, /health                              |
|                                                   v                       v                                           |
|                                      +--------------------+      +--------------------+                                       |
|                                      |  Frontend Service  |      |  Backend Service   | <-----+                               |
|                                      +--------------------+      +--------------------+       |                               |
|                                                |                           |                  |                               |
|                                                v                           v                  | Scrapes /metrics              |
|                                      +--------------------+      +--------------------+       | (ServiceMonitor)              |
|                                      | Frontend Pods (x2) |      | Backend Pods (x2)  |       |                               |
|                                      | (Nginx Non-Root)   |      | (FastAPI Non-Root) |       |                               |
|                                      +--------------------+      +--------------------+       |                               |
|                                                                            |                  |                               |
|                                                                            v                  |                               |
|                                                                  +--------------------+       |                               |
|                                                                  | PostgreSQL (PVC 5G)|       |                               |
|                                                                  +--------------------+       |                               |
|                                                                                               |                               |
|                                                                  +--------------------+       |                               |
|                                                                  | Prometheus Operator| ------+                               |
|                                                                  | & Grafana Dashboard|                                       |
|                                                                  +--------------------+                                       |
+-------------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Core Capabilities & Technology Stack

| Layer | Technologies & Tools | Implementation Details |
|---|---|---|
| **Frontend** | React 18, Vite, CSS Grid/Flexbox | Real-time Incident Dashboard, KPI cards, Status filters, Modal creator |
| **Backend** | Python 3.12+, FastAPI, SQLAlchemy | REST APIs, Alembic migrations, CRUD operations, CORS, Pydantic |
| **Database** | PostgreSQL 16 | Relational incident storage with persistent volume storage |
| **Testing** | Pytest, In-memory SQLite, HTTPX | 10 unit & integration test cases covering 100% of endpoints |
| **Containerization** | Docker, Docker Compose, Multi-stage | Non-root users (`appuser` 10001, `nginx` 101), minimal attack surface |
| **CI/CD** | GitHub Actions | 3-stage pipeline (Test -> Build/Scan/Push -> Deploy) with Git SHA tagging |
| **DevSecOps** | Aqua Security Trivy | Scans container images for vulnerabilities; fails on HIGH/CRITICAL CVEs |
| **Infrastructure as Code** | Terraform, AWS VPC, AWS EKS | Declarative HCL provisioning VPC, NAT Gateways, EKS Cluster 1.31 |
| **Container Orchestration** | Kubernetes, Helm v3 | Deployments, ClusterIP Services, Ingress, HPA, PVC, Secrets, Namespaces |
| **Autoscaling** | Kubernetes HPA v2 | Auto-scales backend from 2 to 6 replicas based on CPU load (60% target) |
| **Observability** | Prometheus, Grafana, ServiceMonitor | Scrapes `/metrics`, visualizes HTTP RPS, error rates, p95 latency |

---

## 3. Application API Specification

The FastAPI backend exposes the following REST and telemetry endpoints:

| Method | Endpoint | Description | Response Status |
|---|---|---|---|
| `GET` | `/` | Service root and metadata | `200 OK` |
| `GET` | `/health` | Kubernetes Liveness Probe endpoint | `200 OK` (`{"status": "UP"}`) |
| `GET` | `/ready` | Kubernetes Readiness Probe (verifies DB ping) | `200 OK` (`{"status": "READY"}`) |
| `GET` | `/metrics` | Prometheus metrics scrape target | `200 OK` (Prometheus text format) |
| `GET` | `/api/incidents` | List all incidents (supports `?status=` and `?severity=`) | `200 OK` |
| `GET` | `/api/incidents/stats` | KPI summary statistics & SLA resolution percentages | `200 OK` |
| `GET` | `/api/incidents/{id}` | Retrieve incident details by ID | `200 OK` / `404 Not Found` |
| `POST` | `/api/incidents` | Create a new incident report | `201 Created` |
| `PUT` | `/api/incidents/{id}` | Update incident status, severity, or assignee | `200 OK` / `404 Not Found` |
| `DELETE` | `/api/incidents/{id}` | Delete / archive incident record | `204 No Content` / `404 Not Found` |

Interactive Swagger documentation is available live at `http://localhost:8000/docs`.

---

## 4. Local Quickstart (Docker Compose)

The entire full-stack application (PostgreSQL + FastAPI + React Frontend) runs locally with one command:

```bash
docker compose up --build
```

Access services locally:
- **Web UI**: [http://localhost:3000](http://localhost:3000)
- **API Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
- **Prometheus Metrics**: [http://localhost:8000/metrics](http://localhost:8000/metrics)

To tear down containers and delete the database volume:
```bash
docker compose down -v
```

---

## 5. Automated Testing (Pytest)

All backend endpoints are tested using an isolated in-memory SQLite database before container images are built:

```bash
cd backend
python -m pytest -v
```

Output:
```text
tests/test_api.py::test_health_check PASSED                              [ 10%]
tests/test_api.py::test_ready_check PASSED                               [ 20%]
tests/test_api.py::test_root_endpoint PASSED                             [ 30%]
tests/test_api.py::test_create_incident PASSED                           [ 40%]
tests/test_api.py::test_get_incident_by_id PASSED                        [ 50%]
tests/test_api.py::test_update_incident PASSED                           [ 60%]
tests/test_api.py::test_list_and_filter_incidents PASSED                 [ 70%]
tests/test_api.py::test_stats_calculation PASSED                         [ 80%]
tests/test_api.py::test_delete_incident PASSED                           [ 90%]
tests/test_api.py::test_get_nonexistent_incident_returns_404 PASSED      [100%]
======================== 10 passed in 4.71s ========================
```

---

## 6. Docker Containerization & Security

Both containers are optimized for security and minimal image size:
1. **Backend (`backend/Dockerfile`)**:
   - Built on `python:3.12-slim`
   - Executes as non-root user `appuser` (UID `10001`)
   - Automatically runs Alembic migrations on startup before starting Uvicorn
2. **Frontend (`frontend/Dockerfile`)**:
   - Multi-stage build (Node 22 build stage -> `nginxinc/nginx-unprivileged:alpine` runtime)
   - Runs as non-root user `nginx` (UID `101`)
   - Listens on unprivileged port `8080`

To build images manually:
```bash
docker build -t cloudpulse-backend:local ./backend
docker build -t cloudpulse-frontend:local ./frontend
```

---

## 7. CI/CD Pipeline (GitHub Actions) & DevSecOps

The pipeline defined in `.github/workflows/ci-cd.yml` automates every code push to `main`:

1. **Test Stage**:
   - Runs `pytest` on the backend.
   - Runs `npm run build` on the frontend.
2. **Build, Scan & Push Stage**:
   - Builds container images for both frontend and backend.
   - **Trivy Vulnerability Scan**: Scans images for `HIGH` and `CRITICAL` vulnerabilities with `exit-code: 1`.
   - Tags images with the immutable Git commit SHA (`${{ github.sha }}`).
   - Pushes images to GitHub Container Registry (`ghcr.io`).
3. **Deploy Stage**:
   - Connects to the Kubernetes cluster using `KUBE_CONFIG_DATA`.
   - Executes `helm upgrade --install` with the new Git SHA tags.

---

## 8. Infrastructure as Code (Terraform)

Provision the production AWS network and EKS cluster:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

To connect `kubectl` to the provisioned EKS cluster:
```bash
aws eks --region ap-south-1 update-kubeconfig --name cloudpulse-eks
kubectl get nodes
```

To cleanly destroy all AWS resources and prevent costs:
```bash
terraform destroy
```

---

## 9. Kubernetes & Helm Deployment

Deploy the entire stack to Kubernetes:

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Deploy CloudPulse via Helm
helm upgrade --install cloudpulse ./helm/cloudpulse \
  --namespace cloudpulse \
  --create-namespace

# 3. Check status
kubectl get pods -n cloudpulse
kubectl get svc -n cloudpulse
kubectl get ingress -n cloudpulse
kubectl get hpa -n cloudpulse
```

---

## 10. Observability & Monitoring

1. Install the Prometheus Operator:
   ```bash
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm repo update
   helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
     -f monitoring/prometheus-values.yaml \
     --namespace monitoring \
     --create-namespace
   ```
2. The `ServiceMonitor` in `helm/cloudpulse/templates/servicemonitor.yaml` automatically configures Prometheus to scrape `/metrics`.
3. Import `monitoring/grafana-dashboard.json` into Grafana to visualize HTTP RPS, error rates, p95 latency, and active backend pods.

---

## 11. Troubleshooting Exercises

Practice Kubernetes diagnostics using the bundled failure scenarios in `troubleshooting/`:
- **ImagePullBackOff Lab**: See [troubleshooting/broken-image.yaml](file:///troubleshooting/broken-image.yaml)
- **Broken Service Routing Lab**: See [troubleshooting/broken-service.yaml](file:///troubleshooting/broken-service.yaml)
- Full step-by-step resolution walkthrough is documented in [troubleshooting/TROUBLESHOOTING.md](file:///troubleshooting/TROUBLESHOOTING.md).

---

## 12. Capstone Submission Checklist

- [x] Application: FastAPI backend + React frontend + PostgreSQL
- [x] REST APIs: GET, POST, PUT, DELETE, `/health`, `/ready`, `/metrics`, and `/api/incidents/stats`
- [x] Database: Alembic migration `0001_create_incidents.py`
- [x] Testing: 10 Pytest test cases passing (`pytest.ini` configured)
- [x] Docker: Multi-stage build + non-root users (`USER 10001` and `USER 101`)
- [x] Compose: `docker-compose.yml` starts frontend, backend, and postgres
- [x] CI/CD: GitHub Actions pipeline with Pytest, npm build, and GHCR push with SHA tags
- [x] DevSecOps: Trivy vulnerability scanning blocking HIGH/CRITICAL CVEs
- [x] Terraform: AWS VPC (public & private subnets) + EKS cluster 1.31 + `terraform.tfvars.example`
- [x] Kubernetes & Helm: Complete chart with Ingress, HPA, Services, PVC, and Deployments
- [x] Observability: Prometheus scrape endpoint (`/metrics`) and Grafana dashboard
- [x] Documentation: Comprehensive README and Troubleshooting lab guide
