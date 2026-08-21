import urllib.request
import json
req = urllib.request.Request('http://localhost:8000/api/v1/auth/login', data=json.dumps({'username':'rm_alice','password':'alicepass'}).encode('utf-8'), headers={'Content-Type':'application/json'})
try:
    response = urllib.request.urlopen(req, timeout=5)
    print("DIRECT:", response.read().decode('utf-8'))
except Exception as e:
    print("DIRECT ERROR:", e)

req2 = urllib.request.Request('http://localhost:5173/api/v1/auth/login', data=json.dumps({'username':'rm_alice','password':'alicepass'}).encode('utf-8'), headers={'Content-Type':'application/json'})
try:
    response2 = urllib.request.urlopen(req2, timeout=5)
    print("PROXY:", response2.read().decode('utf-8'))
except Exception as e:
    print("PROXY ERROR:", e)
