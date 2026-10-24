"""
Product Health Service.
Provides deterministic Product Health Score (0-100) calculations, transparent
deduction breakdowns, positive explanatory factors, and actionable maintenance recommendations.
"""

from datetime import date, datetime
from decimal import Decimal
from app.extensions import db
from app.models.product import Product
from app.models.warranty import Warranty
from app.models.service_record import ServiceRecord
from app.services.warranty_service import compute_warranty_metrics


def calculate_product_health(product, warranty=None, service_records=None, as_of_date=None):
    """
    Calculate deterministic health score (0-100) and evaluation factors for a product.
    
    BASE SCORE: 100
    
    DEDUCTIONS:
      1. Product Age: -4 points per completed year, maximum deduction -25.
      2. Repairs / Service Records: -6 points per completed repair, maximum deduction -30.
      3. Service Cost Ratio (relative to purchase price):
         - If service cost > 25% of purchase price: -25 points
         - If service cost > 10% of purchase price: -10 points
      4. Warranty Status:
         - Expired warranty: -15 points
         - Expiring soon (within 30 days): -5 points
         
    SCORE CLAMPING:
      Final score strictly clamped to range [0, 100]: max(0, min(100, score)).
      
    Args:
        product (Product): Product model instance.
        warranty (Warranty, optional): Active or latest warranty record. If omitted,
            retrieved from product.warranties.
        service_records (list, optional): List of ServiceRecord instances. If omitted,
            retrieved from product.service_records.
        as_of_date (date, optional): Reference date for time-dependent calculations
            (defaults to date.today()).
            
    Returns:
        dict: {
            "score": int (0-100),
            "status": str ("HEALTHY", "ATTENTION", "CRITICAL"),
            "status_label": str,
            "base_score": int (100),
            "positive_factors": list of str,
            "deductions": list of dict,
            "recommendations": list of str,
            "primary_reason": str
        }
    """
    if as_of_date is None:
        as_of_date = date.today()
    elif isinstance(as_of_date, datetime):
        as_of_date = as_of_date.date()
    elif isinstance(as_of_date, str):
        as_of_date = datetime.strptime(as_of_date, "%Y-%m-%d").date()

    base_score = 100
    deductions = []
    positive_factors = []
    recommendations = []

    # Resolve warranty
    if warranty is None and hasattr(product, 'warranties') and product.warranties:
        # Choose the warranty with the latest end_date
        sorted_warranties = sorted(
            product.warranties,
            key=lambda w: w.end_date if w.end_date else date.min,
            reverse=True
        )
        warranty = sorted_warranties[0] if sorted_warranties else None

    # Resolve service records
    if service_records is None and hasattr(product, 'service_records'):
        service_records = list(product.service_records) if product.service_records else []
    elif service_records is None:
        service_records = []

    # -------------------------------------------------------------
    # 1. Product Age Deduction (-4 pts / completed year, max 25)
    # -------------------------------------------------------------
    purchase_date = product.purchase_date if hasattr(product, 'purchase_date') else None
    if isinstance(purchase_date, datetime):
        purchase_date = purchase_date.date()
    elif isinstance(purchase_date, str):
        purchase_date = datetime.strptime(purchase_date, "%Y-%m-%d").date()

    completed_years = 0
    if purchase_date:
        if as_of_date >= purchase_date:
            completed_years = as_of_date.year - purchase_date.year - (
                (as_of_date.month, as_of_date.day) < (purchase_date.month, purchase_date.day)
            )
            completed_years = max(0, completed_years)

        age_deduction = min(25, completed_years * 4)
        if age_deduction > 0:
            deductions.append({
                "reason": "Product age",
                "factor": "Age",
                "points": -age_deduction,
                "description": f"Product is {completed_years} completed year(s) old (-{age_deduction} pts)."
            })
            if completed_years >= 5:
                recommendations.append("Product age suggests evaluating replacement or upgrade options.")
        else:
            positive_factors.append("Recent purchase")

    # -------------------------------------------------------------
    # 2. Repairs / Service Records Deduction (-6 pts / repair, max 30)
    # -------------------------------------------------------------
    # Completed service records count as repairs. Cancelled and pending are excluded.
    completed_repairs = [
        s for s in service_records
        if getattr(s, 'status', '').upper() == 'COMPLETED'
    ]
    repair_count = len(completed_repairs)

    if repair_count > 0:
        repair_deduction = min(30, repair_count * 6)
        deductions.append({
            "reason": "Frequent repairs" if repair_count >= 2 else "Service history",
            "factor": "Repairs",
            "points": -repair_deduction,
            "description": f"{repair_count} completed repair(s) logged (-{repair_deduction} pts)."
        })
        if repair_count >= 2:
            recommendations.append("Frequent repairs may indicate increasing maintenance needs.")
    else:
        positive_factors.append("No service history")

    # -------------------------------------------------------------
    # 3. Service Cost Ratio Deduction (>25% -> -25, >10% -> -10)
    # -------------------------------------------------------------
    # Non-cancelled service records contribute to total service cost
    non_cancelled_records = [
        s for s in service_records
        if getattr(s, 'status', '').upper() != 'CANCELLED'
    ]
    total_service_cost = Decimal('0.00')
    for s in non_cancelled_records:
        cost_val = getattr(s, 'cost', 0)
        if cost_val is not None:
            try:
                total_service_cost += Decimal(str(cost_val))
            except Exception:
                pass

    purchase_price = getattr(product, 'purchase_price', None)
    purchase_price_dec = Decimal('0.00')
    if purchase_price is not None:
        try:
            purchase_price_dec = Decimal(str(purchase_price))
        except Exception:
            purchase_price_dec = Decimal('0.00')

    if purchase_price_dec > Decimal('0.00'):
        ratio = total_service_cost / purchase_price_dec
        if ratio > Decimal('0.25'):
            deductions.append({
                "reason": "High service cost",
                "factor": "Service Cost Ratio",
                "points": -25,
                "description": f"Service cost ({total_service_cost:.2f}) exceeds 25% of purchase price ({purchase_price_dec:.2f})."
            })
            recommendations.append("Service costs are becoming significant compared with purchase price.")
        elif ratio > Decimal('0.10'):
            deductions.append({
                "reason": "Moderate service cost",
                "factor": "Service Cost Ratio",
                "points": -10,
                "description": f"Service cost ({total_service_cost:.2f}) exceeds 10% of purchase price ({purchase_price_dec:.2f})."
            })
            recommendations.append("Monitor recurring service costs.")
        else:
            positive_factors.append("Low service cost")
    else:
        # Zero or missing purchase price: handle safely without dividing
        if total_service_cost == Decimal('0.00'):
            positive_factors.append("Low service cost")

    # -------------------------------------------------------------
    # 4. Warranty Status Deduction (Expired -> -15, Expiring Soon -> -5)
    # -------------------------------------------------------------
    if warranty is not None:
        metrics = compute_warranty_metrics(
            start_date=warranty.start_date,
            end_date=warranty.end_date,
            stored_is_active=getattr(warranty, 'is_active', True),
            reference_date=as_of_date
        )
        w_status = metrics.get('status', 'EXPIRED')
        if w_status == 'EXPIRED':
            deductions.append({
                "reason": "Expired warranty",
                "factor": "Warranty",
                "points": -15,
                "description": "Warranty coverage has expired (-15 pts)."
            })
            recommendations.append("Consider renewing or extending warranty coverage.")
        elif w_status == 'EXPIRING_SOON':
            deductions.append({
                "reason": "Expiring warranty",
                "factor": "Warranty",
                "points": -5,
                "description": f"Warranty expires soon ({metrics.get('days_remaining', 0)} days remaining) (-5 pts)."
            })
            recommendations.append("Warranty expires soon. Review renewal options.")
        elif w_status == 'ACTIVE':
            positive_factors.append("Active warranty")
    else:
        # No warranty registered for this product
        recommendations.append("No warranty registered for this product. Add warranty details to track coverage.")

    # -------------------------------------------------------------
    # 5. Score Aggregation and Bounds Clamping (0 - 100)
    # -------------------------------------------------------------
    total_deduction_points = sum(abs(d["points"]) for d in deductions)
    calculated_score = base_score - total_deduction_points
    final_score = max(0, min(100, calculated_score))

    # -------------------------------------------------------------
    # 6. Primary Reason Determination
    # -------------------------------------------------------------
    if not deductions:
        primary_reason = "Healthy product"
    else:
        # Sort by points magnitude descending. For ties, maintain deterministic priority
        sorted_deductions = sorted(
            deductions,
            key=lambda d: abs(d["points"]),
            reverse=True
        )
        primary_reason = sorted_deductions[0]["reason"]

    # -------------------------------------------------------------
    # 7. Status Category Assignment
    # -------------------------------------------------------------
    if final_score >= 80:
        health_status = "HEALTHY"
        status_label = "Healthy"
    elif final_score >= 50:
        health_status = "ATTENTION"
        status_label = "Needs Attention"
    else:
        health_status = "CRITICAL"
        status_label = "Critical"

    # Default fallback recommendation if completely healthy
    if not recommendations:
        recommendations.append("Product is in optimal condition. Continue regular maintenance.")

    return {
        "score": final_score,
        "status": health_status,
        "status_label": status_label,
        "base_score": base_score,
        "positive_factors": positive_factors,
        "deductions": deductions,
        "recommendations": recommendations,
        "primary_reason": primary_reason
    }


