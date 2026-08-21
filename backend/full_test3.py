import urllib.request
import urllib.error
import json
from datetime import datetime

base_url = 'http://localhost:8000/api/v1'

def login(username, password):
    req = urllib.request.Request(f'{base_url}/auth/login', data=json.dumps({'username':username,'password':password}).encode(), headers={'Content-Type':'application/json'})
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read().decode())['access_token']
    except Exception as e:
        print(f"Login failed for {username}: {e}")
        return None

def fetch(path, token, method='GET', body=None):
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f'{base_url}{path}', data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return resp.getcode(), json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return 500, str(e)

print('--- TEST RM ALICE ---')
token_alice = login('rm_alice', 'alicepass')
print('Alice token received:', bool(token_alice))

print('--- TEST RM BOB ---')
token_bob = login('rm_bob', 'bobpass')
print('Bob token received:', bool(token_bob))

if token_alice and token_bob:
    print('--- SEEDING ACTIONS FOR TEST ---')
    from app.db.database import SessionLocal
    from app.models.models import User, Action, Lead
    db = SessionLocal()
    alice = db.query(User).filter(User.username == 'rm_alice').first()
    bob = db.query(User).filter(User.username == 'rm_bob').first()
    lead_alice = db.query(Lead).filter(Lead.assigned_rm_id == alice.id).first()
    lead_bob = db.query(Lead).filter(Lead.assigned_rm_id == bob.id).first()
    
    # ensure clean actions state
    db.query(Action).delete()
    
    alice_action = Action(title="Alice action", action_type="CALL", priority="HIGH", status="PENDING", rm_id=alice.id, score=90, description="Test", lead_id=lead_alice.id if lead_alice else None, due_at=datetime.utcnow())
    bob_action = Action(title="Bob action", action_type="EMAIL", priority="LOW", status="PENDING", rm_id=bob.id, score=10, description="Test", lead_id=lead_bob.id if lead_bob else None, due_at=datetime.utcnow())
    db.add(alice_action)
    db.add(bob_action)
    db.commit()
    db.refresh(alice_action)
    db.refresh(bob_action)
    
    print('Alice Action ID:', alice_action.id)
    print('Bob Action ID:', bob_action.id)
    
    print('--- TEST ALICE FETCH HER OWN ACTIONS ---')
    code, res = fetch('/rm/me/actions', token_alice)
    print('GET /rm/me/actions (Alice):', code)
    
    print('--- TEST ALICE GET HER OWN ACTION DIRECTLY ---')
    code, res = fetch(f'/actions/{alice_action.id}', token_alice)
    print(f'GET /actions/{alice_action.id} (Alice):', code)

    print('--- TEST ALICE GET BOB ACTION (IDOR TEST) ---')
    code, res = fetch(f'/actions/{bob_action.id}', token_alice)
    print(f'GET /actions/{bob_action.id} (Alice):', code, res)
    
    print('--- TEST COMPLETE ACTION ---')
    code, res = fetch(f'/actions/{alice_action.id}/complete', token_alice, method='POST', body={"outcome": "Success"})
    print(f'POST /actions/{alice_action.id}/complete (Alice):', code)

    print('--- TEST SNOOZE ACTION ---')
    alice_action_2 = Action(title="Alice action 2", action_type="CALL", priority="HIGH", status="PENDING", rm_id=alice.id, score=90, description="Test", lead_id=lead_alice.id if lead_alice else None, due_at=datetime.utcnow())
    db.add(alice_action_2)
    db.commit()
    code, res = fetch(f'/actions/{alice_action_2.id}/snooze', token_alice, method='POST', body={"minutes": 60})
    print(f'POST /actions/{alice_action_2.id}/snooze (Alice):', code)

    print('--- TEST REASSIGN ACTION ---')
    code, res = fetch(f'/actions/{alice_action_2.id}/reassign', token_alice, method='POST', body={"new_rm_id": bob.id})
    print(f'POST /actions/{alice_action_2.id}/reassign (Alice):', code)

    print('--- TEST OUTCOME ACTION ---')
    code, res = fetch(f'/actions/{alice_action_2.id}/outcome', token_alice, method='POST', body={"outcome": "Interested"})
    print(f'POST /actions/{alice_action_2.id}/outcome (Alice):', code)

    print('--- TEST ALICE MUTATING BOB ACTION (IDOR TEST) ---')
    code, res = fetch(f'/actions/{bob_action.id}/complete', token_alice, method='POST', body={"outcome": "Success"})
    print(f'POST /actions/{bob_action.id}/complete (Alice mutating Bob):', code, res)

    print('--- TEST BOB ACCESSING HIS ACTIONS ---')
    code, res = fetch('/rm/me/actions', token_bob)
    print('GET /rm/me/actions (Bob):', code)

    print('--- TEST FRONTEND PROXY ---')
    req3 = urllib.request.Request('http://localhost:5173/api/v1/auth/login', data=json.dumps({'username':'rm_alice','password':'alicepass'}).encode(), headers={'Content-Type':'application/json'})
    try:
        resp3 = urllib.request.urlopen(req3)
        print("PROXY LOGIN:", resp3.getcode())
    except Exception as e:
        print("PROXY LOGIN ERROR:", e)
