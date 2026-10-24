"""
Service Record Database Model.
Defines the SQLAlchemy ServiceRecord entity for appliance maintenance and repair logs.
"""

from datetime import datetime, timezone
from app.extensions import db


class ServiceRecord(db.Model):
    """
    ServiceRecord entity representing a maintenance, repair, or inspection event for a product.
    """
    __tablename__ = 'service_records'

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(
        db.Integer,
        db.ForeignKey('products.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    service_date = db.Column(db.Date, nullable=False, index=True)
    cost = db.Column(db.Numeric(10, 2), nullable=False)
    type = db.Column(db.String(100), nullable=True)
    provider = db.Column(db.String(150), nullable=True)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='COMPLETED')
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
    product = db.relationship('Product', back_populates='service_records')

    def to_dict(self):
        """
        Serialize service record to safe dictionary.
        Avoids circular relationships.
        """
        return {
            "id": self.id,
            "product_id": self.product_id,
            "service_date": self.service_date.isoformat() if self.service_date else None,
            "cost": float(self.cost) if self.cost is not None else 0.0,
            "type": self.type,
            "provider": self.provider,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f"<ServiceRecord id={self.id} product_id={self.product_id} status='{self.status}'>"
