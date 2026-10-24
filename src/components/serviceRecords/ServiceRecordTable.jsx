import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';
import Badge from '../common/Badge/Badge';
import { formatDate, formatCurrency } from '../../utils/formatters.js';
import {
  getServiceStatusBadgeVariant,
  getServiceStatusLabel,
} from '../../utils/serviceRecordUtils.js';
import './ServiceRecordTable.css';

export default function ServiceRecordTable({
  serviceRecords = [],
  onEditRecord,
  onDeleteRecord,
}) {
  const navigate = useNavigate();

  if (!serviceRecords || serviceRecords.length === 0) {
    return null;
  }

  return (
    <div className="service-table-wrapper">
      {/* Desktop Semantic Table */}
      <table className="service-table">
        <thead>
          <tr>
            <th className="th-product">Product</th>
            <th className="th-type">Service Type</th>
            <th className="th-provider">Provider</th>
            <th className="th-date">Service Date</th>
            <th className="th-cost">Service Cost</th>
            <th className="th-status">Status</th>
            <th className="th-summary">Issue / Summary</th>
            <th className="th-actions text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {serviceRecords.map((item) => {
            const product = item.product;
            const status = item.status;
            const badgeVariant = getServiceStatusBadgeVariant(status);
            const statusLabel = getServiceStatusLabel(status);
            const summaryText =
              item.issueDescription || item.description || item.workPerformed || 'Routine service';

            return (
              <tr key={item.id} className="service-row">
                {/* Product Column */}
                <td className="td-product">
                  <div className="product-identity">
                    <button
                      type="button"
                      className="product-name-btn"
                      onClick={() => navigate(`/service-records/${item.id}`)}
                      title={`View service record ${item.id} for ${product?.name || item.productId}`}
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

                {/* Service Type Column */}
                <td className="td-type">
                  <span className="service-type-pill" title={item.serviceType}>
                    {item.serviceType}
                  </span>
                </td>

                {/* Provider Column */}
                <td className="td-provider">
                  <span className="provider-text" title={item.provider}>
                    {item.provider}
                  </span>
                </td>

                {/* Service Date Column */}
                <td className="td-date">
                  <span className="date-cell-text">{formatDate(item.serviceDate)}</span>
                </td>

                {/* Service Cost Column */}
                <td className="td-cost">
                  <span className={`cost-cell-text ${item.cost === 0 ? 'cost-free' : 'cost-paid'}`}>
                    {item.cost > 0 ? formatCurrency(item.cost) : '₹0 (Free)'}
                  </span>
                </td>

                {/* Status Column */}
                <td className="td-status">
                  <Badge variant={badgeVariant} size="sm" dot>
                    {statusLabel}
                  </Badge>
                </td>

                {/* Issue / Summary Column */}
                <td className="td-summary">
                  <span className="summary-cell-text" title={summaryText}>
                    {summaryText}
                  </span>
                </td>

                {/* Actions Column */}
                <td className="td-actions text-right">
                  <div className="action-buttons-group">
                    <button
                      type="button"
                      className="table-action-btn view-btn"
                      onClick={() => navigate(`/service-records/${item.id}`)}
                      title="View Details"
                      aria-label={`View details for record ${item.id}`}
                    >
                      <FiEye />
                    </button>
                    <button
                      type="button"
                      className="table-action-btn edit-btn"
                      onClick={() => onEditRecord && onEditRecord(item)}
                      title="Edit Service Record"
                      aria-label={`Edit service record ${item.id}`}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      className="table-action-btn delete-btn"
                      onClick={() => onDeleteRecord && onDeleteRecord(item)}
                      title="Delete Service Record"
                      aria-label={`Delete service record ${item.id}`}
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
      <div className="mobile-service-cards">
        {serviceRecords.map((item) => {
          const product = item.product;
          const status = item.status;
          const badgeVariant = getServiceStatusBadgeVariant(status);
          const statusLabel = getServiceStatusLabel(status);
          const summaryText =
            item.issueDescription || item.description || item.workPerformed || 'Routine service';

          return (
            <div key={item.id} className="mobile-service-card">
              <div className="card-top-header">
                <div className="card-title-group">
                  <h3
                    className="mobile-card-title"
                    onClick={() => navigate(`/service-records/${item.id}`)}
                  >
                    {product?.name || 'Registered Product'}
                  </h3>
                  <div className="mobile-card-subtitle">
                    <span>{product?.brand || 'Brand'}</span>
                    <span>•</span>
                    <span className="service-type-pill-sm">{item.serviceType}</span>
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
                  <span className="meta-label">Date</span>
                  <span className="meta-val">{formatDate(item.serviceDate)}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Cost</span>
                  <span className={`meta-val ${item.cost === 0 ? 'cost-free' : 'cost-paid'}`}>
                    {item.cost > 0 ? formatCurrency(item.cost) : '₹0 (Free)'}
                  </span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Record ID</span>
                  <span className="meta-val code-font">{item.id}</span>
                </div>
              </div>

              <div className="mobile-summary-row">
                <span className="meta-label">Issue / Summary:</span>
                <p className="mobile-summary-text">{summaryText}</p>
              </div>

              <div className="mobile-card-footer">
                <button
                  type="button"
                  className="mobile-action-btn view-action"
                  onClick={() => navigate(`/service-records/${item.id}`)}
                >
                  <FiEye /> View Details
                </button>
                <button
                  type="button"
                  className="mobile-action-btn edit-action"
                  onClick={() => onEditRecord && onEditRecord(item)}
                >
                  <FiEdit2 /> Edit
                </button>
                <button
                  type="button"
                  className="mobile-action-btn delete-action"
                  onClick={() => onDeleteRecord && onDeleteRecord(item)}
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
