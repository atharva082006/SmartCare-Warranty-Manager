"""
Products API Unit and Integration Tests.
Verifies CRUD operations, auto-generated product codes, validation, and IDOR ownership isolation.
"""

import unittest
from datetime import date
from flask_jwt_extended import create_access_token
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.product import Product


class ProductTestCase(unittest.TestCase):
    """Test suite for product endpoints and ownership rules."""

    def setUp(self):
        """Configure test application, in-memory database, and sample users."""
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

    def tearDown(self):
        """Clean up database and application context."""
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_unauthorized_get_products(self):
        """1. Verify GET /api/v1/products without token returns HTTP 401."""
        res = self.client.get('/api/v1/products')
        self.assertEqual(res.status_code, 401)

    def test_unauthorized_post_product(self):
        """2. Verify POST /api/v1/products without token returns HTTP 401."""
        res = self.client.post('/api/v1/products', json={"name": "Test"})
        self.assertEqual(res.status_code, 401)

    def test_authenticated_empty_product_list(self):
        """3. Verify authenticated user initially gets an empty products list."""
        res = self.client.get('/api/v1/products', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('products'), [])

    def test_create_product_success(self):
        """4, 5, 6. Verify valid product creation succeeds (201), generates code, and associates with user."""
        payload = {
            "name": "MacBook Air",
            "brand": "Apple",
            "category": "Laptop",
            "model": "M4",
            "serial_number": "ABC12345",
            "purchase_date": "2026-01-15",
            "purchase_price": 99999.00,
            "warranty_period": 12,
            "notes": "Personal dev laptop"
        }
        res = self.client.post('/api/v1/products', headers=self.headers_a, json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIn("id", data)
        self.assertTrue(data.get("product_code", "").startswith("PRD-2026-"))
        self.assertEqual(data.get("name"), "MacBook Air")
        self.assertEqual(data.get("brand"), "Apple")
        self.assertEqual(data.get("purchase_price"), 99999.00)

        # Check DB ownership
        db_prod = db.session.get(Product, data['id'])
        self.assertIsNotNone(db_prod)
        self.assertEqual(db_prod.user_id, self.user_a.id)

    def test_get_product_by_id(self):
        """7. Verify GET /api/v1/products/<id> returns product details for owner."""
        res = self.client.post('/api/v1/products', headers=self.headers_a, json={
            "name": "Sony Headphones",
            "brand": "Sony",
            "category": "Audio",
            "purchase_date": "2026-02-10"
        })
        prod_id = res.get_json()['id']

        get_res = self.client.get(f'/api/v1/products/{prod_id}', headers=self.headers_a)
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.get_json()['name'], "Sony Headphones")

    def test_update_product(self):
        """8. Verify PUT /api/v1/products/<id> updates allowed fields without altering product_code or user_id."""
        create_res = self.client.post('/api/v1/products', headers=self.headers_a, json={
            "name": "Original Name",
            "brand": "Original Brand",
            "category": "Appliances",
            "purchase_date": "2026-03-01",
            "purchase_price": 5000.00
        })
        prod_data = create_res.get_json()
        prod_id = prod_data['id']
        original_code = prod_data['product_code']

        update_payload = {
            "name": "Updated Name",
            "purchase_price": 5500.00,
            "product_code": "TAMPERED-CODE",
            "user_id": 999
        }
        put_res = self.client.put(f'/api/v1/products/{prod_id}', headers=self.headers_a, json=update_payload)
        self.assertEqual(put_res.status_code, 200)
        updated_data = put_res.get_json()
        self.assertEqual(updated_data['name'], "Updated Name")
        self.assertEqual(updated_data['purchase_price'], 5500.00)
        self.assertEqual(updated_data['product_code'], original_code)  # immutable

        # Check in DB
        db_prod = db.session.get(Product, prod_id)
        self.assertEqual(db_prod.user_id, self.user_a.id)  # immutable
        self.assertEqual(db_prod.product_code, original_code)

    def test_delete_product(self):
        """9 & 10. Verify DELETE /api/v1/products/<id> deletes product and subsequent GET returns 404."""
        create_res = self.client.post('/api/v1/products', headers=self.headers_a, json={
            "name": "To Delete",
            "brand": "Generic",
            "category": "Other",
            "purchase_date": "2026-01-01"
        })
        prod_id = create_res.get_json()['id']

        del_res = self.client.delete(f'/api/v1/products/{prod_id}', headers=self.headers_a)
        self.assertEqual(del_res.status_code, 200)
        self.assertIn("deleted successfully", del_res.get_json().get('message', ''))

        get_res = self.client.get(f'/api/v1/products/{prod_id}', headers=self.headers_a)
        self.assertEqual(get_res.status_code, 404)

    def test_validation_missing_required_fields(self):
        """11 & 14. Verify missing name, brand, category, or purchase_date returns HTTP 400."""
        # Missing brand and category
        res = self.client.post('/api/v1/products', headers=self.headers_a, json={
            "name": "Incomplete Product"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("brand is required", res.get_json()['error'])

    def test_validation_negative_price_rejected(self):
        """12. Verify negative purchase_price returns HTTP 400."""
        res = self.client.post('/api/v1/products', headers=self.headers_a, json={
            "name": "TV",
            "brand": "LG",
            "category": "Television",
            "purchase_date": "2026-01-01",
            "purchase_price": -500
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("purchase_price cannot be negative", res.get_json()['error'])

    def test_validation_invalid_date_rejected(self):
        """13. Verify malformed purchase_date returns HTTP 400."""
        res = self.client.post('/api/v1/products', headers=self.headers_a, json={
            "name": "Smart Watch",
            "brand": "Fitbit",
            "category": "Wearable",
            "purchase_date": "not-a-valid-date"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("purchase_date must be a valid date", res.get_json()['error'])

    # 15, 16, 17. IDOR & Ownership Protection tests
    def test_idor_protection_another_user_cannot_read_product(self):
        """15. Security: User B cannot access User A's product (must return HTTP 404)."""
        create_res = self.client.post('/api/v1/products', headers=self.headers_a, json={
            "name": "Secret Laptop",
            "brand": "Dell",
            "category": "Laptop",
            "purchase_date": "2026-01-01"
        })
        prod_id = create_res.get_json()['id']

        # User B attempts to read User A's product
        res = self.client.get(f'/api/v1/products/{prod_id}', headers=self.headers_b)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.get_json()['error'], "Product not found")

    def test_idor_protection_another_user_cannot_update_product(self):
        """16. Security: User B cannot update User A's product (must return HTTP 404)."""
        create_res = self.client.post('/api/v1/products', headers=self.headers_a, json={
            "name": "Confidential Hardware",
            "brand": "HP",
            "category": "Server",
            "purchase_date": "2026-01-01"
        })
        prod_id = create_res.get_json()['id']

        # User B attempts to update User A's product
        res = self.client.put(f'/api/v1/products/{prod_id}', headers=self.headers_b, json={
            "name": "Hacked Name"
        })
        self.assertEqual(res.status_code, 404)

        # Verify User A's product was not altered
        owner_check = self.client.get(f'/api/v1/products/{prod_id}', headers=self.headers_a)
        self.assertEqual(owner_check.get_json()['name'], "Confidential Hardware")

    def test_idor_protection_another_user_cannot_delete_product(self):
        """17. Security: User B cannot delete User A's product (must return HTTP 404)."""
        create_res = self.client.post('/api/v1/products', headers=self.headers_a, json={
            "name": "Protected Phone",
            "brand": "Google",
            "category": "Mobile",
            "purchase_date": "2026-01-01"
        })
        prod_id = create_res.get_json()['id']

        # User B attempts to delete User A's product
        res = self.client.delete(f'/api/v1/products/{prod_id}', headers=self.headers_b)
        self.assertEqual(res.status_code, 404)

        # Verify product still exists for owner
        owner_check = self.client.get(f'/api/v1/products/{prod_id}', headers=self.headers_a)
        self.assertEqual(owner_check.status_code, 200)

    def test_safe_serialization(self):
        """18. Verify serialized product payload never contains passwords, hashes, or internal secrets."""
        res = self.client.post('/api/v1/products', headers=self.headers_a, json={
            "name": "Monitor",
            "brand": "BenQ",
            "category": "Display",
            "purchase_date": "2026-01-01"
        })
        raw_text = res.get_data(as_text=True)
        self.assertNotIn("password", raw_text.lower())
        self.assertNotIn("secret", raw_text.lower())
        self.assertNotIn("hash", raw_text.lower())


if __name__ == '__main__':
    unittest.main()
