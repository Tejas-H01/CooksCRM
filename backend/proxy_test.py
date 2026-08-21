import urllib.request
import urllib.error
import json

try:
    req = urllib.request.Request('http://localhost:5173/api/v1/auth/login', data=json.dumps({'username':'rm_alice','password':'alicepass'}).encode(), headers={'Content-Type':'application/json'})
    resp = urllib.request.urlopen(req)
    print("PROXY LOGIN:", resp.getcode())
    print("RESPONSE:", resp.read().decode())
except urllib.error.HTTPError as e:
    print("PROXY LOGIN ERROR HTTP:", e.code, e.read().decode())
except Exception as e:
    print("PROXY LOGIN ERROR:", e)
