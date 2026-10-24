import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBox,
  FiShield,
  FiAlertTriangle,
  FiDollarSign,
  FiFolder,
  FiActivity,
} from 'react-icons/fi';
import Card from '../common/Card/Card';
import Badge from '../common/Badge/Badge';
import { getHealthBadgeVariant, getHealthStatusLabel } from '../../utils/healthScoreUtils';
import './AnalyticsKpiCards.css';

/**
 * Top-level overview KPI Cards for Analytics Page.
 * Displays: Total Products, Active Warranties, Expiring Soon, Total Service Spend, Total Documents, Average Health Score.
 */
export default function AnalyticsKpiCards({ stats = {}, loading = false }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="analytics-kpi-grid">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <Card key={idx} className="analytics-kpi-card kpi-skeleton">
            <div className="kpi-skeleton-line short" />
            <div className="kpi-skeleton-line long" />
          </Card>
        ))}
      </div>
    );
  }

  const {
    totalProducts = 0,
    activeWarranties = 0,
    expiringSoon = 0,
    formattedTotalServiceSpend = '₹0',
    totalDocuments = 0,
    averageHealthScore = 100,
  } = stats;

  const healthVariant = getHealthBadgeVariant(averageHealthScore);
  const healthLabel = getHealthStatusLabel(averageHealthScore);

  return (
    <div className="analytics-kpi-grid">
      {/* 1. Total Products */}
      <Card
        className="analytics-kpi-card"
        hoverable
        onClick={() => navigate('/products')}
      >
        <div className="kpi-card-inner">
          <div className="kpi-icon-pill icon-primary">
            <FiBox />
          </div>
          <div className="kpi-text-block">
            <span className="kpi-meta-label">Total Products</span>
            <div className="kpi-number-row">
              <span className="kpi-primary-number">{totalProducts}</span>
              <Badge variant="neutral" size="sm">
                Catalogued
              </Badge>
            </div>
            <span className="kpi-sub-text">Registered household items</span>
          </div>
        </div>
      </Card>

      {/* 2. Active Warranties */}
      <Card
        className="analytics-kpi-card"
        hoverable
        onClick={() => navigate('/warranties')}
      >
        <div className="kpi-card-inner">
          <div className="kpi-icon-pill icon-success">
            <FiShield />
          </div>
          <div className="kpi-text-block">
            <span className="kpi-meta-label">Active Warranties</span>
            <div className="kpi-number-row">
              <span className="kpi-primary-number">{activeWarranties}</span>
              <Badge variant="success" size="sm" dot>
                Covered
              </Badge>
            </div>
            <span className="kpi-sub-text">Under valid protection</span>
          </div>
        </div>
      </Card>

      {/* 3. Expiring Soon */}
      <Card
        className="analytics-kpi-card"
        hoverable
        onClick={() => navigate('/warranties')}
      >
        <div className="kpi-card-inner">
          <div className="kpi-icon-pill icon-warning">
            <FiAlertTriangle />
          </div>
          <div className="kpi-text-block">
            <span className="kpi-meta-label">Expiring Soon</span>
            <div className="kpi-number-row">
              <span className="kpi-primary-number">{expiringSoon}</span>
              <Badge variant={expiringSoon > 0 ? 'warning' : 'neutral'} size="sm">
                Within 30 Days
              </Badge>
            </div>
            <span className="kpi-sub-text">Requires renewal or check</span>
          </div>
        </div>
      </Card>

      {/* 4. Total Service Spend */}
      <Card
        className="analytics-kpi-card"
        hoverable
        onClick={() => navigate('/service-records')}
      >
        <div className="kpi-card-inner">
          <div className="kpi-icon-pill icon-danger">
            <FiDollarSign />
          </div>
          <div className="kpi-text-block">
            <span className="kpi-meta-label">Total Service Spend</span>
            <div className="kpi-number-row">
              <span className="kpi-primary-number">{formattedTotalServiceSpend}</span>
            </div>
            <span className="kpi-sub-text">Cumulative maintenance</span>
          </div>
        </div>
      </Card>

      {/* 5. Total Documents */}
      <Card
        className="analytics-kpi-card"
        hoverable
        onClick={() => navigate('/documents')}
      >
        <div className="kpi-card-inner">
          <div className="kpi-icon-pill icon-info">
            <FiFolder />
          </div>
          <div className="kpi-text-block">
            <span className="kpi-meta-label">Total Documents</span>
            <div className="kpi-number-row">
              <span className="kpi-primary-number">{totalDocuments}</span>
              <Badge variant="neutral" size="sm">
                Vault
              </Badge>
            </div>
            <span className="kpi-sub-text">Receipts, cards & reports</span>
          </div>
        </div>
      </Card>

      {/* 6. Average Health Score */}
      <Card
        className="analytics-kpi-card"
        hoverable
        onClick={() => {
          const el = document.getElementById('section-health');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      >
        <div className="kpi-card-inner">
          <div className={`kpi-icon-pill icon-${healthVariant}`}>
            <FiActivity />
          </div>
          <div className="kpi-text-block">
            <span className="kpi-meta-label">Average Health Score</span>
            <div className="kpi-number-row">
              <span className="kpi-primary-number">{averageHealthScore}/100</span>
              <Badge variant={healthVariant} size="sm">
                {healthLabel}
              </Badge>
            </div>
            <span className="kpi-sub-text">Deterministic fleet health</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
