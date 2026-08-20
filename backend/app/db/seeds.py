import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal

# Add parent directory to path so app can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.db.database import SessionLocal, Base, engine
from app.models.models import User, Team, Customer, Lead, Target, Benchmark, PerformanceMetric

def seed_data():
    db = SessionLocal()
    try:
        print("Seeding database...")

        # Clear existing data in correct dependency order
        from app.models.models import Action, Event
        db.query(Action).delete()
        db.query(Event).delete()
        db.query(PerformanceMetric).delete()
        db.query(Target).delete()
        db.query(Lead).delete()
        db.query(Customer).delete()
        
        # Break Team manager FK cycle
        for t in db.query(Team).all():
            t.manager_id = None
        db.commit()
        
        db.query(User).delete()
        db.query(Team).delete()
        db.query(Benchmark).delete()
        db.commit()

        from app.services.auth_service import AuthService

        # 1. Create Team first
        team = Team(name="Wealth Management Team Alpha")
        db.add(team)
        db.commit()
        db.refresh(team)

        # 2. Create Users
        # Regional Head
        regional_head = User(
            username="regional_head_1",
            email="regional1@crm.com",
            hashed_password=AuthService.hash_password("regpass"),
            role="REGIONAL_HEAD",
            team_id=None,
            parent_id=None
        )
        db.add(regional_head)
        db.commit()
        db.refresh(regional_head)

        # Branch Manager (points to Regional Head parent)
        manager = User(
            username="branch_mgr_1",
            email="manager1@crm.com",
            hashed_password=AuthService.hash_password("mgrpass"),
            role="BRANCH_MANAGER",
            team_id=team.id,
            parent_id=regional_head.id
        )
        db.add(manager)
        db.commit()
        db.refresh(manager)

        # Update team manager
        team.manager_id = manager.id
        db.commit()

        # RMs (point to Branch Manager parent)
        rm1 = User(
            username="rm_alice",
            email="alice@crm.com",
            hashed_password=AuthService.hash_password("alicepass"),
            role="RM",
            team_id=team.id,
            parent_id=manager.id
        )
        rm2 = User(
            username="rm_bob",
            email="bob@crm.com",
            hashed_password=AuthService.hash_password("bobpass"),
            role="RM",
            team_id=team.id,
            parent_id=manager.id
        )
        # Admin
        admin = User(
            username="admin",
            email="admin@crm.com",
            hashed_password=AuthService.hash_password("adminpass"),
            role="ADMIN",
            team_id=None,
            parent_id=None
        )
        db.add_all([rm1, rm2, admin])
        db.commit()
        db.refresh(rm1)
        db.refresh(rm2)

        # 3. Create Customers (assigned to Alice and Bob)
        cust1 = Customer(
            name="John Smith",
            email="john.smith@gmail.com",
            phone="+1234567890",
            segment="HNW",
            product_holdings=["Mutual Funds", "Savings Account"],
            potential_value=Decimal("500000.00"),
            customer_value=Decimal("150000.00"),
            assigned_rm_id=rm1.id,
            status="ACTIVE"
        )
        cust2 = Customer(
            name="Jane Doe",
            email="jane.doe@yahoo.com",
            phone="+1987654321",
            segment="HNW",
            product_holdings=["Corporate Bonds"],
            potential_value=Decimal("1200000.00"),
            customer_value=Decimal("450000.00"),
            assigned_rm_id=rm2.id,
            status="ACTIVE"
        )
        db.add_all([cust1, cust2])
        db.commit()
        db.refresh(cust1)
        db.refresh(cust2)

        # 4. Create Leads
        lead1 = Lead(
            customer_id=cust1.id,
            name="John Smith - Portfolio Expansion",
            email="john.smith@gmail.com",
            phone="+1234567890",
            source="WEBSITE_VISIT",
            stage="QUALIFIED",
            potential_value=Decimal("100000.00"),
            assigned_rm_id=rm1.id,
            last_contact=datetime.utcnow() - timedelta(days=2),
            next_follow_up=datetime.utcnow() + timedelta(days=1),
            sla_deadline=datetime.utcnow() + timedelta(hours=4),
            status="OPEN"
        )
        lead2 = Lead(
            customer_id=None,
            name="Mark Miller",
            email="mark.miller@outlook.com",
            phone="+1444555666",
            source="PRODUCT_ENQUIRY",
            stage="NEW",
            potential_value=Decimal("25000.00"),
            assigned_rm_id=rm2.id,
            last_contact=None,
            next_follow_up=datetime.utcnow() + timedelta(hours=2),
            sla_deadline=datetime.utcnow() - timedelta(hours=2),  # intentionally breached SLA
            status="OPEN"
        )
        db.add_all([lead1, lead2])

        # 5. Create Target
        target = Target(
            rm_id=rm1.id,
            team_id=None,
            product="Mutual Funds",
            period="monthly",
            target_value=Decimal("200000.00"),
            achieved_value=Decimal("122000.00")  # 61% achieved
        )
        db.add(target)

        # 6. Create Benchmark
        benchmark = Benchmark(
            scope="organization",
            metric="conversion_rate",
            value=Decimal("78.00"),  # 78% expected rate
            period="monthly"
        )
        db.add(benchmark)

        db.commit()
        print("Database seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
