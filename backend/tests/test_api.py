import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Force in-memory SQLite database for isolated automated testing
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.config import settings
from app.db import Base, get_db
from app.main import app

# Create in-memory SQLite engine
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP"}


def test_ready_check():
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "READY"}


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "CloudPulse API"
    assert data["status"] == "healthy"


def test_create_incident():
    payload = {
        "title": "High latency on payment gateway",
        "description": "Payment requests exceeding 3000ms SLA threshold.",
        "service_name": "billing-svc",
        "severity": "CRITICAL",
        "status": "OPEN",
        "assignee": "Alex Rivera",
    }
    response = client.post("/api/incidents", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["severity"] == "CRITICAL"
    assert data["status"] == "OPEN"
    assert "id" in data


def test_get_incident_by_id():
    # First create
    create_res = client.post(
        "/api/incidents",
        json={
            "title": "Database connection pool exhaustion",
            "service_name": "postgres-cluster",
            "severity": "HIGH",
            "status": "INVESTIGATING",
        },
    )
    incident_id = create_res.json()["id"]

    # Now get
    get_res = client.get(f"/api/incidents/{incident_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == incident_id
    assert get_res.json()["title"] == "Database connection pool exhaustion"


def test_update_incident():
    create_res = client.post(
        "/api/incidents",
        json={
            "title": "Ingress SSL certificate expiring",
            "service_name": "ingress-nginx",
            "severity": "MEDIUM",
            "status": "OPEN",
        },
    )
    incident_id = create_res.json()["id"]

    # Update to RESOLVED
    update_res = client.put(
        f"/api/incidents/{incident_id}",
        json={"status": "RESOLVED", "assignee": "DevOps Lead"},
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["status"] == "RESOLVED"
    assert data["assignee"] == "DevOps Lead"


def test_list_and_filter_incidents():
    client.post("/api/incidents", json={"title": "Bug 1", "severity": "LOW", "status": "OPEN"})
    client.post("/api/incidents", json={"title": "Bug 2", "severity": "CRITICAL", "status": "INVESTIGATING"})

    list_res = client.get("/api/incidents")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 2

    filtered_res = client.get("/api/incidents?severity=CRITICAL")
    assert filtered_res.status_code == 200
    assert all(item["severity"] == "CRITICAL" for item in filtered_res.json())


def test_stats_calculation():
    client.post("/api/incidents", json={"title": "Critical Outage", "severity": "CRITICAL", "status": "OPEN"})
    client.post("/api/incidents", json={"title": "Resolved Issue", "severity": "LOW", "status": "RESOLVED"})

    stats_res = client.get("/api/incidents/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total"] == 2
    assert stats["open"] == 1
    assert stats["resolved"] == 1
    assert stats["critical"] == 1
    assert stats["sla_compliance_pct"] == 50.0


def test_delete_incident():
    create_res = client.post("/api/incidents", json={"title": "Temp Incident"})
    incident_id = create_res.json()["id"]

    del_res = client.delete(f"/api/incidents/{incident_id}")
    assert del_res.status_code == 204

    # Confirm it's gone
    get_res = client.get(f"/api/incidents/{incident_id}")
    assert get_res.status_code == 404


def test_get_nonexistent_incident_returns_404():
    res = client.get("/api/incidents/99999")
    assert res.status_code == 404
    assert res.json()["detail"] == "Incident not found"
