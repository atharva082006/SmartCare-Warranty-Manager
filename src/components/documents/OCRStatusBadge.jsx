import React from 'react';
import Badge from '../common/Badge/Badge';
import { getOcrStatusBadgeVariant } from '../../utils/documentUtils';

export default function OCRStatusBadge({ status, size = 'sm', className = '' }) {
  const variant = getOcrStatusBadgeVariant(status);
  const label = status || 'Not Processed';

  return (
    <Badge variant={variant} size={size} dot className={`ocr-status-badge ${className}`}>
      {label}
    </Badge>
  );
}
