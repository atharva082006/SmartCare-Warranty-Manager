"""
Analytics Service.
Provides comprehensive, scoped data analytics across Products, Warranties,
Service Records, Documents, and OCR results.
"""

from collections import defaultdict
from datetime import date
from decimal import Decimal
from sqlalchemy import func
from app.extensions import db
from app.models.product import Product
from app.models.warranty import Warranty
from app.models.service_record import ServiceRecord
from app.models.document import Document
from app.models.ocr_result import OCRResult
from app.services.warranty_service import compute_warranty_metrics
from app.services.health_service import calculate_product_health, get_user_health_analytics


def format_currency(val):
    """Format numeric or Decimal value to clean two-decimal currency string."""
    if val is None:
        return "0.00"
    try:
        dec = Decimal(str(val))
        return f"{dec:.2f}"
    except Exception:
        return "0.00"


def get_overview_stats(user_id, reference_date=None):
    """
    Compute high-level overview metrics across all user resources.
    
    Returns:
        dict: Overview metrics including product, warranty, service, and document counts.
    """
    if reference_date is None:
        reference_date = date.today()

    # Query all products for this user
    products = Product.query.filter_by(user_id=user_id).all()
    total_products = len(products)
    product_ids = [p.id for p in products]

    if not product_ids:
        return {
            "total_products": 0,
            "active_warranties": 0,
            "expiring_warranties": 0,
            "expired_warranties": 0,
            "total_service_records": 0,
            "total_service_cost": "0.00",
            "average_service_cost": "0.00",
            "total_documents": 0,
            "total_document_size": 0
        }

    # Warranties
    warranties = Warranty.query.filter(Warranty.product_id.in_(product_ids)).all()
    active_warranties = 0
    expiring_warranties = 0
    expired_warranties = 0

    for w in warranties:
        metrics = compute_warranty_metrics(
            start_date=w.start_date,
            end_date=w.end_date,
            stored_is_active=w.is_active,
            reference_date=reference_date
        )
        status = metrics.get('status')
        if status == 'ACTIVE':
            active_warranties += 1
        elif status == 'EXPIRING_SOON':
            expiring_warranties += 1
        elif status == 'EXPIRED':
            expired_warranties += 1

    # Service Records
    service_records = ServiceRecord.query.filter(ServiceRecord.product_id.in_(product_ids)).all()
    total_service_records = len(service_records)
    total_cost_dec = Decimal('0.00')
    non_cancelled_count = 0

    for s in service_records:
        if s.status.upper() != 'CANCELLED':
            try:
                total_cost_dec += Decimal(str(s.cost))
                non_cancelled_count += 1
            except Exception:
                pass

    avg_cost_dec = (total_cost_dec / non_cancelled_count) if non_cancelled_count > 0 else Decimal('0.00')

    # Documents
    documents = Document.query.filter(Document.product_id.in_(product_ids)).all()
    total_documents = len(documents)
    total_document_size = sum(d.file_size or 0 for d in documents)

    return {
        "total_products": total_products,
        "active_warranties": active_warranties,
        "expiring_warranties": expiring_warranties,
        "expired_warranties": expired_warranties,
        "total_service_records": total_service_records,
        "total_service_cost": format_currency(total_cost_dec),
        "average_service_cost": format_currency(avg_cost_dec),
        "total_documents": total_documents,
        "total_document_size": total_document_size
    }


