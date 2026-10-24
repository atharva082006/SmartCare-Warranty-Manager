"""
OCR Result Database Model.
Defines the SQLAlchemy OCRResult entity for storing extracted text and parsed entities.
"""

from datetime import datetime, timezone
from app.extensions import db


class OCRResult(db.Model):
    """
    OCR result entity storing raw and processed text, structured entities,
    and processing state for an uploaded document.
    """
    __tablename__ = 'ocr_results'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    document_id = db.Column(
        db.Integer,
        db.ForeignKey('documents.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )
    status = db.Column(db.String(30), nullable=False, default='PENDING')  # PENDING, PROCESSING, COMPLETED, FAILED
    extracted_text = db.Column(db.Text, nullable=True)
    raw_text = db.Column(db.Text, nullable=True)
    entities_json = db.Column(db.JSON, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    processed_at = db.Column(db.DateTime, nullable=True)
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

    def to_dict(self):
        """
        Serialize OCR result to a safe dictionary.
        Does not expose internal server paths.
        """
        entities = self.entities_json if isinstance(self.entities_json, dict) else {}
        return {
            "id": self.id,
            "document_id": self.document_id,
            "status": self.status,
            "extracted_text": self.extracted_text,
            "raw_text": self.raw_text,
            "entities": entities,
            "entities_json": entities,
            "error_message": self.error_message,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f"<OCRResult id={self.id} doc_id={self.document_id} status='{self.status}'>"
