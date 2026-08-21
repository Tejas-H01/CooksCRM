import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.models.models import User, Team, Customer, Lead, Target, Benchmark, Event, Action
from app.services.performance_service import PerformanceService
from app.core.config import settings

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        team = Team(id=1, name="Performance Team")
        session.add(team)
        session.commit()

        rm1 = User(id=1, username="alice", email="alice@crm.com", hashed_password="pw", role="RM", team_id=1)
        rm2 = User(id=2, username="bob", email="bob@crm.com", hashed_password="pw", role="RM", team_id=1)
        manager = User(id=3, username="manager", email="mgr@crm.com", hashed_password="pw", role="TEAM_LEAD", team_id=1)
        session.add_all([rm1, rm2, manager])
        session.commit()

        team.manager_id = 3
        session.commit()

        cust1 = Customer(id=1, name="Cust 1", email="c1@crm.com", segment="HNW", assigned_rm_id=1)
        cust2 = Customer(id=2, name="Cust 2", email="c2@crm.com", segment="HNW", assigned_rm_id=2)
        session.add_all([cust1, cust2])
        session.commit()

        bm = Benchmark(id=1, metric="conversion_rate", scope="organization", value=Decimal("78.00"), period="monthly")
        session.add(bm)
        session.commit()

        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

def test_achievement_percentage(db_session):
    target = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("100000.00"), achieved_value=Decimal("61000.00"))
    db_session.add(target)
    db_session.commit()

    perf = PerformanceService.get_rm_performance(db_session, 1)
    assert perf.achievement_percentage == 61.0

def test_expected_run_rate(db_session):
    run_rate = PerformanceService._get_expected_run_rate()
    assert 0.0 <= run_rate <= 100.0

def test_target_gap(db_session):
    target = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("100000.00"), achieved_value=Decimal("61000.00"))
    db_session.add(target)
    db_session.commit()

    run_rate = PerformanceService._get_expected_run_rate()
    perf = PerformanceService.get_rm_performance(db_session, 1)
    assert perf.target_gap == round(61.0 - run_rate, 2)

def test_zero_target_handling(db_session):
    target = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("0.00"), achieved_value=Decimal("500.00"))
    db_session.add(target)
    db_session.commit()

    perf = PerformanceService.get_rm_performance(db_session, 1)
    assert perf.achievement_percentage == 0.0

def test_conversion_rate(db_session):
    lead1 = Lead(id=1, customer_id=1, assigned_rm_id=1, status="OPEN", stage="QUALIFIED")
    lead2 = Lead(id=2, customer_id=1, assigned_rm_id=1, status="CLOSED", stage="CONVERTED")
    db_session.add_all([lead1, lead2])
    db_session.commit()

    perf = PerformanceService.get_rm_performance(db_session, 1)
    assert perf.conversion_rate == 50.0

def test_pipeline_value(db_session):
    lead1 = Lead(id=1, customer_id=1, assigned_rm_id=1, potential_value=Decimal("100000.00"), status="OPEN", stage="NEW")
    lead2 = Lead(id=2, customer_id=1, assigned_rm_id=1, potential_value=Decimal("150000.00"), status="OPEN", stage="QUALIFIED")
    lead3 = Lead(id=3, customer_id=1, assigned_rm_id=1, potential_value=Decimal("200000.00"), status="CLOSED", stage="CONVERTED")
    db_session.add_all([lead1, lead2, lead3])
    db_session.commit()

    perf = PerformanceService.get_rm_performance(db_session, 1)
    assert perf.pipeline_value == 250000.00

def test_pipeline_coverage(db_session):
    target = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("200000.00"), achieved_value=Decimal("100000.00"))
    lead1 = Lead(id=1, customer_id=1, assigned_rm_id=1, potential_value=Decimal("250000.00"), probability=100, status="OPEN", stage="NEW")
    db_session.add_all([target, lead1])
    db_session.commit()

    perf = PerformanceService.get_rm_performance(db_session, 1)
    assert perf.pipeline_coverage == 2.5

def test_remaining_target_zero_handling(db_session):
    target = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("100.00"), achieved_value=Decimal("100.00"))
    lead1 = Lead(id=1, customer_id=1, assigned_rm_id=1, potential_value=Decimal("100.00"), status="OPEN", stage="NEW")
    db_session.add_all([target, lead1])
    db_session.commit()

    perf = PerformanceService.get_rm_performance(db_session, 1)
    assert perf.pipeline_coverage == 99.0

def test_overdue_followups(db_session):
    lead1 = Lead(id=1, customer_id=1, assigned_rm_id=1, status="OPEN", next_follow_up=datetime.utcnow() - timedelta(hours=1))
    lead2 = Lead(id=2, customer_id=1, assigned_rm_id=1, status="OPEN", next_follow_up=datetime.utcnow() + timedelta(hours=1))
    db_session.add_all([lead1, lead2])
    db_session.commit()

    perf = PerformanceService.get_rm_performance(db_session, 1)
    assert perf.overdue_followups == 1

