import React from 'react';
import { FiShield, FiCheckCircle, FiAlertTriangle, FiXCircle } from 'react-icons/fi';
import Card from '../common/Card/Card';
import Badge from '../common/Badge/Badge';
import './WarrantyKpiCards.css';

export default function WarrantyKpiCards({ stats, loading = false }) {
  if (loading) {
    return (
      <div className="warranty-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="warranty-kpi-card skeleton-card">
            <div className="kpi-skeleton-content" />
          </Card>
        ))}
      </div>
    );
  }

  const {
    totalWarranties = 0,
    active = 0,
    expiringSoon = 0,
    expired = 0,
  } = stats || {};

  return (
    <div className="warranty-kpi-grid">
      {/* 1. Total Warranties */}
      <Card className="warranty-kpi-card">
        <div className="kpi-card-inner">
          <div className="kpi-icon-box icon-primary">
            <FiShield />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Warranties</span>
            <div className="kpi-val-row">
              <span className="kpi-value">{totalWarranties}</span>
              <Badge variant="primary" size="sm">Catalogued</Badge>
            </div>
            <span className="kpi-subtext">Across all registered products</span>
          </div>
        </div>
      </Card>

      {/* 2. Active Warranties */}
      <Card className="warranty-kpi-card">
        <div className="kpi-card-inner">
          <div className="kpi-icon-box icon-success">
            <FiCheckCircle />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Active Warranties</span>
            <div className="kpi-val-row">
              <span className="kpi-value">{active}</span>
              <Badge variant="success" size="sm" dot>Protected</Badge>
            </div>
            <span className="kpi-subtext">Currently protected</span>
          </div>
        </div>
      </Card>

      {/* 3. Expiring Soon */}
      <Card className="warranty-kpi-card">
        <div className="kpi-card-inner">
          <div className="kpi-icon-box icon-warning">
            <FiAlertTriangle />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Expiring Soon</span>
            <div className="kpi-val-row">
              <span className="kpi-value">{expiringSoon}</span>
              <Badge variant={expiringSoon > 0 ? 'warning' : 'success'} size="sm">
                {expiringSoon > 0 ? 'Urgent' : 'None'}
              </Badge>
            </div>
            <span className="kpi-subtext">Expiring within 30 days</span>
          </div>
        </div>
      </Card>

      {/* 4. Expired Warranties */}
      <Card className="warranty-kpi-card">
        <div className="kpi-card-inner">
          <div className="kpi-icon-box icon-danger">
            <FiXCircle />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Expired Warranties</span>
            <div className="kpi-val-row">
              <span className="kpi-value">{expired}</span>
              <Badge variant={expired > 0 ? 'danger' : 'neutral'} size="sm">
                {expired > 0 ? 'Action Needed' : 'Zero'}
              </Badge>
            </div>
            <span className="kpi-subtext">Coverage has ended</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
