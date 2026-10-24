import React from 'react';
import Button from '../Button/Button';
import './EmptyState.css';

export default function EmptyState({
  icon: Icon = null,
  title = 'No items found',
  description = 'There are no records to display at this time.',
  actionLabel,
  onAction,
  actionIcon,
  children,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`}>
      {Icon && (
        <div className="empty-state-icon" aria-hidden="true">
          <Icon />
        </div>
      )}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>

      {actionLabel && onAction && (
        <div className="empty-state-action">
          <Button variant="primary" icon={actionIcon} onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}

      {children}
    </div>
  );
}
