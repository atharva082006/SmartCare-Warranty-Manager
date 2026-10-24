/**
 * Product Health Score calculation and status utilities.
 * Follows the 0–100 score transparent deduction model.
 * Single source of truth for all health score derivations across SmartCare.
 */

/**
 * Determine health category key from numeric score.
 */
export function getHealthStatus(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'critical';
}

/**
 * Get readable label for health status.
 */
export function getHealthStatusLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

/**
 * Get color/badge variant for health score.
 */
export function getHealthBadgeVariant(score) {
  if (score >= 80) return 'success';
  if (score >= 60) return 'primary';
  if (score >= 40) return 'warning';
  return 'danger';
}

/**
 * Get human-readable description for health category.
 */
export function getHealthCategoryDescription(score) {
  if (score >= 80) {
    return 'Optimal reliability and condition. Minimal maintenance intervention required.';
  }
  if (score >= 60) {
    return 'Good operational state. Standard preventive checkups recommended.';
  }
  if (score >= 40) {
    return 'Moderate wear or out-of-warranty exposure. Requires attention.';
  }
  if (score >= 20) {
    return 'Elevated failure risk or frequent past repairs. Prioritize inspection.';
  }
  return 'Critical condition. Significant repair expenses or severe age degradation.';
}

/**
 * Calculate health score with transparent deduction breakdown.
 *
 * Factors evaluated:
 * - Base Score: 100
 * - Age: Deducts points based on years since purchase (4 pts/yr, max 25)
 * - Repair History: Deducts points per corrective repair (6 pts/repair, max 30)
 * - Maintenance Cost: Deducts points if total service exceeds a % of purchase price (>25% = -25, >10% = -10)
 * - Warranty Status: Deducts points if warranty has expired (-15) or expiring soon (-5)
 *
 * Returns structured metrics:
 * {
 *   score,
 *   status,
 *   statusLabel,
 *   category,
 *   baseScore,
 *   deductions,
 *   positiveFactors,
 *   recommendations,
 *   primaryReason,
 * }
 */
