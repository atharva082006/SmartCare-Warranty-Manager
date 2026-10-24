import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiSearch,
  FiInfo,
  FiShield,
  FiTool,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader/PageHeader';
import Card from '../components/common/Card/Card';
import Badge from '../components/common/Badge/Badge';
import Button from '../components/common/Button/Button';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import ErrorState from '../components/common/ErrorState/ErrorState';
import ProductHealthBreakdown from '../components/analytics/ProductHealthBreakdown';
import BarChart from '../components/analytics/charts/BarChart';

import { analyticsService } from '../services/analyticsService';
import {
  getHealthBadgeVariant,
  getHealthStatusLabel,
  getHealthCategoryDescription,
} from '../utils/healthScoreUtils';

import './HealthScorePage.css';

/**
 * Health Score Page.
 * Dedicated deep-dive into the SmartCare deterministic health scoring methodology,
 * fleet score distributions, and interactive itemized health breakdowns for all registered products.
 */
export default function HealthScorePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('all');
  const [expandedProductId, setExpandedProductId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getProductHealthAnalytics();
      setHealthData(data);
    } catch (err) {
      console.error('Failed to load health scores:', err);
      setError(err?.message || 'Failed to compute product health metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allProducts = healthData?.allProductsHealth || [];

  // Filter products by search and status tier
  const filteredProducts = allProducts.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === '' ||
      String(p.name ?? '').toLowerCase().includes(q) ||
      String(p.brand ?? '').toLowerCase().includes(q) ||
      String(p.category ?? '').toLowerCase().includes(q) ||
      String(p.id ?? '').toLowerCase().includes(q) ||
      String(p.productId ?? p.product_code ?? '').toLowerCase().includes(q);

    const matchesTier = selectedTier === 'all' || p.status === selectedTier;

    return matchesSearch && matchesTier;
  });

  const toggleExpand = (id) => {
    setExpandedProductId((prev) => (prev === id ? null : id));
  };

  const avgScore = healthData?.averageScore ?? 100;
  const avgVariant = getHealthBadgeVariant(avgScore);
  const avgLabel = getHealthStatusLabel(avgScore);

  const tierColors = ['#28a745', '#007bff', '#ffc107', '#fd7e14', '#dc3545'];

  return (
    <div className="health-score-page">
      <PageHeader
        title="Product Health Scores"
        subtitle="Transparent 0–100 deterministic reliability index evaluating age, component repairs, and warranty protection."
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={FiActivity}
            onClick={() => navigate('/analytics')}
          >
            All Analytics
          </Button>
        }
      />

      {loading ? (
        <Card className="health-loading-card">
          <LoadingSpinner text="Computing product health metrics across your catalog..." />
        </Card>
      ) : error ? (
        <ErrorState
          title="Health Scores Unavailable"
          message={error}
          onRetry={loadData}
        />
      ) : (
        <>
          {/* Top Overview & Methodology Row */}
          <div className="health-top-grid">
            {/* Average Fleet Health Card */}
            <Card title="Fleet Average Health" className="health-avg-card">
              <div className="health-avg-inner">
                <div className={`health-dial dial-${avgVariant}`}>
                  <span className="health-dial-score">{avgScore}</span>
                  <span className="health-dial-max">/ 100</span>
                </div>
                <div className="health-avg-text">
                  <div className="health-badge-row">
                    <span className="health-avg-title">Overall Portfolio Status</span>
                    <Badge variant={avgVariant} size="md">
                      {avgLabel}
                    </Badge>
                  </div>
                  <p className="health-avg-desc">{getHealthCategoryDescription(avgScore)}</p>
                  <span className="health-avg-total">
                    Computed across {allProducts.length} registered products
                  </span>
                </div>
              </div>
            </Card>

            {/* Transparent Scoring Methodology Card */}
            <Card title="Scoring Methodology" className="health-method-card">
              <div className="methodology-factors-list">
                <div className="method-factor-row">
                  <span className="method-badge base">Base Score</span>
                  <span className="method-pts">100 pts</span>
                  <span className="method-explanation">Starting reliability baseline for newly added assets</span>
                </div>
                <div className="method-factor-row">
                  <span className="method-badge deduction">Age Factor</span>
                  <span className="method-pts">-4 pts / yr</span>
                  <span className="method-explanation">Calculated from purchase date (max deduction: 25 pts)</span>
                </div>
                <div className="method-factor-row">
                  <span className="method-badge deduction">Repairs</span>
                  <span className="method-pts">-6 pts / visit</span>
                  <span className="method-explanation">Corrective part replacements or breakdowns (max: 30 pts)</span>
                </div>
                <div className="method-factor-row">
                  <span className="method-badge deduction">Cost Ratio</span>
                  <span className="method-pts">-10 to -25 pts</span>
                  <span className="method-explanation">Service spend exceeds 10% (-10) or 25% (-25) of purchase price</span>
                </div>
                <div className="method-factor-row">
                  <span className="method-badge deduction">Warranty Status</span>
                  <span className="method-pts">-5 to -15 pts</span>
                  <span className="method-explanation">Expiring soon (-5 pts) or expired warranty coverage (-15 pts)</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Tier Distribution Card */}
          <Card title="Health Tier Distribution" className="health-distribution-card">
            <BarChart
              labels={healthData?.distribution?.labels || []}
              values={healthData?.distribution?.counts || []}
              colors={tierColors}
              height={180}
              layout="horizontal"
              emptyMessage="No health distribution available."
            />
          </Card>

          {/* Product Health Breakdown Inventory List */}
          <Card
            title="Appliance Health Scores"
            subtitle={`Showing ${filteredProducts.length} of ${allProducts.length} registered appliances`}
            className="health-inventory-card"
          >
            {/* Filter and Search Bar */}
            <div className="health-inventory-controls">
              <div className="health-search-wrap">
                <FiSearch className="health-search-icon" />
                <input
                  type="text"
                  placeholder="Search by product, brand, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="health-search-input"
                />
              </div>

              <div className="health-tier-filter-wrap">
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="health-tier-select"
                >
                  <option value="all">All Tiers</option>
                  <option value="excellent">Excellent (80–100)</option>
                  <option value="good">Good (60–79)</option>
                  <option value="fair">Fair (40–59)</option>
                  <option value="poor">Poor (20–39)</option>
                  <option value="critical">Critical (0–19)</option>
                </select>
              </div>
            </div>

            {/* Product Health Rows */}
            {filteredProducts.length === 0 ? (
              <div className="health-empty-search">
                <p>No products match your search or tier filter.</p>
              </div>
            ) : (
              <div className="health-rows-list">
                {filteredProducts.map((item) => {
                  const isExpanded = expandedProductId === item.id;
                  const itemVariant = getHealthBadgeVariant(item.score);
                  const itemLabel = getHealthStatusLabel(item.score);

                  return (
                    <div key={item.id} className="health-accordion-card">
                      <div
                        className="health-row-header"
                        onClick={() => toggleExpand(item.id)}
                      >
                        <div className="health-row-info">
                          <strong className="health-prod-title">{item.name}</strong>
                          <span className="health-prod-meta">
                            {item.brand} • {item.category} • Model: {item.modelNumber || 'N/A'}
                          </span>
                        </div>

                        <div className="health-row-metrics">
                          <div className="health-score-cell">
                            <span className="health-score-val">{item.score}/100</span>
                            <Badge variant={itemVariant} size="sm">
                              {itemLabel}
                            </Badge>
                          </div>
                          <button
                            type="button"
                            className="health-toggle-btn"
                            aria-label={isExpanded ? 'Collapse breakdown' : 'Expand breakdown'}
                          >
                            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Breakdown Drawer */}
                      {isExpanded && (
                        <div className="health-drawer-content">
                          <ProductHealthBreakdown
                            analysis={item}
                            productName={item.name}
                            showActions={true}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
