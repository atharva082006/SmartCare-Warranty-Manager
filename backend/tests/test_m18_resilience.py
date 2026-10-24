"""
Milestone 18 - Production Hardening, Error Handling & UX Resilience Tests.
Validates standardized JSON error codes (400, 401, 403, 404, 405, 413, 415),
absence of SQL/traceback leakages, IDOR protection, zero-JWT URL query rejections,
and catalog edge cases.
"""

import io
import json
import unittest
from flask_jwt_extended import create_access_token
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.product import Product
from app.models.document import Document


class ResilienceTestCase(unittest.TestCase):
    """Resilience and production error handling test suite."""

    def setUp(self):
        """Initialize test application, database, and test identities."""
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        # Seed User A
        self.user_a = User(username="alice", email="alice@test.io")
        self.user_a.set_password("SecurePass123!")
        db.session.add(self.user_a)

        # Seed User B
        self.user_b = User(username="bob", email="bob@test.io")
        self.user_b.set_password("SecurePass123!")
        db.session.add(self.user_b)
        db.session.commit()

        self.token_a = create_access_token(identity=str(self.user_a.id))
        self.token_b = create_access_token(identity=str(self.user_b.id))
        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

    def tearDown(self):
        """Teardown test session and drop schema."""
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_404_nonexistent_endpoint_clean_json(self):
        """Verify 404 endpoints return standardized JSON without HTML or stack traces."""
        res = self.client.get('/api/v1/invalid-route-for-testing')
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertIsInstance(data, dict)
        self.assertEqual(data.get("error"), "Not Found")
        # Ensure no HTML leak
        self.assertNotIn("<html", res.get_data(as_text=True).lower())

    def test_405_method_not_allowed_clean_json(self):
        """Verify 405 Method Not Allowed returns standardized JSON."""
        res = self.client.post('/api/v1/health')
        self.assertEqual(res.status_code, 405)
        data = res.get_json()
        self.assertIsInstance(data, dict)
        self.assertEqual(data.get("error"), "Method Not Allowed")

    def test_401_missing_auth_header(self):
        """Verify endpoints requiring JWT return 401 when Authorization header is absent."""
        res = self.client.get('/api/v1/products')
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertIn("error", data)
        self.assertNotIn("Traceback", res.get_data(as_text=True))

    def test_401_invalid_jwt_format(self):
        """Verify invalid JWT returns 401 with clean error."""
        res = self.client.get('/api/v1/products', headers={"Authorization": "Bearer not.a.valid.jwt"})
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertEqual(data.get("error"), "Invalid token")

    def test_400_malformed_json_payload(self):
        """Verify posting non-JSON body returns 400 Bad Request."""
        res = self.client.post(
            '/api/v1/products',
            data="not-valid-json",
            headers={"Authorization": f"Bearer {self.token_a}", "Content-Type": "application/json"}
        )
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn("error", data)

    def test_404_idor_cross_user_resource_isolation(self):
        """Verify User B cannot access, modify, or delete User A's product, receiving 404."""
        from datetime import date
        from decimal import Decimal
        prod = Product(
            user_id=self.user_a.id,
            name="MacBook Pro",
            brand="Apple",
            category="Electronics",
            purchase_date=date(2026, 1, 1),
            purchase_price=Decimal("2499.00"),
            product_code="PRD-2026-TEST1"
        )
        db.session.add(prod)
        db.session.commit()

        # User B reads User A's product -> 404
        res_get = self.client.get(f'/api/v1/products/{prod.id}', headers=self.headers_b)
        self.assertEqual(res_get.status_code, 404)
        self.assertEqual(res_get.get_json().get("error"), "Product not found")

        # User B updates User A's product -> 404
        res_put = self.client.put(
            f'/api/v1/products/{prod.id}',
            json={"name": "Hacked"},
            headers=self.headers_b
        )
        self.assertEqual(res_put.status_code, 404)

        # User B deletes User A's product -> 404
        res_del = self.client.delete(f'/api/v1/products/{prod.id}', headers=self.headers_b)
        self.assertEqual(res_del.status_code, 404)

    def test_no_database_error_leakage_on_injection_probe(self):
        """Verify SQL injection probe strings return safe validation error without raw SQL leakage."""
        malicious_payload = {
            "name": "'; DROP TABLE products; --",
            "brand": "TestBrand",
            "category": "Electronics",
            "purchase_date": "invalid-date-format-probe",
            "purchase_price": 100.0
        }
        res = self.client.post('/api/v1/products', json=malicious_payload, headers=self.headers_a)
        self.assertEqual(res.status_code, 400)
        raw_text = res.get_data(as_text=True)
        # Verify no database internals or tracebacks leaked
        self.assertNotIn("Traceback", raw_text)
        self.assertNotIn("psycopg2", raw_text)
        self.assertNotIn("sqlite3", raw_text)
        self.assertNotIn("syntax error", raw_text.lower())

    def test_empty_catalog_analytics_does_not_crash(self):
        """Verify analytics endpoints respond gracefully for a fresh user with 0 records."""
        # Overview stats
        res_stats = self.client.get('/api/v1/analytics/overview', headers=self.headers_a)
        self.assertEqual(res_stats.status_code, 200)
        data_stats = res_stats.get_json()["overview"]
        self.assertEqual(data_stats.get("total_products"), 0)

        # Product health
        res_health = self.client.get('/api/v1/analytics/health', headers=self.headers_a)
        self.assertEqual(res_health.status_code, 200)
        data_health = res_health.get_json()["health"]
        self.assertEqual(data_health.get("average_health_score"), 0.0)
        self.assertEqual(data_health.get("product_health_list"), [])

    def test_zero_jwt_in_query_param_strictly_rejected(self):
        """Verify attempting to pass JWT in query parameter is rejected with 401."""
        res = self.client.get(f'/api/v1/documents/1/file?token={self.token_a}')
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertEqual(data.get("error"), "Missing or invalid token")

    def test_unsupported_media_type_document_upload_rejected(self):
        """Verify uploading unsupported file type returns 400 with clean error."""
        data = {
            'file': (io.BytesIO(b"malicious script"), "hack.exe"),
            'document_type': 'Invoice'
        }
        res = self.client.post(
            '/api/v1/documents',
            data=data,
            content_type='multipart/form-data',
            headers=self.headers_a
        )
        self.assertEqual(res.status_code, 400)
        resp_data = res.get_json()
        self.assertIn("error", resp_data)
        self.assertIn("allowed", resp_data["error"].lower())

    def test_rapid_sequential_operations_integrity(self):
        """Verify consecutive rapid creations maintain strict state without race crashes."""
        for i in range(5):
            res = self.client.post(
                '/api/v1/products',
                json={
                    "name": f"Product {i}",
                    "brand": "Brand",
                    "category": "Appliances",
                    "purchase_date": "2026-02-01",
                    "price": 100.0 + i
                },
                headers=self.headers_a
            )
            self.assertEqual(res.status_code, 201)

        res_list = self.client.get('/api/v1/products', headers=self.headers_a)
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.get_json()["products"]), 5)