def test_sla_breach_count(db_session):
    lead1 = Lead(id=1, customer_id=1, assigned_rm_id=1, status="OPEN", sla_deadline=datetime.utcnow() - timedelta(hours=1))
    lead2 = Lead(id=2, customer_id=1, assigned_rm_id=1, status="OPEN", sla_deadline=datetime.utcnow() + timedelta(hours=1))
    db_session.add_all([lead1, lead2])
    db_session.commit()

    perf = PerformanceService.get_rm_performance(db_session, 1)
    assert perf.sla_breach_count == 1

def test_lead_ageing(db_session):
    lead1 = Lead(id=1, customer_id=1, assigned_rm_id=1, status="OPEN", created_at=datetime.utcnow() - timedelta(days=2))
    lead2 = Lead(id=2, customer_id=1, assigned_rm_id=1, status="OPEN", created_at=datetime.utcnow() - timedelta(days=4))
    db_session.add_all([lead1, lead2])
    db_session.commit()

    perf = PerformanceService.get_rm_performance(db_session, 1)
    assert perf.average_lead_ageing == 3.0

def test_high_value_opportunities(db_session):
    lead1 = Lead(id=1, customer_id=1, assigned_rm_id=1, potential_value=Decimal("600000.00"), status="OPEN")
    lead2 = Lead(id=2, customer_id=1, assigned_rm_id=1, potential_value=Decimal("100000.00"), status="OPEN")
    db_session.add_all([lead1, lead2])
    db_session.commit()

    perf = PerformanceService.get_rm_performance(db_session, 1)
    assert perf.high_value_opportunities == 1

def test_untouched_high_intent_leads(db_session):
    action = Action(
        id="act_hi",
        rm_id=1,
        customer_id=1,
        action_type="HIGH_INTENT",
        priority="HIGH",
        title="High Intent",
        due_at=datetime.utcnow(),
        status="PENDING"
    )
    db_session.add(action)
    db_session.commit()

    perf = PerformanceService.get_rm_performance(db_session, 1)
    assert perf.untouched_high_intent_leads == 1

def test_benchmark_comparison(db_session):
    target = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("1000.00"), achieved_value=Decimal("1000.00"))
    db_session.add(target)
    db_session.commit()

    perf = PerformanceService.get_rm_performance(db_session, 1)
    assert "run-rate" in perf.benchmark["achievement"]

def test_team_average(db_session):
    target1 = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("1000.00"), achieved_value=Decimal("1000.00"))
    target2 = Target(rm_id=2, product="Mutual Funds", period="monthly", target_value=Decimal("1000.00"), achieved_value=Decimal("500.00"))
    db_session.add_all([target1, target2])
    db_session.commit()

    team_perf = PerformanceService.get_team_performance(db_session, 1)
    assert team_perf.team_achievement_percentage == 75.0

def test_team_performance_summary(db_session):
    target1 = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("1000.00"), achieved_value=Decimal("1000.00"))
    target2 = Target(rm_id=2, product="Mutual Funds", period="monthly", target_value=Decimal("1000.00"), achieved_value=Decimal("500.00"))
    db_session.add_all([target1, target2])
    db_session.commit()

    team_perf = PerformanceService.get_team_performance(db_session, 1)
    assert len(team_perf.rm_rankings) == 2
    assert team_perf.rm_rankings[0].rm_name == "alice"

def test_target_lag_alert(db_session):
    target = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("1000.00"), achieved_value=Decimal("0.00"))
    db_session.add(target)
    db_session.commit()

    alerts = PerformanceService.get_manager_alerts(db_session)
    assert any(a.type == "TARGET_LAG" and a.rm_id == 1 for a in alerts)

def test_sla_risk_alert(db_session):
    lead = Lead(id=1, customer_id=1, assigned_rm_id=1, status="OPEN", sla_deadline=datetime.utcnow() - timedelta(hours=1))
    db_session.add(lead)
    db_session.commit()

    alerts = PerformanceService.get_manager_alerts(db_session)
    assert any(a.type == "SLA_RISK" and a.rm_id == 1 for a in alerts)

def test_low_conversion_alert(db_session):
    target = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("1000.00"), achieved_value=Decimal("0.00"))
    lead = Lead(id=1, customer_id=1, assigned_rm_id=1, status="OPEN", stage="QUALIFIED")
    db_session.add_all([target, lead])
    db_session.commit()

    alerts = PerformanceService.get_manager_alerts(db_session)
    assert any(a.type == "LOW_CONVERSION" and a.rm_id == 1 for a in alerts)

def test_achievement_detection_manager(db_session):
    target = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("1000.00"), achieved_value=Decimal("1250.00"))
    db_session.add(target)
    db_session.commit()

    achievements = PerformanceService.get_manager_achievements(db_session)
    assert any(ac.achievement_type == "EXCEEDED_TARGET" and ac.rm_id == 1 for ac in achievements)

def test_hierarchy_filtering(db_session):
    target = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("1000.00"), achieved_value=Decimal("0.00"))
    db_session.add(target)
    db_session.commit()

    alerts = PerformanceService.get_manager_alerts(db_session, manager_id=3)
    assert len(alerts) > 0
    assert alerts[0].rm_id == 1