def get_warranty_analytics(user_id, reference_date=None):
    """
    Compute detailed warranty statistics and distributions for a user.
    """
    if reference_date is None:
        reference_date = date.today()

    products = Product.query.filter_by(user_id=user_id).all()
    product_ids = [p.id for p in products]

    if not product_ids:
        return {
            "total_warranties": 0,
            "active_count": 0,
            "expiring_soon_count": 0,
            "expired_count": 0,
            "active_percentage": 0.0,
            "expiring_percentage": 0.0,
            "expired_percentage": 0.0,
            "warranty_type_breakdown": {}
        }

    warranties = Warranty.query.filter(Warranty.product_id.in_(product_ids)).all()
    total_warranties = len(warranties)

    active_count = 0
    expiring_soon_count = 0
    expired_count = 0
    type_counts = defaultdict(int)

    for w in warranties:
        metrics = compute_warranty_metrics(
            start_date=w.start_date,
            end_date=w.end_date,
            stored_is_active=w.is_active,
            reference_date=reference_date
        )
        status = metrics.get('status')
        if status == 'ACTIVE':
            active_count += 1
        elif status == 'EXPIRING_SOON':
            expiring_soon_count += 1
        elif status == 'EXPIRED':
            expired_count += 1

        w_type = w.type.strip() if w.type and w.type.strip() else "Standard"
        type_counts[w_type] += 1

    active_pct = round((active_count / total_warranties) * 100, 1) if total_warranties > 0 else 0.0
    expiring_pct = round((expiring_soon_count / total_warranties) * 100, 1) if total_warranties > 0 else 0.0
    expired_pct = round((expired_count / total_warranties) * 100, 1) if total_warranties > 0 else 0.0

    return {
        "total_warranties": total_warranties,
        "active_count": active_count,
        "expiring_soon_count": expiring_soon_count,
        "expired_count": expired_count,
        "active_percentage": active_pct,
        "expiring_percentage": expiring_pct,
        "expired_percentage": expired_pct,
        "warranty_type_breakdown": dict(type_counts)
    }


def get_service_analytics(user_id):
    """
    Compute detailed service record metrics, costs, and chronological breakdown.
    """
    products = Product.query.filter_by(user_id=user_id).all()
    product_map = {p.id: p.name for p in products}
    product_ids = list(product_map.keys())

    if not product_ids:
        return {
            "total_records": 0,
            "completed_count": 0,
            "pending_count": 0,
            "cancelled_count": 0,
            "total_cost": "0.00",
            "average_cost": "0.00",
            "cost_by_product": [],
            "cost_by_service_type": [],
            "records_by_month": []
        }

    service_records = ServiceRecord.query.filter(
        ServiceRecord.product_id.in_(product_ids)
    ).order_by(ServiceRecord.service_date.asc()).all()

    total_records = len(service_records)
    completed_count = 0
    pending_count = 0
    cancelled_count = 0
    total_cost_dec = Decimal('0.00')
    non_cancelled_count = 0

    # Aggregations
    product_costs = defaultdict(lambda: {"cost": Decimal('0.00'), "count": 0})
    type_costs = defaultdict(lambda: {"cost": Decimal('0.00'), "count": 0})
    monthly_data = defaultdict(lambda: {"cost": Decimal('0.00'), "count": 0})

    for s in service_records:
        status = s.status.upper()
        if status == 'COMPLETED':
            completed_count += 1
        elif status == 'PENDING':
            pending_count += 1
        elif status == 'CANCELLED':
            cancelled_count += 1

        is_non_cancelled = status != 'CANCELLED'
        cost_val = Decimal(str(s.cost)) if s.cost is not None else Decimal('0.00')

        if is_non_cancelled:
            total_cost_dec += cost_val
            non_cancelled_count += 1

            # By Product
            product_costs[s.product_id]["cost"] += cost_val
            product_costs[s.product_id]["count"] += 1

            # By Type
            stype = s.type.strip() if s.type and s.type.strip() else "Maintenance"
            type_costs[stype]["cost"] += cost_val
            type_costs[stype]["count"] += 1

            # By Month
            month_key = s.service_date.strftime('%Y-%m') if s.service_date else "Unknown"
            monthly_data[month_key]["cost"] += cost_val
            monthly_data[month_key]["count"] += 1

    avg_cost_dec = (total_cost_dec / non_cancelled_count) if non_cancelled_count > 0 else Decimal('0.00')

    # Format cost_by_product list
    cost_by_product = [
        {
            "product_id": pid,
            "product_name": product_map.get(pid, f"Product {pid}"),
            "cost": format_currency(info["cost"]),
            "count": info["count"]
        }
        for pid, info in sorted(product_costs.items(), key=lambda x: x[1]["cost"], reverse=True)
    ]

    # Format cost_by_service_type list
    cost_by_service_type = [
        {
            "type": stype,
            "cost": format_currency(info["cost"]),
            "count": info["count"]
        }
        for stype, info in sorted(type_costs.items(), key=lambda x: x[1]["cost"], reverse=True)
    ]

    # Format records_by_month list (chronological)
    records_by_month = [
        {
            "month": month,
            "count": info["count"],
            "cost": format_currency(info["cost"])
        }
        for month, info in sorted(monthly_data.items())
        if month != "Unknown"
    ]

    return {
        "total_records": total_records,
        "completed_count": completed_count,
        "pending_count": pending_count,
        "cancelled_count": cancelled_count,
        "total_cost": format_currency(total_cost_dec),
        "average_cost": format_currency(avg_cost_dec),
        "cost_by_product": cost_by_product,
        "cost_by_service_type": cost_by_service_type,
        "records_by_month": records_by_month
    }


