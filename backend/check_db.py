from app.db.database import SessionLocal
from app.models.models import User, Action, Lead
db = SessionLocal()
users = db.query(User).all()
print('Users:')
for u in users:
    print(f'ID: {u.id}, Username: {u.username}')
actions = db.query(Action).all()
print('\nActions:')
for a in actions:
    print(f'ID: {a.id}, Title: {a.title}, RM ID: {a.rm_id}')
