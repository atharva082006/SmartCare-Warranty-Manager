"""
Service Records API Routes.
Provides CRUD operations for appliance maintenance and repair logs with strict ownership verification.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.service_record_service import (
    validate_service_record_payload,
    get_user_service_records,
    get_user_service_record_by_id,
    create_service_record,
    update_service_record,
    delete_service_record
)

service_records_bp = Blueprint('service_records', __name__, url_prefix='/api/v1/service-records')


def get_current_user_id():
    """Extract and validate the authenticated user ID from JWT identity."""
    identity = get_jwt_identity()
    try:
        return int(identity)
    except (ValueError, TypeError):
        return None


@service_records_bp.route('', methods=['GET'])
@jwt_required()
def list_service_records():
    """
    List service records belonging to the authenticated user.
    Supports optional product scoping: ?product_id=<id>
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    product_id_param = request.args.get('product_id')
    product_id = None
    if product_id_param is not None:
        try:
            product_id = int(product_id_param)
        except (ValueError, TypeError):
            return jsonify({"error": "product_id query parameter must be an integer"}), 400

    records, error = get_user_service_records(user_id, product_id)
    if error:
        return jsonify({"error": error}), 404

    return jsonify({
        "service_records": [r.to_dict() for r in records]
    }), 200


@service_records_bp.route('/<int:record_id>', methods=['GET'])
@jwt_required()
def get_service_record(record_id):
    """
    Retrieve single service record by ID.
    Enforces server-side user ownership; returns 404 if record does not belong to user.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    record = get_user_service_record_by_id(user_id, record_id)
    if not record:
        return jsonify({"error": "Service record not found"}), 404

    return jsonify(record.to_dict()), 200


@service_records_bp.route('', methods=['POST'])
@jwt_required()
def create_new_service_record():
    """
    Create a new service record for a product owned by the authenticated user.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    if not request.is_json:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    data = request.get_json(silent=True)
    validated, error = validate_service_record_payload(data, is_update=False)
    if error:
        return jsonify({"error": error}), 400

    record, err = create_service_record(user_id, validated)
    if err:
        return jsonify({"error": err}), 404

    return jsonify(record.to_dict()), 201


@service_records_bp.route('/<int:record_id>', methods=['PUT'])
@jwt_required()
def update_existing_service_record(record_id):
    """
    Update an existing service record owned by the authenticated user.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    if not request.is_json:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    data = request.get_json(silent=True)
    validated, error = validate_service_record_payload(data, is_update=True)
    if error:
        return jsonify({"error": error}), 400

    record, err = update_service_record(user_id, record_id, validated)
    if err:
        return jsonify({"error": err}), 404

    return jsonify(record.to_dict()), 200


@service_records_bp.route('/<int:record_id>', methods=['DELETE'])
@jwt_required()
def delete_existing_service_record(record_id):
    """
    Delete a service record owned by the authenticated user.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    success, err = delete_service_record(user_id, record_id)
    if not success:
        return jsonify({"error": err or "Service record not found"}), 404

    return jsonify({"message": "Service record deleted successfully"}), 200
