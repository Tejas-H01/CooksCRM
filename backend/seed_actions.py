from app.db.database import SessionLocal
from app.models.models import User, Action, Customer, Lead
import datetime

db = SessionLocal()

alice = db.query(User).filter_by(username='rm_alice').first()
bob = db.query(User).filter_by(username='rm_bob').first()

if alice:
    a1 = Action(
        rm_id=alice.id,
        customer_id=db.query(Customer).filter_by(assigned_rm_id=alice.id).first().id if db.query(Customer).filter_by(assigned_rm_id=alice.id).first() else None,
        title="Alice's Action",
        description="test",
        type="FOLLOW_UP",
        priority="HIGH",
        status="OPEN",
        due_date=datetime.datetime.now()
    )
    db.add(a1)
if bob:
    b1 = Action(
        rm_id=bob.id,
        title="Bob's Action",
        description="test",
        type="FOLLOW_UP",
        priority="HIGH",
        status="OPEN",
        due_date=datetime.datetime.now()
    )
    db.add(b1)

db.commit()
print("Added mock actions")
