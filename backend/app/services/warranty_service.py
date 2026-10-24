"""
Warranty Service and Status Calculation.
Provides reusable warranty status, remaining days computation, and validation logic.
"""

from datetime import date, datetime


def compute_warranty_metrics(start_date, end_date, stored_is_active=True, reference_date=None):
    """
    Compute dynamic warranty status, remaining days, and active state.
    
    Status logic:
      - ACTIVE: > 30 days remaining
      - EXPIRING_SOON: 0 to 30 days remaining
      - EXPIRED: < 0 days remaining (end_date before reference date)
      
    Args:
        start_date (date or str): Warranty coverage start date.
        end_date (date or str): Warranty coverage expiration date.
        stored_is_active (bool): Persisted active flag.
        reference_date (date, optional): Reference date for computation (defaults to date.today()).
        
    Returns:
        dict: {"status": str, "days_remaining": int, "is_active": bool}
    """
    if reference_date is None:
        reference_date = date.today()

    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    elif isinstance(end_date, datetime):
        end_date = end_date.date()

    if end_date is None:
        return {
            "status": "EXPIRED",
            "days_remaining": 0,
            "is_active": False
        }

    days_remaining = (end_date - reference_date).days

    if days_remaining < 0:
        status = "EXPIRED"
        effective_active = False
    elif days_remaining <= 30:
        status = "EXPIRING_SOON"
        effective_active = bool(stored_is_active)
    else:
        status = "ACTIVE"
        effective_active = bool(stored_is_active)

    # If explicitly deactivated, reflect that
    if stored_is_active is False:
        effective_active = False

    return {
        "status": status,
        "days_remaining": days_remaining,
        "is_active": effective_active
    }


def validate_warranty_payload(data, is_update=False):
    """
    Validate incoming warranty payload for creation or update.
    
    Returns:
        tuple: (validated_dict, error_message)
    """
    if not isinstance(data, dict):
        return None, "Request payload must be a JSON object"

    errors = []
    validated = {}

    # product_id
    if not is_update:
        product_id = data.get('product_id')
        if product_id is None:
            errors.append("product_id is required")
        else:
            try:
                validated['product_id'] = int(product_id)
            except (ValueError, TypeError):
                errors.append("product_id must be a valid integer")

    # start_date
    start_date_val = data.get('start_date')
    if not is_update and not start_date_val:
        errors.append("start_date is required")
    elif start_date_val:
        try:
            if isinstance(start_date_val, str):
                validated['start_date'] = datetime.strptime(start_date_val.strip(), '%Y-%m-%d').date()
            elif isinstance(start_date_val, date):
                validated['start_date'] = start_date_val
            else:
                errors.append("start_date must be in YYYY-MM-DD format")
        except ValueError:
            errors.append("start_date must be a valid date in YYYY-MM-DD format")

    # end_date
    end_date_val = data.get('end_date')
    if not is_update and not end_date_val:
        errors.append("end_date is required")
    elif end_date_val:
        try:
            if isinstance(end_date_val, str):
                validated['end_date'] = datetime.strptime(end_date_val.strip(), '%Y-%m-%d').date()
            elif isinstance(end_date_val, date):
                validated['end_date'] = end_date_val
            else:
                errors.append("end_date must be in YYYY-MM-DD format")
        except ValueError:
            errors.append("end_date must be a valid date in YYYY-MM-DD format")

    # Date range check
    s_date = validated.get('start_date')
    e_date = validated.get('end_date')
    if s_date and e_date and e_date < s_date:
        errors.append("end_date cannot be earlier than start_date")

    # Optional fields
    if 'type' in data:
        t = data.get('type')
        validated['type'] = t.strip() if isinstance(t, str) else None

    if 'coverage' in data:
        c = data.get('coverage')
        validated['coverage'] = c.strip() if isinstance(c, str) else None

    if 'is_active' in data:
        validated['is_active'] = bool(data.get('is_active'))

    if errors:
        return None, "; ".join(errors)

    return validated, None