export function calculateHealthScore(
  product,
  warranty = null,
  serviceRecords = [],
  referenceDate = new Date()
) {
  const baseScore = 100;
  const deductions = [];
  const positiveFactors = [];
  const recommendations = [];

  const ref = new Date(referenceDate);

  // 1. Age Factor
  let ageInYears = 0;
  if (product?.purchaseDate) {
    const purchase = new Date(product.purchaseDate);
    ageInYears = Math.max(
      0,
      (ref.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    );
    const ageDeduction = Math.min(25, Math.round(ageInYears * 4)); // 4 pts per year, max 25

    if (ageDeduction > 0) {
      deductions.push({
        factor: 'Age',
        points: -ageDeduction,
        description: `Product is approx. ${ageInYears.toFixed(1)} years old.`,
      });
    } else {
      positiveFactors.push({
        factor: 'New Asset',
        description: 'Product was purchased less than 3 months ago.',
      });
    }
  }

  // 2. Repairs Factor
  const repairRecords = (serviceRecords || []).filter(
    (s) =>
      s.serviceType === 'Repair' ||
      (s.partsReplaced && s.partsReplaced.length > 0)
  );

  if (repairRecords.length > 0) {
    const repairDeduction = Math.min(30, repairRecords.length * 6); // 6 pts per repair, max 30
    deductions.push({
      factor: 'Repair History',
      points: -repairDeduction,
      description: `${repairRecords.length} repair visit(s) with component replacements.`,
    });

    if (repairRecords.length >= 2) {
      recommendations.push({
        title: 'Frequent Component Repairs',
        message: `${repairRecords.length} corrective repairs logged. Inspect service history for recurring part defects.`,
        actionText: 'Inspect History',
        actionLink: '/service-records',
      });
    }
  } else {
    positiveFactors.push({
      factor: 'Zero Component Failures',
      description: 'No corrective repairs or component breakdowns logged.',
    });
  }

  // 3. Maintenance Cost Ratio
  const totalCost = (serviceRecords || []).reduce(
    (sum, s) => sum + (Number(s.cost) || 0),
    0
  );
  const purchasePrice = Number(product?.purchasePrice) || 1;
  const costRatio = totalCost / purchasePrice;

  if (costRatio > 0.25) {
    const costDeduction = 25;
    deductions.push({
      factor: 'High Maintenance Cost',
      points: -costDeduction,
      description: `Service cost is ${Math.round(costRatio * 100)}% of the original purchase price.`,
    });
    recommendations.push({
      title: 'High Maintenance Expense Ratio',
      message: `Total service cost (₹${totalCost.toLocaleString('en-IN')}) exceeds 25% of asset value. Evaluate replacement feasibility.`,
      actionText: 'Review Spending',
      actionLink: '/service-records',
    });
  } else if (costRatio > 0.1) {
    const costDeduction = 10;
    deductions.push({
      factor: 'Moderate Service Cost',
      points: -costDeduction,
      description: `Service cost is ${Math.round(costRatio * 100)}% of the original purchase price.`,
    });
  } else {
    positiveFactors.push({
      factor: 'Economical Upkeep',
      description: 'Cumulative service spend is minimal relative to asset price.',
    });
  }

  // 4. Warranty Status Factor
  const isExpired =
    warranty?.status === 'expired' ||
    (warranty?.endDate && new Date(warranty.endDate) < ref);
  const isExpiringSoon =
    warranty?.status === 'expiringSoon' ||
    (warranty?.daysRemaining !== undefined &&
      warranty.daysRemaining > 0 &&
      warranty.daysRemaining <= 30);

  if (isExpired) {
    const warrantyDeduction = 15;
    deductions.push({
      factor: 'Expired Warranty',
      points: -warrantyDeduction,
      description: 'Product is no longer covered under active warranty.',
    });
    recommendations.push({
      title: 'Warranty Coverage Expired',
      message: 'Product has lapsed warranty protection. Review renewal or extended AMC options.',
      actionText: 'Check Warranty',
      actionLink: '/warranties',
    });
  } else if (isExpiringSoon) {
    const warrantyDeduction = 5;
    deductions.push({
      factor: 'Warranty Expiring Soon',
      points: -warrantyDeduction,
      description: `Warranty coverage ends in ${warranty.daysRemaining || '<30'} days.`,
    });
    recommendations.push({
      title: 'Warranty Expiring Soon',
      message: `Coverage expires within ${warranty.daysRemaining || 30} days. Review renewal options to prevent lapses.`,
      actionText: 'Renew Warranty',
      actionLink: '/warranties',
    });
  } else if (warranty && (warranty.status === 'active' || warranty.daysRemaining > 30)) {
    positiveFactors.push({
      factor: 'Active Warranty Protection',
      description: `Covered under active ${warranty.type || 'warranty'} until ${warranty.endDate || 'end date'}.`,
    });
  } else if (!warranty) {
    // No warranty registered at all
    const noWarrantyDeduction = 10;
    deductions.push({
      factor: 'Unregistered Warranty',
      points: -noWarrantyDeduction,
      description: 'No warranty record is catalogued for this product.',
    });
    recommendations.push({
      title: 'No Warranty on File',
      message: 'Catalogue warranty documentation or invoices to track coverage.',
      actionText: 'Add Warranty',
      actionLink: '/warranties',
    });
  }

  // Fallback recommendation if product is completely healthy
  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Optimal Condition',
      message: 'Appliance is functioning efficiently with active protection. Continue periodic preventive care.',
      actionText: 'View Details',
      actionLink: `/products/${product?.id || ''}`,
    });
  }

  // Sum points
  const totalDeductions = deductions.reduce(
    (sum, d) => sum + Math.abs(d.points),
    0
  );
  const finalScore = Math.max(5, Math.min(100, baseScore - totalDeductions));

  // Determine primary reason
  let primaryReason = 'Optimal reliability and coverage';
  if (deductions.length > 0) {
    // Largest deduction
    const worstDeduction = [...deductions].sort(
      (a, b) => Math.abs(b.points) - Math.abs(a.points)
    )[0];
    primaryReason = worstDeduction.description;
  }

  const status = getHealthStatus(finalScore);
  const statusLabel = getHealthStatusLabel(finalScore);

  return {
    score: finalScore,
    status,
    statusLabel,
    category: statusLabel,
    baseScore,
    deductions,
    positiveFactors,
    recommendations,
    primaryReason,
  };
}
