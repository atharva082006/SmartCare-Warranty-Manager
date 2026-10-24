"""
Routes package initialization.
Exports route blueprints and registration helper.
"""

from app.routes.health import health_bp
from app.routes.auth import auth_bp
from app.routes.products import products_bp
from app.routes.warranties import warranties_bp
from app.routes.service_records import service_records_bp
from app.routes.documents import documents_bp
from app.routes.ocr import ocr_bp
from app.routes.product_health import product_health_bp
from app.routes.analytics import analytics_bp


def register_routes(app):
    """Register all application blueprints."""
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(warranties_bp)
    app.register_blueprint(service_records_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(ocr_bp)
    app.register_blueprint(product_health_bp)
    app.register_blueprint(analytics_bp)


