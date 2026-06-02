import urllib.request
import json

try:
    data = json.dumps({
        "messages": [
            {"role": "system", "content": "You are a concise assistant."},
            {"role": "user", "content": "Say hello."}
        ],
        "temperature": 0.2,
        "max_tokens": 30
    }).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8080/v1/chat/completions', data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as resp:
        print('status', resp.status)
        body = resp.read().decode()
        print(body)
except Exception as e:
    print('ERROR', e)
