import urllib.request

try:
    r = urllib.request.urlopen("http://127.0.0.1:8080/")
    print('status', r.status)
    print(r.read().decode())
except Exception as e:
    print('ERROR', e)
