"""
Milestone 18 Live End-to-End Hardening & UX Resilience Test Script.
Validates live HTTP responses, error payload schemas, IDOR protection,
input validation, zero-token URLs, and graceful error handling on the running Flask server.
"""

import io
import json
import os
import sys
import time
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:5000/api/v1"

def api_request(endpoint, method="GET", data=None, token=None, files=None, content_type=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = None
    if files:
        boundary = "----SmartCareBoundary" + str(int(time.time()))
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        buffer = io.BytesIO()
        for k, v in (data or {}).items():
            buffer.write(f"--{boundary}\r\n".encode())
            buffer.write(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode())
            buffer.write(f"{v}\r\n".encode())
        for field, (fname, fcontent, ftype) in files.items():
            buffer.write(f"--{boundary}\r\n".encode())
            buffer.write(f'Content-Disposition: form-data; name="{field}"; filename="{fname}"\r\n'.encode())
            buffer.write(f"Content-Type: {ftype}\r\n\r\n".encode())
            buffer.write(fcontent if isinstance(fcontent, bytes) else fcontent.encode())
            buffer.write(b"\r\n")
        buffer.write(f"--{boundary}--\r\n".encode())
        body = buffer.getvalue()
    elif data is not None:
        headers["Content-Type"] = content_type or "application/json"
        body = json.dumps(data).encode("utf-8") if isinstance(data, dict) else (data.encode("utf-8") if isinstance(data, str) else data)

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            resp_body = resp.read()
            ct = resp.headers.get("Content-Type", "")
            if "application/json" in ct:
                return resp.status, json.loads(resp_body.decode("utf-8"))
            return resp.status, resp_body
    except urllib.error.HTTPError as e:
        err_body = e.read()
        try:
            return e.code, json.loads(err_body.decode("utf-8"))
        except Exception:
            return e.code, err_body.decode("utf-8")

def run_tests():
    print("=" * 60)
    print("SMARTCARE MILESTONE 18 — LIVE HARDENING & RESILIENCE TEST SUITE")
    print("=" * 60)

    # 1. Health check
    print("\n[1] Verifying Backend Health...")
    status, body = api_request("/health")
    assert status == 200, f"Expected 200 from /health, got {status}"
    assert body.get("status") == "ok", f"Expected ok status, got {body}"
    print("  [OK] Health check passed.")

    # 2. 404 on non-existent endpoint
    print("\n[2] Verifying 404 on non-existent route returns clean JSON...")
    status, body = api_request("/nonexistent-route-for-resilience-check")
    assert status == 404, f"Expected 404, got {status}"
    assert isinstance(body, dict), f"Expected JSON dict, got {body}"
    assert body.get("error") == "Not Found", f"Expected error 'Not Found', got {body}"
    print("  [OK] 404 response formatted as clean JSON.")

    # 3. 405 Method Not Allowed
    print("\n[3] Verifying 405 Method Not Allowed on read-only endpoints...")
    status, body = api_request("/health", method="POST", data={"foo": "bar"})
    assert status == 405, f"Expected 405, got {status}"
    assert isinstance(body, dict), f"Expected JSON dict, got {body}"
    assert body.get("error") == "Method Not Allowed", f"Expected 'Method Not Allowed', got {body}"
    print("  [OK] 405 response formatted as clean JSON.")

    # 4. 401 on protected endpoint without token
    print("\n[4] Verifying 401 on protected routes without Authorization header...")
    status, body = api_request("/products")
    assert status == 401, f"Expected 401, got {status}"
    assert isinstance(body, dict), f"Expected JSON dict, got {body}"
    print("  [OK] Missing Authorization correctly returns 401 JSON.")

    # 5. Register and login a test user
    uid = str(int(time.time()))
    email = f"m18_user_{uid}@smartcare.local"
    password = "ResiliencePassword123!"
    print(f"\n[5] Registering and authenticating test user: {email}...")
    status, reg_body = api_request("/auth/register", method="POST", data={
        "username": f"user_{uid}",
        "email": email,
        "password": password
    })
    assert status == 201, f"Expected 201, got {status} ({reg_body})"
    status, login_body = api_request("/auth/login", method="POST", data={
        "email": email,
        "password": password
    })
    assert status == 200, f"Expected 200, got {status}"
    token = login_body["access_token"]
    print("  [OK] User registered and authenticated.")

    # 6. Malformed JSON handling
    print("\n[6] Verifying 400 Bad Request on malformed JSON payload...")
    status, body = api_request("/products", method="POST", data="this is not json", token=token, content_type="application/json")
    assert status == 400, f"Expected 400, got {status}"
    assert isinstance(body, dict) and "error" in body, f"Expected error JSON, got {body}"
    print("  [OK] Malformed JSON safely caught and rejected with 400.")

    # 7. Invalid fields / validation failure
    print("\n[7] Verifying 400 on invalid product validation (missing fields)...")
    status, body = api_request("/products", method="POST", data={"brand": "TestBrand"}, token=token)
    assert status == 400, f"Expected 400, got {status}"
    assert "error" in body, f"Expected error field, got {body}"
    print("  [OK] Missing required fields properly rejected with 400.")

    # 8. SQL Injection probe safety
    print("\n[8] Verifying SQL Injection probe does not leak tracebacks or schema...")
    probe_payload = {
        "name": "' OR '1'='1; DROP TABLE products; --",
        "brand": "SafeBrand",
        "category": "Electronics",
        "purchase_date": "not-a-valid-date-probe",
        "price": 199.99
    }
    status, body = api_request("/products", method="POST", data=probe_payload, token=token)
    assert status == 400, f"Expected 400 validation error, got {status}"
    body_str = json.dumps(body)
    assert "Traceback" not in body_str, "Traceback leaked!"
    assert "psycopg2" not in body_str, "Database driver details leaked!"
    assert "syntax error" not in body_str.lower(), "SQL syntax error leaked!"
    print("  [OK] Injection probe handled safely without leakage.")

    # 9. Create valid product and test IDOR
    print("\n[9] Creating valid product and verifying IDOR protection with secondary user...")
    status, prod_body = api_request("/products", method="POST", data={
        "name": "Resilience Monitor",
        "brand": "LG",
        "category": "Electronics",
        "purchase_date": "2026-01-15",
        "price": 499.00
    }, token=token)
    assert status == 201, f"Expected 201, got {status}"
    prod_id = prod_body["id"]

    # Register user 2
    email_2 = f"m18_user2_{uid}@smartcare.local"
    status, reg2_body = api_request("/auth/register", method="POST", data={
        "username": f"user2_{uid}",
        "email": email_2,
        "password": password
    })
    assert status == 201, f"Expected 201, got {status}"
    status, login2_body = api_request("/auth/login", method="POST", data={
        "email": email_2,
        "password": password
    })
    assert status == 200, f"Expected 200, got {status}"
    token_2 = login2_body["access_token"]

    # User 2 tries to GET, PUT, DELETE User 1's product -> 404
    status_get, _ = api_request(f"/products/{prod_id}", token=token_2)
    assert status_get == 404, f"Expected 404 for cross-user GET, got {status_get}"
    status_put, _ = api_request(f"/products/{prod_id}", method="PUT", data={"name": "Hacked"}, token=token_2)
    assert status_put == 404, f"Expected 404 for cross-user PUT, got {status_put}"
    status_del, _ = api_request(f"/products/{prod_id}", method="DELETE", token=token_2)
    assert status_del == 404, f"Expected 404 for cross-user DELETE, got {status_del}"
    print("  [OK] IDOR cross-user protection confirmed (all 404).")

    # 10. Zero-JWT in URL query parameter verification
    print("\n[10] Verifying Zero-JWT in query parameter rejection...")
    status_query, _ = api_request(f"/documents/1/file?token={token}")
    assert status_query == 401, f"Expected 401 for token-in-query, got {status_query}"
    print("  [OK] Token-in-query attempt strictly rejected with 401.")

    # 11. Static Frontend Audit for zero token-in-url
    print("\n[11] Running comprehensive static audit on frontend source code (src/)...")
    import pathlib
    src_dir = pathlib.Path(__file__).resolve().parent.parent.parent / "src"
    violations = []
    forbidden_patterns = ["?token=", "?access_token=", "?jwt=", "&token=", "&access_token=", "&jwt="]
    for root, _, files in os.walk(src_dir):
        for fname in files:
            if fname.endswith((".js", ".jsx", ".ts", ".tsx")):
                fpath = os.path.join(root, fname)
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    for pattern in forbidden_patterns:
                        if pattern in content:
                            violations.append(f"{fpath} contains forbidden pattern '{pattern}'")

    assert len(violations) == 0, f"Token violations found: {violations}"
    print("  [OK] Frontend static audit PASSED: 0 token-in-URL occurrences in src/.")

    # 12. Cleanup
    api_request(f"/products/{prod_id}", method="DELETE", token=token)
    print("\n[12] Cleanup completed.")

    print("\n" + "=" * 60)
    print("ALL MILESTONE 18 LIVE RESILIENCE TESTS PASSED! [OK][OK][OK]")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