def get_product_analytics(user_id):
    """
    Compute product-level distribution, purchase value, and warranty attachment metrics.
    """
    products = Product.query.filter_by(user_id=user_id).all()
    total_products = len(products)

    if not products:
        return {
            "total_products": 0,
            "products_by_category": {},
            "products_by_brand": {},
            "products_by_year": {},
            "total_purchase_value": "0.00",
            "average_purchase_price": "0.00",
            "products_with_warranty": 0,
            "products_without_warranty": 0
        }

    categories = defaultdict(int)
    brands = defaultdict(int)
    years = defaultdict(int)
    total_value_dec = Decimal('0.00')
    price_count = 0
    products_with_warranty = 0
    products_without_warranty = 0

    for p in products:
        categories[p.category.strip() if p.category else "Uncategorized"] += 1
        brands[p.brand.strip() if p.brand else "Generic"] += 1

        if p.purchase_date:
            years[str(p.purchase_date.year)] += 1

        if p.purchase_price is not None:
            try:
                total_value_dec += Decimal(str(p.purchase_price))
                price_count += 1
            except Exception:
                pass

        if p.warranties and len(p.warranties) > 0:
            products_with_warranty += 1
        else:
            products_without_warranty += 1

    avg_price_dec = (total_value_dec / price_count) if price_count > 0 else Decimal('0.00')

    return {
        "total_products": total_products,
        "products_by_category": dict(categories),
        "products_by_brand": dict(brands),
        "products_by_year": dict(sorted(years.items())),
        "total_purchase_value": format_currency(total_value_dec),
        "average_purchase_price": format_currency(avg_price_dec),
        "products_with_warranty": products_with_warranty,
        "products_without_warranty": products_without_warranty
    }


