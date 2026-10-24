"""
Analytics API and Service Tests.
Verifies dashboard overview, warranty metrics, service spending, monthly trends,
product distributions, document/OCR counts, attention items, Decimal safety, and user isolation.
"""

import unittest
from datetime import date
from decimal import Decimal
from flask_jwt_extended import create_access_token
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.product import Product
from app.models.warranty import Warranty
from app.models.service_record import ServiceRecord
from app.models.document import Document
from app.models.ocr_result import OCRResult


class AnalyticsTestCase(unittest.TestCase):
    """Test suite for analytics endpoints, aggregations, user isolation, and monetary safety."""

    def setUp(self):
        """Configure test client, in-memory database, and user fixtures."""
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        # Seed Users
        self.user_a = User(username="usera", email="usera@example.com")
        self.user_a.set_password("password123")
        db.session.add(self.user_a)

        self.user_b = User(username="userb", email="userb@example.com")
        self.user_b.set_password("password123")
        db.session.add(self.user_b)
        db.session.commit()

        self.token_a = create_access_token(identity=str(self.user_a.id))
        self.token_b = create_access_token(identity=str(self.user_b.id))
        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

    def tearDown(self):
        """Clean up database and context."""
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    # -------------------------------------------------------------
    # 1. Authentication Tests
    # -------------------------------------------------------------

    def test_unauthenticated_analytics_endpoints_rejected(self):
        """Ensure all 7 analytics endpoints reject unauthenticated requests with 401."""
        endpoints = [
            '/api/v1/analytics/overview',
            '/api/v1/analytics/warranties',
            '/api/v1/analytics/services',
            '/api/v1/analytics/products',
            '/api/v1/analytics/documents',
            '/api/v1/analytics/health',
            '/api/v1/analytics/attention'
        ]
        for ep in endpoints:
            res = self.client.get(ep)
            self.assertEqual(res.status_code, 401, f"Endpoint {ep} failed to reject unauthenticated request")

    # -------------------------------------------------------------
    # 2. Overview Analytics
    # -------------------------------------------------------------

    def test_overview_analytics_empty_data(self):
        """Ensure /overview returns safe zero metrics for a new user."""
        res = self.client.get('/api/v1/analytics/overview', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["overview"]
        self.assertEqual(data["total_products"], 0)
        self.assertEqual(data["active_warranties"], 0)
        self.assertEqual(data["total_service_records"], 0)
        self.assertEqual(data["total_service_cost"], "0.00")
        self.assertEqual(data["average_service_cost"], "0.00")
        self.assertEqual(data["total_documents"], 0)

    def test_overview_analytics_with_data_and_cancelled_exclusion(self):
        """Ensure overview counts correctly and excludes cancelled service costs."""
        p = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="Laptop",
            brand="Dell",
            category="Computers",
            purchase_date=date(2026, 1, 1),
            purchase_price=Decimal("1200.00")
        )
        db.session.add(p)
        db.session.commit()

        # Add Active Warranty (future date)
        w = Warranty(product_id=p.id, start_date=date(2026, 1, 1), end_date=date(2027, 1, 1))
        # Add Completed Service Record ($100.00)
        s1 = ServiceRecord(product_id=p.id, service_date=date(2026, 2, 1), cost=Decimal("100.00"), status="COMPLETED")
        # Add Cancelled Service Record ($500.00)
        s2 = ServiceRecord(product_id=p.id, service_date=date(2026, 3, 1), cost=Decimal("500.00"), status="CANCELLED")
        # Add Document
        d1 = Document(
            product_id=p.id,
            name="Invoice",
            file_name="invoice.pdf",
            stored_file_name="abc.pdf",
            file_path="documents/abc.pdf",
            file_size=5000
        )

        db.session.add_all([w, s1, s2, d1])
        db.session.commit()

        res = self.client.get('/api/v1/analytics/overview', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["overview"]
        self.assertEqual(data["total_products"], 1)
        self.assertEqual(data["active_warranties"], 1)
        self.assertEqual(data["total_service_records"], 2)
        # Cancelled $500 excluded: total cost must be 100.00
        self.assertEqual(data["total_service_cost"], "100.00")
        self.assertEqual(data["average_service_cost"], "100.00")
        self.assertEqual(data["total_documents"], 1)
        self.assertEqual(data["total_document_size"], 5000)

    # -------------------------------------------------------------
    # 3. Warranty Analytics
    # -------------------------------------------------------------

    def test_warranty_analytics_calculations(self):
        """Ensure /warranties returns status distribution, percentages, and types."""
        p = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="Air Conditioner",
            brand="Daikin",
            category="Appliances",
            purchase_date=date(2025, 1, 1)
        )
        db.session.add(p)
        db.session.commit()

        # 1 Active, 1 Expired
        w_active = Warranty(
            product_id=p.id,
            start_date=date(2026, 1, 1),
            end_date=date(2028, 1, 1),
            type="Comprehensive"
        )
        w_expired = Warranty(
            product_id=p.id,
            start_date=date(2023, 1, 1),
            end_date=date(2024, 1, 1),
            type="Standard"
        )
        db.session.add_all([w_active, w_expired])
        db.session.commit()

        res = self.client.get('/api/v1/analytics/warranties', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["warranties"]
        self.assertEqual(data["total_warranties"], 2)
        self.assertEqual(data["active_count"], 1)
        self.assertEqual(data["expired_count"], 1)
        self.assertEqual(data["active_percentage"], 50.0)
        self.assertEqual(data["expired_percentage"], 50.0)
        self.assertEqual(data["warranty_type_breakdown"]["Comprehensive"], 1)
        self.assertEqual(data["warranty_type_breakdown"]["Standard"], 1)

    # -------------------------------------------------------------
    # 4. Service Analytics
    # -------------------------------------------------------------

    def test_service_analytics_monthly_and_cost_breakdowns(self):
        """Ensure /services returns chronological monthly aggregations and product breakdown."""
        p = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="Washing Machine",
            brand="LG",
            category="Appliances",
            purchase_date=date(2025, 1, 1)
        )
        db.session.add(p)
        db.session.commit()

        s1 = ServiceRecord(
            product_id=p.id,
            service_date=date(2026, 1, 15),
            cost=Decimal("150.00"),
            type="Maintenance",
            status="COMPLETED"
        )
        s2 = ServiceRecord(
            product_id=p.id,
            service_date=date(2026, 2, 20),
            cost=Decimal("250.00"),
            type="Repair",
            status="COMPLETED"
        )
        s3 = ServiceRecord(
            product_id=p.id,
            service_date=date(2026, 2, 25),
            cost=Decimal("999.00"),
            type="Repair",
            status="CANCELLED"  # excluded from cost
        )
        db.session.add_all([s1, s2, s3])
        db.session.commit()

        res = self.client.get('/api/v1/analytics/services', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["services"]
        self.assertEqual(data["total_records"], 3)
        self.assertEqual(data["completed_count"], 2)
        self.assertEqual(data["cancelled_count"], 1)
        self.assertEqual(data["total_cost"], "400.00")
        self.assertEqual(data["average_cost"], "200.00")

        # Monthly aggregation
        months = data["records_by_month"]
        self.assertEqual(len(months), 2)
        self.assertEqual(months[0]["month"], "2026-01")
        self.assertEqual(months[0]["cost"], "150.00")
        self.assertEqual(months[1]["month"], "2026-02")
        self.assertEqual(months[1]["cost"], "250.00")

    # -------------------------------------------------------------
    # 5. Product Analytics
    # -------------------------------------------------------------

    def test_product_analytics_breakdowns_and_values(self):
        """Ensure /products returns category, brand, year breakdowns, and purchase totals."""
        p1 = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="iPhone 15",
            brand="Apple",
            category="Mobile",
            purchase_date=date(2025, 9, 20),
            purchase_price=Decimal("999.00")
        )
        p2 = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0002",
            name="MacBook Pro",
            brand="Apple",
            category="Laptops",
            purchase_date=date(2026, 1, 10),
            purchase_price=Decimal("1999.00")
        )
        db.session.add_all([p1, p2])
        db.session.commit()

        # Add warranty to p1 only
        w = Warranty(product_id=p1.id, start_date=date(2025, 9, 20), end_date=date(2026, 9, 20))
        db.session.add(w)
        db.session.commit()

        res = self.client.get('/api/v1/analytics/products', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["products"]
        self.assertEqual(data["total_products"], 2)
        self.assertEqual(data["products_by_category"]["Mobile"], 1)
        self.assertEqual(data["products_by_category"]["Laptops"], 1)
        self.assertEqual(data["products_by_brand"]["Apple"], 2)
        self.assertEqual(data["products_by_year"]["2025"], 1)
        self.assertEqual(data["products_by_year"]["2026"], 1)
        self.assertEqual(data["total_purchase_value"], "2998.00")
        self.assertEqual(data["average_purchase_price"], "1499.00")
        self.assertEqual(data["products_with_warranty"], 1)
        self.assertEqual(data["products_without_warranty"], 1)

    # -------------------------------------------------------------
    # 6. Document & OCR Analytics
    # -------------------------------------------------------------

    def test_document_analytics_and_ocr_status_counts(self):
        """Ensure /documents returns file counts, sizes, types, and OCR status counts."""
        p = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="iPad Air",
            brand="Apple",
            category="Tablets",
            purchase_date=date(2026, 1, 1)
        )
        db.session.add(p)
        db.session.commit()

        d1 = Document(
            product_id=p.id,
            name="Invoice",
            document_type="Invoice",
            file_name="inv.pdf",
            stored_file_name="inv.pdf",
            file_path="documents/inv.pdf",
            file_size=2048
        )
        d2 = Document(
            product_id=p.id,
            name="Warranty Card",
            document_type="Warranty",
            file_name="card.jpg",
            stored_file_name="card.jpg",
            file_path="documents/card.jpg",
            file_size=1024
        )
        db.session.add_all([d1, d2])
        db.session.commit()

        # Add OCRResult: d1 COMPLETED, d2 FAILED
        ocr1 = OCRResult(document_id=d1.id, status="COMPLETED")
        ocr2 = OCRResult(document_id=d2.id, status="FAILED")
        db.session.add_all([ocr1, ocr2])
        db.session.commit()

        res = self.client.get('/api/v1/analytics/documents', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["documents"]
        self.assertEqual(data["total_documents"], 2)
        self.assertEqual(data["total_file_size"], 3072)
        self.assertEqual(data["documents_by_type"]["Invoice"], 1)
        self.assertEqual(data["documents_by_type"]["Warranty"], 1)
        self.assertEqual(data["documents_with_ocr"], 2)
        self.assertEqual(data["completed_ocr_count"], 1)
        self.assertEqual(data["failed_ocr_count"], 1)

    # -------------------------------------------------------------
    # 7. Attention Items & Health Analytics
    # -------------------------------------------------------------

    def test_attention_items_prioritization(self):
        """Ensure /attention generates prioritized alerts (HIGH, MEDIUM, LOW)."""
        p = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="Refrigerator",
            brand="Samsung",
            category="Appliances",
            purchase_date=date(2020, 1, 1),
            purchase_price=Decimal("1000.00")
        )
        db.session.add(p)
        db.session.commit()

        # Expired warranty -> HIGH severity
        w = Warranty(product_id=p.id, start_date=date(2020, 1, 1), end_date=date(2021, 1, 1))
        # Document with failed OCR -> LOW severity
        d = Document(
            product_id=p.id,
            name="Receipt",
            file_name="r.pdf",
            stored_file_name="r.pdf",
            file_path="documents/r.pdf"
        )
        db.session.add_all([w, d])
        db.session.commit()

        ocr = OCRResult(document_id=d.id, status="FAILED")
        db.session.add(ocr)
        db.session.commit()

        res = self.client.get('/api/v1/analytics/attention', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        items = res.get_json()["attention_items"]
        self.assertGreaterEqual(len(items), 2)
        # Severity order: HIGH first, then LOW
        severities = [i["severity"] for i in items]
        self.assertEqual(severities[0], "HIGH")
        self.assertIn("LOW", severities)

    def test_health_analytics_endpoint(self):
        """Ensure /api/v1/analytics/health returns distribution and average score."""
        p = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="Coffee Machine",
            brand="Breville",
            category="Appliances",
            purchase_date=date(2026, 1, 1),
            purchase_price=Decimal("600.00")
        )
        db.session.add(p)
        db.session.commit()

        res = self.client.get('/api/v1/analytics/health', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["health"]
        self.assertEqual(data["healthy_products"], 1)
        self.assertEqual(data["average_health_score"], 100.0)

    # -------------------------------------------------------------
    # 8. User Isolation & IDOR Protection Tests
    # -------------------------------------------------------------

    def test_user_isolation_user_b_cannot_see_user_a_metrics(self):
        """Ensure User B sees 0 metrics when User A has extensive records."""
        p = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="User A Expensive Rig",
            brand="Custom",
            category="Computers",
            purchase_date=date(2026, 1, 1),
            purchase_price=Decimal("5000.00")
        )
        db.session.add(p)
        db.session.commit()

        # User A has 1 product
        res_a = self.client.get('/api/v1/analytics/overview', headers=self.headers_a)
        self.assertEqual(res_a.get_json()["overview"]["total_products"], 1)

        # User B has 0 products
        res_b = self.client.get('/api/v1/analytics/overview', headers=self.headers_b)
        self.assertEqual(res_b.get_json()["overview"]["total_products"], 0)
        self.assertEqual(res_b.get_json()["overview"]["total_service_cost"], "0.00")

    def test_decimal_currency_formatting_guaranteed_two_decimals(self):
        """Monetary values must serialize with exact two-decimal precision strings."""
        p = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="Speakers",
            brand="Bose",
            category="Audio",
            purchase_date=date(2026, 1, 1),
            purchase_price=Decimal("299.5")
        )
        db.session.add(p)
        db.session.commit()

        s = ServiceRecord(
            product_id=p.id,
            service_date=date(2026, 2, 1),
            cost=Decimal("49.9"),
            status="COMPLETED"
        )
        db.session.add(s)
        db.session.commit()

        res = self.client.get('/api/v1/analytics/services', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["services"]
        self.assertEqual(data["total_cost"], "49.90")
        self.assertEqual(data["average_cost"], "49.90")

    def test_multiple_users_complete_isolation(self):
        """Ensure User A, User B, and User C see strictly isolated metrics."""
        user_c = User(username="userc", email="userc@example.com")
        user_c.set_password("password123")
        db.session.add(user_c)
        db.session.commit()
        token_c = create_access_token(identity=str(user_c.id))
        headers_c = {"Authorization": f"Bearer {token_c}"}

        p_a = Product(user_id=self.user_a.id, product_code="PRD-A-01", name="Product A", brand="A", category="C", purchase_date=date(2026, 1, 1))
        p_b = Product(user_id=self.user_b.id, product_code="PRD-B-01", name="Product B", brand="B", category="C", purchase_date=date(2026, 1, 1))
        p_c = Product(user_id=user_c.id, product_code="PRD-C-01", name="Product C", brand="C", category="C", purchase_date=date(2026, 1, 1))
        db.session.add_all([p_a, p_b, p_c])
        db.session.commit()

        res_a = self.client.get('/api/v1/analytics/products', headers=self.headers_a)
        res_b = self.client.get('/api/v1/analytics/products', headers=self.headers_b)
        res_c = self.client.get('/api/v1/analytics/products', headers=headers_c)

        self.assertEqual(res_a.get_json()["products"]["total_products"], 1)
        self.assertEqual(res_b.get_json()["products"]["total_products"], 1)
        self.assertEqual(res_c.get_json()["products"]["total_products"], 1)
        self.assertEqual(res_a.get_json()["products"]["products_by_brand"]["A"], 1)
        self.assertNotIn("A", res_b.get_json()["products"]["products_by_brand"])

    def test_attention_items_empty_for_healthy_user(self):
        """User with active warranty and optimal product condition has zero attention items."""
        p = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="New Tablet",
            brand="Apple",
            category="Tablets",
            purchase_date=date(2026, 5, 1),
            purchase_price=Decimal("800.00")
        )
        db.session.add(p)
        db.session.commit()

        w = Warranty(product_id=p.id, start_date=date(2026, 5, 1), end_date=date(2027, 5, 1))
        db.session.add(w)
        db.session.commit()

        res = self.client.get('/api/v1/analytics/attention', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["attention_items"], [])

    def test_attention_items_high_service_cost_alert(self):
        """Service costs exceeding 25% of asset value triggers HIGH_SERVICE_COST alert."""
        p = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="Expensive Maintenance Appliance",
            brand="BrandX",
            category="Appliances",
            purchase_date=date(2026, 1, 1),
            purchase_price=Decimal("1000.00")
        )
        db.session.add(p)
        db.session.commit()

        # Add active warranty to prevent warranty deduction
        w = Warranty(product_id=p.id, start_date=date(2026, 1, 1), end_date=date(2028, 1, 1))
        # Non-cancelled cost = 300 (30% of 1000)
        s = ServiceRecord(product_id=p.id, service_date=date(2026, 2, 1), cost=Decimal("300.00"), status="COMPLETED")
        db.session.add_all([w, s])
        db.session.commit()

        res = self.client.get('/api/v1/analytics/attention', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        item_types = [i["type"] for i in res.get_json()["attention_items"]]
        self.assertIn("HIGH_SERVICE_COST", item_types)

    def test_attention_items_frequent_repairs_alert(self):
        """Two or more completed repairs triggers FREQUENT_REPAIRS alert."""
        p = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="Fragile Gadget",
            brand="BrandY",
            category="Gadgets",
            purchase_date=date(2026, 1, 1),
            purchase_price=Decimal("2000.00")
        )
        db.session.add(p)
        db.session.commit()

        w = Warranty(product_id=p.id, start_date=date(2026, 1, 1), end_date=date(2028, 1, 1))
        s1 = ServiceRecord(product_id=p.id, service_date=date(2026, 2, 1), cost=Decimal("50.00"), status="COMPLETED")
        s2 = ServiceRecord(product_id=p.id, service_date=date(2026, 3, 1), cost=Decimal("50.00"), status="COMPLETED")
        db.session.add_all([w, s1, s2])
        db.session.commit()

        res = self.client.get('/api/v1/analytics/attention', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        item_types = [i["type"] for i in res.get_json()["attention_items"]]
        self.assertIn("FREQUENT_REPAIRS", item_types)

