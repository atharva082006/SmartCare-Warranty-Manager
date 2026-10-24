import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiZap,
  FiArrowRight,
} from 'react-icons/fi';
import Badge from '../common/Badge/Badge';
import {
  getHealthBadgeVariant,
  getHealthStatusLabel,
  getHealthCategoryDescription,
} from '../../utils/healthScoreUtils';
import './ProductHealthBreakdown.css';

/**
 * Reusable Product Health Score & Breakdown Component.
 * Displays overall score gauge, health status, positive factors (✓),
 * transparent deductions (⚠), and deterministic recommendations (→).
 * Can be used in ProductDetailPage, Analytics deep dives, or modals.
 */
export default function ProductHealthBreakdown({ analysis, productName, showActions = true }) {
  const navigate = useNavigate();

  if (!analysis) return null;

  const {
    score = 100,
    statusLabel = 'Excellent',
    baseScore = 100,
    deductions = [],
    positiveFactors = [],
    recommendations = [],
  } = analysis;

  const variant = getHealthBadgeVariant(score);
  const description = getHealthCategoryDescription(score);

  return (
    <div className="product-health-breakdown-wrapper">
      {/* Top Score Gauge Header */}
      <div className="health-gauge-header">
        <div className={`health-score-dial dial-${variant}`}>
          <span className="dial-number">{score}</span>
          <span className="dial-total">/ 100</span>
        </div>
        <div className="health-gauge-details">
          <div className="gauge-status-row">
            <span className="gauge-product-title">{productName || 'Appliance Health'}</span>
            <Badge variant={variant} size="md">
              {statusLabel} Condition
            </Badge>
          </div>
          <p className="gauge-description">{description}</p>
          <div className="health-progress-track">
            <div
              className={`health-progress-fill fill-${variant}`}
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Transparent Breakdown Columns: Positive vs Deductions */}
      <div className="breakdown-factors-grid">
        {/* Positive Factors */}
        <div className="factors-column factors-positive">
          <h5 className="factors-col-title">
            <FiCheckCircle className="factors-icon-green" /> Positive Safeguards
          </h5>
          {positiveFactors && positiveFactors.length > 0 ? (
            <ul className="factors-list">
              {positiveFactors.map((pf, idx) => (
                <li key={idx} className="factor-item item-positive">
                  <span className="factor-bullet">✓</span>
                  <div className="factor-text-wrap">
                    <strong className="factor-name">{pf.factor}</strong>
                    <span className="factor-desc">{pf.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="factors-empty-text">No active positive safeguards recorded.</p>
          )}
        </div>

        {/* Deductions Applied */}
        <div className="factors-column factors-deductions">
          <h5 className="factors-col-title">
            <FiAlertTriangle className="factors-icon-amber" /> Deductions Applied
          </h5>
          {deductions && deductions.length > 0 ? (
            <ul className="factors-list">
              {deductions.map((d, idx) => (
                <li key={idx} className="factor-item item-deduction">
                  <span className="factor-bullet">⚠</span>
                  <div className="factor-text-wrap">
                    <div className="factor-name-row">
                      <strong className="factor-name">{d.factor}</strong>
                      <span className="factor-deduction-badge">{d.points} pts</span>
                    </div>
                    <span className="factor-desc">{d.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="zero-deductions-notice">
              <FiCheckCircle /> Zero deductions applied! Starting base: {baseScore} pts.
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Column */}
      {recommendations && recommendations.length > 0 && (
        <div className="health-recommendations-box">
          <h5 className="recs-heading">
            <FiZap className="recs-zap-icon" /> Tailored Action Recommendations
          </h5>
          <div className="recs-cards-list">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="rec-action-card">
                <div className="rec-action-info">
                  <strong className="rec-action-title">{rec.title}</strong>
                  <p className="rec-action-msg">{rec.message}</p>
                </div>
                {showActions && rec.actionLink && (
                  <button
                    type="button"
                    className="rec-action-btn"
                    onClick={() => navigate(rec.actionLink)}
                  >
                    {rec.actionText || 'Take Action'} <FiArrowRight />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
