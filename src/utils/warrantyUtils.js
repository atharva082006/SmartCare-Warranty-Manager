/**
 * Warranty calculation utilities.
 * Handles consistent status determination and time boundaries.
 */

/**
 * Calculate the number of days remaining until warranty expires.
 * Negative numbers indicate the warranty has already expired.
 */
export function getDaysRemaining(endDate, referenceDate = new Date()) {
  if (!endDate) return 0;

  const expiry = new Date(endDate);
  const ref = new Date(referenceDate);

  if (isNaN(expiry.getTime())) return 0;

  expiry.setHours(0, 0, 0, 0);
  ref.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - ref.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a warranty is expiring within the specified threshold (default 30 days).
 */
export function isWarrantyExpiringSoon(endDate, thresholdDays = 30, referenceDate = new Date()) {
  const days = getDaysRemaining(endDate, referenceDate);
  return days >= 0 && days <= thresholdDays;
}

/**
 * Determine canonical warranty status: 'active' | 'expiringSoon' | 'expired'.
 */
export function calculateWarrantyStatus(startDate, endDate, referenceDate = new Date()) {
  if (!endDate) return 'expired';

  const days = getDaysRemaining(endDate, referenceDate);

  if (days < 0) {
    return 'expired';
  }
  if (days <= 30) {
    return 'expiringSoon';
  }
  return 'active';
}

/**
 * Get readable label for warranty status.
 */
export function getWarrantyStatusLabel(status) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'expiringSoon':
      return 'Expiring Soon';
    case 'expired':
      return 'Expired';
    default:
      return 'Unknown';
  }
}

/**
 * Get UI Badge variant for warranty status.
 */
export function getWarrantyBadgeVariant(status) {
  switch (status) {
    case 'active':
      return 'success';
    case 'expiringSoon':
      return 'warning';
    case 'expired':
      return 'danger';
    default:
      return 'neutral';
  }
}

/**
 * Format readable countdown or expired-ago text.
 * Example: "128 days remaining", "12 days remaining", "Expired 45 days ago"
 */
export function formatExpiryCountdown(endDate, referenceDate = new Date()) {
  if (!endDate) return 'No expiry date';
  const days = getDaysRemaining(endDate, referenceDate);
  if (days < 0) {
    const past = Math.abs(days);
    return `Expired ${past} day${past === 1 ? '' : 's'} ago`;
  }
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `${days} days remaining`;
}
