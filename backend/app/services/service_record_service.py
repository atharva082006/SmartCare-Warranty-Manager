"""
Service Record Service Module.
Handles validation, ownership-aware queries, CRUD operations, and analytics-ready service statistics.
"""

from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from app.extensions import db
from app.models.product import Product
from app.models.service_record import ServiceRecord

ALLOWED_STATUSES = {"COMPLETED", "PENDING", "CANCELLED"}
DEFAULT_STATUS = "COMPLETED"


def validate_service_record_payload(data, is_update=False):
    """
    Validate incoming service record payload for creation or update.
    
    Returns:
        tuple: (validated_dict, error_message)
    """
    if not isinstance(data, dict):
        return None, "Request payload must be a JSON object"

    errors = []
    validated = {}

    # product_id (required on create, immutable on update)
    if not is_update:
        product_id = data.get('product_id') or data.get('productId')
        if product_id is None:
            errors.append("product_id is required")
        else:
            try:
                validated['product_id'] = int(product_id)
            except (ValueError, TypeError):
                errors.append("product_id must be a valid integer")

    # service_date (required on create)
    service_date_val = data.get('service_date') or data.get('serviceDate')
    if not is_update and not service_date_val:
        errors.append("service_date is required")
    elif service_date_val is not None:
        try:
            if isinstance(service_date_val, str):
                validated['service_date'] = datetime.strptime(service_date_val.strip(), '%Y-%m-%d').date()
            elif isinstance(service_date_val, date):
                validated['service_date'] = service_date_val
            else:
                errors.append("service_date must be in YYYY-MM-DD format")
        except ValueError:
            errors.append("service_date must be a valid date in YYYY-MM-DD format")

    # cost (required on create, non-negative numeric)
    cost_val = data.get('cost')
    if not is_update and cost_val is None:
        errors.append("cost is required")
    elif cost_val is not None:
        try:
            dec_cost = Decimal(str(cost_val))
            if dec_cost < 0:
                errors.append("cost cannot be negative")
            else:
                validated['cost'] = dec_cost
        except (InvalidOperation, ValueError, TypeError):
            errors.append("cost must be a valid numeric value")

    # status (optional, must match ALLOWED_STATUSES)
    if 'status' in data and data['status'] is not None:
        status_raw = str(data['status']).strip().upper()
        if status_raw not in ALLOWED_STATUSES:
            errors.append(f"status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}")
        else:
            validated['status'] = status_raw
    elif not is_update:
        validated['status'] = DEFAULT_STATUS

    # Optional string fields: type, provider, description
    type_val = data.get('type') or data.get('serviceType')
    if type_val is not None:
        validated['type'] = str(type_val).strip() if isinstance(type_val, (str, int)) else None

    provider_val = data.get('provider')
    if provider_val is not None:
        validated['provider'] = str(provider_val).strip() if isinstance(provider_val, (str, int)) else None

    desc_val = data.get('description') or data.get('issueDescription')
    if desc_val is not None:
        validated['description'] = str(desc_val).strip() if desc_val is not None else None

    if errors:
        return None, "; ".join(errors)

    return validated, None


def get_user_service_records(user_id, product_id=None):
    """
    Retrieve service records belonging to the authenticated user.
    If product_id is provided, verifies that the product is owned by user.
    
    Returns:
        tuple: (list_of_records, error_message)
    """
    if product_id is not None:
        product = db.session.get(Product, product_id)
        if not product or product.user_id != user_id:
            return None, "Product not found"

    query = (
        ServiceRecord.query
        .join(Product, ServiceRecord.product_id == Product.id)
        .filter(Product.user_id == user_id)
    )

    if product_id is not None:
        query = query.filter(ServiceRecord.product_id == product_id)

    records = query.order_by(ServiceRecord.service_date.desc(), ServiceRecord.id.desc()).all()
    return records, None


