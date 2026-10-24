"""
Product Database Model.
Defines the SQLAlchemy Product entity for SmartCare product management.
"""

from datetime import datetime, timezone
from app.extensions import db


class Product(db.Model):
    """
    Product entity representing an appliance or gadget owned by a registered user.
    """
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    product_code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(150), nullable=False)
    brand = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=True)
    serial_number = db.Column(db.String(100), nullable=True)
    purchase_date = db.Column(db.Date, nullable=False)
    purchase_price = db.Column(db.Numeric(10, 2), nullable=True)
    warranty_period = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.Text, nullable=True)
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
    user = db.relationship('User', back_populates='products')
    warranties = db.relationship(
        'Warranty',
        back_populates='product',
        cascade='all, delete-orphan',
        lazy=True
    )
    service_records = db.relationship(
        'ServiceRecord',
        back_populates='product',
        cascade='all, delete-orphan',
        lazy=True
    )
    documents = db.relationship(
        'Document',
        backref='product',
        cascade='all, delete-orphan',
        lazy=True
    )

    def to_dict(self):
        """
        Serialize product to safe dictionary.
        Excludes user relationship tree to avoid circular references.
        """
        return {
            "id": self.id,
            "product_code": self.product_code,
            "name": self.name,
            "brand": self.brand,
            "category": self.category,
            "model": self.model,
            "serial_number": self.serial_number,
            "purchase_date": self.purchase_date.isoformat() if self.purchase_date else None,
            "purchase_price": float(self.purchase_price) if self.purchase_price is not None else None,
            "warranty_period": self.warranty_period,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f"<Product id={self.id} code='{self.product_code}' name='{self.name}'>"
