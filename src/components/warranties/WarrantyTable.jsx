import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';
import Badge from '../common/Badge/Badge';
import { formatDate } from '../../utils/formatters.js';
import {
  getWarrantyBadgeVariant,
  getWarrantyStatusLabel,
  formatExpiryCountdown,
} from '../../utils/warrantyUtils.js';
import './WarrantyTable.css';

export default function WarrantyTable({
  warranties = [],
  onEditWarranty,
  onDeleteWarranty,
}) {
  const navigate = useNavigate();

  if (!warranties || warranties.length === 0) {
    return null;
  }

  return (
    <div className="warranty-table-wrapper">
      {/* Desktop Table */}
      <table className="warranty-table">
        <thead>
          <tr>
            <th className="th-product">Product</th>
            <th className="th-type">Warranty Type</th>
            <th className="th-provider">Provider</th>
            <th className="th-start">Start Date</th>
            <th className="th-expiry">Expiry Date</th>
            <th className="th-countdown">Days Remaining</th>
            <th className="th-status">Status</th>
            <th className="th-actions text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {warranties.map((item) => {
            const product = item.product;
            const status = item.status;
            const badgeVariant = getWarrantyBadgeVariant(status);
            const statusLabel = getWarrantyStatusLabel(status);
            const countdownText = formatExpiryCountdown(item.endDate);

            return (
              <tr key={item.id} className="warranty-row">
                {/* Product Column */}
                <td className="td-product">
                  <div className="product-identity">
                    <button
                      type="button"
                      className="product-name-btn"
                      onClick={() => navigate(`/warranties/${item.id}`)}
                      title={`View warranty for ${product?.name || item.id}`}
                    >
                      {product?.name || 'Registered Product'}
                    </button>
                    <div className="product-sub-ids">
                      <span className="product-id-tag">
                        {product?.productId || item.productId}
                      </span>
                      {product?.brand && (
                        <span className="product-brand-tag">{product.brand}</span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Warranty Type Column */}
                <td className="td-type">
                  <span className="warranty-type-pill" title={item.type}>
                    {item.type}
                  </span>
                </td>

                {/* Provider Column */}
                <td className="td-provider">
                  <span className="provider-text">{item.provider}</span>
                </td>

                {/* Start Date Column */}
                <td className="td-start">
                  <span className="date-cell-text">{formatDate(item.startDate)}</span>
                </td>

                {/* Expiry Date Column */}
                <td className="td-expiry">
                  <span className="date-cell-text bold">{formatDate(item.endDate)}</span>
                </td>

                {/* Days Remaining Countdown Column */}
                <td className="td-countdown">
                  <span
                    className={`countdown-pill ${
                      status === 'expiringSoon'
                        ? 'countdown-urgent'
                        : status === 'expired'
                        ? 'countdown-expired'
                        : 'countdown-active'
                    }`}
                  >
                    {countdownText}
                  </span>
                </td>

                {/* Status Column */}
                <td className="td-status">
                  <Badge variant={badgeVariant} size="sm" dot>
                    {statusLabel}
                  </Badge>
                </td>

                {/* Actions Column */}
                <td className="td-actions text-right">
                  <div className="action-buttons-group">
                    <button
                      type="button"
                      className="table-action-btn view-btn"
                      onClick={() => navigate(`/warranties/${item.id}`)}
                      title="View Details"
                      aria-label={`View warranty details for ${product?.name || item.id}`}
                    >
                      <FiEye />
                    </button>
                    <button
                      type="button"
                      className="table-action-btn edit-btn"
                      onClick={() => onEditWarranty && onEditWarranty(item)}
                      title="Edit Warranty"
                      aria-label="Edit Warranty"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      className="table-action-btn delete-btn"
                      onClick={() => onDeleteWarranty && onDeleteWarranty(item)}
                      title="Delete Warranty"
                      aria-label="Delete Warranty"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile Cards View (<640px) */}
      <div className="mobile-warranty-cards">
        {warranties.map((item) => {
          const product = item.product;
          const status = item.status;
          const badgeVariant = getWarrantyBadgeVariant(status);
          const statusLabel = getWarrantyStatusLabel(status);
          const countdownText = formatExpiryCountdown(item.endDate);

          return (
            <div key={item.id} className="mobile-warranty-card">
              <div className="card-top-header">
                <div className="card-title-group">
                  <h3
                    className="mobile-card-title"
                    onClick={() => navigate(`/warranties/${item.id}`)}
                  >
                    {product?.name || 'Registered Product'}
                  </h3>
                  <div className="mobile-card-subtitle">
                    <span>{product?.brand || 'Brand'}</span>
                    <span>•</span>
                    <span className="warranty-type-pill-sm">{item.type}</span>
                  </div>
                </div>
                <Badge variant={badgeVariant} size="sm" dot>
                  {statusLabel}
                </Badge>
              </div>

              <div className="mobile-card-meta-grid">
                <div className="meta-box">
                  <span className="meta-label">Provider</span>
                  <span className="meta-val">{item.provider}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Product ID</span>
                  <span className="meta-val">{product?.productId || item.productId}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Starts</span>
                  <span className="meta-val">{formatDate(item.startDate)}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Expires</span>
                  <span className="meta-val expiry-val">{formatDate(item.endDate)}</span>
                </div>
              </div>

              <div className="mobile-countdown-row">
                <span className="meta-label">Protection Time:</span>
                <span
                  className={`countdown-pill ${
                    status === 'expiringSoon'
                      ? 'countdown-urgent'
                      : status === 'expired'
                      ? 'countdown-expired'
                      : 'countdown-active'
                  }`}
                >
                  {countdownText}
                </span>
              </div>

              <div className="mobile-card-footer">
                <button
                  type="button"
                  className="mobile-action-btn view-action"
                  onClick={() => navigate(`/warranties/${item.id}`)}
                >
                  <FiEye /> View Details
                </button>
                <button
                  type="button"
                  className="mobile-action-btn edit-action"
                  onClick={() => onEditWarranty && onEditWarranty(item)}
                >
                  <FiEdit2 /> Edit
                </button>
                <button
                  type="button"
                  className="mobile-action-btn delete-action"
                  onClick={() => onDeleteWarranty && onDeleteWarranty(item)}
                >
                  <FiTrash2 /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
