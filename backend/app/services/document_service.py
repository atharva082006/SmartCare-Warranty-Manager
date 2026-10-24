"""
Document Service Module.
Handles document validation, secure file storage, filesystem-database consistency,
ownership checks, and statistics.
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from werkzeug.utils import secure_filename
from flask import current_app
from app.extensions import db
from app.config import Config
from app.models.document import Document
from app.models.product import Product

logger = logging.getLogger(__name__)

# Allowed file extensions and corresponding MIME types
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'webp'}
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
}

EXTENSION_TO_MIME = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp'
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def get_upload_dir(custom_dir=None):
    """
    Get the configured upload directory.
    Uses custom_dir if provided, otherwise current_app config, otherwise Config default.
    """
    if custom_dir:
        return os.path.abspath(custom_dir)
    if current_app:
        return os.path.abspath(current_app.config.get('UPLOAD_FOLDER', Config.UPLOAD_FOLDER))
    return os.path.abspath(Config.UPLOAD_FOLDER)


def resolve_storage_path(relative_path, upload_dir=None):
    """
    Safely resolve a relative file path against the upload directory.
    Prevents directory traversal attacks.
    
    Returns:
        str: Absolute verified path, or None if path escapes upload_dir.
    """
    base_dir = get_upload_dir(upload_dir)
    # Strip any leading slashes or backslashes
    safe_rel = os.path.normpath(relative_path).lstrip('\\/')
    # Reject paths that contain '..' parent traversals
    if '..' in safe_rel.split(os.sep) or '..' in safe_rel.split('/'):
        return None

    full_path = os.path.abspath(os.path.join(base_dir, safe_rel))
    
    # Check that resolved full_path stays within base_dir
    common_prefix = os.path.commonpath([base_dir, full_path])
    if common_prefix != base_dir:
        return None

    return full_path


def validate_uploaded_file(file_storage):
    """
    Validate an uploaded FileStorage object.
    
    Checks:
    - File presence
    - Non-empty filename
    - Allowed extension
    - Allowed MIME type
    - File size <= 10 MB
    
    Returns:
        tuple: (is_valid, error_message, file_info)
    """
    if not file_storage or not file_storage.filename or not file_storage.filename.strip():
        return False, "File is required", None

    original_filename = file_storage.filename.strip()
    
    # Check for empty filename or single dot
    base_name = os.path.basename(original_filename)
    if not base_name or base_name == '.':
        return False, "Invalid filename", None

    # Check extension
    if '.' not in base_name:
        return False, "File must have a valid extension (pdf, jpg, jpeg, png, webp)", None

    ext = base_name.rsplit('.', 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file extension '.{ext}'. Allowed extensions: pdf, jpg, jpeg, png, webp", None

    # Check MIME type
    mime_type = file_storage.mimetype
    # If client omitted or generic octet-stream, infer from extension
    if not mime_type or mime_type == 'application/octet-stream':
        mime_type = EXTENSION_TO_MIME.get(ext)
    else:
        mime_type = mime_type.lower()
        if mime_type not in ALLOWED_MIME_TYPES:
            return False, f"Unsupported file MIME type '{mime_type}'. Allowed types: application/pdf, image/jpeg, image/png, image/webp", None

    # Check file size
    file_storage.seek(0, os.SEEK_END)
    file_size = file_storage.tell()
    file_storage.seek(0)  # Reset stream position

    if file_size <= 0:
        return False, "File cannot be empty", None

    if file_size > MAX_FILE_SIZE:
        return False, "File size exceeds the 10 MB limit", None

    # Sanitize user filename for display
    sanitized_display_name = secure_filename(base_name)
    if not sanitized_display_name:
        sanitized_display_name = f"document.{ext}"

    file_info = {
        "original_filename": sanitized_display_name,
        "extension": ext,
        "mime_type": mime_type,
        "file_size": file_size
    }

    return True, None, file_info


def validate_document_metadata(data, is_update=False):
    """
    Validate document metadata for creation or update.
    
    Returns:
        tuple: (validated_dict, error_message)
    """
    if not isinstance(data, dict):
        return None, "Request payload must be an object or form-data"

    validated = {}
    errors = []

    # product_id check on create
    if not is_update:
        raw_product_id = data.get('product_id')
        if raw_product_id is None or raw_product_id == '':
            errors.append("product_id is required")
        else:
            try:
                validated['product_id'] = int(raw_product_id)
            except (ValueError, TypeError):
                errors.append("product_id must be a valid integer")

    # name (optional, string)
    if 'name' in data and data['name'] is not None:
        name_val = str(data['name']).strip()
        if not name_val:
            errors.append("name cannot be empty if provided")
        else:
            validated['name'] = name_val[:255]

    # document_type (optional, string)
    if 'document_type' in data and data['document_type'] is not None:
        doc_type_val = str(data['document_type']).strip()
        validated['document_type'] = doc_type_val[:100] if doc_type_val else None

    # description (optional, text)
    if 'description' in data and data['description'] is not None:
        desc_val = str(data['description']).strip()
        validated['description'] = desc_val if desc_val else None

    if errors:
        return None, "; ".join(errors)

    return validated, None


def get_user_documents(user_id, product_id=None):
    """
    Retrieve all documents owned by user, optionally filtered by product_id.
    
    Returns:
        tuple: (documents_list, error_tuple)
        If product_id specified but not found/unauthorized, error_tuple is ("Product not found", 404).
    """
    if product_id is not None:
        # Verify product exists and is owned by current user
        product = Product.query.filter_by(id=product_id, user_id=user_id).first()
        if not product:
            return None, ("Product not found", 404)

        docs = (
            Document.query
            .filter_by(product_id=product_id)
            .order_by(Document.created_at.desc())
            .all()
        )
        return docs, None

    docs = (
        Document.query
        .join(Product, Document.product_id == Product.id)
        .filter(Product.user_id == user_id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return docs, None


def get_user_document_by_id(document_id, user_id):
    """
    Retrieve a document by ID ensuring the parent product belongs to user_id.
    
    Returns:
        Document or None
    """
    return (
        Document.query
        .join(Product, Document.product_id == Product.id)
        .filter(Document.id == document_id, Product.user_id == user_id)
        .first()
    )


def delete_document_file(relative_path, upload_dir=None):
    """
    Safely delete physical file from storage.
    If file doesn't exist, logs warning and returns False without raising exception.
    """
    if not relative_path:
        return False

    full_path = resolve_storage_path(relative_path, upload_dir)
    if not full_path:
        logger.warning(f"Invalid or unsafe storage path: {relative_path}")
        return False

    try:
        if os.path.exists(full_path) and os.path.isfile(full_path):
            os.remove(full_path)
            return True
        else:
            logger.warning(f"File not found on storage during deletion: {full_path}")
            return False
    except OSError as e:
        logger.error(f"Error deleting physical file {full_path}: {e}")
        return False


def get_document_file_path(document, upload_dir=None):
    """
    Resolve and verify absolute file path for a document.
    
    Returns:
        tuple: (full_path, error_message)
    """
    if not document or not document.file_path:
        return None, "Document has no file path"

    full_path = resolve_storage_path(document.file_path, upload_dir)
    if not full_path:
        return None, "Invalid storage path"

    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        return None, "File not found on storage"

    return full_path, None


def create_document(file_storage, data, user_id, upload_dir=None):
    """
    Create a new document with secure file upload and database record creation.
    Enforces transaction consistency: if DB fails, physical file is removed.
    
    Returns:
        tuple: (document, error_message, status_code)
    """
    # 1. Validate file
    is_valid_file, file_err, file_info = validate_uploaded_file(file_storage)
    if not is_valid_file:
        return None, file_err, 400

    # 2. Validate metadata
    validated_meta, meta_err = validate_document_metadata(data, is_update=False)
    if meta_err:
        return None, meta_err, 400

    product_id = validated_meta['product_id']

    # 3. Verify product belongs to user
    product = Product.query.filter_by(id=product_id, user_id=user_id).first()
    if not product:
        return None, "Product not found", 404

    # 4. Generate unique safe storage filename and path
    base_upload = get_upload_dir(upload_dir)
    docs_folder = os.path.join(base_upload, 'documents')
    os.makedirs(docs_folder, exist_ok=True)

    ext = file_info['extension']
    unique_storage_name = f"{uuid.uuid4().hex}.{ext}"
    relative_file_path = f"documents/{unique_storage_name}"
    absolute_file_path = os.path.join(docs_folder, unique_storage_name)

    # 5. Save physical file to disk
    try:
        file_storage.save(absolute_file_path)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        return None, "Failed to save uploaded file", 500

    # 6. Determine display name
    display_name = validated_meta.get('name') or file_info['original_filename']

    # 7. Insert Document record in database
    now_utc = datetime.now(timezone.utc)
    document = Document(
        product_id=product.id,
        name=display_name,
        document_type=validated_meta.get('document_type'),
        file_name=file_info['original_filename'],
        stored_file_name=unique_storage_name,
        file_path=relative_file_path,
        mime_type=file_info['mime_type'],
        file_size=file_info['file_size'],
        description=validated_meta.get('description'),
        upload_date=now_utc,
        created_at=now_utc,
        updated_at=now_utc
    )

    db.session.add(document)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Database error creating document record, removing uploaded file: {e}")
        # Clean up physical file to avoid orphan file
        delete_document_file(relative_file_path, upload_dir)
        return None, "Failed to create document record", 500

    return document, None, 201


def update_document(document, data):
    """
    Update document metadata only.
    Protected fields (id, product_id, stored_file_name, file_path, file_size, upload_date)
    cannot be modified.
    
    Returns:
        tuple: (document, error_message)
    """
    validated_meta, meta_err = validate_document_metadata(data, is_update=True)
    if meta_err:
        return None, meta_err

    if 'name' in validated_meta:
        document.name = validated_meta['name']
    if 'document_type' in validated_meta:
        document.document_type = validated_meta['document_type']
    if 'description' in validated_meta:
        document.description = validated_meta['description']

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Database error updating document {document.id}: {e}")
        return None, "Failed to update document metadata"

    return document, None


def delete_document(document, upload_dir=None):
    """
    Delete document database record and its physical storage file.
    
    Returns:
        bool: True if deletion succeeded.
    """
    # 1. Delete physical file
    delete_document_file(document.file_path, upload_dir)

    # 2. Delete database record
    try:
        db.session.delete(document)
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        logger.error(f"Database error deleting document {document.id}: {e}")
        raise e


def get_document_stats(user_id):
    """
    Compute document statistics for all products owned by current user.
    
    Returns:
        dict:
            - total_documents: int
            - total_file_size: int (bytes)
            - document_type_counts: dict
    """
    docs = (
        Document.query
        .join(Product, Document.product_id == Product.id)
        .filter(Product.user_id == user_id)
        .all()
    )

    total_docs = len(docs)
    total_size = sum((d.file_size or 0) for d in docs)

    type_counts = {}
    for d in docs:
        dtype = d.document_type or "Other"
        type_counts[dtype] = type_counts.get(dtype, 0) + 1

    return {
        "total_documents": total_docs,
        "total_file_size": total_size,
        "document_type_counts": type_counts
    }


# Automatically clean up physical file when a Document is deleted in SQLAlchemy
from sqlalchemy import event


@event.listens_for(Document, 'after_delete')
def _cleanup_document_file_after_delete(mapper, connection, target):
    """Event listener to delete physical file on disk when Document is deleted."""
    if target and target.file_path:
        delete_document_file(target.file_path)

