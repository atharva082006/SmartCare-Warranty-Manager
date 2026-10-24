"""
Authentication API Unit and Integration Tests.
Verifies registration, login, JWT protection, password hashing, and security constraints.
"""

import unittest
from datetime import timedelta
import bcrypt
from flask_jwt_extended import create_access_token
from app import create_app
from app.extensions import db
from app.models.user import User


class AuthTestCase(unittest.TestCase):
    """Test suite for authentication workflows and security rules."""

    def setUp(self):
        """Configure test application and fresh in-memory database."""
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        """Clean up database and application context."""
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    # 1. App starts and configuration
    def test_app_starts(self):
        """1. Verify application starts with testing configuration."""
        self.assertIsNotNone(self.app)
        self.assertTrue(self.app.config.get('TESTING'))

    # 2 & 3. Register valid user & HTTP 201
    def test_register_valid_user(self):
        """2 & 3. Verify user registration succeeds with HTTP 201 and clean response."""
        payload = {
            "username": "student",
            "email": "student@example.com",
            "password": "password123",
            "phone": "9876543210"
        }
        res = self.client.post('/api/v1/auth/register', json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data.get('message'), "User registered successfully")
        user = data.get('user', {})
        self.assertEqual(user.get('username'), "student")
        self.assertEqual(user.get('email'), "student@example.com")
        self.assertEqual(user.get('phone'), "9876543210")
        self.assertIn('id', user)

    # 4, 5, 6. User stored in DB, password hashed with bcrypt, plaintext not stored
    def test_user_stored_in_database_and_password_hashed(self):
        """4, 5, 6. Verify user is saved in DB, password is encrypted with bcrypt, and plaintext is not stored."""
        raw_password = "SecurePassword123!"
        payload = {
            "username": "alice",
            "email": "alice@example.com",
            "password": raw_password
        }
        res = self.client.post('/api/v1/auth/register', json=payload)
        self.assertEqual(res.status_code, 201)

        db_user = User.query.filter_by(email="alice@example.com").first()
        self.assertIsNotNone(db_user)
        self.assertEqual(db_user.username, "alice")
        # Ensure password_hash is not plaintext
        self.assertNotEqual(db_user.password_hash, raw_password)
        # Ensure it is a valid bcrypt hash
        self.assertTrue(db_user.password_hash.startswith("$2b$") or db_user.password_hash.startswith("$2a$"))
        # Verify bcrypt validation
        self.assertTrue(db_user.check_password(raw_password))
        self.assertFalse(db_user.check_password("WrongPassword123!"))

    # 7. Register duplicate email -> HTTP 409
    def test_register_duplicate_email(self):
        """7. Verify registering an existing email returns HTTP 409 Conflict."""
        payload1 = {
            "username": "user1",
            "email": "duplicate@example.com",
            "password": "password123"
        }
        self.client.post('/api/v1/auth/register', json=payload1)

        payload2 = {
            "username": "user2",
            "email": "duplicate@example.com",
            "password": "password123"
        }
        res = self.client.post('/api/v1/auth/register', json=payload2)
        self.assertEqual(res.status_code, 409)
        data = res.get_json()
        self.assertIn("Email is already registered", data.get('error', ''))

    # 8. Register duplicate username -> HTTP 409
    def test_register_duplicate_username(self):
        """8. Verify registering an existing username returns HTTP 409 Conflict."""
        payload1 = {
            "username": "samename",
            "email": "first@example.com",
            "password": "password123"
        }
        self.client.post('/api/v1/auth/register', json=payload1)

        payload2 = {
            "username": "samename",
            "email": "second@example.com",
            "password": "password123"
        }
        res = self.client.post('/api/v1/auth/register', json=payload2)
        self.assertEqual(res.status_code, 409)
        data = res.get_json()
        self.assertIn("Username is already taken", data.get('error', ''))

    # 9. Register missing email -> HTTP 400
    def test_register_missing_email(self):
        """9. Verify registering without email returns HTTP 400 Bad Request."""
        payload = {
            "username": "noemail",
            "password": "password123"
        }
        res = self.client.post('/api/v1/auth/register', json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn("Email is required", data.get('error', ''))

    # 10. Register invalid email -> HTTP 400
    def test_register_invalid_email(self):
        """10. Verify registering with malformed email returns HTTP 400 Bad Request."""
        payload = {
            "username": "bademail",
            "email": "not-an-email",
            "password": "password123"
        }
        res = self.client.post('/api/v1/auth/register', json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn("Invalid email format", data.get('error', ''))

    # 11. Register short password -> HTTP 400
    def test_register_short_password(self):
        """11. Verify registering with a password under 8 characters returns HTTP 400."""
        payload = {
            "username": "shortpass",
            "email": "short@example.com",
            "password": "short"
        }
        res = self.client.post('/api/v1/auth/register', json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertIn("at least 8 characters", data.get('error', ''))

    # 12, 13, 14. Login with valid credentials -> HTTP 200, returns token and user info
    def test_login_valid_credentials(self):
        """12, 13, 14. Verify successful login returns HTTP 200, access_token, and user info."""
        self.client.post('/api/v1/auth/register', json={
            "username": "bob",
            "email": "bob@example.com",
            "password": "password123",
            "phone": "5551234567"
        })

        login_res = self.client.post('/api/v1/auth/login', json={
            "email": "bob@example.com",
            "password": "password123"
        })
        self.assertEqual(login_res.status_code, 200)
        data = login_res.get_json()
        self.assertEqual(data.get('message'), "Login successful")
        self.assertTrue(isinstance(data.get('access_token'), str) and len(data.get('access_token')) > 10)
        user = data.get('user', {})
        self.assertEqual(user.get('username'), "bob")
        self.assertEqual(user.get('email'), "bob@example.com")
        self.assertEqual(user.get('phone'), "5551234567")

    # 15. Login with wrong password -> HTTP 401
    def test_login_wrong_password(self):
        """15. Verify login with wrong password returns HTTP 401."""
        self.client.post('/api/v1/auth/register', json={
            "username": "carol",
            "email": "carol@example.com",
            "password": "correctpassword123"
        })

        login_res = self.client.post('/api/v1/auth/login', json={
            "email": "carol@example.com",
            "password": "wrongpassword"
        })
        self.assertEqual(login_res.status_code, 401)
        data = login_res.get_json()
        self.assertEqual(data.get('error'), "Invalid email or password")

    # 16 & 17. Login with unknown email -> HTTP 401 generic message
    def test_login_unknown_email_returns_generic_message(self):
        """16 & 17. Verify login with non-existent email returns generic HTTP 401 without revealing account status."""
        login_res = self.client.post('/api/v1/auth/login', json={
            "email": "doesnotexist@example.com",
            "password": "password123"
        })
        self.assertEqual(login_res.status_code, 401)
        data = login_res.get_json()
        self.assertEqual(data.get('error'), "Invalid email or password")

    # 18. /auth/me without token -> HTTP 401
    def test_me_without_token(self):
        """18. Verify GET /api/v1/auth/me without authorization header returns HTTP 401."""
        res = self.client.get('/api/v1/auth/me')
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertIn("error", data)

    # 19. /auth/me with invalid token -> HTTP 401
    def test_me_with_invalid_token(self):
        """19. Verify GET /api/v1/auth/me with bogus token returns HTTP 401."""
        headers = {"Authorization": "Bearer not-a-valid-jwt-token"}
        res = self.client.get('/api/v1/auth/me', headers=headers)
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertIn("error", data)

    # 20 & 21. /auth/me with valid token -> HTTP 200, returns correct user
    def test_me_with_valid_token(self):
        """20 & 21. Verify GET /api/v1/auth/me with valid bearer token returns HTTP 200 and user profile."""
        reg_res = self.client.post('/api/v1/auth/register', json={
            "username": "david",
            "email": "david@example.com",
            "password": "password123",
            "phone": "9998887777"
        })
        user_id = reg_res.get_json()['user']['id']

        login_res = self.client.post('/api/v1/auth/login', json={
            "email": "david@example.com",
            "password": "password123"
        })
        token = login_res.get_json()['access_token']

        headers = {"Authorization": f"Bearer {token}"}
        me_res = self.client.get('/api/v1/auth/me', headers=headers)
        self.assertEqual(me_res.status_code, 200)
        data = me_res.get_json()
        user = data.get('user', {})
        self.assertEqual(user.get('id'), user_id)
        self.assertEqual(user.get('username'), "david")
        self.assertEqual(user.get('email'), "david@example.com")
        self.assertEqual(user.get('phone'), "9998887777")

    # 22. Password hash is never returned in any response
    def test_password_hash_never_returned(self):
        """22. Verify password_hash is never included in register, login, or /me responses."""
        reg_res = self.client.post('/api/v1/auth/register', json={
            "username": "eve",
            "email": "eve@example.com",
            "password": "password123"
        })
        self.assertNotIn("password_hash", reg_res.get_data(as_text=True))
        self.assertNotIn("password123", reg_res.get_data(as_text=True))

        login_res = self.client.post('/api/v1/auth/login', json={
            "email": "eve@example.com",
            "password": "password123"
        })
        token = login_res.get_json()['access_token']
        self.assertNotIn("password_hash", login_res.get_data(as_text=True))

        me_res = self.client.get('/api/v1/auth/me', headers={"Authorization": f"Bearer {token}"})
        self.assertNotIn("password_hash", me_res.get_data(as_text=True))

    # 23. Health endpoint still works
    def test_health_endpoint_still_works(self):
        """23. Verify GET /api/v1/health continues to return HTTP 200 OK."""
        res = self.client.get('/api/v1/health')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'ok')

    # 24. Database health endpoint still works
    def test_db_health_endpoint_still_works(self):
        """24. Verify GET /api/v1/health/db continues to return HTTP 200 OK."""
        res = self.client.get('/api/v1/health/db')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'ok')
        self.assertEqual(data.get('database'), 'connected')

    # 25. Security test: Expired token returns 401
    def test_expired_token_rejected(self):
        """25. Verify expired token is rejected with HTTP 401."""
        with self.app.app_context():
            expired_token = create_access_token(
                identity="1",
                expires_delta=timedelta(seconds=-1)
            )
        res = self.client.get('/api/v1/auth/me', headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertIn("expired", data.get('error', '').lower())

    # 26. Security test: Non-existent user with valid JWT returns 401
    def test_valid_token_deleted_user_returns_401(self):
        """26. Verify a token with an ID of a user not in database returns HTTP 401."""
        with self.app.app_context():
            token = create_access_token(identity="999999")
        res = self.client.get('/api/v1/auth/me', headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertIn("error", data)


if __name__ == '__main__':
    unittest.main()
