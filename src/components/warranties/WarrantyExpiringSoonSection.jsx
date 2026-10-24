import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import Card from '../common/Card/Card';
import Badge from '../common/Badge/Badge';
import Button from '../common/Button/Button';
import { formatDate } from '../../utils/formatters.js';
import { formatExpiryCountdown } from '../../utils/warrantyUtils.js';
import './WarrantyExpiringSoonSection.css';

export default function WarrantyExpiringSoonSection({ expiringWarranties = [] }) {
  const navigate = useNavigate();

  if (!expiringWarranties || expiringWarranties.length === 0) {
    return (
      <Card className="expiring-section-card empty-expiring-card">
        <div className="empty-expiring-content">
          <FiCheckCircle className="empty-check-icon" />
          <div className="empty-expiring-text">
            <h4 className="empty-expiring-title">No warranties are expiring soon</h4>
            <p className="empty-expiring-desc">
              All active warranties have more than 30 days of coverage remaining.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="expiring-section-card">
      <div className="expiring-section-header">
        <div className="expiring-header-left">
          <div className="alert-badge-icon">
            <FiAlertTriangle />
          </div>
          <div>
            <h3 className="expiring-section-title">Expiring Soon (Next 30 Days)</h3>
            <p className="expiring-section-subtitle">
              {expiringWarranties.length} product{expiringWarranties.length === 1 ? '' : 's'} require renewal, extension, or AMC coverage
            </p>
          </div>
        </div>
      </div>

      <div className="expiring-cards-grid">
        {expiringWarranties.map((item) => {
          const product = item.product;
          return (
            <div key={item.id} className="expiring-item-card">
              <div className="expiring-card-top">
                <div className="expiring-prod-info">
                  <h4
                    className="expiring-prod-name"
                    onClick={() => navigate(`/warranties/${item.id}`)}
                  >
                    {product?.name || 'Registered Appliance'}
                  </h4>
                  <span className="expiring-brand-text">
                    {product?.brand || 'Brand'} • {item.type}
                  </span>
                </div>
                <Badge variant="warning" size="sm" dot>
                  Expiring Soon
                </Badge>
              </div>

              <div className="expiring-card-dates">
                <div className="expiring-date-row">
                  <span className="exp-label">Expires On:</span>
                  <span className="exp-val">{formatDate(item.endDate)}</span>
                </div>
                <div className="expiring-countdown-tag">
                  {formatExpiryCountdown(item.endDate)}
                </div>
              </div>

              <div className="expiring-card-action">
                <Button
                  variant="outline"
                  size="sm"
                  iconRight={FiArrowRight}
                  onClick={() => navigate(`/warranties/${item.id}`)}
                  block
                >
                  View Details & Renew
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
