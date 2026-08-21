import urllib.request
import json

BASE_URL = 'http://localhost:8000/api/v1'

def print_step(msg):
    print(f"\n--- {msg} ---")

def make_request(method, endpoint, headers=None, json_data=None):
    url = BASE_URL + endpoint
    data = json.dumps(json_data).encode('utf-8') if json_data else None
    req = urllib.request.Request(url, data=data, method=method)
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    if json_data:
        req.add_header('Content-Type', 'application/json')
    try:
        res = urllib.request.urlopen(req)
        return res.status, json.loads(res.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8')) if e.read() else str(e)
    except Exception as e:
        return 500, str(e)

def run_tests():
    print_step("4 & 5. Login using rm_alice / alicepass and Verify JWT")
    status, data = make_request('POST', '/auth/login', json_data={"username": "rm_alice", "password": "alicepass"})
    if status != 200:
        print("ALICE LOGIN FAILED:", data)
        return
    alice_token = data.get('access_token')
    print("ALICE LOGIN SUCCESS. Token:", alice_token[:15] + "...")
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    print_step("6. Use Alice's token to access Alice's own actions")
    status, data = make_request('GET', '/rm/me/actions', headers=alice_headers)
    if status == 200:
        alice_actions = data
        print(f"Alice has {len(alice_actions)} actions.")
        alice_action_id = alice_actions[0]['id'] if alice_actions else None
        print("Alice's Action ID:", alice_action_id)
    else:
        print("Failed to get Alice's actions:", data)
        return

    print_step("8. Login using rm_bob / bobpass")
    status, data = make_request('POST', '/auth/login', json_data={"username": "rm_bob", "password": "bobpass"})
    if status != 200:
        print("BOB LOGIN FAILED:", data)
        return
    bob_token = data.get('access_token')
    print("BOB LOGIN SUCCESS.")
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    print_step("9. Verify Bob can access his own actions")
    status, data = make_request('GET', '/rm/me/actions', headers=bob_headers)
    if status == 200:
        bob_actions = data
        print(f"Bob has {len(bob_actions)} actions.")
        bob_action_id = bob_actions[0]['id'] if bob_actions else None
        print("Bob's Action ID:", bob_action_id)
    else:
        print("Failed to get Bob's actions:", data)
        return

    if bob_action_id:
        print_step("7. Use Alice's token to access/modify Bob's action -> MUST return 403")
        status, data = make_request('POST', f'/actions/{bob_action_id}/complete', headers=alice_headers, json_data={"notes":"test"})
        print(f"Alice trying to complete Bob's action. Status: {status}")
        if status == 403:
            print("SUCCESS: 403 Forbidden correctly returned for cross-RM access.")
        else:
            print(f"FAIL: Expected 403, got {status}. Response: {data}")

    if alice_action_id:
        print_step("10. Test Complete, Snooze, Reassign and Outcome on Alice's action")
        
        # Snooze
        status, data = make_request('POST', f'/actions/{alice_action_id}/snooze', headers=alice_headers, json_data={"minutes": 60})
        print("Snooze status:", status, data)

        # Outcome
        status, data = make_request('POST', f'/actions/{alice_action_id}/outcome', headers=alice_headers, json_data={"outcome": "Interested in new policy"})
        print("Outcome status:", status, data)

        # Reassign (need another RM ID, let's say bob's RM ID is something, but we just pass an ID)
        bob_rm_id = bob_actions[0]['rm_id'] if bob_actions else 2
        status, data = make_request('POST', f'/actions/{alice_action_id}/reassign', headers=alice_headers, json_data={"new_rm_id": bob_rm_id})
        print("Reassign status:", status, data)

        # Complete
        status, data = make_request('POST', f'/actions/{alice_action_id}/complete', headers=alice_headers, json_data={"notes": "All done"})
        print("Complete status:", status, data)

run_tests()