def get_document_analytics(user_id):
    """
    Compute document counts, storage usage, and stored OCR states.
    Does not trigger new OCR processing.
    """
    products = Product.query.filter_by(user_id=user_id).all()
    product_map = {p.id: p.name for p in products}
    product_ids = list(product_map.keys())

    if not product_ids:
        return {
            "total_documents": 0,
            "total_file_size": 0,
            "documents_by_type": {},
            "documents_by_product": [],
            "documents_with_ocr": 0,
            "documents_without_ocr": 0,
            "completed_ocr_count": 0,
            "failed_ocr_count": 0
        }

    documents = Document.query.filter(Document.product_id.in_(product_ids)).all()
    total_documents = len(documents)
    total_file_size = 0
    type_counts = defaultdict(int)
    product_counts = defaultdict(int)
    documents_with_ocr = 0
    documents_without_ocr = 0
    completed_ocr_count = 0
    failed_ocr_count = 0

    for d in documents:
        total_file_size += (d.file_size or 0)
        dtype = d.document_type.strip() if d.document_type else "Other"
        type_counts[dtype] += 1
        product_counts[d.product_id] += 1

        # Check existing OCR result association
        if d.ocr_result:
            documents_with_ocr += 1
            ocr_status = getattr(d.ocr_result, 'status', '').upper()
            if ocr_status == 'COMPLETED':
                completed_ocr_count += 1
            elif ocr_status == 'FAILED':
                failed_ocr_count += 1
        else:
            documents_without_ocr += 1

    documents_by_product = [
        {
            "product_id": pid,
            "product_name": product_map.get(pid, f"Product {pid}"),
            "count": count
        }
        for pid, count in sorted(product_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "total_documents": total_documents,
        "total_file_size": total_file_size,
        "documents_by_type": dict(type_counts),
        "documents_by_product": documents_by_product,
        "documents_with_ocr": documents_with_ocr,
        "documents_without_ocr": documents_without_ocr,
        "completed_ocr_count": completed_ocr_count,
        "failed_ocr_count": failed_ocr_count
    }


def get_health_analytics(user_id, status_filter=None, as_of_date=None):
    """
    Delegate health analytics computation to health_service.
    """
    return get_user_health_analytics(user_id, status_filter=status_filter, as_of_date=as_of_date)


def get_attention_items(user_id, reference_date=None):
    """
    Identify and prioritize actionable maintenance, warranty, and health alerts.
    
    Severity Ranking:
      - HIGH: Expired warranties, Critical health scores (<50), Service cost > 25% of purchase price.
      - MEDIUM: Warranties expiring within 30 days, Attention health scores (50-79), >=2 repairs.
      - LOW: Failed OCR processing records.
      
    Returns:
        dict: {"attention_items": list of dicts sorted by severity}
    """
    if reference_date is None:
        reference_date = date.today()

    products = Product.query.filter_by(user_id=user_id).all()
    product_map = {p.id: p for p in products}
    product_ids = list(product_map.keys())

    if not product_ids:
        return {"attention_items": []}

    items = []
    seen_keys = set()

    def add_item(item_type, severity, product_id, message):
        key = (item_type, product_id)
        if key not in seen_keys:
            seen_keys.add(key)
            items.append({
                "type": item_type,
                "severity": severity,
                "product_id": product_id,
                "message": message
            })

    # 1. Product Health, Cost, and Repairs
    for p in products:
        health_info = calculate_product_health(p, as_of_date=reference_date)
        score = health_info["score"]
        status = health_info["status"]

        if status == "CRITICAL":
            add_item("CRITICAL_HEALTH", "HIGH", p.id, f"{p.name} has critical health score ({score}/100).")
        elif status == "ATTENTION":
            add_item("ATTENTION_HEALTH", "MEDIUM", p.id, f"{p.name} requires attention (health score: {score}/100).")

        # Check completed repairs count
        repairs = [s for s in p.service_records if s.status.upper() == 'COMPLETED']
        if len(repairs) >= 2:
            add_item("FREQUENT_REPAIRS", "MEDIUM", p.id, f"{p.name} has {len(repairs)} completed repairs.")

        # Check service cost ratio
        non_cancelled_cost = sum(
            Decimal(str(s.cost)) for s in p.service_records
            if s.status.upper() != 'CANCELLED' and s.cost is not None
        )
        purchase_price = Decimal(str(p.purchase_price)) if p.purchase_price else Decimal('0.00')
        if purchase_price > Decimal('0.00') and (non_cancelled_cost / purchase_price) > Decimal('0.25'):
            add_item("HIGH_SERVICE_COST", "HIGH", p.id, f"{p.name} service costs exceed 25% of its purchase price.")

    # 2. Warranties
    warranties = Warranty.query.filter(Warranty.product_id.in_(product_ids)).all()
    for w in warranties:
        p = product_map.get(w.product_id)
        p_name = p.name if p else "Product"
        metrics = compute_warranty_metrics(
            start_date=w.start_date,
            end_date=w.end_date,
            stored_is_active=w.is_active,
            reference_date=reference_date
        )
        status = metrics.get('status')
        if status == 'EXPIRED':
            add_item("WARRANTY_EXPIRED", "HIGH", w.product_id, f"Warranty for {p_name} has expired.")
        elif status == 'EXPIRING_SOON':
            days = metrics.get('days_remaining', 0)
            add_item("WARRANTY_EXPIRING", "MEDIUM", w.product_id, f"Warranty for {p_name} expires in {days} day(s).")

    # 3. Documents with failed OCR
    documents = Document.query.filter(Document.product_id.in_(product_ids)).all()
    for d in documents:
        if d.ocr_result and d.ocr_result.status.upper() == 'FAILED':
            p = product_map.get(d.product_id)
            p_name = p.name if p else "Product"
            add_item("FAILED_OCR", "LOW", d.product_id, f"OCR processing failed for document '{d.name}' ({p_name}).")

    # Severity ordering
    severity_rank = {"HIGH": 1, "MEDIUM": 2, "LOW": 3}
    items.sort(key=lambda x: (severity_rank.get(x["severity"], 99), x["product_id"], x["type"]))

    return {"attention_items": items}