def get_user_service_record_by_id(user_id, record_id):
    """
    Retrieve a single service record by ID if owned by the user.
    """
    record = db.session.get(ServiceRecord, record_id)
    if not record or not record.product or record.product.user_id != user_id:
        return None
    return record


def create_service_record(user_id, validated_data):
    """
    Create a new service record for a product owned by user.
    
    Returns:
        tuple: (created_record, error_message)
    """
    product = db.session.get(Product, validated_data['product_id'])
    if not product or product.user_id != user_id:
        return None, "Product not found"

    record = ServiceRecord(
        product_id=product.id,
        service_date=validated_data['service_date'],
        cost=validated_data['cost'],
        type=validated_data.get('type'),
        provider=validated_data.get('provider'),
        description=validated_data.get('description'),
        status=validated_data.get('status', DEFAULT_STATUS)
    )

    db.session.add(record)
    db.session.commit()
    return record, None


def update_service_record(user_id, record_id, validated_data):
    """
    Update an existing service record owned by user.
    
    Returns:
        tuple: (updated_record, error_message)
    """
    record = get_user_service_record_by_id(user_id, record_id)
    if not record:
        return None, "Service record not found"

    if 'service_date' in validated_data:
        record.service_date = validated_data['service_date']
    if 'cost' in validated_data:
        record.cost = validated_data['cost']
    if 'type' in validated_data:
        record.type = validated_data['type']
    if 'provider' in validated_data:
        record.provider = validated_data['provider']
    if 'description' in validated_data:
        record.description = validated_data['description']
    if 'status' in validated_data:
        record.status = validated_data['status']

    db.session.commit()
    return record, None


def delete_service_record(user_id, record_id):
    """
    Delete a service record owned by user.
    
    Returns:
        tuple: (success_bool, error_message)
    """
    record = get_user_service_record_by_id(user_id, record_id)
    if not record:
        return False, "Service record not found"

    db.session.delete(record)
    db.session.commit()
    return True, None


def get_service_record_stats(user_id):
    """
    Calculate aggregate statistics for a user's service history.
    Prepared for future Analytics module consumption.
    
    Returns:
        dict: Summary statistics including counts, costs, and breakdowns.
    """
    records, _ = get_user_service_records(user_id)
    if not records:
        return {
            "total_service_records": 0,
            "total_service_cost": 0.0,
            "average_service_cost": 0.0,
            "completed_service_records": 0,
            "pending_service_records": 0,
            "cancelled_service_records": 0,
            "records_by_product": {},
            "records_by_month": {}
        }

    total_records = len(records)
    total_cost = sum(Decimal(str(r.cost)) for r in records)
    avg_cost = (total_cost / total_records) if total_records > 0 else Decimal('0.00')

    completed = sum(1 for r in records if r.status == 'COMPLETED')
    pending = sum(1 for r in records if r.status == 'PENDING')
    cancelled = sum(1 for r in records if r.status == 'CANCELLED')

    # Breakdown by product
    by_product = {}
    for r in records:
        pid = r.product_id
        if pid not in by_product:
            by_product[pid] = {"count": 0, "total_cost": 0.0}
        by_product[pid]["count"] += 1
        by_product[pid]["total_cost"] = round(by_product[pid]["total_cost"] + float(r.cost), 2)

    # Breakdown by month (YYYY-MM)
    by_month = {}
    for r in records:
        if r.service_date:
            month_key = r.service_date.strftime('%Y-%m')
            if month_key not in by_month:
                by_month[month_key] = {"count": 0, "total_cost": 0.0}
            by_month[month_key]["count"] += 1
            by_month[month_key]["total_cost"] = round(by_month[month_key]["total_cost"] + float(r.cost), 2)

    return {
        "total_service_records": total_records,
        "total_service_cost": float(round(total_cost, 2)),
        "average_service_cost": float(round(avg_cost, 2)),
        "completed_service_records": completed,
        "pending_service_records": pending,
        "cancelled_service_records": cancelled,
        "records_by_product": by_product,
        "records_by_month": by_month
    }
