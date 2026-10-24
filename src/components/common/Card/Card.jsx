import React from 'react';
import './Card.css';

export default function Card({
  title,
  subtitle,
  actions,
  children,
  footer,
  hoverable = false,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  ...rest
}) {
  const hasHeader = title || subtitle || actions;

  return (
    <div className={`sc-card ${hoverable ? 'sc-card-hoverable' : ''} ${className}`} {...rest}>
      {hasHeader && (
        <div className={`sc-card-header ${headerClassName}`}>
          <div className="sc-card-header-text">
            {title && <h3 className="sc-card-title">{title}</h3>}
            {subtitle && (
              typeof subtitle === 'string' ? (
                <p className="sc-card-subtitle">{subtitle}</p>
              ) : (
                <div className="sc-card-subtitle">{subtitle}</div>
              )
            )}
          </div>
          {actions && <div className="sc-card-actions">{actions}</div>}
        </div>
      )}

      <div className={`sc-card-body ${bodyClassName}`}>{children}</div>

      {footer && <div className="sc-card-footer">{footer}</div>}
    </div>
  );
}
