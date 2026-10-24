import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiAlertTriangle, FiClock, FiArrowRight } from 'react-icons/fi';
import Card from '../common/Card/Card';
import Badge from '../common/Badge/Badge';
import Button from '../common/Button/Button';
import DoughnutChart from './charts/DoughnutChart';
import { getWarrantyBadgeVariant, getWarrantyStatusLabel } from '../../utils/warrantyUtils';
import './WarrantyAnalyticsSection.css';

/**
 * Warranty Analytics Section.
 * Visualizes warranty status distribution (Doughnut), coverage metrics,
 * and upcoming & expired coverage lists.
 */
export default function WarrantyAnalyticsSection({ data = {}, loading = false }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('expiring'); // 'expiring' | 'expired'

  if (loading) {
    return (
      <Card title="Warranty Analytics" className="warranty-analytics-card">
        <div className="kpi-skeleton-line long" />
      </Card>
    );
  }

  const {
    distribution = { labels: [], counts: [], percentages: [], total: 0 },
    coverage = {
      totalProducts: 0,
      coveredProducts: 0,
      coveragePercentage: 0,
      activePercentage: 0,
      expiredPercentage: 0,
    },
    upcomingExpirations = [],
    expiredWarranties = [],
    totalWarranties = 0,
  } = data;

  // Chart data format
  const doughnutData = [
    {
      label: 'Active',
      value: distribution.counts?.[0] || 0,
      color: '#28a745',
    },
    {
      label: 'Expiring Soon',
      value: distribution.counts?.[1] || 0,
      color: '#ffc107',
    },
    {
      label: 'Expired',
      value: distribution.counts?.[2] || 0,
      color: '#dc3545',
    },
  ];

  const currentList = activeTab === 'expiring' ? upcomingExpirations : expiredWarranties;

  return (
    <Card
      id="section-warranties"
      title="Warranty Analytics & Expirations"
      subtitle={`Tracking ${totalWarranties} registered warranties across ${coverage.totalProducts} products`}
      className="warranty-analytics-card"
      actions={
        <Button
          variant="ghost"
          size="sm"
          icon={FiArrowRight}
          onClick={() => navigate('/warranties')}
        >
          View Warranties
        </Button>
      }
    >
      <div className="warranty-analytics-grid">
        {/* Left Column: Doughnut Chart & Coverage Indicators */}
        <div className="warranty-chart-col">
          <h4 className="analytics-subheading">Status Distribution</h4>
          <DoughnutChart
            data={doughnutData}
            centerLabel="Warranties"
            centerValue={totalWarranties}
            size={180}
            strokeWidth={28}
            emptyMessage="No warranty records found."
          />

          {/* Coverage Summary Metrics */}
          <div className="warranty-coverage-metrics">
            <div className="coverage-metric-box">
              <span className="cov-label">Overall Coverage</span>
              <span className="cov-value">{coverage.coveragePercentage}%</span>
              <span className="cov-detail">
                {coverage.coveredProducts} of {coverage.totalProducts} products covered
              </span>
            </div>
            <div className="coverage-metric-box">
              <span className="cov-label">Active Ratio</span>
              <span className="cov-value text-success">{coverage.activePercentage}%</span>
              <span className="cov-detail">of warranties active</span>
            </div>
            <div className="coverage-metric-box">
              <span className="cov-label">Expired Ratio</span>
              <span className="cov-value text-danger">{coverage.expiredPercentage}%</span>
              <span className="cov-detail">require renewal</span>
            </div>
          </div>
        </div>

        {/* Right Column: Expirations List (Expiring Soon vs Expired) */}
        <div className="warranty-list-col">
          <div className="warranty-list-header">
            <div className="warranty-tabs-switch">
              <button
                type="button"
                className={`w-tab-btn ${activeTab === 'expiring' ? 'active' : ''}`}
                onClick={() => setActiveTab('expiring')}
              >
                <FiClock /> Expiring Soon ({upcomingExpirations.length})
              </button>
              <button
                type="button"
                className={`w-tab-btn ${activeTab === 'expired' ? 'active' : ''}`}
                onClick={() => setActiveTab('expired')}
              >
                <FiAlertTriangle /> Expired ({expiredWarranties.length})
              </button>
            </div>
          </div>

          <div className="warranty-items-scroll">
            {currentList.length === 0 ? (
              <div className="warranty-empty-list">
                <FiShield className="empty-icon-shield" />
                <p>
                  {activeTab === 'expiring'
                    ? 'No warranties expiring within the next 30 days.'
                    : 'No expired warranties recorded.'}
                </p>
              </div>
            ) : (
              <div className="warranty-list-group">
                {currentList.map((item) => {
                  const badgeVariant = getWarrantyBadgeVariant(item.status);
                  const statusLabel = getWarrantyStatusLabel(item.status);

                  return (
                    <div
                      key={item.id}
                      className="warranty-row-card"
                      onClick={() => navigate(`/warranties/${item.id}`)}
                    >
                      <div className="warranty-row-main">
                        <span className="warranty-prod-name">{item.productName}</span>
                        <span className="warranty-meta">
                          {item.brand} • {item.provider} • {item.type}
                        </span>
                      </div>
                      <div className="warranty-row-status">
                        <Badge variant={badgeVariant} size="sm" dot>
                          {statusLabel}
                        </Badge>
                        <span className="warranty-days-info">
                          {item.daysRemaining > 0
                            ? `${item.daysRemaining} days left`
                            : `Ended on ${item.formattedEndDate}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
