"""
Warranties API Routes.
Provides CRUD operations for product warranties with inherited ownership verification and dynamic status calculation.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.product import Product
from app.models.warranty import Warranty
from app.services.warranty_service import validate_warranty_payload

warranties_bp = Blueprint('warranties', __name__, url_prefix='/api/v1/warranties')


def get_current_user_id():
    """Extract and validate the authenticated user ID from JWT identity."""
    identity = get_jwt_identity()
    try:
        return int(identity)
    except (ValueError, TypeError):
        return None


@warranties_bp.route('', methods=['GET'])
@jwt_required()
def list_warranties():
    """
    List all warranties belonging to the authenticated user via product ownership.
    Supports optional query filter: ?product_id=<id>
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    query = (
        Warranty.query
        .join(Product, Warranty.product_id == Product.id)
        .filter(Product.user_id == user_id)
    )

    product_id_param = request.args.get('product_id')
    if product_id_param:
        try:
            pid = int(product_id_param)
            query = query.filter(Warranty.product_id == pid)
        except (ValueError, TypeError):
            pass

    warranties = query.order_by(Warranty.id.asc()).all()

    return jsonify({
        "warranties": [w.to_dict() for w in warranties]
    }), 200


@warranties_bp.route('/<int:warranty_id>', methods=['GET'])
@jwt_required()
def get_warranty(warranty_id):
    """
    Retrieve single warranty by ID.
    Enforces user ownership via associated product; returns 404 if not found or unauthorized.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    warranty = db.session.get(Warranty, warranty_id)
    if not warranty or not warranty.product or warranty.product.user_id != user_id:
        return jsonify({"error": "Warranty not found"}), 404

    return jsonify(warranty.to_dict()), 200


@warranties_bp.route('', methods=['POST'])
@jwt_required()
def create_warranty():
    """
    Create a new warranty for a product owned by the authenticated user.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    if not request.is_json:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    data = request.get_json(silent=True)
    validated, error = validate_warranty_payload(data, is_update=False)
    if error:
        return jsonify({"error": error}), 400

    # Verify that the target product exists and belongs to the authenticated user
    product = db.session.get(Product, validated['product_id'])
    if not product or product.user_id != user_id:
        return jsonify({"error": "Product not found"}), 404

    warranty = Warranty(
        product_id=product.id,
        start_date=validated['start_date'],
        end_date=validated['end_date'],
        type=validated.get('type'),
        coverage=validated.get('coverage'),
        is_active=validated.get('is_active', True)
    )

    db.session.add(warranty)
    db.session.commit()

    return jsonify(warranty.to_dict()), 201


@warranties_bp.route('/<int:warranty_id>', methods=['PUT'])
@jwt_required()
def update_warranty(warranty_id):
    """
    Update a warranty belonging to the authenticated user.
    Does not allow altering product ownership.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    warranty = db.session.get(Warranty, warranty_id)
    if not warranty or not warranty.product or warranty.product.user_id != user_id:
        return jsonify({"error": "Warranty not found"}), 404

    if not request.is_json:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    data = request.get_json(silent=True)
    validated, error = validate_warranty_payload(data, is_update=True)
    if error:
        return jsonify({"error": error}), 400

    # Apply updates
    if 'start_date' in validated:
        warranty.start_date = validated['start_date']
    if 'end_date' in validated:
        warranty.end_date = validated['end_date']
    if 'type' in validated:
        warranty.type = validated['type']
    if 'coverage' in validated:
        warranty.coverage = validated['coverage']
    if 'is_active' in validated:
        warranty.is_active = validated['is_active']

    db.session.commit()

    return jsonify(warranty.to_dict()), 200


@warranties_bp.route('/<int:warranty_id>', methods=['DELETE'])
@jwt_required()
def delete_warranty(warranty_id):
    """
    Delete a warranty belonging to the authenticated user.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    warranty = db.session.get(Warranty, warranty_id)
    if not warranty or not warranty.product or warranty.product.user_id != user_id:
        return jsonify({"error": "Warranty not found"}), 404

    db.session.delete(warranty)
    db.session.commit()

    return jsonify({"message": "Warranty deleted successfully"}), 200
