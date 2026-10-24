"""
User Database Model.
Defines the SQLAlchemy User model for PostgreSQL, bcrypt password hashing, and serialization.
"""

from datetime import datetime, timezone
import bcrypt
from app.extensions import db


class User(db.Model):
    """
    User entity representing a registered SmartCare user.
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
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
    products = db.relationship('Product', back_populates='user', cascade='all, delete-orphan', lazy=True)

    def set_password(self, password: str):
        """Hash plaintext password using bcrypt with salt and store the hash."""
        if not password:
            raise ValueError("Password cannot be empty")
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def check_password(self, password: str) -> bool:
        """Verify candidate password against the stored bcrypt hash."""
        if not self.password_hash or not password:
            return False
        try:
            return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        except (ValueError, TypeError):
            return False

    def to_dict(self):
        """
        Serialize user to safe dictionary.
        NEVER includes password or password_hash.
        """
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "phone": self.phone
        }

    def __repr__(self):
        return f"<User id={self.id} username='{self.username}'>"
