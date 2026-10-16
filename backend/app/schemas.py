from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class IncidentBase(BaseModel):
    title: str
    description: Optional[str] = None
    service_name: Optional[str] = "api-gateway"
    severity: Optional[str] = "MEDIUM"
    status: Optional[str] = "OPEN"
    assignee: Optional[str] = "DevOps On-Call"


class IncidentCreate(IncidentBase):
    pass


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    service_name: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    assignee: Optional[str] = None


class IncidentOut(IncidentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StatsOut(BaseModel):
    total: int
    open: int
    investigating: int
    mitigated: int
    resolved: int
    critical: int
    high: int
    sla_compliance_pct: float
