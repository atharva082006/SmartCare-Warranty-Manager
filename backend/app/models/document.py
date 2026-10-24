"""
Document Database Model.
Defines the SQLAlchemy Document entity for SmartCare document & attachment management.
"""

from datetime import datetime, timezone
from app.extensions import db


class Document(db.Model):
    """
    Document entity representing a receipt, invoice, warranty manual, or certificate
    associated with a product.
    """
    __tablename__ = 'documents'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    product_id = db.Column(
        db.Integer,
        db.ForeignKey('products.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    name = db.Column(db.String(255), nullable=False)
    document_type = db.Column(db.String(100), nullable=True)  # e.g. Warranty, Invoice, Receipt, Manual
    file_name = db.Column(db.String(255), nullable=False)     # User's sanitized original filename
    stored_file_name = db.Column(db.String(255), nullable=False)  # Generated safe storage filename (<uuid>.<ext>)
    file_path = db.Column(db.String(500), nullable=False)     # Relative storage path (documents/<stored_name>)
    mime_type = db.Column(db.String(100), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)          # Size in bytes
    description = db.Column(db.Text, nullable=True)
    upload_date = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    ocr_result = db.relationship(
        'OCRResult',
        backref='document',
        uselist=False,
        cascade='all, delete-orphan'
    )

    def to_dict(self):
        """
        Serialize document metadata to safe dictionary.
        Does not serialize internal absolute or relative filesystem paths or stored UUIDs.
        """
        ocr = self.ocr_result
        ocr_status = "Not Processed"
        ocr_processed_at = None
        ocr_extracted_text = None
        ocr_structured_data = None
        if ocr:
            if ocr.status == 'COMPLETED':
                ocr_status = 'Completed'
            elif ocr.status == 'PROCESSING':
                ocr_status = 'Processing'
            elif ocr.status == 'FAILED':
                ocr_status = 'Failed'
            else:
                ocr_status = 'Pending'
            ocr_processed_at = ocr.processed_at.isoformat() if ocr.processed_at else None
            ocr_extracted_text = ocr.extracted_text
            ocr_structured_data = ocr.entities_json

        return {
            "id": self.id,
            "product_id": self.product_id,
            "name": self.name,
            "document_type": self.document_type,
            "file_name": self.file_name,
            "mime_type": self.mime_type,
            "file_size": self.file_size,
            "description": self.description,
            "upload_date": self.upload_date.isoformat() if self.upload_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "ocr_status": ocr_status,
            "ocr_processed_at": ocr_processed_at,
            "ocr_extracted_text": ocr_extracted_text,
            "ocr_structured_data": ocr_structured_data
        }

    def __repr__(self):
        return f"<Document id={self.id} product_id={self.product_id} name='{self.name}'>"
