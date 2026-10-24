import React from 'react';
import { FiTool, FiCheckCircle, FiClock, FiCreditCard } from 'react-icons/fi';
import Card from '../common/Card/Card';
import Badge from '../common/Badge/Badge';
import { formatCurrency } from '../../utils/formatters.js';
import './ServiceRecordKpiCards.css';

export default function ServiceRecordKpiCards({ stats, loading = false }) {
  if (loading) {
    return (
      <div className="service-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="service-kpi-card skeleton-card">
            <div className="kpi-skeleton-content" />
          </Card>
        ))}
      </div>
    );
  }

  const {
    totalRecords = 0,
    completed = 0,
    scheduledOrInProgress = 0,
    totalCost = 0,
    averageCost = 0,
  } = stats || {};

  return (
    <div className="service-kpi-grid">
      {/* 1. Total Service Records */}
      <Card className="service-kpi-card">
        <div className="kpi-card-inner">
          <div className="kpi-icon-box icon-primary">
            <FiTool />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Service Records</span>
            <div className="kpi-val-row">
              <span className="kpi-value">{totalRecords}</span>
              <Badge variant="primary" size="sm">Logged</Badge>
            </div>
            <span className="kpi-subtext">Across all registered products</span>
          </div>
        </div>
      </Card>

      {/* 2. Completed Services */}
      <Card className="service-kpi-card">
        <div className="kpi-card-inner">
          <div className="kpi-icon-box icon-success">
            <FiCheckCircle />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Completed Services</span>
            <div className="kpi-val-row">
              <span className="kpi-value">{completed}</span>
              <Badge variant="success" size="sm" dot>Resolved</Badge>
            </div>
            <span className="kpi-subtext">Maintenance & repair completed</span>
          </div>
        </div>
      </Card>

      {/* 3. Scheduled / In Progress Services */}
      <Card className="service-kpi-card">
        <div className="kpi-card-inner">
          <div className="kpi-icon-box icon-warning">
            <FiClock />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Scheduled / In Progress</span>
            <div className="kpi-val-row">
              <span className="kpi-value">{scheduledOrInProgress}</span>
              <Badge variant={scheduledOrInProgress > 0 ? 'warning' : 'neutral'} size="sm">
                {scheduledOrInProgress > 0 ? 'Active' : 'None'}
              </Badge>
            </div>
            <span className="kpi-subtext">Upcoming visits or active repair</span>
          </div>
        </div>
      </Card>

      {/* 4. Total Service Cost (with Average Service Cost) */}
      <Card className="service-kpi-card">
        <div className="kpi-card-inner">
          <div className="kpi-icon-box icon-cost">
            <FiCreditCard />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Service Cost</span>
            <div className="kpi-val-row">
              <span className="kpi-value cost-value">{formatCurrency(totalCost)}</span>
            </div>
            <span className="kpi-subtext">
              Avg: <strong>{formatCurrency(averageCost)}</strong> / service
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
