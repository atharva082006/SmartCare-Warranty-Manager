import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiAlertCircle,
  FiInfo,
  FiCheckCircle,
  FiArrowRight,
} from 'react-icons/fi';
import Card from '../common/Card/Card';
import Button from '../common/Button/Button';
import Badge from '../common/Badge/Badge';
import './AttentionRequiredSection.css';

/**
 * Actionable Attention Required / Insights Section.
 * Surfaces high-priority warnings (expiring warranties, expired items, repeated repairs, high spending, OCR needs)
 * with direct contextual links.
 */
export default function AttentionRequiredSection({ items = [], loading = false }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card
        title="Attention Required"
        subtitle="Actionable items identified across your appliances"
        className="attention-section-card"
      >
        <div className="attention-loading-skeleton">
          <div className="kpi-skeleton-line long" />
          <div className="kpi-skeleton-line short" />
        </div>
      </Card>
    );
  }

  const getSeverityIcon = (sev) => {
    switch (sev) {
      case 'danger':
        return <FiAlertCircle className="sev-icon icon-danger" />;
      case 'warning':
        return <FiAlertTriangle className="sev-icon icon-warning" />;
      case 'info':
      default:
        return <FiInfo className="sev-icon icon-info" />;
    }
  };

  const getBadgeVariant = (sev) => {
    switch (sev) {
      case 'danger':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'primary';
    }
  };

  return (
    <Card
      title="Attention Required"
      subtitle={`${items.length} actionable item${items.length === 1 ? '' : 's'} identified across your inventory`}
      className="attention-section-card"
    >
      {items.length === 0 ? (
        <div className="attention-empty-banner">
          <FiCheckCircle className="attention-clean-icon" />
          <div className="attention-empty-text">
            <strong>All systems optimal</strong>
            <p>No critical issues, expiring warranties, or elevated maintenance risks detected.</p>
          </div>
        </div>
      ) : (
        <div className="attention-items-list">
          {items.map((item) => (
            <div key={item.id} className={`attention-item-row severity-${item.severity}`}>
              <div className="attention-item-left">
                <div className="attention-icon-box">{getSeverityIcon(item.severity)}</div>
                <div className="attention-content-block">
                  <div className="attention-header-line">
                    <span className="attention-title">{item.title}</span>
                    <Badge variant={getBadgeVariant(item.severity)} size="sm">
                      {item.type.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="attention-message">{item.message}</p>
                </div>
              </div>
              <div className="attention-item-right">
                <Button
                  variant="outline"
                  size="sm"
                  icon={FiArrowRight}
                  onClick={() => navigate(item.actionLink)}
                >
                  {item.actionLabel || 'Inspect'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
