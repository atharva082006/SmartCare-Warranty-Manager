"""
Warranties API Unit and Integration Tests.
Verifies CRUD operations, inherited ownership verification, status calculations, and security isolation.
"""

import unittest
from datetime import date, timedelta
from flask_jwt_extended import create_access_token
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.product import Product
from app.models.warranty import Warranty
from app.services.warranty_service import compute_warranty_metrics


class WarrantyTestCase(unittest.TestCase):
    """Test suite for warranty endpoints, calculations, and ownership rules."""

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
            name="User A Laptop",
            brand="Dell",
            category="Laptop",
            purchase_date=date(2026, 1, 1)
        )
        db.session.add(self.product_a)

        # Seed Product owned by User B
        self.product_b = Product(
            user_id=self.user_b.id,
            product_code="PRD-2026-00002",
            name="User B Phone",
            brand="Samsung",
            category="Mobile",
            purchase_date=date(2026, 1, 1)
        )
        db.session.add(self.product_b)
        db.session.commit()

    def tearDown(self):
        """Clean up database and application context."""
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_unauthorized_get_warranties(self):
        """1. Verify GET /api/v1/warranties without token returns HTTP 401."""
        res = self.client.get('/api/v1/warranties')
        self.assertEqual(res.status_code, 401)

    def test_unauthorized_post_warranty(self):
        """2. Verify POST /api/v1/warranties without token returns HTTP 401."""
        res = self.client.post('/api/v1/warranties', json={"product_id": self.product_a.id})
        self.assertEqual(res.status_code, 401)

    def test_create_warranty_success(self):
        """3 & 4. Verify warranty creation for own product returns HTTP 201 and inherits user association."""
        start = date.today()
        end = start + timedelta(days=365)
        payload = {
            "product_id": self.product_a.id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "type": "Manufacturer",
            "coverage": "Parts and labor"
        }
        res = self.client.post('/api/v1/warranties', headers=self.headers_a, json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIn("id", data)
        self.assertEqual(data["product_id"], self.product_a.id)
        self.assertEqual(data["type"], "Manufacturer")
        self.assertEqual(data["coverage"], "Parts and labor")
        self.assertEqual(data["status"], "ACTIVE")
        self.assertTrue(data["is_active"])
        self.assertGreater(data["days_remaining"], 300)

    def test_get_warranty_by_id(self):
        """5. Verify GET /api/v1/warranties/<id> returns warranty details for owner."""
        start = date.today()
        end = start + timedelta(days=60)
        create_res = self.client.post('/api/v1/warranties', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "type": "Standard"
        })
        war_id = create_res.get_json()['id']

        get_res = self.client.get(f'/api/v1/warranties/{war_id}', headers=self.headers_a)
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.get_json()['id'], war_id)
        self.assertEqual(get_res.get_json()['type'], "Standard")

    def test_update_warranty(self):
        """6. Verify PUT /api/v1/warranties/<id> updates warranty fields."""
        start = date.today()
        end = start + timedelta(days=60)
        create_res = self.client.post('/api/v1/warranties', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "type": "Basic"
        })
        war_id = create_res.get_json()['id']

        new_end = start + timedelta(days=90)
        put_res = self.client.put(f'/api/v1/warranties/{war_id}', headers=self.headers_a, json={
            "type": "Extended Care",
            "coverage": "Full replacement",
            "end_date": new_end.isoformat()
        })
        self.assertEqual(put_res.status_code, 200)
        updated = put_res.get_json()
        self.assertEqual(updated['type'], "Extended Care")
        self.assertEqual(updated['coverage'], "Full replacement")
        self.assertEqual(updated['end_date'], new_end.isoformat())

    def test_delete_warranty(self):
        """7. Verify DELETE /api/v1/warranties/<id> deletes warranty."""
        start = date.today()
        end = start + timedelta(days=60)
        create_res = self.client.post('/api/v1/warranties', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat()
        })
        war_id = create_res.get_json()['id']

        del_res = self.client.delete(f'/api/v1/warranties/{war_id}', headers=self.headers_a)
        self.assertEqual(del_res.status_code, 200)

        get_res = self.client.get(f'/api/v1/warranties/{war_id}', headers=self.headers_a)
        self.assertEqual(get_res.status_code, 404)

    def test_invalid_product_id_rejected(self):
        """8. Verify creating a warranty for nonexistent product returns HTTP 404."""
        start = date.today()
        end = start + timedelta(days=60)
        res = self.client.post('/api/v1/warranties', headers=self.headers_a, json={
            "product_id": 999999,
            "start_date": start.isoformat(),
            "end_date": end.isoformat()
        })
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.get_json()['error'], "Product not found")

    def test_cannot_create_warranty_for_another_users_product(self):
        """9. Security: User A cannot create a warranty attached to User B's product."""
        start = date.today()
        end = start + timedelta(days=60)
        res = self.client.post('/api/v1/warranties', headers=self.headers_a, json={
            "product_id": self.product_b.id,  # Owned by User B
            "start_date": start.isoformat(),
            "end_date": end.isoformat()
        })
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.get_json()['error'], "Product not found")

    def test_idor_another_user_cannot_read_warranty(self):
        """10. Security: User B cannot access User A's warranty (HTTP 404)."""
        start = date.today()
        end = start + timedelta(days=60)
        create_res = self.client.post('/api/v1/warranties', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "type": "Confidential Warranty"
        })
        war_id = create_res.get_json()['id']

        # User B attempts to access
        res = self.client.get(f'/api/v1/warranties/{war_id}', headers=self.headers_b)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.get_json()['error'], "Warranty not found")

    def test_idor_another_user_cannot_update_warranty(self):
        """11. Security: User B cannot update User A's warranty (HTTP 404)."""
        start = date.today()
        end = start + timedelta(days=60)
        create_res = self.client.post('/api/v1/warranties', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "type": "Original Warranty"
        })
        war_id = create_res.get_json()['id']

        # User B attempts to update
        res = self.client.put(f'/api/v1/warranties/{war_id}', headers=self.headers_b, json={
            "type": "Tampered Type"
        })
        self.assertEqual(res.status_code, 404)

        # Confirm owner data unchanged
        owner_res = self.client.get(f'/api/v1/warranties/{war_id}', headers=self.headers_a)
        self.assertEqual(owner_res.get_json()['type'], "Original Warranty")

    def test_idor_another_user_cannot_delete_warranty(self):
        """12. Security: User B cannot delete User A's warranty (HTTP 404)."""
        start = date.today()
        end = start + timedelta(days=60)
        create_res = self.client.post('/api/v1/warranties', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat()
        })
        war_id = create_res.get_json()['id']

        # User B attempts to delete
        res = self.client.delete(f'/api/v1/warranties/{war_id}', headers=self.headers_b)
        self.assertEqual(res.status_code, 404)

        # Confirm warranty still exists
        owner_res = self.client.get(f'/api/v1/warranties/{war_id}', headers=self.headers_a)
        self.assertEqual(owner_res.status_code, 200)

    def test_end_date_before_start_date_rejected(self):
        """13. Validation: end_date before start_date returns HTTP 400."""
        res = self.client.post('/api/v1/warranties', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "start_date": "2026-06-01",
            "end_date": "2026-05-01"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("end_date cannot be earlier than start_date", res.get_json()['error'])

    def test_warranty_status_active(self):
        """14. Calculation: Warranty with >30 days remaining has status ACTIVE."""
        today = date.today()
        start = today - timedelta(days=10)
        end = today + timedelta(days=45)
        metrics = compute_warranty_metrics(start, end, reference_date=today)
        self.assertEqual(metrics["status"], "ACTIVE")
        self.assertEqual(metrics["days_remaining"], 45)
        self.assertTrue(metrics["is_active"])

    def test_warranty_status_expiring_soon(self):
        """15. Calculation: Warranty with 0-30 days remaining has status EXPIRING_SOON."""
        today = date.today()
        start = today - timedelta(days=100)
        end = today + timedelta(days=15)
        metrics = compute_warranty_metrics(start, end, reference_date=today)
        self.assertEqual(metrics["status"], "EXPIRING_SOON")
        self.assertEqual(metrics["days_remaining"], 15)
        self.assertTrue(metrics["is_active"])

    def test_warranty_status_expired(self):
        """16. Calculation: Warranty with end_date before today has status EXPIRED."""
        today = date.today()
        start = today - timedelta(days=365)
        end = today - timedelta(days=5)
        metrics = compute_warranty_metrics(start, end, reference_date=today)
        self.assertEqual(metrics["status"], "EXPIRED")
        self.assertEqual(metrics["days_remaining"], -5)
        self.assertFalse(metrics["is_active"])

    def test_days_remaining_exact_calculation(self):
        """17. Calculation: days_remaining matches (end_date - today).days."""
        today = date.today()
        end = today + timedelta(days=100)
        metrics = compute_warranty_metrics(today, end, reference_date=today)
        self.assertEqual(metrics["days_remaining"], 100)

    def test_no_circular_json_serialization(self):
        """18. Verify warranty response does not contain circular product-warranty trees."""
        start = date.today()
        end = start + timedelta(days=60)
        res = self.client.post('/api/v1/warranties', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat()
        })
        data = res.get_json()
        self.assertNotIn("product", data)  # Does not nest full product with sub-warranties
        self.assertIn("product_id", data)

    def test_cascade_delete_warranties_on_product_deletion(self):
        """19. Cascade: Deleting a product automatically deletes its associated warranties."""
        start = date.today()
        end = start + timedelta(days=60)
        war_res = self.client.post('/api/v1/warranties', headers=self.headers_a, json={
            "product_id": self.product_a.id,
            "start_date": start.isoformat(),
            "end_date": end.isoformat()
        })
        war_id = war_res.get_json()['id']

        # Delete product
        del_res = self.client.delete(f'/api/v1/products/{self.product_a.id}', headers=self.headers_a)
        self.assertEqual(del_res.status_code, 200)

        # Warranty should now be gone from DB
        db_war = db.session.get(Warranty, war_id)
        self.assertIsNone(db_war)


if __name__ == '__main__':
    unittest.main()
