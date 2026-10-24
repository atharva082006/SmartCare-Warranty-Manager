"""
Analytics REST Routes.
Provides endpoints for high-level overview, warranty, service, product, document,
health, and attention items analytics.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.analytics_service import (
    get_overview_stats,
    get_warranty_analytics,
    get_service_analytics,
    get_product_analytics,
    get_document_analytics,
    get_health_analytics,
    get_attention_items
)

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/v1/analytics')


@analytics_bp.route('/overview', methods=['GET'])
@jwt_required()
def overview_analytics():
    """
    Get top-level dashboard overview statistics for authenticated user.
    """
    current_user_id = int(get_jwt_identity())
    stats = get_overview_stats(current_user_id)
    return jsonify({"overview": stats}), 200


@analytics_bp.route('/warranties', methods=['GET'])
@jwt_required()
def warranty_analytics():
    """
    Get detailed warranty coverage analytics and status distribution.
    """
    current_user_id = int(get_jwt_identity())
    stats = get_warranty_analytics(current_user_id)
    return jsonify({"warranties": stats}), 200


@analytics_bp.route('/services', methods=['GET'])
@jwt_required()
def service_analytics():
    """
    Get service maintenance analytics, costs, and monthly breakdowns.
    """
    current_user_id = int(get_jwt_identity())
    stats = get_service_analytics(current_user_id)
    return jsonify({"services": stats}), 200


@analytics_bp.route('/products', methods=['GET'])
@jwt_required()
def product_analytics():
    """
    Get product-level distribution, purchase value, and warranty attachment rates.
    """
    current_user_id = int(get_jwt_identity())
    stats = get_product_analytics(current_user_id)
    return jsonify({"products": stats}), 200


@analytics_bp.route('/documents', methods=['GET'])
@jwt_required()
def document_analytics():
    """
    Get document storage analytics, type distribution, and OCR result statuses.
    """
    current_user_id = int(get_jwt_identity())
    stats = get_document_analytics(current_user_id)
    return jsonify({"documents": stats}), 200


@analytics_bp.route('/health', methods=['GET'])
@jwt_required()
def health_analytics():
    """
    Get aggregate product health distribution and scores.
    Supports optional status filter: ?status=HEALTHY | ATTENTION | CRITICAL
    """
    current_user_id = int(get_jwt_identity())
    status_filter = request.args.get('status')
    stats = get_health_analytics(current_user_id, status_filter=status_filter)
    return jsonify({"health": stats}), 200


@analytics_bp.route('/attention', methods=['GET'])
@jwt_required()
def attention_analytics():
    """
    Get prioritized, actionable maintenance and warranty alerts.
    """
    current_user_id = int(get_jwt_identity())
    items = get_attention_items(current_user_id)
    return jsonify(items), 200