def get_user_health_analytics(user_id, status_filter=None, as_of_date=None):
    """
    Compute health metrics and summaries for all products owned by a user.
    
    Args:
        user_id (int): ID of the authenticated user.
        status_filter (str, optional): Filter by status ("HEALTHY", "ATTENTION", "CRITICAL").
        as_of_date (date, optional): Date for deterministic calculations.
        
    Returns:
        dict: Health analytics summary dictionary including distribution and list.
    """
    products = Product.query.filter_by(user_id=user_id).order_by(Product.id.asc()).all()

    product_health_list = []
    total_score = 0
    healthy_count = 0
    attention_count = 0
    critical_count = 0

    normalized_filter = status_filter.strip().upper() if status_filter else None

    for product in products:
        health_data = calculate_product_health(product, as_of_date=as_of_date)
        score = health_data["score"]
        status = health_data["status"]

        total_score += score
        if status == "HEALTHY":
            healthy_count += 1
        elif status == "ATTENTION":
            attention_count += 1
        elif status == "CRITICAL":
            critical_count += 1

        if normalized_filter is None or status == normalized_filter:
            product_health_list.append({
                "product_id": product.id,
                "product_code": product.product_code,
                "name": product.name,
                "brand": product.brand,
                "category": product.category,
                "health_score": score,
                "health_status": status,
                "primary_reason": health_data["primary_reason"]
            })

    total_products = len(products)
    avg_score = round(total_score / total_products, 1) if total_products > 0 else 0.0

    return {
        "average_health_score": avg_score,
        "healthy_products": healthy_count,
        "attention_products": attention_count,
        "critical_products": critical_count,
        "score_distribution": {
            "healthy": healthy_count,
            "attention": attention_count,
            "critical": critical_count
        },
        "product_health_list": product_health_list
    }
