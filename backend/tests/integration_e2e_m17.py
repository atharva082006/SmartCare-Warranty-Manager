"""
Milestone 17 Live Integration Test Script.
Performs end-to-end validation of the frontend-backend communication protocol,
JWT authentication, product/warranty/service/document/OCR flows, analytics,
multi-user isolation, and error handling against the running Flask server.
"""

import io
import json
import time
import urllib.request
import urllib.error
import urllib.parse

BASE_URL = "http://127.0.0.1:5000/api/v1"

def api_request(endpoint, method="GET", data=None, token=None, files=None, content_type=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = None
    if files:
        # Simple multipart form construction
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
        body = json.dumps(data).encode("utf-8")
        
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
    print("SMARTCARE MILESTONE 17 — LIVE INTEGRATION TEST SUITE")
    print("=" * 60)
    
    timestamp = int(time.time())
    email_a = f"user_a_{timestamp}@smartcare.local"
    email_b = f"user_b_{timestamp}@smartcare.local"
    password = "SecurePassword123!"

    # 1. Register User A
    print("\n[1] Registering User A...")
    code, res = api_request("/auth/register", method="POST", data={
        "username": f"user_a_{timestamp}",
        "email": email_a,
        "password": password,
        "phone": "+91 98765 43210"
    })
    assert code == 201, f"Expected 201, got {code}: {res}"
    print(f"  [OK] User A registered successfully: id={res['user']['id']}")

    # 2. Login User A
    print("\n[2] Logging in User A...")
    code, res = api_request("/auth/login", method="POST", data={
        "email": email_a,
        "password": password
    })
    assert code == 200, f"Expected 200, got {code}: {res}"
    token_a = res["access_token"]
    user_a_id = res["user"]["id"]
    print(f"  [OK] Login successful, received JWT access_token")

    # 3. Test /auth/me
    print("\n[3] Verifying session with /auth/me...")
    code, res = api_request("/auth/me", method="GET", token=token_a)
    assert code == 200, f"Expected 200, got {code}: {res}"
    assert res["user"]["email"] == email_a
    print(f"  [OK] /auth/me verified identity for {email_a}")

    # 4. Create Product
    print("\n[4] Creating product for User A...")
    product_payload = {
        "name": "Smart QLED Television 55-inch",
        "brand": "Samsung",
        "category": "Television",
        "model": "QA55QN90B",
        "serial_number": f"SN-SAM-{timestamp}",
        "purchase_date": "2025-06-15",
        "purchase_price": 74990.00,
        "warranty_period": 24,
        "notes": "Purchased from Samsung Flagship Store."
    }
    code, res = api_request("/products", method="POST", data=product_payload, token=token_a)
    assert code == 201, f"Expected 201, got {code}: {res}"
    product_id = res["id"]
    product_code = res["product_code"]
    print(f"  [OK] Product created: id={product_id}, product_code={product_code}")

    # 5. List Products
    print("\n[5] Listing products...")
    code, res = api_request("/products", method="GET", token=token_a)
    assert code == 200, f"Expected 200, got {code}: {res}"
    assert any(p["id"] == product_id for p in res["products"])
    print(f"  [OK] Product list returned {len(res['products'])} product(s)")

    # 6. Update Product
    print("\n[6] Updating product...")
    code, res = api_request(f"/products/{product_id}", method="PUT", data={
        "notes": "Updated: Wall mount installation verified."
    }, token=token_a)
    assert code == 200, f"Expected 200, got {code}: {res}"
    assert "Wall mount" in res["notes"]
    print(f"  [OK] Product updated successfully")

    # 7. Create Warranty
    print("\n[7] Creating warranty for product...")
    warranty_payload = {
        "product_id": product_id,
        "start_date": "2025-06-15",
        "end_date": "2027-06-15",
        "type": "Comprehensive Manufacturer Warranty",
        "coverage": "Panel, motherboard, audio drivers, power supply units.",
        "is_active": True
    }
    code, res = api_request("/warranties", method="POST", data=warranty_payload, token=token_a)
    assert code == 201, f"Expected 201, got {code}: {res}"
    warranty_id = res["id"]
    print(f"  [OK] Warranty created: id={warranty_id}, status={res['status']}, days_remaining={res['days_remaining']}")

    # 8. List Warranties
    print("\n[8] Listing warranties...")
    code, res = api_request(f"/warranties?product_id={product_id}", method="GET", token=token_a)
    assert code == 200, f"Expected 200, got {code}: {res}"
    assert len(res["warranties"]) >= 1
    print(f"  [OK] Scoped warranty listing verified: {len(res['warranties'])} policy found")

    # 9. Create Service Record
    print("\n[9] Logging service record...")
    service_payload = {
        "product_id": product_id,
        "service_date": "2026-02-10",
        "cost": 1250.00,
        "type": "Maintenance",
        "provider": "Samsung Care Authorized Hub",
        "description": "Routine scheduled preventive calibration and firmware upgrade.",
        "status": "COMPLETED"
    }
    code, res = api_request("/service-records", method="POST", data=service_payload, token=token_a)
    assert code == 201, f"Expected 201, got {code}: {res}"
    service_id = res["id"]
    print(f"  [OK] Service record logged: id={service_id}, cost=INR {res['cost']}")

    # 10. Upload Document
    print("\n[10] Uploading document attachment (multipart/form-data)...")
    from PIL import Image, ImageDraw
    img = Image.new('RGB', (300, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), "Invoice INV-2026-9999 Total INR 5000", fill=(0, 0, 0))
    img_buf = io.BytesIO()
    img.save(img_buf, format='PNG')
    fake_png = img_buf.getvalue()

    code, res = api_request(
        "/documents",
        method="POST",
        data={
            "product_id": str(product_id),
            "name": "Samsung Tax Invoice",
            "document_type": "Invoice",
            "description": "Retail tax invoice"
        },
        files={
            "file": ("samsung_invoice.png", fake_png, "image/png")
        },
        token=token_a
    )
    assert code == 201, f"Expected 201, got {code}: {res}"
    doc_id = res["id"]
    print(f"  [OK] Document uploaded: id={doc_id}, file_name={res['file_name']}, ocr_status={res.get('ocr_status')}")

    # 11. Stream / Download Document File via Authorization Header
    print("\n[11] Verifying authenticated document download via Authorization header...")
    code, content = api_request(f"/documents/{doc_id}/file", method="GET", token=token_a)
    assert code == 200, f"Expected 200 with Authorization header, got {code}"
    assert len(content) == len(fake_png), "Downloaded image did not match uploaded PNG content"
    print(f"  [OK] Document file streamed successfully ({len(content)} bytes) via Authorization header")

    # 11b. Verify query parameter token access is strictly REJECTED (Security Hardening)
    print("\n[11b] Verifying query parameter tokens are strictly REJECTED without Authorization header...")
    code_no_auth, _ = api_request(f"/documents/{doc_id}/file", method="GET")
    assert code_no_auth == 401, f"Expected 401 for unauthenticated request, got {code_no_auth}"

    code_query_token, _ = api_request(f"/documents/{doc_id}/file?token={token_a}", method="GET")
    assert code_query_token == 401, f"Security Violation: Query param ?token= must NOT authenticate, got {code_query_token}"

    code_access_token, _ = api_request(f"/documents/{doc_id}/file?access_token={token_a}", method="GET")
    assert code_access_token == 401, f"Security Violation: Query param ?access_token= must NOT authenticate, got {code_access_token}"

    code_jwt, _ = api_request(f"/documents/{doc_id}/file?jwt={token_a}", method="GET")
    assert code_jwt == 401, f"Security Violation: Query param ?jwt= must NOT authenticate, got {code_jwt}"
    print(f"  [OK] Token-in-query attempts strictly rejected with 401 Unauthorized")

    # 12. Run OCR Processing
    print("\n[12] Triggering OCR text extraction...")
    code, res = api_request(f"/ocr/documents/{doc_id}/process", method="POST", token=token_a)
    assert code in (200, 400, 422, 503), f"Expected OCR response (200, 400, 422, 503), got {code}: {res}"
    print(f"  [OK] OCR processing route responded: status={code}")

    # 13. Check Product Health API
    print("\n[13] Verifying Product Health score endpoint...")
    code, res = api_request(f"/health/products/{product_id}", method="GET", token=token_a)
    assert code == 200, f"Expected 200, got {code}: {res}"
    health_score = res["health"]["score"]
    status_label = res["health"]["status_label"]
    print(f"  [OK] Deterministic health score computed: {health_score}/100 ({status_label})")

    # 14. Check Analytics Overview & Attention
    print("\n[14] Checking Analytics endpoints...")
    code, res_overview = api_request("/analytics/overview", method="GET", token=token_a)
    assert code == 200
    assert res_overview["overview"]["total_products"] >= 1
    print(f"  [OK] Analytics overview: total_products={res_overview['overview']['total_products']}, active_warranties={res_overview['overview']['active_warranties']}")

    code, res_attention = api_request("/analytics/attention", method="GET", token=token_a)
    assert code == 200
    print(f"  [OK] Analytics attention items: {len(res_attention.get('attention_items', []))} item(s)")

    # 15. Multi-User Isolation / IDOR Protection
    print("\n[15] Testing Multi-User Data Isolation with User B...")
    code, res = api_request("/auth/register", method="POST", data={
        "username": f"user_b_{timestamp}",
        "email": email_b,
        "password": password
    })
    assert code == 201

    code, res = api_request("/auth/login", method="POST", data={
        "email": email_b,
        "password": password
    })
    assert code == 200
    token_b = res["access_token"]

    # User B should NOT see User A's product
    code, res = api_request(f"/products/{product_id}", method="GET", token=token_b)
    assert code == 404, f"IDOR Vulnerability: Expected 404 for User B accessing User A product, got {code}"
    print("  [OK] User B received 404 for User A's product (IDOR protected)")

    # User B should NOT access User A's warranty
    code, res = api_request(f"/warranties/{warranty_id}", method="GET", token=token_b)
    assert code == 404, f"IDOR Vulnerability: Expected 404 for User B accessing User A warranty, got {code}"
    print("  [OK] User B received 404 for User A's warranty (IDOR protected)")

    # User B should NOT access User A's document file
    code, res = api_request(f"/documents/{doc_id}/file", method="GET", token=token_b)
    assert code == 404, f"IDOR Vulnerability: Expected 404 for User B accessing User A document file, got {code}"
    print("  [OK] User B received 404 for User A's document file (IDOR protected)")

    # 16. Cascade Deletion Verification
    print("\n[16] Verifying Cascade Deletion...")
    code, res = api_request(f"/products/{product_id}", method="DELETE", token=token_a)
    assert code == 200, f"Expected 200, got {code}: {res}"
    print(f"  [OK] Product {product_id} deleted")

    # Associated warranty should now be gone (404)
    code, res = api_request(f"/warranties/{warranty_id}", method="GET", token=token_a)
    assert code == 404, f"Expected warranty to be cascade-deleted, got {code}"
    print("  [OK] Warranty was cascade deleted")

    # Associated document should now be gone (404)
    code, res = api_request(f"/documents/{doc_id}", method="GET", token=token_a)
    assert code == 404, f"Expected document to be cascade-deleted, got {code}"
    print("  [OK] Document was cascade deleted")

    # 17. Frontend Source-Code Security Audit (Zero JWTs in URLs)
    print("\n[17] Running Static Security Audit on Frontend Source Code (src/)...")
    import os, pathlib
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

    assert len(violations) == 0, f"Security Audit Failed: Found token-in-URL violations in frontend:\n" + "\n".join(violations)
    print("  [OK] Security Audit PASSED: 0 token-in-URL violations across all frontend source files.")

    print("\n" + "=" * 60)
    print("ALL MILESTONE 17 INTEGRATION & SECURITY TESTS PASSED! [OK][OK][OK]")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
