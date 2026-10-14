import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Numeric, Table, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.db.database import Base

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    manager_id = Column(Integer, ForeignKey("users.id", use_alter=True, name="fk_team_manager_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    manager = relationship("User", foreign_keys=[manager_id], post_update=True, back_populates="managed_teams")
    members = relationship("User", foreign_keys="User.team_id", back_populates="team")
    targets = relationship("Target", back_populates="team")
    performance_metrics = relationship("PerformanceMetric", back_populates="team")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False, unique=True)
    email = Column(String(100), nullable=False, unique=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # RM, BRANCH_MANAGER, REGIONAL_HEAD, ADMIN
    team_id = Column(Integer, ForeignKey("teams.id", name="fk_user_team_id"), nullable=True)
    parent_id = Column(Integer, ForeignKey("users.id", name="fk_user_parent_id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    team = relationship("Team", foreign_keys=[team_id], back_populates="members")
    managed_teams = relationship("Team", foreign_keys=[Team.manager_id], back_populates="manager")
    parent = relationship("User", remote_side=[id], backref="subordinates")
    assigned_customers = relationship("Customer", back_populates="assigned_rm")
    assigned_leads = relationship("Lead", back_populates="assigned_rm")
    actions = relationship("Action", back_populates="rm")
    targets = relationship("Target", back_populates="rm")
    performance_metrics = relationship("PerformanceMetric", back_populates="rm")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=True)
    phone = Column(String(20), nullable=True)
    segment = Column(String(50), nullable=True)  # e.g. HNW, Retail, Corporate
    product_holdings = Column(JSON, nullable=True)  # list of products currently held
    potential_value = Column(Numeric(15, 2), default=0.00)
    customer_value = Column(Numeric(15, 2), default=0.00)
    assigned_rm_id = Column(Integer, ForeignKey("users.id", name="fk_customer_assigned_rm_id"), nullable=True)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assigned_rm = relationship("User", back_populates="assigned_customers")
    leads = relationship("Lead", back_populates="customer")
    actions = relationship("Action", back_populates="customer")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", name="fk_lead_customer_id"), nullable=True)
    name = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    source = Column(String(100), nullable=True)
    stage = Column(String(50), default="NEW")
    potential_value = Column(Numeric(15, 2), default=0.00)
    actual_value = Column(Numeric(15, 2), default=0.00)
    probability = Column(Integer, default=50)
    expected_close_date = Column(DateTime, nullable=True)
    assigned_rm_id = Column(Integer, ForeignKey("users.id", name="fk_lead_assigned_rm_id"), nullable=True)
    last_contact = Column(DateTime, nullable=True)
    next_follow_up = Column(DateTime, nullable=True)
    sla_deadline = Column(DateTime, nullable=True)
    status = Column(String(50), default="OPEN")
    reason = Column(String(500), nullable=True)
    notes = Column(String(500), nullable=True)
    trigger_event_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="leads")
    assigned_rm = relationship("User", back_populates="assigned_leads")
    actions = relationship("Action", back_populates="lead")


class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=False)
    actor_id = Column(String(50), nullable=True)
    payload = Column(JSON, nullable=False)
    occurred_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    idempotency_key = Column(String(100), unique=True, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)
    error_message = Column(String(500), nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    actions = relationship("Action", back_populates="source_event")


class Action(Base):
    __tablename__ = "actions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rm_id = Column(Integer, ForeignKey("users.id", name="fk_action_rm_id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id", name="fk_action_customer_id"), nullable=True)
    lead_id = Column(Integer, ForeignKey("leads.id", name="fk_action_lead_id"), nullable=True)
    action_type = Column(String(100), nullable=False)  # CALL_CUSTOMER, FOLLOW_UP, etc.
    priority = Column(String(20), nullable=False)  # HIGH, MEDIUM, LOW
    score = Column(Float, default=0.0)
    title = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    reason = Column(String(500), nullable=True)
    source_event_id = Column(String(36), ForeignKey("events.id", name="fk_action_source_event_id"), nullable=True)
    status = Column(String(50), default="PENDING")  # PENDING, IN_PROGRESS, COMPLETED, etc.
    factors = Column(JSON().with_variant(JSONB(), "postgresql"), nullable=True)
    outcome = Column(JSON().with_variant(JSONB(), "postgresql"), nullable=True)
    due_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    rm = relationship("User", back_populates="actions")
    customer = relationship("Customer", back_populates="actions")
    lead = relationship("Lead", back_populates="actions")
    source_event = relationship("Event", back_populates="actions")

    @property
    def rm_name(self) -> Optional[str]:
        return self.rm.username if self.rm else None

    @property
    def customer_name(self) -> Optional[str]:
        return self.customer.name if self.customer else None

    @property
    def lead_name(self) -> Optional[str]:
        return self.lead.name if self.lead else None

    @property
    def customer_email(self) -> Optional[str]:
        if self.customer and self.customer.email:
            return self.customer.email
        if self.lead and self.lead.email:
            return self.lead.email
        return None

    @property
    def customer_phone(self) -> Optional[str]:
        if self.customer and self.customer.phone:
            return self.customer.phone
        if self.lead and self.lead.phone:
            return self.lead.phone
        return None


class Target(Base):
    __tablename__ = "targets"

    id = Column(Integer, primary_key=True, index=True)
    rm_id = Column(Integer, ForeignKey("users.id", name="fk_target_rm_id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id", name="fk_target_team_id"), nullable=True)
    product = Column(String(100), nullable=False)
    period = Column(String(50), nullable=False)  # e.g., "monthly", "Q1_2026"
    target_value = Column(Numeric(15, 2), nullable=False)
    achieved_value = Column(Numeric(15, 2), default=0.00)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    rm = relationship("User", back_populates="targets")
    team = relationship("Team", back_populates="targets")


class Benchmark(Base):
    __tablename__ = "benchmarks"

    id = Column(Integer, primary_key=True, index=True)
    scope = Column(String(50), nullable=False)  # e.g., "team", "organization"
    metric = Column(String(100), nullable=False)  # e.g., "conversion_rate", "response_time"
    value = Column(Numeric(15, 2), nullable=False)
    period = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PerformanceMetric(Base):
    __tablename__ = "performance_metrics"

    id = Column(Integer, primary_key=True, index=True)
    rm_id = Column(Integer, ForeignKey("users.id", name="fk_performance_metric_rm_id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id", name="fk_performance_metric_team_id"), nullable=True)
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Numeric(15, 2), nullable=False)
    calculated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    rm = relationship("User", back_populates="performance_metrics")
    team = relationship("Team", back_populates="performance_metrics")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", name="fk_audit_log_user_id"), nullable=True)
    action = Column(String(100), nullable=False)
    ip_address = Column(String(50), nullable=True)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
