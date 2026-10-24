import React from 'react';
import { FiBox, FiCheckCircle, FiAlertTriangle, FiActivity } from 'react-icons/fi';
import Card from '../common/Card/Card';
import Badge from '../common/Badge/Badge';
import './ProductSummaryCards.css';

export default function ProductSummaryCards({ summary, loading = false }) {
  if (loading) {
    return (
      <div className="product-summary-grid">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="product-summary-card skeleton-card">
            <div className="summary-skeleton-content" />
          </Card>
        ))}
      </div>
    );
  }

  const {
    totalProducts = 0,
    activeProducts = 0,
    needingAttention = 0,
    averageHealthScore = 100,
  } = summary || {};

  return (
    <div className="product-summary-grid">
      {/* Total Products */}
      <Card className="product-summary-card">
        <div className="summary-card-inner">
          <div className="summary-icon-box icon-primary">
            <FiBox />
          </div>
          <div className="summary-info">
            <span className="summary-label">Total Products</span>
            <div className="summary-val-row">
              <span className="summary-value">{totalProducts}</span>
              <Badge variant="primary" size="sm">Catalogued</Badge>
            </div>
            <span className="summary-subtext">Registered appliances</span>
          </div>
        </div>
      </Card>

      {/* Active Products */}
      <Card className="product-summary-card">
        <div className="summary-card-inner">
          <div className="summary-icon-box icon-success">
            <FiCheckCircle />
          </div>
          <div className="summary-info">
            <span className="summary-label">Active Warranties</span>
            <div className="summary-val-row">
              <span className="summary-value">{activeProducts}</span>
              <Badge variant="success" size="sm" dot>Protected</Badge>
            </div>
            <span className="summary-subtext">Full warranty coverage</span>
          </div>
        </div>
      </Card>

      {/* Needing Attention */}
      <Card className="product-summary-card">
        <div className="summary-card-inner">
          <div className="summary-icon-box icon-warning">
            <FiAlertTriangle />
          </div>
          <div className="summary-info">
            <span className="summary-label">Needs Attention</span>
            <div className="summary-val-row">
              <span className="summary-value">{needingAttention}</span>
              {needingAttention > 0 ? (
                <Badge variant="warning" size="sm">Action Needed</Badge>
              ) : (
                <Badge variant="success" size="sm">All Good</Badge>
              )}
            </div>
            <span className="summary-subtext">Expiring, expired, or low health</span>
          </div>
        </div>
      </Card>

      {/* Average Health Score */}
      <Card className="product-summary-card">
        <div className="summary-card-inner">
          <div className="summary-icon-box icon-info">
            <FiActivity />
          </div>
          <div className="summary-info">
            <span className="summary-label">Average Health</span>
            <div className="summary-val-row">
              <span className="summary-value">{averageHealthScore}/100</span>
              <Badge
                variant={
                  averageHealthScore >= 80
                    ? 'success'
                    : averageHealthScore >= 60
                    ? 'primary'
                    : 'warning'
                }
                size="sm"
              >
                {averageHealthScore >= 80 ? 'Optimal' : averageHealthScore >= 60 ? 'Good' : 'Fair'}
              </Badge>
            </div>
            <span className="summary-subtext">Fleet condition index</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
