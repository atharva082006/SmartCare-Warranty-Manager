import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiBox,
  FiTool,
  FiCalendar,
  FiCreditCard,
  FiAlertCircle,
  FiCheckCircle,
  FiExternalLink,
  FiClock,
  FiRefreshCw,
} from 'react-icons/fi';

import PageHeader from '../components/common/PageHeader/PageHeader';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import Badge from '../components/common/Badge/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog/ConfirmDialog';
import ServiceRecordFormModal from '../components/serviceRecords/ServiceRecordFormModal';
import { useToast } from '../hooks/useToast';

import { serviceRecordService } from '../services/serviceRecordService';
import { productService } from '../services/productService';

import { formatDate, formatCurrency } from '../utils/formatters.js';
import {
  getServiceStatusBadgeVariant,
  getServiceStatusLabel,
} from '../utils/serviceRecordUtils.js';

import './ServiceRecordDetailPage.css';

export default function ServiceRecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [record, setRecord] = useState(null);
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch service record
      const rec = await serviceRecordService.getServiceRecordById(id);
      if (!rec) {
        setError(`Unable to load service record with ID "${id}".`);
        return;
      }
      setRecord(rec);

      // Fetch associated product & all products safely (do not crash if auxiliary list fails)
      try {
        const prods = await productService.getProducts();
        setAllProducts(prods || []);

        const matchedProd = (prods || []).find(
          (p) => p.id === rec.productId || p.productId === rec.productId
        );
        setProduct(matchedProd || null);
      } catch {
        setAllProducts([]);
        setProduct(null);
      }
    } catch (err) {
      setError(err.message || `Unable to load service record with ID "${id}".`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Edit Submit
  const handleEditSubmit = async (formData) => {
    if (isSubmitting || !record) return;
    try {
      setIsSubmitting(true);
      await serviceRecordService.updateServiceRecord(record.id, formData);

      toast.success('Service record updated successfully!');
      setIsEditModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Unable to save changes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (isDeleting || !record) return;
    try {
      setIsDeleting(true);
      await serviceRecordService.deleteServiceRecord(record.id);
      toast.success(`Service record ${record.id} removed.`);
      setIsDeleteDialogOpen(false);
      navigate('/service-records');
    } catch (err) {
      toast.error(err.message || 'Unable to delete service record. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="service-detail-page">
        <Card className="detail-loading-card">
          <LoadingSpinner text="Fetching service record details..." />
        </Card>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="service-detail-page">
        <Card className="detail-error-card">
          <FiAlertCircle className="detail-error-icon" />
          <h2>Service Record Not Found</h2>
          <p>{error || 'The requested service record could not be found.'}</p>
          <div className="detail-error-actions">
            <Button
              variant="secondary"
              icon={FiRefreshCw}
              onClick={loadData}
            >
              Retry
            </Button>
            <Button
              variant="outline"
              icon={FiArrowLeft}
              onClick={() => navigate('/service-records')}
            >
              Back to Service Records
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const badgeVariant = getServiceStatusBadgeVariant(record.status);
  const statusLabel = getServiceStatusLabel(record.status);
  const productName = product?.name || 'Registered Product';

  return (
    <div className="service-detail-page">
      {/* Breadcrumb Navigation */}
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/service-records" className="breadcrumb-link">
          <FiArrowLeft /> Service Records
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{productName} Service Record</span>
      </nav>

      {/* Header */}
      <PageHeader
        title={`${productName} Service Record`}
        subtitle={`${record.serviceType} • Serviced by ${record.provider} on ${formatDate(
          record.serviceDate
        )}`}
        actions={
          <div className="detail-header-actions">
            <Button
              variant="outline"
              size="sm"
              icon={FiArrowLeft}
              onClick={() => navigate('/service-records')}
            >
              Back
            </Button>
            {product && (
              <Button
                variant="outline"
                size="sm"
                icon={FiBox}
                onClick={() => navigate(`/products/${product.id}`)}
              >
                View Product
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={FiEdit2}
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={FiTrash2}
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </div>
        }
      />

      {/* Two-Column Detail Grid */}
      <div className="detail-layout-grid">
        {/* LEFT COLUMN: Service Information & Details */}
        <div className="detail-col-main">
          {/* Hero Summary Card */}
          <Card className="detail-card service-hero-card">
            <div className="service-hero-inner">
              <div className={`service-hero-icon-box box-${badgeVariant}`}>
                <FiTool />
              </div>
              <div className="service-hero-text">
                <div className="service-top-badge-row">
                  <Badge variant={badgeVariant} size="md" dot>
                    {statusLabel}
                  </Badge>
                  <span className="record-id-tag">ID: {record.id}</span>
                </div>
                <h2 className="service-hero-title">
                  {record.serviceType} — {record.cost > 0 ? formatCurrency(record.cost) : '₹0 (Free)'}
                </h2>
                <p className="service-hero-sub">
                  Executed on <strong>{formatDate(record.serviceDate)}</strong> by {record.provider}
                </p>
              </div>
            </div>
          </Card>

          {/* Service Information Card */}
          <Card title="Service Information" className="detail-card">
            <div className="detail-info-grid">
              <div className="info-item">
                <span className="info-label">Service Record ID</span>
                <span className="info-val code-font">{record.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Associated Product</span>
                <span className="info-val bold">{productName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Service Type</span>
                <span className="info-val bold">{record.serviceType}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Service Provider</span>
                <span className="info-val">{record.provider}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Service Date</span>
                <span className="info-val">{formatDate(record.serviceDate)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Service Cost</span>
                <span className="info-val price-val">
                  {record.cost > 0 ? formatCurrency(record.cost) : '₹0 (Free / Warranty Covered)'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-val">
                  <Badge variant={badgeVariant} size="sm" dot>
                    {statusLabel}
                  </Badge>
                </span>
              </div>
              {record.nextServiceDate && (
                <div className="info-item">
                  <span className="info-label">Next Service Due</span>
                  <span className="info-val bold">{formatDate(record.nextServiceDate)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Service Details Card (Issue, Work Performed, Parts, Notes) */}
          <Card title="Service Details & Work Log" className="detail-card">
            {/* Issue / Problem */}
            <div className="service-block">
              <span className="info-label">Issue / Problem Description</span>
              <p className="block-body-text">
                {record.issueDescription || record.description || 'Routine maintenance and inspection.'}
              </p>
            </div>

            {/* Work Performed */}
            <div className="service-block">
              <span className="info-label">Work Performed</span>
              <p className="block-body-text">
                {record.workPerformed || record.description || 'Completed per authorized service procedures.'}
              </p>
            </div>

            {/* Parts Replaced */}
            <div className="service-block">
              <span className="info-label">Parts Replaced</span>
              {record.partsReplaced && record.partsReplaced.length > 0 ? (
                <div className="parts-tags-list">
                  {record.partsReplaced.map((part, idx) => (
                    <span key={idx} className="part-tag">
                      <FiCheckCircle className="part-tag-icon" />
                      {part}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="block-body-text muted">None replaced (inspection/labor only)</p>
              )}
            </div>

            {/* Notes */}
            {record.notes && (
              <div className="service-block">
                <span className="info-label">Technician Notes & Operating Advice</span>
                <p className="block-body-text notes-text">{record.notes}</p>
              </div>
            )}

            {/* Next Service Date Reminder Banner */}
            {record.nextServiceDate && (
              <div className="next-service-banner">
                <FiClock className="banner-clock-icon" />
                <div className="banner-text">
                  <strong>Upcoming Service Scheduled:</strong> Recommended follow-up on{' '}
                  {formatDate(record.nextServiceDate)}.
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Associated Product & Quick Actions */}
        <div className="detail-col-sidebar">
          {/* Associated Product Card */}
          <Card
            title="Associated Product"
            subtitle="Appliance tied to this service record"
            className="detail-card"
          >
            {product ? (
              <div className="product-summary-block">
                <div className="prod-badge-header">
                  <h3 className="prod-title-text">{product.name}</h3>
                  <Badge variant="neutral" size="sm">
                    {product.category}
                  </Badge>
                </div>

                <div className="prod-specs-list">
                  <div className="spec-row">
                    <span className="spec-label">Brand</span>
                    <span className="spec-val bold">{product.brand}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Model No.</span>
                    <span className="spec-val code-font">{product.modelNumber || '—'}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Product ID</span>
                    <span className="spec-val code-font">{product.productId || product.id}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Category</span>
                    <span className="spec-val">{product.category}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Purchase Date</span>
                    <span className="spec-val">{formatDate(product.purchaseDate)}</span>
                  </div>
                </div>

                <div className="view-product-action">
                  <Button
                    variant="outline"
                    icon={FiExternalLink}
                    block
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    View Product
                  </Button>
                </div>
              </div>
            ) : (
              <div className="empty-prod-callout">
                <FiBox className="empty-box-icon" />
                <p>Associated product details could not be loaded.</p>
              </div>
            )}
          </Card>

          {/* Quick Actions Card */}
          <Card title="Quick Actions" className="detail-card">
            <div className="service-actions-list">
              {product && (
                <Button
                  variant="outline"
                  icon={FiBox}
                  block
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  Go to {product.name}
                </Button>
              )}
              <Button
                variant="secondary"
                icon={FiEdit2}
                block
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit Service Record
              </Button>
              <Button
                variant="danger"
                icon={FiTrash2}
                block
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete Service Record
              </Button>
              <Button
                variant="ghost"
                icon={FiArrowLeft}
                block
                onClick={() => navigate('/service-records')}
              >
                Back to All Service Records
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Service Record Modal */}
      {isEditModalOpen && (
        <ServiceRecordFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialValues={record}
          products={allProducts}
          onSubmit={handleEditSubmit}
          isEdit={true}
          loading={isSubmitting}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Service Record"
        message={`Are you sure you want to delete service record ${record.id} for "${productName}"? This action cannot be undone.`}
        confirmText="Delete Record"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
