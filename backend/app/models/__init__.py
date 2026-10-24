"""
Database Models Package.
Exports all application database models for SQLAlchemy discovery and migrations.
"""

from app.models.user import User
from app.models.product import Product
from app.models.warranty import Warranty
from app.models.service_record import ServiceRecord
from app.models.document import Document
from app.models.ocr_result import OCRResult

__all__ = ['User', 'Product', 'Warranty', 'ServiceRecord', 'Document', 'OCRResult']
