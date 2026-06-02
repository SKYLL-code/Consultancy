import urllib.request
import json

try:
    data = json.dumps({"prompt": "Hello from backend test"}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:3000/local-ai-chat', data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as resp:
        print('status', resp.status)
        print(resp.read().decode())
except Exception as e:
    print('ERROR', e)
    import traceback
    traceback.print_exc()
