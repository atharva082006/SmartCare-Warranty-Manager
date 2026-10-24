import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiArrowRight,
  FiInfo,
} from 'react-icons/fi';
import Card from '../common/Card/Card';
import Badge from '../common/Badge/Badge';
import Button from '../common/Button/Button';
import BarChart from './charts/BarChart';
import ProductHealthBreakdown from './ProductHealthBreakdown';
import Modal from '../common/Modal/Modal';
import {
  getHealthBadgeVariant,
  getHealthStatusLabel,
  getHealthCategoryDescription,
} from '../../utils/healthScoreUtils';
import './ProductHealthAnalyticsSection.css';

/**
 * Product Health Analytics Section.
 * Visualizes fleet-wide health scores, tier distributions (Excellent to Critical),
 * lowest-scoring items requiring attention, and highest-health assets.
 */
export default function ProductHealthAnalyticsSection({ data = {}, loading = false }) {
  const navigate = useNavigate();
  const [selectedProductAnalysis, setSelectedProductAnalysis] = useState(null);

  if (loading) {
    return (
      <Card title="Product Health Analytics" className="health-analytics-card">
        <div className="kpi-skeleton-line long" />
      </Card>
    );
  }

  const {
    averageScore = 100,
    distribution = { labels: [], counts: [], percentages: [], total: 0 },
    lowestHealthProducts = [],
    highestHealthProducts = [],
  } = data;

  const avgVariant = getHealthBadgeVariant(averageScore);
  const avgLabel = getHealthStatusLabel(averageScore);
  const avgDesc = getHealthCategoryDescription(averageScore);

  // Health tier bar colors
  const tierColors = [
    '#28a745', // Excellent
    '#007bff', // Good
    '#ffc107', // Fair
    '#fd7e14', // Poor
    '#dc3545', // Critical
  ];

  return (
    <Card
      id="section-health"
      title="Fleet Health Score Analytics"
      subtitle={`Transparent 0–100 deterministic scoring evaluating age, repair history, cost ratio, and warranty coverage`}
      className="health-analytics-card"
      actions={
        <Button
          variant="ghost"
          size="sm"
          icon={FiArrowRight}
          onClick={() => navigate('/health')}
        >
          Detailed Health View
        </Button>
      }
    >
      <div className="health-analytics-grid">
        {/* Left Column: Average Health Dial & Tier Distribution */}
        <div className="health-left-col">
          {/* Average Gauge Hero */}
          <div className="health-hero-panel">
            <div className={`health-dial-box dial-${avgVariant}`}>
              <span className="health-dial-val">{averageScore}</span>
              <span className="health-dial-sub">/ 100</span>
            </div>
            <div className="health-hero-info">
              <div className="health-hero-status-row">
                <span className="hero-title">Average Fleet Health</span>
                <Badge variant={avgVariant} size="md">
                  {avgLabel}
                </Badge>
              </div>
              <p className="hero-desc">{avgDesc}</p>
              <span className="hero-subtext">
                Evaluated across {distribution.total || 0} registered appliance{distribution.total === 1 ? '' : 's'}.
              </span>
            </div>
          </div>

          {/* Health Tier Distribution */}
          <div className="health-tiers-chart-block">
            <h4 className="analytics-subheading">
              <FiActivity /> Score Tier Distribution
            </h4>
            <BarChart
              labels={distribution.labels}
              values={distribution.counts}
              colors={tierColors}
              height={180}
              layout="horizontal"
              emptyMessage="No product health data available."
            />
          </div>
        </div>

        {/* Right Column: Attention Products (Lowest) & Healthy Products (Highest) */}
        <div className="health-right-col">
          {/* Products Requiring Attention */}
          <div className="health-sublist-block">
            <div className="sublist-header">
              <h4 className="analytics-subheading sublist-attention-title">
                <FiAlertTriangle /> Products Requiring Attention (Lowest Scores)
              </h4>
              <span className="sublist-caption">Priority maintenance candidates</span>
            </div>

            <div className="health-products-list">
              {lowestHealthProducts.length === 0 ? (
                <p className="health-empty-msg">No products in critical or poor condition.</p>
              ) : (
                lowestHealthProducts.map((item) => {
                  const itemVariant = getHealthBadgeVariant(item.score);
                  const itemLabel = getHealthStatusLabel(item.score);

                  return (
                    <div key={item.id} className="health-product-row">
                      <div className="hp-row-main">
                        <button
                          type="button"
                          className="hp-name-link"
                          onClick={() => navigate(`/products/${item.id}`)}
                        >
                          {item.name}
                        </button>
                        <span className="hp-meta">
                          {item.brand} • {item.category}
                        </span>
                        <span className="hp-reason" title={item.primaryReason}>
                          {item.primaryReason}
                        </span>
                      </div>
                      <div className="hp-row-score">
                        <div className="hp-score-badge-wrap">
                          <span className="hp-score-num">{item.score}/100</span>
                          <Badge variant={itemVariant} size="sm">
                            {itemLabel}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          className="hp-breakdown-btn"
                          onClick={() => setSelectedProductAnalysis(item)}
                          title="View transparent health calculation breakdown"
                        >
                          <FiInfo /> Factors
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Highest Health Products */}
          <div className="health-sublist-block mt-4">
            <div className="sublist-header">
              <h4 className="analytics-subheading sublist-healthy-title">
                <FiCheckCircle /> Highest Health Appliances
              </h4>
              <span className="sublist-caption">Fully protected & optimal assets</span>
            </div>

            <div className="health-products-list">
              {highestHealthProducts.length === 0 ? (
                <p className="health-empty-msg">No products catalogued.</p>
              ) : (
                highestHealthProducts.map((item) => {
                  const itemVariant = getHealthBadgeVariant(item.score);
                  const itemLabel = getHealthStatusLabel(item.score);

                  return (
                    <div key={item.id} className="health-product-row">
                      <div className="hp-row-main">
                        <button
                          type="button"
                          className="hp-name-link"
                          onClick={() => navigate(`/products/${item.id}`)}
                        >
                          {item.name}
                        </button>
                        <span className="hp-meta">
                          {item.brand} • {item.category}
                        </span>
                      </div>
                      <div className="hp-row-score">
                        <div className="hp-score-badge-wrap">
                          <span className="hp-score-num">{item.score}/100</span>
                          <Badge variant={itemVariant} size="sm">
                            {itemLabel}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Health Breakdown Modal */}
      {selectedProductAnalysis && (
        <Modal
          isOpen={Boolean(selectedProductAnalysis)}
          onClose={() => setSelectedProductAnalysis(null)}
          title={`Health Score Breakdown: ${selectedProductAnalysis.name}`}
          size="lg"
        >
          <ProductHealthBreakdown
            analysis={selectedProductAnalysis}
            productName={selectedProductAnalysis.name}
            showActions={true}
          />
        </Modal>
      )}
    </Card>
  );
}
