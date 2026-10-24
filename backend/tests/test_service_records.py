"""
Service Records API Unit and Integration Tests.
Verifies CRUD operations, inherited ownership verification, status validation, statistics calculation, and IDOR protection.
"""

import unittest
from datetime import date
from flask_jwt_extended import create_access_token
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.product import Product
from app.models.service_record import ServiceRecord
from app.services.service_record_service import get_service_record_stats


class ServiceRecordTestCase(unittest.TestCase):
    """Test suite for service record endpoints, ownership rules, and analytics aggregations."""

    def setUp(self):
        """Configure test application, in-memory database, sample users and products."""
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        # Seed User A
        self.user_a = User(username="usera", email="usera@example.com")
        self.user_a.set_password("password123")
        db.session.add(self.user_a)

        # Seed User B
        self.user_b = User(username="userb", email="userb@example.com")
        self.user_b.set_password("password123")
        db.session.add(self.user_b)
        db.session.commit()

        self.token_a = create_access_token(identity=str(self.user_a.id))
        self.token_b = create_access_token(identity=str(self.user_b.id))
        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

        # Seed Product owned by User A
        self.product_a = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-00001",
            name="User A Washing Machine",
            brand="LG",
            category="Washing Machine",
            purchase_date=date(2025, 8, 20)
        )
        db.session.add(self.product_a)

        # Seed Product owned by User B
        self.product_b = Product(
            user_id=self.user_b.id,
            product_code="PRD-2026-00002",
            name="User B Television",
            brand="Sony",
            category="Television",
            purchase_date=date(2025, 1, 15)
        )
        db.session.add(self.product_b)
        db.session.commit()

    def tearDown(self):
        """Clean up database and application context."""
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_unauthorized_get(self):
        """1. Verify GET /api/v1/service-records without token returns HTTP 401."""
        res = self.client.get('/api/v1/service-records')
        self.assertEqual(res.status_code, 401)

    def test_unauthorized_post(self):
        """2. Verify POST /api/v1/service-records without token returns HTTP 401."""
        res = self.client.post('/api/v1/service-records', json={"product_id": self.product_a.id})
        self.assertEqual(res.status_code, 401)

    def test_authenticated_empty_list(self):
        """3. Verify authenticated user initially gets an empty service records list."""
        res = self.client.get('/api/v1/service-records', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("service_records"), [])

    def test_create_service_record_success(self):
        """4. Verify valid service record creation returns HTTP 201."""
        payload = {
            "product_id": self.product_a.id,
            "service_date": "2026-09-15",
            "cost": 2500.00,
            "type": "Repair",
            "provider": "LG Direct Care",
            "description": "Drain pump replacement and calibration",
            "status": "COMPLETED"
        }
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIn("id", data)
        self.assertEqual(data["product_id"], self.product_a.id)
        self.assertEqual(data["cost"], 2500.00)
        self.assertEqual(data["type"], "Repair")
        self.assertEqual(data["provider"], "LG Direct Care")
        self.assertEqual(data["status"], "COMPLETED")

    def test_service_record_stored_in_database(self):
        """5. Verify service record is stored in database and linked to the correct product."""
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-09-15",
            "cost": 1500.00
        })
        rec_id = res.get_json()["id"]
        db_rec = db.session.get(ServiceRecord, rec_id)
        self.assertIsNotNone(db_rec)
        self.assertEqual(db_rec.product_id, self.product_a.id)

    def test_get_service_record_by_id(self):
        """6. Verify GET /api/v1/service-records/<id> returns record details for owner."""
        create_res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-05-10",
            "cost": 850.00,
            "type": "Maintenance"
        })
        rec_id = create_res.get_json()["id"]

        get_res = self.client.get(f'/api/v1/service-records/{rec_id}', headers=self.headers_a)
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.get_json()["id"], rec_id)
        self.assertEqual(get_res.get_json()["type"], "Maintenance")

    def test_update_service_record(self):
        """7. Verify PUT /api/v1/service-records/<id> updates allowed fields."""
        create_res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-05-10",
            "cost": 500.00,
            "status": "PENDING"
        })
        rec_id = create_res.get_json()["id"]

        put_res = self.client.put(f'/api/v1/service-records/{rec_id}', headers=self.headers_a, json={
            "cost": 750.00,
            "status": "COMPLETED",
            "description": "Work finished and tested"
        })
        self.assertEqual(put_res.status_code, 200)
        updated = put_res.get_json()
        self.assertEqual(updated["cost"], 750.00)
        self.assertEqual(updated["status"], "COMPLETED")
        self.assertEqual(updated["description"], "Work finished and tested")

    def test_delete_service_record(self):
        """8. Verify DELETE /api/v1/service-records/<id> returns HTTP 200."""
        create_res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-05-10",
            "cost": 500.00
        })
        rec_id = create_res.get_json()["id"]

        del_res = self.client.delete(f'/api/v1/service-records/{rec_id}', headers=self.headers_a)
        self.assertEqual(del_res.status_code, 200)
        self.assertIn("deleted successfully", del_res.get_json().get("message", ""))

    def test_deleted_service_record_returns_404(self):
        """9. Verify subsequent GET on deleted record returns HTTP 404."""
        create_res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-05-10",
            "cost": 500.00
        })
        rec_id = create_res.get_json()["id"]
        self.client.delete(f'/api/v1/service-records/{rec_id}', headers=self.headers_a)

        get_res = self.client.get(f'/api/v1/service-records/{rec_id}', headers=self.headers_a)
        self.assertEqual(get_res.status_code, 404)

    def test_validation_missing_product_id(self):
        """10. Validation: Missing product_id returns HTTP 400."""
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "service_date": "2026-01-01",
            "cost": 100
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("product_id is required", res.get_json()["error"])

    def test_validation_invalid_product_id(self):
        """11. Validation: Malformed product_id returns HTTP 400."""
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": "not-an-int",
            "service_date": "2026-01-01",
            "cost": 100
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("product_id must be a valid integer", res.get_json()["error"])

    def test_product_belonging_to_another_user_rejected(self):
        """12. Security: User A cannot create a service record for User B's product (HTTP 404)."""
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_b.id,
            "service_date": "2026-01-01",
            "cost": 100
        })
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.get_json()["error"], "Product not found")

    def test_validation_invalid_date(self):
        """13. Validation: Malformed service_date returns HTTP 400."""
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "bad-date-format",
            "cost": 100
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("service_date must be a valid date", res.get_json()["error"])

    def test_validation_negative_cost_rejected(self):
        """14. Validation: Negative cost returns HTTP 400."""
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-01-01",
            "cost": -150
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("cost cannot be negative", res.get_json()["error"])

    def test_validation_invalid_cost_rejected(self):
        """15. Validation: Non-numeric cost string returns HTTP 400."""
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-01-01",
            "cost": "free-of-charge"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("cost must be a valid numeric value", res.get_json()["error"])

    def test_validation_invalid_status_rejected(self):
        """16. Validation: Unknown status returns HTTP 400."""
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-01-01",
            "cost": 100,
            "status": "UNKNOWN_STATE"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("status must be one of", res.get_json()["error"])

    def test_valid_status_completed_accepted(self):
        """17. Validation: Valid COMPLETED status accepted."""
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-02-01",
            "cost": 200,
            "status": "completed"
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.get_json()["status"], "COMPLETED")

    def test_valid_status_pending_accepted(self):
        """18. Validation: Valid PENDING status accepted."""
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-02-01",
            "cost": 200,
            "status": "pending"
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.get_json()["status"], "PENDING")

    def test_valid_status_cancelled_accepted(self):
        """19. Validation: Valid CANCELLED status accepted."""
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-02-01",
            "cost": 200,
            "status": "cancelled"
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.get_json()["status"], "CANCELLED")

    def test_optional_fields_handled_correctly(self):
        """20. Handling: Optional type, provider, description are trimmed and stored."""
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-03-01",
            "cost": 350,
            "type": "  Inspection  ",
            "provider": "  Quick Repair  ",
            "description": "  Cleaned filters  "
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data["type"], "Inspection")
        self.assertEqual(data["provider"], "Quick Repair")
        self.assertEqual(data["description"], "Cleaned filters")

    def test_product_filter_works(self):
        """21. Scoping: GET /api/v1/service-records?product_id=<id> filters by product."""
        prod_a2 = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-00003",
            name="User A Microwave",
            brand="Samsung",
            category="Microwave",
            purchase_date=date(2025, 5, 1)
        )
        db.session.add(prod_a2)
        db.session.commit()

        self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-01-01",
            "cost": 100
        })
        self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": prod_a2.id,
            "service_date": "2026-02-01",
            "cost": 200
        })

        filter_res = self.client.get(f'/api/v1/service-records?product_id={self.product_a.id}', headers=self.headers_a)
        self.assertEqual(filter_res.status_code, 200)
        records = filter_res.get_json()["service_records"]
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["product_id"], self.product_a.id)

    def test_product_filter_cannot_access_another_users_product(self):
        """22. Security: User A filtering by User B's product_id returns HTTP 404."""
        res = self.client.get(f'/api/v1/service-records?product_id={self.product_b.id}', headers=self.headers_a)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.get_json()["error"], "Product not found")

    # 23, 24, 25. IDOR & Ownership Protection Tests
    def test_idor_another_user_cannot_get_record(self):
        """23. Security: User B cannot GET User A's service record (HTTP 404)."""
        create_res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-01-01",
            "cost": 500
        })
        rec_id = create_res.get_json()["id"]

        res = self.client.get(f'/api/v1/service-records/{rec_id}', headers=self.headers_b)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.get_json()["error"], "Service record not found")

    def test_idor_another_user_cannot_put_record(self):
        """24. Security: User B cannot PUT User A's service record (HTTP 404)."""
        create_res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-01-01",
            "cost": 500,
            "description": "Original Work"
        })
        rec_id = create_res.get_json()["id"]

        res = self.client.put(f'/api/v1/service-records/{rec_id}', headers=self.headers_b, json={
            "description": "Hacked Work"
        })
        self.assertEqual(res.status_code, 404)

        owner_res = self.client.get(f'/api/v1/service-records/{rec_id}', headers=self.headers_a)
        self.assertEqual(owner_res.get_json()["description"], "Original Work")

    def test_idor_another_user_cannot_delete_record(self):
        """25. Security: User B cannot DELETE User A's service record (HTTP 404)."""
        create_res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-01-01",
            "cost": 500
        })
        rec_id = create_res.get_json()["id"]

        res = self.client.delete(f'/api/v1/service-records/{rec_id}', headers=self.headers_b)
        self.assertEqual(res.status_code, 404)

        owner_res = self.client.get(f'/api/v1/service-records/{rec_id}', headers=self.headers_a)
        self.assertEqual(owner_res.status_code, 200)

    def test_serialization_safe(self):
        """26. Security: Serialization does not leak secrets, hashes, or circular relationships."""
        res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-01-01",
            "cost": 500
        })
        raw = res.get_data(as_text=True)
        self.assertNotIn("password", raw.lower())
        self.assertNotIn("secret", raw.lower())
        self.assertNotIn("hash", raw.lower())
        data = res.get_json()
        self.assertNotIn("product", data)

    def test_cascade_delete_on_product_deletion(self):
        """27. Cascade: Deleting a product automatically cascades to its service records."""
        create_res = self.client.post('/api/v1/service-records', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "service_date": "2026-01-01",
            "cost": 500
        })
        rec_id = create_res.get_json()["id"]

        del_prod = self.client.delete(f'/api/v1/products/{self.product_a.id}', headers=self.headers_a)
        self.assertEqual(del_prod.status_code, 200)

        db_rec = db.session.get(ServiceRecord, rec_id)
        self.assertIsNone(db_rec)

    def test_service_record_statistics_calculation(self):
        """28. Statistics: get_service_record_stats aggregates costs, counts, and categories correctly."""
        rec1 = ServiceRecord(
            product_id=self.product_a.id,
            service_date=date(2026, 1, 15),
            cost=1000.00,
            status="COMPLETED"
        )
        rec2 = ServiceRecord(
            product_id=self.product_a.id,
            service_date=date(2026, 1, 20),
            cost=2000.00,
            status="PENDING"
        )
        rec3 = ServiceRecord(
            product_id=self.product_a.id,
            service_date=date(2026, 2, 10),
            cost=3000.00,
            status="CANCELLED"
        )
        db.session.add_all([rec1, rec2, rec3])
        db.session.commit()

        stats = get_service_record_stats(self.user_a.id)
        self.assertEqual(stats["total_service_records"], 3)
        self.assertEqual(stats["total_service_cost"], 6000.00)
        self.assertEqual(stats["average_service_cost"], 2000.00)
        self.assertEqual(stats["completed_service_records"], 1)
        self.assertEqual(stats["pending_service_records"], 1)
        self.assertEqual(stats["cancelled_service_records"], 1)

        self.assertIn(self.product_a.id, stats["records_by_product"])
        self.assertEqual(stats["records_by_product"][self.product_a.id]["count"], 3)
        self.assertEqual(stats["records_by_product"][self.product_a.id]["total_cost"], 6000.00)

        self.assertIn("2026-01", stats["records_by_month"])
        self.assertEqual(stats["records_by_month"]["2026-01"]["count"], 2)
        self.assertEqual(stats["records_by_month"]["2026-01"]["total_cost"], 3000.00)
        self.assertIn("2026-02", stats["records_by_month"])
        self.assertEqual(stats["records_by_month"]["2026-02"]["count"], 1)
        self.assertEqual(stats["records_by_month"]["2026-02"]["total_cost"], 3000.00)

    def test_empty_stats_calculation(self):
        """29. Statistics: get_service_record_stats returns zeroed metrics when user has no records."""
        stats = get_service_record_stats(self.user_b.id)
        self.assertEqual(stats["total_service_records"], 0)
        self.assertEqual(stats["total_service_cost"], 0.0)
        self.assertEqual(stats["average_service_cost"], 0.0)

    def test_nonexistent_service_record_operations(self):
        """30. Error handling: PUT and DELETE on nonexistent record return HTTP 404."""
        put_res = self.client.put('/api/v1/service-records/999999', headers=self.headers_a, json={"cost": 100})
        self.assertEqual(put_res.status_code, 404)
        del_res = self.client.delete('/api/v1/service-records/999999', headers=self.headers_a)
        self.assertEqual(del_res.status_code, 404)


if __name__ == '__main__':
    unittest.main()
