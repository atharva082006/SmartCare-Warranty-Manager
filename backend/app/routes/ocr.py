"""
OCR API Routes.
Provides endpoints for triggering OCR processing, retrieving OCR results and statuses,
and deleting OCR records with strict user-product ownership verification.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.ocr_service import (
    process_document,
    get_ocr_result,
    delete_ocr_result,
    get_ocr_status
)

ocr_bp = Blueprint('ocr', __name__, url_prefix='/api/v1/ocr')


def get_current_user_id():
    """Extract and validate the authenticated user ID from JWT identity."""
    identity = get_jwt_identity()
    try:
        return int(identity)
    except (ValueError, TypeError):
        return None


@ocr_bp.route('/documents/<int:document_id>/process', methods=['POST'])
@jwt_required()
def process_document_route(document_id):
    """
    Start OCR text extraction and entity parsing for a user-owned document.
    Supports reprocessing existing documents.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    ocr_result, err_msg, status_code = process_document(document_id, user_id)
    if err_msg and status_code >= 400:
        resp = {"error": err_msg}
        if ocr_result:
            resp["ocr_result"] = ocr_result.to_dict()
        return jsonify(resp), status_code

    return jsonify({"ocr_result": ocr_result.to_dict()}), 200


@ocr_bp.route('/documents/<int:document_id>', methods=['GET'])
@jwt_required()
def get_ocr_result_route(document_id):
    """
    Retrieve extracted OCR text and parsed entities for a user-owned document.
    Returns 404 if unauthorized or no OCR processing has occurred.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    ocr_result, err_msg, status_code = get_ocr_result(document_id, user_id)
    if err_msg:
        return jsonify({"error": err_msg}), status_code

    return jsonify({"ocr_result": ocr_result.to_dict()}), 200


@ocr_bp.route('/documents/<int:document_id>', methods=['DELETE'])
@jwt_required()
def delete_ocr_result_route(document_id):
    """
    Delete OCR result record while keeping the underlying document intact.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    success, err_msg, status_code = delete_ocr_result(document_id, user_id)
    if not success:
        return jsonify({"error": err_msg}), status_code

    return jsonify({"message": "OCR result deleted successfully"}), 200


@ocr_bp.route('/documents/<int:document_id>/status', methods=['GET'])
@jwt_required()
def get_ocr_status_route(document_id):
    """
    Check current OCR processing status for a user-owned document.
    Returns PENDING if document exists but has not been processed.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    status_dict, err_msg, status_code = get_ocr_status(document_id, user_id)
    if err_msg:
        return jsonify({"error": err_msg}), status_code

    return jsonify(status_dict), 200
