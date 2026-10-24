import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiBox,
  FiClock,
  FiPhone,
  FiAlertCircle,
  FiExternalLink,
  FiRefreshCw,
} from 'react-icons/fi';

import PageHeader from '../components/common/PageHeader/PageHeader';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import Badge from '../components/common/Badge/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog/ConfirmDialog';
import WarrantyFormModal from '../components/warranties/WarrantyFormModal';
import { useToast } from '../hooks/useToast';

import { warrantyService } from '../services/warrantyService';
import { productService } from '../services/productService';

import { formatDate, formatCurrency } from '../utils/formatters.js';
import {
  getWarrantyBadgeVariant,
  getWarrantyStatusLabel,
  formatExpiryCountdown,
} from '../utils/warrantyUtils.js';

import './WarrantyDetailPage.css';

export default function WarrantyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [warranty, setWarranty] = useState(null);
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

      // Fetch warranty
      const war = await warrantyService.getWarrantyById(id);
      if (!war) {
        setError(`Unable to load warranty policy with ID "${id}".`);
        return;
      }
      setWarranty(war);

      // Fetch associated product & all products list safely (do not crash if auxiliary list fails)
      try {
        const prods = await productService.getProducts();
        setAllProducts(prods || []);

        const matchedProd = (prods || []).find(
          (p) => p.id === war.productId || p.productId === war.productId
        );
        setProduct(matchedProd || null);
      } catch {
        setAllProducts([]);
        setProduct(null);
      }
    } catch (err) {
      setError(err.message || `Unable to load warranty policy with ID "${id}".`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Edit Submit
  const handleEditSubmit = async (formData) => {
    if (isSubmitting || !warranty) return;
    try {
      setIsSubmitting(true);
      await warrantyService.updateWarranty(warranty.id, {
        productId: formData.productId,
        type: formData.type,
        provider: formData.provider,
        startDate: formData.startDate,
        endDate: formData.endDate,
        durationMonths: formData.durationMonths,
        coverageDetails: formData.coverageDetails,
        supportContact: formData.supportContact,
        terms: formData.terms,
      });

      toast.success('Warranty details updated successfully!');
      setIsEditModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Unable to save warranty. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (isDeleting || !warranty) return;
    try {
      setIsDeleting(true);
      await warrantyService.deleteWarranty(warranty.id);
      toast.success('Warranty record removed from SmartCare.');
      setIsDeleteDialogOpen(false);
      navigate('/warranties');
    } catch (err) {
      toast.error(err.message || 'Unable to delete warranty. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="warranty-detail-page">
        <Card className="detail-loading-card">
          <LoadingSpinner text="Fetching warranty policy details..." />
        </Card>
      </div>
    );
  }

  if (error || !warranty) {
    return (
      <div className="warranty-detail-page">
        <Card className="detail-error-card">
          <FiAlertCircle className="detail-error-icon" />
          <h2>Warranty Not Found</h2>
          <p>{error || 'The requested warranty record could not be found.'}</p>
          <div className="detail-error-actions">
            <Button variant="secondary" icon={FiRefreshCw} onClick={loadData}>
              Retry
            </Button>
            <Button variant="outline" icon={FiArrowLeft} onClick={() => navigate('/warranties')}>
              Back to Warranties
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const status = warranty.status;
  const badgeVariant = getWarrantyBadgeVariant(status);
  const statusLabel = getWarrantyStatusLabel(status);
  const countdownText = formatExpiryCountdown(warranty.endDate);

  return (
    <div className="warranty-detail-page">
      {/* Breadcrumb */}
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/warranties" className="breadcrumb-link">
          <FiArrowLeft /> Warranties
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">
          {product ? `${product.name} Warranty` : warranty.type}
        </span>
      </nav>

      {/* Page Header */}
      <PageHeader
        title={product?.name || warranty.type}
        subtitle={`${warranty.type} • Issued by ${warranty.provider}`}
        actions={
          <div className="detail-header-actions">
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

      {/* Two-Column Grid Layout */}
      <div className="detail-layout-grid">
        {/* LEFT COLUMN: Policy Details & Coverage */}
        <div className="detail-col-main">
          {/* Expiry Countdown Hero Card */}
          <Card className="detail-card countdown-hero-card">
            <div className="countdown-hero-inner">
              <div className={`countdown-icon-box box-${badgeVariant}`}>
                <FiClock />
              </div>
              <div className="countdown-hero-text">
                <div className="countdown-top-badge">
                  <Badge variant={badgeVariant} size="md" dot>
                    {statusLabel}
                  </Badge>
                  <span className="warranty-id-label">ID: {warranty.id}</span>
                </div>
                <h2 className="countdown-hero-timer">{countdownText}</h2>
                <p className="countdown-hero-sub">
                  Coverage window: {formatDate(warranty.startDate)} to{' '}
                  <strong>{formatDate(warranty.endDate)}</strong> ({warranty.durationMonths || 12} months total)
                </p>
              </div>
            </div>
          </Card>

          {/* Warranty Terms and Policy Details */}
          <Card title="Coverage Scope & Policy Details" className="detail-card">
            <div className="detail-info-grid">
              <div className="info-item">
                <span className="info-label">Warranty Type</span>
                <span className="info-val bold">{warranty.type}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Issuer / Provider</span>
                <span className="info-val bold">{warranty.provider}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Effective Date</span>
                <span className="info-val">{formatDate(warranty.startDate)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Expiration Date</span>
                <span className="info-val bold">{formatDate(warranty.endDate)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Duration</span>
                <span className="info-val">{warranty.durationMonths || 12} Months</span>
              </div>
              <div className="info-item">
                <span className="info-label">Associated Product ID</span>
                <span className="info-val code-font">{warranty.productId}</span>
              </div>
            </div>

            <div className="coverage-scope-block">
              <span className="info-label">Coverage Inclusions</span>
              <p className="coverage-body-text">
                {warranty.coverageDetails || 'Standard manufacturer warranty against material defects and component failures.'}
              </p>
            </div>

            {warranty.terms && (
              <div className="warranty-terms-block">
                <span className="info-label">Terms & Special Conditions</span>
                <p className="terms-body-text">{warranty.terms}</p>
              </div>
            )}
          </Card>

          {/* Support Helpline & Claims Card */}
          <Card title="Support & Claims Assistance" className="detail-card">
            <div className="support-card-content">
              <div className="support-callout">
                <FiPhone className="support-phone-icon" />
                <div className="support-callout-text">
                  <span className="support-callout-title">Authorized Service Helpline</span>
                  {warranty.supportContact ? (
                    <a href={`tel:${warranty.supportContact}`} className="support-callout-num">
                      {warranty.supportContact}
                    </a>
                  ) : (
                    <span className="support-callout-num">Toll-free service desk</span>
                  )}
                  <p className="support-callout-hint">
                    Have your serial number and invoice ready when initiating warranty claims with {warranty.provider}.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Associated Product & Quick Actions */}
        <div className="detail-col-sidebar">
          {/* Associated Product Card */}
          <Card
            title="Associated Product"
            subtitle="Appliance registered under this protection plan"
            className="detail-card"
          >
            {product ? (
              <div className="product-summary-block">
                <div className="prod-badge-header">
                  <h3 className="prod-title-text">{product.name}</h3>
                  <Badge variant="neutral" size="sm">{product.category}</Badge>
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
                    <span className="spec-label">Serial No.</span>
                    <span className="spec-val code-font">{product.serialNumber || '—'}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Purchase Date</span>
                    <span className="spec-val">{formatDate(product.purchaseDate)}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Purchase Price</span>
                    <span className="spec-val price-text">{formatCurrency(product.purchasePrice)}</span>
                  </div>
                </div>

                <div className="view-product-action">
                  <Button
                    variant="outline"
                    icon={FiExternalLink}
                    block
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    View Product Details
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
            <div className="warranty-actions-list">
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
                Edit Warranty Details
              </Button>
              <Button
                variant="danger"
                icon={FiTrash2}
                block
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete Warranty Record
              </Button>
              <Button
                variant="ghost"
                icon={FiArrowLeft}
                block
                onClick={() => navigate('/warranties')}
              >
                Back to All Warranties
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Warranty Modal */}
      <WarrantyFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialValues={warranty}
        products={allProducts}
        onSubmit={handleEditSubmit}
        isEdit={true}
        loading={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Warranty"
        message="Deleting this warranty will remove the warranty record from SmartCare. Are you sure you want to proceed?"
        confirmText="Delete Warranty"
        cancelText="Keep Warranty"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
