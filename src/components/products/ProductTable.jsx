import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiEye,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi';
import Badge from '../common/Badge/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import {
  getWarrantyBadgeVariant,
  getWarrantyStatusLabel,
} from '../../utils/warrantyUtils.js';
import {
  getHealthBadgeVariant,
  getHealthStatusLabel,
} from '../../utils/healthScoreUtils.js';
import './ProductTable.css';

export default function ProductTable({
  products = [],
  onEditProduct,
  onDeleteProduct,
}) {
  const navigate = useNavigate();

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="product-table-wrapper">
      {/* Desktop Table View */}
      <table className="product-table">
        <thead>
          <tr>
            <th className="th-product">Product</th>
            <th className="th-brand">Brand & Model</th>
            <th className="th-category">Category</th>
            <th className="th-purchase">Purchase</th>
            <th className="th-warranty">Warranty Status</th>
            <th className="th-health">Health Score</th>
            <th className="th-actions text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((item) => {
            const warranty = item.warranty;
            const warrantyStatus = warranty?.status || 'expired';
            const warrantyBadgeVariant = getWarrantyBadgeVariant(warrantyStatus);
            const warrantyLabel = getWarrantyStatusLabel(warrantyStatus);

            const healthScore = item.healthScore ?? 100;
            const healthVariant = getHealthBadgeVariant(healthScore);
            const healthLabel = getHealthStatusLabel(healthScore);

            return (
              <tr key={item.id} className="product-row">
                {/* Product Column */}
                <td className="td-product">
                  <div className="product-identity">
                    <button
                      type="button"
                      className="product-name-btn"
                      onClick={() => navigate(`/products/${item.id}`)}
                      title={`View ${item.name}`}
                    >
                      {item.name}
                    </button>
                    <div className="product-sub-ids">
                      <span className="product-id-tag">{item.productId || item.id}</span>
                      {item.serialNumber && (
                        <span className="product-serial-tag" title="Serial Number">
                          SN: {item.serialNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Brand & Model Column */}
                <td className="td-brand">
                  <div className="brand-model-cell">
                    <span className="brand-text">{item.brand}</span>
                    <span className="model-text">{item.modelNumber || '—'}</span>
                  </div>
                </td>

                {/* Category Column */}
                <td className="td-category">
                  <span className="category-pill">{item.category}</span>
                </td>

                {/* Purchase Column */}
                <td className="td-purchase">
                  <div className="purchase-cell">
                    <span className="purchase-price">{formatCurrency(item.purchasePrice)}</span>
                    <span className="purchase-date">{formatDate(item.purchaseDate)}</span>
                  </div>
                </td>

                {/* Warranty Column */}
                <td className="td-warranty">
                  <div className="warranty-cell">
                    <Badge variant={warrantyBadgeVariant} size="sm" dot>
                      {warrantyLabel}
                    </Badge>
                    {warranty?.daysRemaining !== undefined && (
                      <span className="warranty-days-text">
                        {warranty.daysRemaining > 0
                          ? `${warranty.daysRemaining} days left`
                          : 'Expired'}
                      </span>
                    )}
                  </div>
                </td>

                {/* Health Score Column */}
                <td className="td-health">
                  <div className="health-cell">
                    <div className="health-score-header">
                      <span className="health-number">{healthScore}/100</span>
                      <Badge variant={healthVariant} size="sm">
                        {healthLabel}
                      </Badge>
                    </div>
                    <div className="health-bar-track" title={`Health Score: ${healthScore}%`}>
                      <div
                        className={`health-bar-fill fill-${healthVariant}`}
                        style={{ width: `${Math.min(100, Math.max(0, healthScore))}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Actions Column */}
                <td className="td-actions text-right">
                  <div className="action-buttons-group">
                    <button
                      type="button"
                      className="table-action-btn view-btn"
                      onClick={() => navigate(`/products/${item.id}`)}
                      title="View Details"
                      aria-label={`View details of ${item.name}`}
                    >
                      <FiEye />
                    </button>
                    <button
                      type="button"
                      className="table-action-btn edit-btn"
                      onClick={() => onEditProduct && onEditProduct(item)}
                      title="Edit Product"
                      aria-label={`Edit ${item.name}`}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      className="table-action-btn delete-btn"
                      onClick={() => onDeleteProduct && onDeleteProduct(item)}
                      title="Delete Product"
                      aria-label={`Delete ${item.name}`}
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

      {/* Mobile Cards Transformation (<640px) */}
      <div className="mobile-product-cards">
        {products.map((item) => {
          const warranty = item.warranty;
          const warrantyStatus = warranty?.status || 'expired';
          const warrantyBadgeVariant = getWarrantyBadgeVariant(warrantyStatus);
          const warrantyLabel = getWarrantyStatusLabel(warrantyStatus);

          const healthScore = item.healthScore ?? 100;
          const healthVariant = getHealthBadgeVariant(healthScore);
          const healthLabel = getHealthStatusLabel(healthScore);

          return (
            <div key={item.id} className="mobile-product-card">
              <div className="card-top-header">
                <div className="card-title-group">
                  <h3
                    className="mobile-card-title"
                    onClick={() => navigate(`/products/${item.id}`)}
                  >
                    {item.name}
                  </h3>
                  <div className="mobile-card-subtitle">
                    <span>{item.brand}</span>
                    <span>•</span>
                    <span className="category-pill-sm">{item.category}</span>
                  </div>
                </div>
                <Badge variant={warrantyBadgeVariant} size="sm" dot>
                  {warrantyLabel}
                </Badge>
              </div>

              <div className="mobile-card-meta-grid">
                <div className="meta-box">
                  <span className="meta-label">Model</span>
                  <span className="meta-val">{item.modelNumber || '—'}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Serial</span>
                  <span className="meta-val">{item.serialNumber || '—'}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Purchased</span>
                  <span className="meta-val">{formatDate(item.purchaseDate)}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Price</span>
                  <span className="meta-val price-val">
                    {formatCurrency(item.purchasePrice)}
                  </span>
                </div>
              </div>

              <div className="mobile-card-health">
                <div className="mobile-health-row">
                  <span className="mobile-health-label">Health Score</span>
                  <div className="mobile-health-badge-group">
                    <span className="health-number">{healthScore}/100</span>
                    <Badge variant={healthVariant} size="sm">
                      {healthLabel}
                    </Badge>
                  </div>
                </div>
                <div className="health-bar-track">
                  <div
                    className={`health-bar-fill fill-${healthVariant}`}
                    style={{ width: `${Math.min(100, Math.max(0, healthScore))}%` }}
                  />
                </div>
              </div>

              <div className="mobile-card-footer">
                <button
                  type="button"
                  className="mobile-action-btn view-action"
                  onClick={() => navigate(`/products/${item.id}`)}
                >
                  <FiEye /> View Details
                </button>
                <button
                  type="button"
                  className="mobile-action-btn edit-action"
                  onClick={() => onEditProduct && onEditProduct(item)}
                >
                  <FiEdit2 /> Edit
                </button>
                <button
                  type="button"
                  className="mobile-action-btn delete-action"
                  onClick={() => onDeleteProduct && onDeleteProduct(item)}
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
