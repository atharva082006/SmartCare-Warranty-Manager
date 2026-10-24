import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus,
  FiCamera,
  FiBox,
  FiShield,
  FiAlertTriangle,
  FiDollarSign,
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { analyticsService } from '../services/analyticsService';
import PageHeader from '../components/common/PageHeader/PageHeader';
import Card from '../components/common/Card/Card';
import Button from '../components/common/Button/Button';
import Badge from '../components/common/Badge/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import ErrorState from '../components/common/ErrorState/ErrorState';
import './DashboardPreview.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Unable to load dashboard data. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'User';

  return (
    <div className="dashboard-page">
      <PageHeader
        title={`Good morning, ${firstName}`}
        subtitle="Here's what's happening with your products, warranties, and maintenance records."
        actions={
          <div className="dashboard-quick-actions">
            <Button
              variant="outline"
              size="sm"
              icon={FiCamera}
              onClick={() => navigate('/ocr')}
            >
              Scan Invoice
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={FiPlus}
              onClick={() => navigate('/products/new')}
            >
              Add Product
            </Button>
          </div>
        }
      />

      {loading ? (
        <Card className="dashboard-loading-card">
          <LoadingSpinner text="Fetching real-time metrics from SmartCare service layer..." />
        </Card>
      ) : error ? (
        <ErrorState
          title="Dashboard Unavailable"
          message={error}
          onRetry={loadDashboardData}
          retryLabel="Retry"
        />
      ) : (
        <>
          {/* Top KPI Cards (Dynamically computed from Services) */}
          <div className="dashboard-kpi-grid">
            <Card className="kpi-card" hoverable onClick={() => navigate('/products')}>
              <div className="kpi-content">
                <div className="kpi-icon-wrapper kpi-primary">
                  <FiBox />
                </div>
                <div className="kpi-details">
                  <span className="kpi-label">Total Products</span>
                  <div className="kpi-value-row">
                    <span className="kpi-value">{summary?.totalProducts || 0}</span>
                    <Badge variant="primary" size="sm">Catalogued</Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="kpi-card" hoverable onClick={() => navigate('/warranties')}>
              <div className="kpi-content">
                <div className="kpi-icon-wrapper kpi-success">
                  <FiShield />
                </div>
                <div className="kpi-details">
                  <span className="kpi-label">Active Warranties</span>
                  <div className="kpi-value-row">
                    <span className="kpi-value">{summary?.activeWarranties || 0}</span>
                    <Badge variant="success" size="sm" dot>Protected</Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="kpi-card" hoverable onClick={() => navigate('/warranties')}>
              <div className="kpi-content">
                <div className="kpi-icon-wrapper kpi-warning">
                  <FiAlertTriangle />
                </div>
                <div className="kpi-details">
                  <span className="kpi-label">Expiring Soon</span>
                  <div className="kpi-value-row">
                    <span className="kpi-value">{summary?.expiringSoon || 0}</span>
                    <Badge variant="warning" size="sm">Within 30 days</Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="kpi-card" hoverable onClick={() => navigate('/services')}>
              <div className="kpi-content">
                <div className="kpi-icon-wrapper kpi-danger">
                  <FiDollarSign />
                </div>
                <div className="kpi-details">
                  <span className="kpi-label">Total Service Cost</span>
                  <div className="kpi-value-row">
                    <span className="kpi-value">{summary?.formattedTotalServiceCost || '₹0'}</span>
                    <span className="kpi-subtext">Cumulative maintenance</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Activity & Expiries Two-Column Summary */}
          <div className="dashboard-summary-split">
            {/* Upcoming Expiries Preview */}
            <Card
              title="Upcoming Warranty Expiries"
              subtitle="Appliances requiring attention or renewal"
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate('/warranties')}>
                  View All
                </Button>
              }
            >
              {summary?.upcomingExpiries && summary.upcomingExpiries.length > 0 ? (
                <div className="dashboard-list-items">
                  {summary.upcomingExpiries.map((item) => (
                    <div key={item.id} className="dashboard-list-row">
                      <div className="list-row-main">
                        <span className="list-item-title">{item.productName}</span>
                        <span className="list-item-subtitle">{item.brand} • {item.provider}</span>
                      </div>
                      <div className="list-row-meta">
                        <Badge
                          variant={item.daysRemaining <= 30 ? 'warning' : 'primary'}
                          size="sm"
                          dot
                        >
                          {item.daysRemaining > 0 ? `${item.daysRemaining} days left` : 'Expired'}
                        </Badge>
                        <span className="list-item-date">{item.formattedEndDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-subtext">No warranties expiring soon.</p>
              )}
            </Card>

            {/* Recent Service History Preview */}
            <Card
              title="Recent Service Activity"
              subtitle="Latest maintenance visits and inspections"
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate('/services')}>
                  View All
                </Button>
              }
            >
              {summary?.recentActivity && summary.recentActivity.length > 0 ? (
                <div className="dashboard-list-items">
                  {summary.recentActivity.map((activity) => (
                    <div key={activity.id} className="dashboard-list-row">
                      <div className="list-row-main">
                        <span className="list-item-title">{activity.productName}</span>
                        <span className="list-item-subtitle">{activity.serviceType} • {activity.provider}</span>
                      </div>
                      <div className="list-row-meta">
                        <span className="list-item-cost">{activity.formattedCost}</span>
                        <span className="list-item-date">{activity.formattedDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-subtext">No recent service records recorded.</p>
              )}
            </Card>
          </div>

          {/* Architecture Status Callout Card */}
          <Card
            title="SmartCare Frontend Architecture Milestone Status"
            subtitle="Milestone 3: Mock Data + Service Layer Active"
            className="status-summary-card"
          >
            <div className="status-summary-content">
              <p>
                Connected to <strong>SmartCare Service Layer</strong>. Average Fleet Health Score is{' '}
                <strong>{summary?.averageHealthScore || 100}/100</strong> across{' '}
                <strong>{summary?.totalProducts || 0} registered appliances</strong>.
              </p>
              <div className="feature-badges-list">
                <Badge variant="success" dot>productService: Active</Badge>
                <Badge variant="success" dot>warrantyService: Active</Badge>
                <Badge variant="success" dot>serviceRecordService: Active</Badge>
                <Badge variant="success" dot>documentService: Active</Badge>
                <Badge variant="success" dot>notificationService: Active</Badge>
                <Badge variant="success" dot>recommendationService: Active</Badge>
                <Badge variant="success" dot>analyticsService: Active</Badge>
                <Badge variant="success" dot>qrService: Active</Badge>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
