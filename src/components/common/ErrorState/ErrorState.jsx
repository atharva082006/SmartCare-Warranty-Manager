import React from 'react';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import Button from '../Button/Button';
import './ErrorState.css';

/**
 * Reusable Error State Component
 * Provides clear heading, concise explanation, and optional retry action.
 */
export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section.',
  onRetry = null,
  retryLabel = 'Retry',
  actionLabel = null,
  onAction = null,
  icon: Icon = FiAlertCircle,
  className = '',
  compact = false,
}) {
  return (
    <div className={`error-state-container ${compact ? 'error-state-compact' : ''} ${className}`} role="alert">
      <div className="error-state-icon-wrapper" aria-hidden="true">
        <Icon className="error-state-icon" />
      </div>

      <div className="error-state-text">
        <h3 className="error-state-title">{title}</h3>
        {message && <p className="error-state-message">{message}</p>}
      </div>

      {(onRetry || (actionLabel && onAction)) && (
        <div className="error-state-actions">
          {onRetry && (
            <Button
              variant="secondary"
              size={compact ? 'sm' : 'md'}
              icon={FiRefreshCw}
              onClick={onRetry}
            >
              {retryLabel}
            </Button>
          )}

          {actionLabel && onAction && (
            <Button
              variant="outline"
              size={compact ? 'sm' : 'md'}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
