from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text

from .db import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    service_name = Column(String(100), nullable=False, default="api-gateway")
    severity = Column(String(20), nullable=False, default="MEDIUM")
    status = Column(String(30), nullable=False, default="OPEN")
    assignee = Column(String(100), nullable=False, default="DevOps On-Call")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
