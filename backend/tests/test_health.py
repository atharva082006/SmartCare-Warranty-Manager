"""
Health and Configuration Endpoint Tests.
Tests the Flask application factory, error handlers, and health endpoints.
"""

import unittest
from app import create_app


class HealthEndpointTestCase(unittest.TestCase):
    """Test suite for service and database health checks."""

    def setUp(self):
        """Create and configure a new app instance for each test."""
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        """Clean up application context."""
        self.ctx.pop()

    def test_app_starts_and_testing_enabled(self):
        """1. Verify Flask application starts with testing configuration enabled."""
        self.assertIsNotNone(self.app)
        self.assertTrue(self.app.config.get('TESTING'))

    def test_health_endpoint_status_code_200(self):
        """2. Verify GET /api/v1/health returns HTTP status 200."""
        response = self.client.get('/api/v1/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content_type, 'application/json')

    def test_health_endpoint_status_field(self):
        """3. Verify GET /api/v1/health JSON payload contains status = 'ok'."""
        response = self.client.get('/api/v1/health')
        data = response.get_json()
        self.assertIsInstance(data, dict)
        self.assertEqual(data.get('status'), 'ok')

    def test_health_endpoint_service_field(self):
        """4. Verify GET /api/v1/health JSON payload contains service = 'SmartCare API'."""
        response = self.client.get('/api/v1/health')
        data = response.get_json()
        self.assertIsInstance(data, dict)
        self.assertEqual(data.get('service'), 'SmartCare API')

    def test_404_error_returns_clean_json(self):
        """5. Verify nonexistent routes return clean JSON with error = 'Not Found' and HTTP 404."""
        response = self.client.get('/api/v1/does-not-exist')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.content_type, 'application/json')
        data = response.get_json()
        self.assertIsInstance(data, dict)
        self.assertEqual(data.get('error'), 'Not Found')

    def test_db_health_route_exists_and_returns_safe_json(self):
        """
        6. Verify GET /api/v1/health/db route exists, responds with JSON, and
        gracefully handles both connected (200) and disconnected (503) states
        without exposing database credentials, secrets, or unhandled exceptions.
        """
        response = self.client.get('/api/v1/health/db')
        self.assertIn(response.status_code, [200, 503])
        self.assertEqual(response.content_type, 'application/json')
        data = response.get_json()
        self.assertIsInstance(data, dict)

        if response.status_code == 200:
            # PostgreSQL is connected
            self.assertEqual(data.get('status'), 'ok')
            self.assertEqual(data.get('database'), 'connected')
        else:
            # PostgreSQL service is unavailable or credentials not set
            self.assertEqual(data.get('status'), 'error')
            self.assertEqual(data.get('database'), 'disconnected')
            self.assertEqual(data.get('message'), 'Database service unavailable')

        # Safety verification: ensure no database credentials or connection string leaked
        response_str = str(data).lower()
        self.assertNotIn('password', response_str)
        self.assertNotIn('postgresql://', response_str)


if __name__ == '__main__':
    unittest.main()
