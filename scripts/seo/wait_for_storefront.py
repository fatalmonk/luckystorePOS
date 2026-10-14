"""Bounded readiness wait for local verification."""
import time
import urllib.request

for attempt in range(30):
    try:
        with urllib.request.urlopen("http://127.0.0.1:3000/", timeout=2) as response:
            if response.status == 200:
                break
    except (OSError, TimeoutError):
        pass
    time.sleep(1)
else:
    raise SystemExit("Local storefront did not become ready")
