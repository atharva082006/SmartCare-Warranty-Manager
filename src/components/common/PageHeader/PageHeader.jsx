import React from 'react';
import './PageHeader.css';

export default function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs = null,
  className = '',
}) {
  return (
    <div className={`page-header ${className}`}>
      {breadcrumbs && <div className="page-header-breadcrumbs">{breadcrumbs}</div>}
      <div className="page-header-main">
        <div className="page-header-info">
          {title && <h1 className="page-header-title">{title}</h1>}
          {subtitle && (
            typeof subtitle === 'string' ? (
              <p className="page-header-subtitle">{subtitle}</p>
            ) : (
              <div className="page-header-subtitle">{subtitle}</div>
            )
          )}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </div>
  );
}
