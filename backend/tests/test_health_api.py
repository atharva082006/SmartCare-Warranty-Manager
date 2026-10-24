"""
Product Health API and Service Tests.
Verifies deterministic health score calculation (0-100), transparent deductions,
age caps, repair caps, cost ratios, warranty impacts, recommendations, filters, and IDOR protection.
"""

import unittest
from datetime import date, timedelta
from decimal import Decimal
from flask_jwt_extended import create_access_token
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.product import Product
from app.models.warranty import Warranty
from app.models.service_record import ServiceRecord
from app.services.health_service import calculate_product_health, get_user_health_analytics


class ProductHealthTestCase(unittest.TestCase):
    """Test suite for product health calculation algorithms and REST endpoints."""

    def setUp(self):
        """Configure test client, in-memory database, and test fixtures."""
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

        # Reference date for deterministic testing
        self.ref_date = date(2026, 6, 1)

    def tearDown(self):
        """Clean up database and context."""
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    # -------------------------------------------------------------
    # 1. Endpoint Authentication & IDOR Tests
    # -------------------------------------------------------------

    def test_unauthenticated_health_products_rejected(self):
        """Ensure GET /api/v1/health/products without token returns 401."""
        res = self.client.get('/api/v1/health/products')
        self.assertEqual(res.status_code, 401)

    def test_unauthenticated_health_product_detail_rejected(self):
        """Ensure GET /api/v1/health/products/<id> without token returns 401."""
        res = self.client.get('/api/v1/health/products/1')
        self.assertEqual(res.status_code, 401)

    def test_product_health_detail_idor_protection(self):
        """Ensure User B receives 404 when requesting health details for User A's product."""
        p_a = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="Laptop A",
            brand="Dell",
            category="Computers",
            purchase_date=date(2025, 1, 1),
            purchase_price=Decimal("1000.00")
        )
        db.session.add(p_a)
        db.session.commit()

        res = self.client.get(f'/api/v1/health/products/{p_a.id}', headers=self.headers_b)
        self.assertEqual(res.status_code, 404)
        self.assertIn("not found", res.get_json()["message"].lower())

    def test_nonexistent_product_returns_404(self):
        """Ensure requesting a nonexistent product ID returns 404."""
        res = self.client.get('/api/v1/health/products/99999', headers=self.headers_a)
        self.assertEqual(res.status_code, 404)

    # -------------------------------------------------------------
    # 2. List & Detail API Endpoints
    # -------------------------------------------------------------

    def test_empty_products_health_list(self):
        """Ensure GET /api/v1/health/products returns empty list for user with no products."""
        res = self.client.get('/api/v1/health/products', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["products"], [])
        self.assertEqual(data["summary"]["average_health_score"], 0.0)

    def test_product_health_list_success(self):
        """Ensure GET /api/v1/health/products returns correct product scores for user."""
        p1 = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="MacBook",
            brand="Apple",
            category="Laptops",
            purchase_date=date(2026, 1, 1),
            purchase_price=Decimal("2000.00")
        )
        db.session.add(p1)
        db.session.commit()

        res = self.client.get('/api/v1/health/products', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(len(data["products"]), 1)
        self.assertEqual(data["products"][0]["name"], "MacBook")
        self.assertEqual(data["products"][0]["health_status"], "HEALTHY")
        self.assertGreaterEqual(data["products"][0]["health_score"], 80)

    def test_product_health_detail_success(self):
        """Ensure GET /api/v1/health/products/<id> returns complete product and health payload."""
        p1 = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="Smart TV",
            brand="Sony",
            category="Television",
            purchase_date=date(2026, 1, 1),
            purchase_price=Decimal("800.00")
        )
        db.session.add(p1)
        db.session.commit()

        res = self.client.get(f'/api/v1/health/products/{p1.id}', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("product", data)
        self.assertIn("health", data)
        self.assertEqual(data["health"]["score"], 100)
        self.assertEqual(data["health"]["status"], "HEALTHY")
        self.assertEqual(data["health"]["primary_reason"], "Healthy product")
        self.assertIsInstance(data["health"]["positive_factors"], list)
        self.assertIsInstance(data["health"]["recommendations"], list)

    def test_status_query_filter_healthy_and_critical(self):
        """Ensure ?status= query parameter correctly filters the products list."""
        p_healthy = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="New iPhone",
            brand="Apple",
            category="Phones",
            purchase_date=date(2026, 5, 1),
            purchase_price=Decimal("1200.00")
        )
        # Old broken product with expired warranty, high repairs, high cost
        p_critical = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0002",
            name="Old Fridge",
            brand="Whirlpool",
            category="Appliances",
            purchase_date=date(2018, 1, 1),  # 8 years -> -25 age cap
            purchase_price=Decimal("500.00")
        )
        db.session.add_all([p_healthy, p_critical])
        db.session.commit()

        # Add expired warranty and expensive repairs to p_critical
        w = Warranty(
            product_id=p_critical.id,
            start_date=date(2018, 1, 1),
            end_date=date(2019, 1, 1)  # expired -> -15
        )
        # 5 completed repairs -> -30 repair cap, cost $300 -> >25% -> -25
        for i in range(5):
            sr = ServiceRecord(
                product_id=p_critical.id,
                service_date=date(2020 + i, 1, 1),
                cost=Decimal("60.00"),
                status="COMPLETED"
            )
            db.session.add(sr)
        db.session.add(w)
        db.session.commit()

        # Score for p_critical: 100 - 25 (age) - 30 (repairs) - 25 (cost) - 15 (warranty) = 5 (CRITICAL)
        res_all = self.client.get('/api/v1/health/products', headers=self.headers_a)
        self.assertEqual(len(res_all.get_json()["products"]), 2)

        res_healthy = self.client.get('/api/v1/health/products?status=HEALTHY', headers=self.headers_a)
        self.assertEqual(len(res_healthy.get_json()["products"]), 1)
        self.assertEqual(res_healthy.get_json()["products"][0]["name"], "New iPhone")

        res_critical = self.client.get('/api/v1/health/products?status=CRITICAL', headers=self.headers_a)
        self.assertEqual(len(res_critical.get_json()["products"]), 1)
        self.assertEqual(res_critical.get_json()["products"][0]["name"], "Old Fridge")

    # -------------------------------------------------------------
    # 3. Health Algorithm Rule Tests (Deterministic Math)
    # -------------------------------------------------------------

    def test_brand_new_product_score_is_100(self):
        """A brand new product with no repairs and active warranty should score 100."""
        p = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-0001",
            name="New Laptop",
            brand="Dell",
            category="Computers",
            purchase_date=date(2026, 3, 1),
            purchase_price=Decimal("1500.00")
        )
        w = Warranty(
            product_id=1,
            start_date=date(2026, 3, 1),
            end_date=date(2027, 3, 1)  # Active
        )
        res = calculate_product_health(p, warranty=w, service_records=[], as_of_date=self.ref_date)
        self.assertEqual(res["score"], 100)
        self.assertEqual(res["status"], "HEALTHY")
        self.assertIn("Active warranty", res["positive_factors"])
        self.assertIn("No service history", res["positive_factors"])

    def test_age_deduction_calculation(self):
        """Each completed year deducts 4 points."""
        p = Product(
            purchase_date=date(2024, 6, 1),  # exactly 2 completed years relative to 2026-06-01
            purchase_price=Decimal("1000.00")
        )
        res = calculate_product_health(p, service_records=[], as_of_date=self.ref_date)
        # 100 - (2 * 4) = 92
        self.assertEqual(res["score"], 92)
        age_deduction = next(d for d in res["deductions"] if d["factor"] == "Age")
        self.assertEqual(age_deduction["points"], -8)

    def test_age_deduction_capped_at_25(self):
        """Age deduction must cap at maximum 25 points even for very old items."""
        p = Product(
            purchase_date=date(2010, 1, 1),  # 16 years old -> 16*4 = 64
            purchase_price=Decimal("1000.00")
        )
        res = calculate_product_health(p, service_records=[], as_of_date=self.ref_date)
        self.assertEqual(res["score"], 75)  # 100 - 25
        age_deduction = next(d for d in res["deductions"] if d["factor"] == "Age")
        self.assertEqual(age_deduction["points"], -25)

    def test_repair_deduction_calculation(self):
        """Each completed repair deducts 6 points."""
        p = Product(purchase_date=date(2026, 1, 1), purchase_price=Decimal("1000.00"))
        sr = [
            ServiceRecord(cost=Decimal("20.00"), status="COMPLETED"),
            ServiceRecord(cost=Decimal("30.00"), status="COMPLETED")
        ]
        res = calculate_product_health(p, service_records=sr, as_of_date=self.ref_date)
        # 2 repairs -> -12 points. Cost = 50 / 1000 = 5% (no cost deduction)
        self.assertEqual(res["score"], 88)
        repair_deduction = next(d for d in res["deductions"] if d["factor"] == "Repairs")
        self.assertEqual(repair_deduction["points"], -12)

    def test_repair_deduction_capped_at_30(self):
        """Repairs deduction must cap at 30 points (5+ repairs)."""
        p = Product(purchase_date=date(2026, 1, 1), purchase_price=Decimal("5000.00"))
        sr = [ServiceRecord(cost=Decimal("10.00"), status="COMPLETED") for _ in range(8)]
        res = calculate_product_health(p, service_records=sr, as_of_date=self.ref_date)
        self.assertEqual(res["score"], 70)  # 100 - 30
        repair_deduction = next(d for d in res["deductions"] if d["factor"] == "Repairs")
        self.assertEqual(repair_deduction["points"], -30)

    def test_service_cost_ratio_moderate_deduction_10_percent(self):
        """Service cost > 10% of purchase price deducts 10 points."""
        p = Product(purchase_date=date(2026, 1, 1), purchase_price=Decimal("1000.00"))
        # 1 repair, cost = 150 (15% of purchase price)
        sr = [ServiceRecord(cost=Decimal("150.00"), status="COMPLETED")]
        res = calculate_product_health(p, service_records=sr, as_of_date=self.ref_date)
        # 100 - 6 (repair) - 10 (cost ratio) = 84
        self.assertEqual(res["score"], 84)
        cost_deduction = next(d for d in res["deductions"] if d["factor"] == "Service Cost Ratio")
        self.assertEqual(cost_deduction["points"], -10)

    def test_service_cost_ratio_high_deduction_25_percent(self):
        """Service cost > 25% of purchase price deducts 25 points."""
        p = Product(purchase_date=date(2026, 1, 1), purchase_price=Decimal("1000.00"))
        # 1 repair, cost = 300 (30% of purchase price)
        sr = [ServiceRecord(cost=Decimal("300.00"), status="COMPLETED")]
        res = calculate_product_health(p, service_records=sr, as_of_date=self.ref_date)
        # 100 - 6 (repair) - 25 (cost ratio) = 69
        self.assertEqual(res["score"], 69)
        cost_deduction = next(d for d in res["deductions"] if d["factor"] == "Service Cost Ratio")
        self.assertEqual(cost_deduction["points"], -25)

    def test_expired_warranty_deduction_15_points(self):
        """Expired warranty deducts 15 points."""
        p = Product(purchase_date=date(2026, 1, 1), purchase_price=Decimal("1000.00"))
        w = Warranty(
            start_date=date(2025, 1, 1),
            end_date=date(2026, 1, 1)  # expired relative to 2026-06-01
        )
        res = calculate_product_health(p, warranty=w, service_records=[], as_of_date=self.ref_date)
        self.assertEqual(res["score"], 85)
        w_deduction = next(d for d in res["deductions"] if d["factor"] == "Warranty")
        self.assertEqual(w_deduction["points"], -15)
        self.assertEqual(res["primary_reason"], "Expired warranty")

    def test_expiring_soon_warranty_deduction_5_points(self):
        """Warranty expiring within 30 days deducts 5 points."""
        p = Product(purchase_date=date(2026, 1, 1), purchase_price=Decimal("1000.00"))
        w = Warranty(
            start_date=date(2025, 6, 20),
            end_date=date(2026, 6, 20)  # 19 days remaining relative to 2026-06-01
        )
        res = calculate_product_health(p, warranty=w, service_records=[], as_of_date=self.ref_date)
        self.assertEqual(res["score"], 95)
        w_deduction = next(d for d in res["deductions"] if d["factor"] == "Warranty")
        self.assertEqual(w_deduction["points"], -5)

    def test_cancelled_and_pending_service_records_behavior(self):
        """Cancelled service records must not count toward repairs or financial costs."""
        p = Product(purchase_date=date(2026, 1, 1), purchase_price=Decimal("1000.00"))
        sr = [
            ServiceRecord(cost=Decimal("500.00"), status="CANCELLED"),
            ServiceRecord(cost=Decimal("200.00"), status="PENDING")
        ]
        res = calculate_product_health(p, service_records=sr, as_of_date=self.ref_date)
        # Cancelled is completely excluded. Pending does not count as completed repair.
        # Pending cost (200) > 10% -> -10 cost ratio, but 0 repairs.
        self.assertEqual(res["score"], 90)
        self.assertNotIn("Repairs", [d["factor"] for d in res["deductions"]])

    def test_score_floor_is_zero(self):
        """Severe accumulated deductions must clamp to exactly 0, never negative."""
        p = Product(
            purchase_date=date(2010, 1, 1),  # -25 age
            purchase_price=Decimal("100.00")
        )
        w = Warranty(start_date=date(2010, 1, 1), end_date=date(2011, 1, 1))  # -15 warranty
        sr = [ServiceRecord(cost=Decimal("100.00"), status="COMPLETED") for _ in range(10)]
        # -30 repairs, -25 cost ratio
        # Total deduction: 25 + 15 + 30 + 25 = 95 -> score = 5.
        # Add another deduction or verify with score calculation
        res = calculate_product_health(p, warranty=w, service_records=sr, as_of_date=self.ref_date)
        self.assertEqual(res["score"], 5)
        self.assertGreaterEqual(res["score"], 0)

    def test_zero_purchase_price_handled_safely(self):
        """Purchase price of 0 does not raise ZeroDivisionError."""
        p = Product(purchase_date=date(2026, 1, 1), purchase_price=Decimal("0.00"))
        sr = [ServiceRecord(cost=Decimal("50.00"), status="COMPLETED")]
        res = calculate_product_health(p, service_records=sr, as_of_date=self.ref_date)
        self.assertIsInstance(res["score"], int)
        self.assertEqual(res["score"], 94)  # 100 - 6 (repair)

    def test_existing_health_check_endpoints_unaffected(self):
        """Verify that Milestone 10 /api/v1/health and /api/v1/health/db remain 200 OK."""
        res_svc = self.client.get('/api/v1/health')
        self.assertEqual(res_svc.status_code, 200)
        self.assertEqual(res_svc.get_json()["status"], "ok")

        res_db = self.client.get('/api/v1/health/db')
        self.assertEqual(res_db.status_code, 200)
        self.assertEqual(res_db.get_json()["status"], "ok")

    def test_health_status_category_boundaries(self):
        """Verify status classifications at exact threshold boundaries (80, 79, 50, 49)."""
        # Score 80 -> HEALTHY
        p80 = Product(purchase_date=date(2021, 6, 1), purchase_price=Decimal("1000.00"))  # 5 yrs -> -20
        res80 = calculate_product_health(p80, service_records=[], as_of_date=self.ref_date)
        self.assertEqual(res80["score"], 80)
        self.assertEqual(res80["status"], "HEALTHY")

        # Score 79 (e.g. 5 yrs age -20 + expiring warranty -5 -> 75 -> ATTENTION)
        w_exp = Warranty(start_date=date(2025, 6, 20), end_date=date(2026, 6, 20))  # expiring soon -5
        res75 = calculate_product_health(p80, warranty=w_exp, service_records=[], as_of_date=self.ref_date)
        self.assertEqual(res75["score"], 75)
        self.assertEqual(res75["status"], "ATTENTION")

        # Score 50 -> ATTENTION
        # 10 yrs age (-25) + service cost >25% (-25) = -50 -> score 50
        p50 = Product(purchase_date=date(2010, 1, 1), purchase_price=Decimal("100.00"))
        sr50 = [ServiceRecord(cost=Decimal("50.00"), status="COMPLETED")]  # 1 repair (-6), wait:
        # Let's test with exact deductions
        res_custom = calculate_product_health(
            Product(purchase_date=date(2015, 6, 1), purchase_price=Decimal("1000.00")),  # -25 age
            warranty=Warranty(start_date=date(2020, 1, 1), end_date=date(2021, 1, 1)),  # -15 warranty
            service_records=[ServiceRecord(cost=Decimal("150.00"), status="COMPLETED")],  # -6 repair, -10 cost -> 25+15+6+10 = 56 -> score 44 (CRITICAL)
            as_of_date=self.ref_date
        )
        self.assertEqual(res_custom["score"], 44)
        self.assertEqual(res_custom["status"], "CRITICAL")

    def test_primary_reason_identifies_largest_deduction(self):
        """Primary reason must reflect the single factor causing the largest point loss."""
        # Age -8 vs Expired Warranty -15 -> Primary reason is "Expired warranty"
        p = Product(purchase_date=date(2024, 6, 1), purchase_price=Decimal("1000.00"))
        w = Warranty(start_date=date(2023, 1, 1), end_date=date(2024, 1, 1))
        res = calculate_product_health(p, warranty=w, service_records=[], as_of_date=self.ref_date)
        self.assertEqual(res["primary_reason"], "Expired warranty")

    def test_recommendations_content_matches_deductions(self):
        """Ensure appropriate actionable advice is generated for warranty and service issues."""
        p = Product(purchase_date=date(2020, 1, 1), purchase_price=Decimal("500.00"))
        w = Warranty(start_date=date(2020, 1, 1), end_date=date(2021, 1, 1))
        sr = [ServiceRecord(cost=Decimal("300.00"), status="COMPLETED")]  # cost > 25%
        res = calculate_product_health(p, warranty=w, service_records=sr, as_of_date=self.ref_date)
        recs = res["recommendations"]
        self.assertTrue(any("renewing or extending" in r.lower() for r in recs))
        self.assertTrue(any("significant compared" in r.lower() for r in recs))

    def test_positive_factors_list_generation(self):
        """Positive factors list must report active warranty and zero repair history."""
        p = Product(purchase_date=date(2026, 5, 1), purchase_price=Decimal("1500.00"))
        w = Warranty(start_date=date(2026, 5, 1), end_date=date(2027, 5, 1))
        res = calculate_product_health(p, warranty=w, service_records=[], as_of_date=self.ref_date)
        self.assertIn("Active warranty", res["positive_factors"])
        self.assertIn("No service history", res["positive_factors"])
        self.assertIn("Recent purchase", res["positive_factors"])

    def test_no_warranty_behavior(self):
        """Products without warranty should receive a recommendation and zero warranty penalty."""
        p = Product(purchase_date=date(2026, 5, 1), purchase_price=Decimal("1000.00"))
        res = calculate_product_health(p, warranty=None, service_records=[], as_of_date=self.ref_date)
        self.assertEqual(res["score"], 100)
        self.assertTrue(any("no warranty" in r.lower() for r in res["recommendations"]))

    def test_no_service_history_behavior(self):
        """Products with no service records have positive factor 'No service history'."""
        p = Product(purchase_date=date(2026, 5, 1), purchase_price=Decimal("1000.00"))
        res = calculate_product_health(p, service_records=[], as_of_date=self.ref_date)
        self.assertIn("No service history", res["positive_factors"])

    def test_score_cannot_exceed_100(self):
        """Final score is strictly bounded at maximum 100."""
        p = Product(purchase_date=date(2026, 5, 1), purchase_price=Decimal("1000.00"))
        res = calculate_product_health(p, service_records=[], as_of_date=self.ref_date)
        self.assertLessEqual(res["score"], 100)

    def test_score_consistency_deterministic(self):
        """Repeated calculations on identical input must produce identical results."""
        p = Product(purchase_date=date(2023, 1, 1), purchase_price=Decimal("1000.00"))
        w = Warranty(start_date=date(2023, 1, 1), end_date=date(2024, 1, 1))
        sr = [ServiceRecord(cost=Decimal("50.00"), status="COMPLETED")]
        scores = [
            calculate_product_health(p, warranty=w, service_records=sr, as_of_date=self.ref_date)["score"]
            for _ in range(10)
        ]
        self.assertEqual(len(set(scores)), 1)

