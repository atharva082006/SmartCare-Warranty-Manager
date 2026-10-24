"""
Documents API Routes.
Provides REST endpoints for document upload, listing, metadata retrieval, download/viewing,
metadata update, and deletion with strict user-product ownership verification.
"""

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.document_service import (
    get_user_documents,
    get_user_document_by_id,
    create_document,
    update_document,
    delete_document,
    get_document_file_path
)

documents_bp = Blueprint('documents', __name__, url_prefix='/api/v1/documents')


def get_current_user_id():
    """Extract and validate the authenticated user ID from JWT identity."""
    identity = get_jwt_identity()
    try:
        return int(identity)
    except (ValueError, TypeError):
        return None


@documents_bp.route('', methods=['GET'])
@jwt_required()
def list_documents():
    """
    List all documents for products owned by the authenticated user.
    Optional query parameter: ?product_id=<id>
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
            return jsonify({"error": "Invalid product_id parameter"}), 400

    docs, error_tuple = get_user_documents(user_id, product_id)
    if error_tuple:
        err_msg, status_code = error_tuple
        return jsonify({"error": err_msg}), status_code

    return jsonify({"documents": [d.to_dict() for d in docs]}), 200


@documents_bp.route('/<int:document_id>', methods=['GET'])
@jwt_required()
def get_document(document_id):
    """
    Retrieve document metadata by ID.
    Enforces product ownership. Returns 404 for nonexistent or unauthorized records.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    document = get_user_document_by_id(document_id, user_id)
    if not document:
        return jsonify({"error": "Document not found"}), 404

    return jsonify(document.to_dict()), 200


@documents_bp.route('', methods=['POST'])
@jwt_required()
def upload_document():
    """
    Upload a document file with metadata (multipart/form-data).
    Required fields: product_id, file.
    Optional fields: name, document_type, description.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    # Check for file
    if 'file' not in request.files:
        return jsonify({"error": "File is required"}), 400

    file_storage = request.files['file']
    if not file_storage or not file_storage.filename or not file_storage.filename.strip():
        return jsonify({"error": "File is required"}), 400

    form_data = request.form.to_dict() if request.form else {}

    document, error_msg, status_code = create_document(
        file_storage=file_storage,
        data=form_data,
        user_id=user_id
    )

    if error_msg:
        return jsonify({"error": error_msg}), status_code

    return jsonify(document.to_dict()), 201


@documents_bp.route('/<int:document_id>/file', methods=['GET'])
@jwt_required()
def download_document_file(document_id):
    """
    Download or stream the physical document file.
    Requires ownership verification and returns 404 for unauthorized documents.
    Requires JWT authentication via standard Authorization: Bearer <token> header.
    Supports query parameter ?download=true to force Content-Disposition attachment.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    document = get_user_document_by_id(document_id, user_id)
    if not document:
        return jsonify({"error": "Document not found"}), 404

    file_path, err = get_document_file_path(document)
    if err:
        return jsonify({"error": err}), 404

    force_download = request.args.get('download', '').lower() in ('true', '1')

    return send_file(
        file_path,
        mimetype=document.mime_type or 'application/octet-stream',
        as_attachment=force_download,
        download_name=document.file_name
    )


@documents_bp.route('/<int:document_id>', methods=['PUT'])
@jwt_required()
def update_document_metadata(document_id):
    """
    Update document metadata (name, document_type, description).
    Protected fields (id, product_id, stored_file_name, file_path, file_size, upload_date)
    cannot be altered.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    document = get_user_document_by_id(document_id, user_id)
    if not document:
        return jsonify({"error": "Document not found"}), 404

    # Support JSON or form data
    if request.is_json:
        data = request.get_json(silent=True)
    elif request.form:
        data = request.form.to_dict()
    else:
        return jsonify({"error": "Request payload must be JSON or form-data"}), 400

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request payload"}), 400

    updated_doc, error_msg = update_document(document, data)
    if error_msg:
        return jsonify({"error": error_msg}), 400

    return jsonify(updated_doc.to_dict()), 200


@documents_bp.route('/<int:document_id>', methods=['DELETE'])
@jwt_required()
def delete_document_route(document_id):
    """
    Delete a document database record and its physical storage file.
    Enforces ownership. Returns 404 for unauthorized records.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    document = get_user_document_by_id(document_id, user_id)
    if not document:
        return jsonify({"error": "Document not found"}), 404

    try:
        delete_document(document)
    except Exception:
        return jsonify({"error": "Failed to delete document"}), 500

    return jsonify({"message": "Document deleted successfully"}), 200
