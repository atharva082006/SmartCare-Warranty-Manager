"""
SmartCare Demo Seed & Atharv Raykar Verification Test Suite.
Verifies:
1. Atharv Raykar account creation as a NORMAL USER (no admin role).
2. Standard authentication through POST /api/v1/auth/login and JWT generation.
3. Seeding of exactly 10 products, 10 warranties, 18 service records, and 12 documents.
4. Ownership of all demo entities by Atharv.
5. User data isolation (User B sees 0 records, IDOR access returns 404).
6. Idempotency (re-running seed_demo_data produces 0 duplicate records).
7. Live analytics and deterministic Product Health Scores derived from seeded records.
"""

import os
import shutil
import unittest
from flask_jwt_extended import create_access_token
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.product import Product
from app.models.warranty import Warranty
from app.models.service_record import ServiceRecord
from app.models.document import Document
from app.models.ocr_result import OCRResult
from scripts.seed_demo import (
    seed_demo_data,
    DEMO_USER_EMAIL,
    DEMO_USER_USERNAME,
    DEMO_USER_PASSWORD,
)


class DemoSeedTestCase(unittest.TestCase):
    """Test suite for verifying the college demo user and restored demo dataset."""

    def setUp(self):
        """Configure test application, clean database, and seed demo dataset."""
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        # Run seed
        seed_demo_data(self.app, verbose=False)

        # Retrieve Atharv
        self.atharv = User.query.filter_by(email=DEMO_USER_EMAIL).first()
        self.assertIsNotNone(self.atharv)

        # Create separate normal User B
        self.user_b = User(username="other_student", email="student_b@smartcare.io")
        self.user_b.set_password("student_pass_123")
        db.session.add(self.user_b)
        db.session.commit()

        self.token_b = create_access_token(identity=str(self.user_b.id))
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

    def tearDown(self):
        """Clean up database, files, and application context."""
        db.session.remove()
        db.drop_all()
        # Clean up test upload files
        upload_dir = self.app.config.get('UPLOAD_FOLDER')
        if upload_dir and os.path.exists(upload_dir):
            shutil.rmtree(upload_dir, ignore_errors=True)
        self.ctx.pop()

    def test_01_atharv_is_normal_user_without_admin_role(self):
        """1. Verify Atharv Raykar is a normal user with no admin profile or privileges."""
        self.assertEqual(self.atharv.email, DEMO_USER_EMAIL)
        self.assertEqual(self.atharv.username, DEMO_USER_USERNAME)
        # Verify no admin attributes exist on the User model
        self.assertFalse(hasattr(self.atharv, 'role'))
        self.assertFalse(hasattr(self.atharv, 'is_admin'))
        self.assertFalse(hasattr(self.atharv, 'is_superuser'))
        user_dict = self.atharv.to_dict()
        self.assertNotIn('role', user_dict)
        self.assertNotIn('password', user_dict)
        self.assertNotIn('password_hash', user_dict)

    def test_02_atharv_login_via_real_endpoint(self):
        """2. Verify Atharv authenticates via standard POST /api/v1/auth/login."""
        res = self.client.post('/api/v1/auth/login', json={
            "email": DEMO_USER_EMAIL,
            "password": DEMO_USER_PASSWORD
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["email"], DEMO_USER_EMAIL)
        self.assertEqual(data["user"]["username"], DEMO_USER_USERNAME)

    def test_03_exact_ten_products_seeded(self):
        """3. Verify exactly 10 demo products are created and owned by Atharv."""
        products = Product.query.filter_by(user_id=self.atharv.id).all()
        self.assertEqual(len(products), 10)
        codes = [p.product_code for p in products]
        expected_codes = [f"PRD-2026-{i:05d}" for i in range(1, 11)]
        self.assertEqual(sorted(codes), sorted(expected_codes))

    def test_04_exact_ten_warranties_seeded(self):
        """4. Verify exactly 10 warranties are created for Atharv's products."""
        warranties = (
            Warranty.query
            .join(Product, Warranty.product_id == Product.id)
            .filter(Product.user_id == self.atharv.id)
            .all()
        )
        self.assertEqual(len(warranties), 10)

    def test_05_exact_eighteen_service_records_seeded(self):
        """5. Verify exactly 18 service records are created for Atharv's products."""
        services = (
            ServiceRecord.query
            .join(Product, ServiceRecord.product_id == Product.id)
            .filter(Product.user_id == self.atharv.id)
            .all()
        )
        self.assertEqual(len(services), 18)

    def test_06_exact_twelve_documents_seeded(self):
        """6. Verify exactly 12 documents are created for Atharv's products."""
        documents = (
            Document.query
            .join(Product, Document.product_id == Product.id)
            .filter(Product.user_id == self.atharv.id)
            .all()
        )
        self.assertEqual(len(documents), 12)

    def test_07_ocr_results_seeded(self):
        """7. Verify OCR results are seeded and linked to Atharv's completed documents."""
        ocr_records = (
            OCRResult.query
            .join(Document, OCRResult.document_id == Document.id)
            .join(Product, Document.product_id == Product.id)
            .filter(Product.user_id == self.atharv.id)
            .all()
        )
        self.assertGreaterEqual(len(ocr_records), 7)
        for ocr in ocr_records:
            self.assertEqual(ocr.status, "COMPLETED")
            self.assertTrue(bool(ocr.extracted_text))
            self.assertIsInstance(ocr.entities_json, dict)

    def test_08_user_isolation_for_user_b(self):
        """8. Verify another normal user sees 0 of Atharv's products and receives 404 on IDOR."""
        # User B queries their own products list
        res = self.client.get('/api/v1/products', headers=self.headers_b)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.get_json().get("products", [])), 0)

        # User B attempts to access one of Atharv's products
        atharv_prod = Product.query.filter_by(user_id=self.atharv.id).first()
        res_detail = self.client.get(f'/api/v1/products/{atharv_prod.id}', headers=self.headers_b)
        self.assertEqual(res_detail.status_code, 404)

        # User B queries their warranties list
        res_war = self.client.get('/api/v1/warranties', headers=self.headers_b)
        self.assertEqual(res_war.status_code, 200)
        self.assertEqual(len(res_war.get_json().get("warranties", [])), 0)

        # User B queries their service records list
        res_srv = self.client.get('/api/v1/service-records', headers=self.headers_b)
        self.assertEqual(res_srv.status_code, 200)
        self.assertEqual(len(res_srv.get_json().get("service_records", [])), 0)

        # User B queries their documents list
        res_doc = self.client.get('/api/v1/documents', headers=self.headers_b)
        self.assertEqual(res_doc.status_code, 200)
        self.assertEqual(len(res_doc.get_json().get("documents", [])), 0)

    def test_09_seed_idempotency_creates_zero_duplicates(self):
        """9. Verify running seed_demo_data a second time creates no duplicates and preserves data."""
        # Initial counts
        prod_count_1 = Product.query.filter_by(user_id=self.atharv.id).count()
        war_count_1 = Warranty.query.join(Product).filter(Product.user_id == self.atharv.id).count()
        srv_count_1 = ServiceRecord.query.join(Product).filter(Product.user_id == self.atharv.id).count()
        doc_count_1 = Document.query.join(Product).filter(Product.user_id == self.atharv.id).count()
        ocr_count_1 = OCRResult.query.join(Document).join(Product).filter(Product.user_id == self.atharv.id).count()

        # Run seed a second time
        res = seed_demo_data(self.app, verbose=False)

        # Verify counts remained completely identical
        self.assertEqual(Product.query.filter_by(user_id=self.atharv.id).count(), prod_count_1)
        self.assertEqual(Warranty.query.join(Product).filter(Product.user_id == self.atharv.id).count(), war_count_1)
        self.assertEqual(ServiceRecord.query.join(Product).filter(Product.user_id == self.atharv.id).count(), srv_count_1)
        self.assertEqual(Document.query.join(Product).filter(Product.user_id == self.atharv.id).count(), doc_count_1)
        self.assertEqual(OCRResult.query.join(Document).join(Product).filter(Product.user_id == self.atharv.id).count(), ocr_count_1)

    def test_10_analytics_derived_from_seeded_data(self):
        """10. Verify analytics endpoints return metrics derived from live records."""
        token_a = create_access_token(identity=str(self.atharv.id))
        headers_a = {"Authorization": f"Bearer {token_a}"}

        res = self.client.get('/api/v1/analytics/overview', headers=headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("overview", data)
        self.assertEqual(data["overview"]["total_products"], 10)
        self.assertIn("total_service_cost", data["overview"])

    def test_11_health_scores_derived_from_seeded_data(self):
        """11. Verify health score endpoints compute deterministic scores from live records."""
        token_a = create_access_token(identity=str(self.atharv.id))
        headers_a = {"Authorization": f"Bearer {token_a}"}

        res = self.client.get('/api/v1/health/products', headers=headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("summary", data)
        self.assertGreater(data["summary"]["average_health_score"], 0)
        self.assertIn("products", data)
        self.assertEqual(len(data["products"]), 10)


if __name__ == '__main__':
    unittest.main()
