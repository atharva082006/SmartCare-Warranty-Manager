/**
 * Service Record Utilities
 * Helpers for service status badges, labels, types, and formatting.
 */

import { formatCurrency } from './formatters.js';

export const SERVICE_TYPES = [
  'Repair',
  'Maintenance',
  'Inspection',
  'Replacement',
  'Installation',
  'General Service',
  'Cleaning',
  'Battery Replacement',
  'Other',
];

export const SERVICE_STATUSES = [
  'Completed',
  'Scheduled',
  'In Progress',
  'Cancelled',
];

/**
 * Returns badge variant string for a service status.
 */
export function getServiceStatusBadgeVariant(status) {
  if (!status) return 'neutral';
  const s = status.toLowerCase();
  if (s === 'completed') return 'success';
  if (s === 'scheduled') return 'primary';
  if (s === 'in progress') return 'warning';
  if (s === 'cancelled') return 'danger';
  return 'neutral';
}

/**
 * Returns user-friendly status label.
 */
export function getServiceStatusLabel(status) {
  if (!status) return 'Unknown';
  const s = status.toLowerCase();
  if (s === 'completed') return 'Completed';
  if (s === 'scheduled') return 'Scheduled';
  if (s === 'in progress') return 'In Progress';
  if (s === 'cancelled') return 'Cancelled';
  return status;
}

/**
 * Formats a service cost nicely.
 */
export function formatServiceCost(cost) {
  const num = Number(cost) || 0;
  if (num === 0) return '₹0 (Free / Warranty)';
  return formatCurrency(num);
}
