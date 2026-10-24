"""
Product Service Module.
Handles product code generation, payload validation, and business logic.
"""

from datetime import datetime, date, timezone
from decimal import Decimal, InvalidOperation
from app.extensions import db
from app.models.product import Product


def generate_product_code():
    """
    Generate a predictable, unique, human-readable product identifier.
    Format: PRD-<YEAR>-<5-DIGIT-SEQUENCE> (e.g. PRD-2026-00001)
    """
    current_year = datetime.now(timezone.utc).year
    prefix = f"PRD-{current_year}-"

    # Query for the latest product code matching current year
    latest_product = (
        Product.query
        .filter(Product.product_code.like(f"{prefix}%"))
        .order_by(Product.product_code.desc())
        .first()
    )

    next_sequence = 1
    if latest_product and latest_product.product_code:
        try:
            parts = latest_product.product_code.split('-')
            if len(parts) == 3 and parts[2].isdigit():
                next_sequence = int(parts[2]) + 1
        except (ValueError, IndexError):
            next_sequence = Product.query.filter(Product.product_code.like(f"{prefix}%")).count() + 1

    candidate_code = f"{prefix}{next_sequence:05d}"

    # Collision guard
    while Product.query.filter_by(product_code=candidate_code).first() is not None:
        next_sequence += 1
        candidate_code = f"{prefix}{next_sequence:05d}"

    return candidate_code


def validate_product_payload(data, is_update=False):
    """
    Validate product creation/update payload.
    
    Returns:
        tuple: (validated_dict, error_message)
    """
    if not isinstance(data, dict):
        return None, "Request payload must be a JSON object"

    errors = []
    validated = {}

    # name
    name = data.get('name')
    if not is_update and not name:
        errors.append("name is required")
    elif name is not None:
        if not isinstance(name, str) or not name.strip():
            errors.append("name must be a non-empty string")
        else:
            validated['name'] = name.strip()

    # brand
    brand = data.get('brand')
    if not is_update and not brand:
        errors.append("brand is required")
    elif brand is not None:
        if not isinstance(brand, str) or not brand.strip():
            errors.append("brand must be a non-empty string")
        else:
            validated['brand'] = brand.strip()

    # category
    category = data.get('category')
    if not is_update and not category:
        errors.append("category is required")
    elif category is not None:
        if not isinstance(category, str) or not category.strip():
            errors.append("category must be a non-empty string")
        else:
            validated['category'] = category.strip()

    # purchase_date
    purchase_date_val = data.get('purchase_date') or data.get('purchaseDate')
    if not is_update and not purchase_date_val:
        errors.append("purchase_date is required")
    elif purchase_date_val is not None:
        try:
            if isinstance(purchase_date_val, str):
                validated['purchase_date'] = datetime.strptime(purchase_date_val.strip(), '%Y-%m-%d').date()
            elif isinstance(purchase_date_val, date):
                validated['purchase_date'] = purchase_date_val
            else:
                errors.append("purchase_date must be in YYYY-MM-DD format")
        except ValueError:
            errors.append("purchase_date must be a valid date in YYYY-MM-DD format")

    # purchase_price (optional, must be numeric and non-negative)
    price_val = data.get('purchase_price') if 'purchase_price' in data else data.get('purchasePrice')
    if price_val is not None:
        try:
            decimal_price = Decimal(str(price_val))
            if decimal_price < 0:
                errors.append("purchase_price cannot be negative")
            else:
                validated['purchase_price'] = decimal_price
        except (InvalidOperation, ValueError, TypeError):
            errors.append("purchase_price must be a valid numeric value")

    # warranty_period (optional, integer months, >= 0)
    period_val = data.get('warranty_period') if 'warranty_period' in data else data.get('warrantyPeriod')
    if period_val is not None:
        try:
            int_period = int(period_val)
            if int_period < 0:
                errors.append("warranty_period cannot be negative")
            else:
                validated['warranty_period'] = int_period
        except (ValueError, TypeError):
            errors.append("warranty_period must be a non-negative integer")

    # model (optional)
    model_val = data.get('model') or data.get('modelNumber')
    if model_val is not None:
        validated['model'] = str(model_val).strip() if isinstance(model_val, (str, int)) else None

    # serial_number (optional)
    serial_val = data.get('serial_number') or data.get('serialNumber')
    if serial_val is not None:
        validated['serial_number'] = str(serial_val).strip() if isinstance(serial_val, (str, int)) else None

    # notes (optional)
    if 'notes' in data:
        notes_val = data.get('notes')
        validated['notes'] = str(notes_val).strip() if notes_val is not None else None

    if errors:
        return None, "; ".join(errors)

    return validated, None
