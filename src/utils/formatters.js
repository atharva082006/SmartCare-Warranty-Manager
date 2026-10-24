/**
 * Display formatters for currency, dates, relative time, and file sizes.
 */

/**
 * Format numeric value to Indian Rupee (INR) currency representation.
 * Example: 74990 -> "₹74,990"
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format standard ISO date string (YYYY-MM-DD) into readable format.
 * Example: "2026-10-15" -> "15 Oct 2026"
 */
export function formatDate(dateString, style = 'medium') {
  if (!dateString) return '—';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);

  if (style === 'short') {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  }

  if (style === 'long') {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  // Medium (default): 15 Oct 2026
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format standard ISO date-time string into readable format with time.
 * Example: "2026-10-15T14:30:00Z" -> "15 Oct 2026, 2:30 pm"
 */
export function formatDateTime(dateString) {
  if (!dateString) return '—';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date relative to current time or reference date.
 * Example: "In 15 days", "Expired 3 months ago", "Today"
 */
export function formatRelativeDate(dateString, referenceDate = new Date()) {
  if (!dateString) return '—';

  const target = new Date(dateString);
  const ref = new Date(referenceDate);

  if (isNaN(target.getTime())) return String(dateString);

  // Normalize to date boundary
  target.setHours(0, 0, 0, 0);
  ref.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - ref.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  if (diffDays > 0) {
    if (diffDays < 30) return `In ${diffDays} days`;
    const months = Math.round(diffDays / 30);
    return `In ${months} ${months === 1 ? 'month' : 'months'}`;
  } else {
    const pastDays = Math.abs(diffDays);
    if (pastDays < 30) return `${pastDays} days ago`;
    const pastMonths = Math.round(pastDays / 30);
    return `${pastMonths} ${pastMonths === 1 ? 'month' : 'months'} ago`;
  }
}

/**
 * Format bytes into human-readable file size (KB, MB).
 * Example: 2450000 -> "2.3 MB"
 */
export function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
