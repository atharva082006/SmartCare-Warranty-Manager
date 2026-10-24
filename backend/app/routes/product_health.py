"""
Product Health REST Routes.
Provides endpoints for retrieving product health scores, deduction factors,
and maintenance recommendations.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.product import Product
from app.services.health_service import calculate_product_health, get_user_health_analytics

product_health_bp = Blueprint('product_health', __name__, url_prefix='/api/v1/health')


@product_health_bp.route('/products', methods=['GET'])
@jwt_required()
def list_product_health():
    """
    Retrieve product health scores and status classifications for authenticated user.
    Supports optional query filter: ?status=HEALTHY | ATTENTION | CRITICAL
    """
    current_user_id = int(get_jwt_identity())
    status_filter = request.args.get('status')

    analytics = get_user_health_analytics(
        user_id=current_user_id,
        status_filter=status_filter
    )

    return jsonify({
        "products": analytics["product_health_list"],
        "summary": {
            "average_health_score": analytics["average_health_score"],
            "healthy_products": analytics["healthy_products"],
            "attention_products": analytics["attention_products"],
            "critical_products": analytics["critical_products"]
        }
    }), 200


@product_health_bp.route('/products/<int:product_id>', methods=['GET'])
@jwt_required()
def get_product_health_detail(product_id):
    """
    Retrieve detailed health breakdown, deduction factors, and recommendations for a single product.
    Enforces strict ownership checks (returns 404 for nonexistent or unauthorized access).
    """
    current_user_id = int(get_jwt_identity())
    product = db.session.get(Product, product_id)

    if not product or product.user_id != current_user_id:
        return jsonify({
            "error": "Not Found",
            "message": "Product not found"
        }), 404

    health_data = calculate_product_health(product)

    return jsonify({
        "product": product.to_dict(),
        "health": health_data
    }), 200
