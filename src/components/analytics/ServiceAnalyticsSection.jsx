import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDollarSign, FiTool, FiTrendingUp, FiArrowRight } from 'react-icons/fi';
import Card from '../common/Card/Card';
import Badge from '../common/Badge/Badge';
import Button from '../common/Button/Button';
import TrendLineChart from './charts/TrendLineChart';
import BarChart from './charts/BarChart';
import './ServiceAnalyticsSection.css';

/**
 * Service Analytics Section.
 * Visualizes total spending, 12-month cost trend, service type breakdown,
 * status distribution, and most-serviced appliances.
 */
export default function ServiceAnalyticsSection({ data = {}, loading = false }) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('types'); // 'types' | 'statuses'

  if (loading) {
    return (
      <Card title="Service Analytics" className="service-analytics-card">
        <div className="kpi-skeleton-line long" />
      </Card>
    );
  }

  const {
    totalSpend = 0,
    formattedTotalSpend = '₹0',
    totalRecords = 0,
    averageCost = 0,
    formattedAverageCost = '₹0',
    monthlyTrend = { labels: [], values: [], formattedValues: [], hasData: false },
    serviceTypeDistribution = { labels: [], counts: [], costs: [], formattedCosts: [] },
    serviceStatusDistribution = { labels: [], counts: [] },
    mostServicedProducts = [],
  } = data;

  // Colors for service types
  const typeColors = ['#007bff', '#28a745', '#ffc107', '#17a2b8', '#6f42c1', '#fd7e14'];

  return (
    <Card
      id="section-services"
      title="Maintenance & Service Analytics"
      subtitle={`Cumulative spend of ${formattedTotalSpend} across ${totalRecords} maintenance visits`}
      className="service-analytics-card"
      actions={
        <Button
          variant="ghost"
          size="sm"
          icon={FiArrowRight}
          onClick={() => navigate('/service-records')}
        >
          View Service Records
        </Button>
      }
    >
      {/* Top Highlights Summary */}
      <div className="service-stats-summary-strip">
        <div className="service-stat-item">
          <span className="stat-label">Total Spend</span>
          <span className="stat-value">{formattedTotalSpend}</span>
        </div>
        <div className="service-stat-divider" />
        <div className="service-stat-item">
          <span className="stat-label">Average Visit Cost</span>
          <span className="stat-value">{formattedAverageCost}</span>
        </div>
        <div className="service-stat-divider" />
        <div className="service-stat-item">
          <span className="stat-label">Total Service Visits</span>
          <span className="stat-value">{totalRecords}</span>
        </div>
      </div>

      <div className="service-analytics-grid">
        {/* Left Column: Monthly Spending Trend */}
        <div className="service-trend-col">
          <div className="service-chart-header">
            <h4 className="analytics-subheading">
              <FiTrendingUp /> Monthly Spending Trend
            </h4>
            <span className="chart-header-sub">Past 12 Months</span>
          </div>

          <TrendLineChart
            labels={monthlyTrend.labels}
            values={monthlyTrend.values}
            formattedValues={monthlyTrend.formattedValues}
            strokeColor="#007bff"
            height={220}
            emptyMessage="Not enough service history to display a meaningful trend."
          />
        </div>

        {/* Right Column: Service Type or Status Breakdown */}
        <div className="service-breakdown-col">
          <div className="service-chart-header">
            <div className="service-switch-tabs">
              <button
                type="button"
                className={`switch-tab ${viewMode === 'types' ? 'active' : ''}`}
                onClick={() => setViewMode('types')}
              >
                Service Types
              </button>
              <button
                type="button"
                className={`switch-tab ${viewMode === 'statuses' ? 'active' : ''}`}
                onClick={() => setViewMode('statuses')}
              >
                Service Status
              </button>
            </div>
          </div>

          {viewMode === 'types' ? (
            <div className="service-breakdown-content">
              <BarChart
                labels={serviceTypeDistribution.labels}
                values={serviceTypeDistribution.counts}
                colors={typeColors}
                layout="horizontal"
                valuePrefix=""
                emptyMessage="No service types recorded."
              />
            </div>
          ) : (
            <div className="service-breakdown-content">
              <BarChart
                labels={serviceStatusDistribution.labels}
                values={serviceStatusDistribution.counts}
                colors={['#28a745', '#007bff', '#ffc107', '#dc3545']}
                layout="horizontal"
                valuePrefix=""
                emptyMessage="No service statuses recorded."
              />
            </div>
          )}
        </div>
      </div>

      {/* Most Serviced Products Bottom Row */}
      {mostServicedProducts.length > 0 && (
        <div className="most-serviced-section">
          <h4 className="analytics-subheading">
            <FiTool /> Most Serviced Products
          </h4>
          <div className="most-serviced-grid">
            {mostServicedProducts.map((p) => (
              <div
                key={p.id}
                className="most-serviced-card"
                onClick={() => navigate(`/products/${p.id}`)}
              >
                <div className="serviced-card-main">
                  <span className="serviced-prod-name">{p.productName}</span>
                  <span className="serviced-prod-brand">
                    {p.brand} • {p.category}
                  </span>
                </div>
                <div className="serviced-card-metrics">
                  <Badge variant="primary" size="sm">
                    {p.visitCount} visit{p.visitCount === 1 ? '' : 's'}
                  </Badge>
                  <span className="serviced-total-cost">{p.formattedTotalCost}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
