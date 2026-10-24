"""
Products API Routes.
Provides CRUD operations for user-owned products with JWT authentication and strict ownership verification.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.product import Product
from app.services.product_service import (
    generate_product_code,
    validate_product_payload
)

products_bp = Blueprint('products', __name__, url_prefix='/api/v1/products')


def get_current_user_id():
    """Extract and validate the authenticated user ID from JWT identity."""
    identity = get_jwt_identity()
    try:
        return int(identity)
    except (ValueError, TypeError):
        return None


@products_bp.route('', methods=['GET'])
@jwt_required()
def list_products():
    """
    List all products belonging to the currently authenticated user.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    products = (
        Product.query
        .filter_by(user_id=user_id)
        .order_by(Product.id.asc())
        .all()
    )

    return jsonify({
        "products": [p.to_dict() for p in products]
    }), 200


@products_bp.route('/<int:product_id>', methods=['GET'])
@jwt_required()
def get_product(product_id):
    """
    Retrieve single product by ID.
    Enforces server-side user ownership; returns 404 if product does not belong to user.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    product = db.session.get(Product, product_id)
    if not product or product.user_id != user_id:
        return jsonify({"error": "Product not found"}), 404

    return jsonify(product.to_dict()), 200


@products_bp.route('', methods=['POST'])
@jwt_required()
def create_product():
    """
    Create a new product for the authenticated user.
    Server generates a unique human-readable product_code (e.g. PRD-2026-00001).
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    if not request.is_json:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    data = request.get_json(silent=True)
    validated, error = validate_product_payload(data, is_update=False)
    if error:
        return jsonify({"error": error}), 400

    # Auto-generate server-side product_code
    product_code = generate_product_code()

    product = Product(
        user_id=user_id,
        product_code=product_code,
        name=validated['name'],
        brand=validated['brand'],
        category=validated['category'],
        model=validated.get('model'),
        serial_number=validated.get('serial_number'),
        purchase_date=validated['purchase_date'],
        purchase_price=validated.get('purchase_price'),
        warranty_period=validated.get('warranty_period'),
        notes=validated.get('notes')
    )

    db.session.add(product)
    db.session.commit()

    return jsonify(product.to_dict()), 201


@products_bp.route('/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    """
    Update an existing product owned by the authenticated user.
    Does not allow changing id, user_id, or product_code.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    product = db.session.get(Product, product_id)
    if not product or product.user_id != user_id:
        return jsonify({"error": "Product not found"}), 404

    if not request.is_json:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    data = request.get_json(silent=True)
    validated, error = validate_product_payload(data, is_update=True)
    if error:
        return jsonify({"error": error}), 400

    # Apply updates for allowed fields
    if 'name' in validated:
        product.name = validated['name']
    if 'brand' in validated:
        product.brand = validated['brand']
    if 'category' in validated:
        product.category = validated['category']
    if 'model' in validated:
        product.model = validated['model']
    if 'serial_number' in validated:
        product.serial_number = validated['serial_number']
    if 'purchase_date' in validated:
        product.purchase_date = validated['purchase_date']
    if 'purchase_price' in validated:
        product.purchase_price = validated['purchase_price']
    if 'warranty_period' in validated:
        product.warranty_period = validated['warranty_period']
    if 'notes' in validated:
        product.notes = validated['notes']

    db.session.commit()

    return jsonify(product.to_dict()), 200


@products_bp.route('/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    """
    Delete a product owned by the authenticated user.
    Cascades deletion to associated warranties.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    product = db.session.get(Product, product_id)
    if not product or product.user_id != user_id:
        return jsonify({"error": "Product not found"}), 404

    # Clean up physical document files associated with this product
    from app.services.document_service import delete_document_file
    for doc in product.documents:
        delete_document_file(doc.file_path)

    db.session.delete(product)
    db.session.commit()

    return jsonify({"message": "Product deleted successfully"}), 200
