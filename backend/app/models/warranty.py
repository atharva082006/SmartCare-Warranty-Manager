"""
Warranty Database Model.
Defines the SQLAlchemy Warranty entity for product warranty records and coverage details.
"""

from datetime import datetime, timezone
from app.extensions import db


class Warranty(db.Model):
    """
    Warranty entity representing coverage duration, terms, and status for a product.
    """
    __tablename__ = 'warranties'

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(
        db.Integer,
        db.ForeignKey('products.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    type = db.Column(db.String(100), nullable=True)
    coverage = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
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
    product = db.relationship('Product', back_populates='warranties')

    def to_dict(self):
        """
        Serialize warranty to safe dictionary with dynamic status calculation.
        Excludes product relationship tree to prevent circular references.
        """
        from app.services.warranty_service import compute_warranty_metrics

        metrics = compute_warranty_metrics(
            start_date=self.start_date,
            end_date=self.end_date,
            stored_is_active=self.is_active
        )

        return {
            "id": self.id,
            "product_id": self.product_id,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "type": self.type,
            "coverage": self.coverage,
            "is_active": metrics["is_active"],
            "status": metrics["status"],
            "days_remaining": metrics["days_remaining"],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f"<Warranty id={self.id} product_id={self.product_id} type='{self.type}'>"
