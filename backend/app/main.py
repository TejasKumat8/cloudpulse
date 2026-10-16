from contextlib import asynccontextmanager
from typing import Optional
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .db import Base, engine, get_db
from .models import Incident
from .schemas import IncidentCreate, IncidentOut, IncidentUpdate, StatsOut


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are created (especially during tests or initial local boot)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="CloudPulse - Enterprise Cloud Incident & Reliability Management API",
    lifespan=lifespan,
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus instrumentator exposing /metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/", tags=["System"])
def root():
    return {
        "service": settings.app_name,
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs",
    }


@app.get("/health", tags=["System"])
def health():
    return {"status": "UP"}


@app.get("/ready", tags=["System"])
def ready(db: Session = Depends(get_db)):
    try:
        db.execute(select(func.count(Incident.id)))
        return {"status": "READY"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unreachable: {str(e)}",
        )


@app.get("/api/incidents", response_model=list[IncidentOut], tags=["Incidents"])
def list_incidents(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity_filter: Optional[str] = Query(None, alias="severity"),
    db: Session = Depends(get_db),
):
    query = select(Incident).order_by(Incident.id.desc())
    if status_filter:
        query = query.where(Incident.status == status_filter.upper())
    if severity_filter:
        query = query.where(Incident.severity == severity_filter.upper())
    return list(db.scalars(query))


@app.get("/api/incidents/stats", response_model=StatsOut, tags=["Incidents"])
def get_stats(db: Session = Depends(get_db)):
    rows = db.execute(select(Incident.status, func.count(Incident.id)).group_by(Incident.status)).all()
    status_counts = {s.upper(): count for s, count in rows}

    severity_rows = db.execute(select(Incident.severity, func.count(Incident.id)).group_by(Incident.severity)).all()
    severity_counts = {sev.upper(): count for sev, count in severity_rows}

    total = sum(status_counts.values())
    resolved = status_counts.get("RESOLVED", 0)
    sla_pct = round(((resolved / total) * 100) if total > 0 else 100.0, 1)

    return StatsOut(
        total=total,
        open=status_counts.get("OPEN", 0),
        investigating=status_counts.get("INVESTIGATING", 0),
        mitigated=status_counts.get("MITIGATED", 0),
        resolved=resolved,
        critical=severity_counts.get("CRITICAL", 0),
        high=severity_counts.get("HIGH", 0),
        sla_compliance_pct=sla_pct,
    )


@app.get("/api/incidents/{incident_id}", response_model=IncidentOut, tags=["Incidents"])
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.post("/api/incidents", response_model=IncidentOut, status_code=status.HTTP_201_CREATED, tags=["Incidents"])
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    data["severity"] = data.get("severity", "MEDIUM").upper()
    data["status"] = data.get("status", "OPEN").upper()
    incident = Incident(**data)
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@app.put("/api/incidents/{incident_id}", response_model=IncidentOut, tags=["Incidents"])
def update_incident(incident_id: int, payload: IncidentUpdate, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "severity" in update_data and update_data["severity"]:
        update_data["severity"] = update_data["severity"].upper()
    if "status" in update_data and update_data["status"]:
        update_data["status"] = update_data["status"].upper()

    for key, value in update_data.items():
        setattr(incident, key, value)

    db.commit()
    db.refresh(incident)
    return incident


@app.delete("/api/incidents/{incident_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Incidents"])
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    db.delete(incident)
    db.commit()
