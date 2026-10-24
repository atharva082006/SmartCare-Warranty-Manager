"""
Health and Diagnostic Routes.
Provides service and database health checks for the SmartCare API.
"""

from flask import Blueprint, jsonify, current_app
from sqlalchemy import text
from app.extensions import db

health_bp = Blueprint('health', __name__, url_prefix='/api/v1')


@health_bp.route('/health', methods=['GET'])
def service_health():
    """
    Service health check endpoint.
    Verifies that the Flask application is running and responding to requests.
    """
    return jsonify({
        "status": "ok",
        "service": "SmartCare API"
    }), 200


@health_bp.route('/health/db', methods=['GET'])
def database_health():
    """
    Database health check endpoint.
    Verifies that SQLAlchemy can communicate with the configured PostgreSQL database.
    Does not expose sensitive credentials, connection strings, or internal traces.
    """
    try:
        # Execute a minimal query to verify live connection
        db.session.execute(text("SELECT 1"))
        return jsonify({
            "status": "ok",
            "database": "connected"
        }), 200
    except Exception as exc:
        # Log error internally for diagnostics while keeping API response safe
        current_app.logger.warning(f"Database health check failed: {type(exc).__name__}")
        return jsonify({
            "status": "error",
            "database": "disconnected",
            "message": "Database service unavailable"
        }), 503
    finally:
        db.session.remove()
