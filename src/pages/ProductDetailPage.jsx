import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiSmartphone,
  FiShield,
  FiTool,
  FiFolder,
  FiZap,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiPhone,
  FiFileText,
  FiPlus,
  FiEye,
  FiCamera,
  FiExternalLink,
  FiUploadCloud,
  FiRefreshCw,
} from 'react-icons/fi';

import PageHeader from '../components/common/PageHeader/PageHeader';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import Badge from '../components/common/Badge/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog/ConfirmDialog';
import ProductFormModal from '../components/products/ProductFormModal';
import ServiceRecordFormModal from '../components/serviceRecords/ServiceRecordFormModal';
import DocumentUploadModal from '../components/documents/DocumentUploadModal';
import OCRStatusBadge from '../components/documents/OCRStatusBadge';
import { useToast } from '../hooks/useToast';

import { productService } from '../services/productService';
import { warrantyService } from '../services/warrantyService';
import { serviceRecordService } from '../services/serviceRecordService';
import { documentService } from '../services/documentService';
import { recommendationService } from '../services/recommendationService';

import { formatCurrency, formatDate, formatFileSize, formatRelativeDate } from '../utils/formatters.js';
import { getWarrantyBadgeVariant, getWarrantyStatusLabel } from '../utils/warrantyUtils.js';
import { getServiceStatusBadgeVariant, getServiceStatusLabel } from '../utils/serviceRecordUtils.js';
import { calculateHealthScore, getHealthBadgeVariant, getHealthStatusLabel } from '../utils/healthScoreUtils.js';
import { getDocumentTypeBadgeVariant } from '../utils/documentUtils.js';

import './ProductDetailPage.css';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [warranty, setWarranty] = useState(null);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [healthAnalysis, setHealthAnalysis] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [isServiceSubmitting, setIsServiceSubmitting] = useState(false);

  const [isDocUploadModalOpen, setIsDocUploadModalOpen] = useState(false);
  const [isDocUploading, setIsDocUploading] = useState(false);

  const loadProductData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch product
      const prod = await productService.getProductById(id);
      if (!prod) {
        setError(`Product with ID "${id}" could not be found.`);
        return;
      }
      setProduct(prod);

      // Fetch related records in parallel safely (resilient to individual section failures)
      const [warrantiesResult, servicesResult, docsResult, recsResult] = await Promise.allSettled([
        warrantyService.getWarrantiesByProduct(prod.id),
        serviceRecordService.getServiceRecordsByProductId(prod.id),
        documentService.getDocumentsByProduct(prod.id),
        recommendationService.getRecommendationsByProduct(prod.id),
      ]);

      const warranties = warrantiesResult.status === 'fulfilled' ? warrantiesResult.value : [];
      const services = servicesResult.status === 'fulfilled' ? servicesResult.value : [];
      const docs = docsResult.status === 'fulfilled' ? docsResult.value : [];
      const recs = recsResult.status === 'fulfilled' ? recsResult.value : [];

      const primaryWarranty = warranties.length > 0 ? warranties[0] : null;
      setWarranty(primaryWarranty);
      setServiceRecords(services);
      setDocuments(docs);
      setRecommendations(recs);

      // Compute health score with transparent deduction breakdown
      const healthResult = calculateHealthScore(prod, primaryWarranty, services);
      setHealthAnalysis(healthResult);
    } catch (err) {
      setError(err.message || `Unable to load product with ID: "${id}". It may have been deleted.`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

  // Handle Add Service Record Submit
  const handleAddServiceSubmit = async (formData) => {
    if (isServiceSubmitting) return;
    try {
      setIsServiceSubmitting(true);
      await serviceRecordService.createServiceRecord(formData);
      toast.success('Service record logged successfully!');
      setIsAddServiceModalOpen(false);
      await loadProductData();
    } catch (err) {
      toast.error(err.message || 'Unable to save service record. Please try again.');
    } finally {
      setIsServiceSubmitting(false);
    }
  };

  // Handle Add Document Submit
  const handleUploadDocSubmit = async (formData) => {
    if (isDocUploading) return;
    try {
      setIsDocUploading(true);
      await documentService.createDocument(formData);
      toast.success(`"${formData.fileName}" uploaded successfully!`);
      setIsDocUploadModalOpen(false);
      await loadProductData();
    } catch (err) {
      toast.error(err.message || 'Failed to upload document.');
    } finally {
      setIsDocUploading(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (formData) => {
    if (isSubmitting || !product) return;
    try {
      setIsSubmitting(true);
      const updated = await productService.updateProduct(product.id, {
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        modelNumber: formData.modelNumber,
        serialNumber: formData.serialNumber,
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice,
        notes: formData.notes,
      });

      toast.success(`Product "${updated.name}" updated successfully!`);
      setIsEditModalOpen(false);
      await loadProductData();
    } catch (err) {
      toast.error(err.message || 'Failed to update product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (isDeleting || !product) return;
    try {
      setIsDeleting(true);
      await productService.deleteProduct(product.id);
      toast.success(`"${product.name}" has been deleted.`);
      setIsDeleteDialogOpen(false);
      navigate('/products');
    } catch (err) {
      toast.error(err.message || 'Failed to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <Card className="detail-loading-card">
          <LoadingSpinner text="Fetching product details and warranty records..." />
        </Card>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <Card className="detail-error-card">
          <FiAlertCircle className="detail-error-icon" />
          <h2>Product Not Found</h2>
          <p>{error || 'The requested product could not be found.'}</p>
          <div className="detail-error-actions">
            <Button variant="secondary" icon={FiRefreshCw} onClick={loadProductData}>
              Retry
            </Button>
            <Button variant="outline" icon={FiArrowLeft} onClick={() => navigate('/products')}>
              Back to Products
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const warrantyStatus = warranty?.status || 'expired';
  const warrantyBadgeVariant = getWarrantyBadgeVariant(warrantyStatus);
  const warrantyStatusLabel = getWarrantyStatusLabel(warrantyStatus);

  const healthScore = healthAnalysis?.score ?? (product.healthScore ?? 100);
  const healthBadgeVariant = getHealthBadgeVariant(healthScore);
  const healthStatusLabel = getHealthStatusLabel(healthScore);

  const totalServiceCost = serviceRecords.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);

  return (
    <div className="product-detail-page">
      {/* Breadcrumb Navigation */}
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/products" className="breadcrumb-link">
          <FiArrowLeft /> Products
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{product.name}</span>
      </nav>

      {/* Header */}
      <PageHeader
        title={product.name}
        subtitle={`${product.brand} • ${product.category} • Model: ${product.modelNumber || 'N/A'}`}
        actions={
          <div className="detail-header-actions">
            <Button
              variant="outline"
              size="sm"
              icon={FiSmartphone}
              onClick={() => navigate(`/qr?productId=${product.id}`)}
            >
              QR Passport
            </Button>
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

      {/* Two-Column Detail Layout */}
      <div className="detail-layout-grid">
        {/* LEFT COLUMN: Core Product Specs & Health Analysis */}
        <div className="detail-col-main">
          {/* Product Specifications Card */}
          <Card title="Product Information" className="detail-card">
            <div className="detail-info-grid">
              <div className="info-item">
                <span className="info-label">Brand</span>
                <span className="info-val bold">{product.brand}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Category</span>
                <span className="info-val">
                  <Badge variant="neutral" size="sm">{product.category}</Badge>
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Model Number</span>
                <span className="info-val code-font">{product.modelNumber || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Serial Number</span>
                <span className="info-val code-font">{product.serialNumber || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Purchase Date</span>
                <span className="info-val">
                  {formatDate(product.purchaseDate)} ({formatRelativeDate(product.purchaseDate)})
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Purchase Price</span>
                <span className="info-val price-text">{formatCurrency(product.purchasePrice)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Product ID</span>
                <span className="info-val code-font id-text">{product.productId || product.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Registered On</span>
                <span className="info-val">{formatDate(product.createdAt || product.purchaseDate)}</span>
              </div>
            </div>

            {product.notes && (
              <div className="detail-notes-section">
                <span className="info-label">Notes & Placement</span>
                <p className="notes-content">{product.notes}</p>
              </div>
            )}
          </Card>

          {/* Product Health Score Card (Transparent Deduction Breakdown) */}
          <Card
            title="Product Health Score"
            subtitle="Calculated dynamically based on age, repair history, and warranty status"
            className="detail-card health-score-card"
          >
            <div className="health-score-hero">
              <div className="health-gauge-circle">
                <span className="gauge-number">{healthScore}</span>
                <span className="gauge-total">/ 100</span>
              </div>
              <div className="health-hero-details">
                <div className="health-status-badge-row">
                  <Badge variant={healthBadgeVariant} size="md">
                    {healthStatusLabel} Condition
                  </Badge>
                  <span className="health-status-hint">
                    {healthScore >= 80
                      ? 'Optimal reliability. Low maintenance required.'
                      : healthScore >= 60
                      ? 'Good operational state. Standard preventive check suggested.'
                      : healthScore >= 40
                      ? 'Noticeable component wear or out-of-warranty exposure.'
                      : 'High risk of failure or severe past maintenance expenses.'}
                  </span>
                </div>
                <div className="health-meter-bar">
                  <div
                    className={`health-meter-fill fill-${healthBadgeVariant}`}
                    style={{ width: `${Math.min(100, Math.max(0, healthScore))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Transparent Deduction Breakdown */}
            <div className="deductions-breakdown-wrapper">
              <h4 className="breakdown-title">Transparent Deduction Model</h4>
              <p className="breakdown-subtitle">
                Starting from Base Score: <strong>100 points</strong>
              </p>

              {healthAnalysis?.deductions && healthAnalysis.deductions.length > 0 ? (
                <div className="deduction-items-list">
                  {healthAnalysis.deductions.map((d, idx) => (
                    <div key={idx} className="deduction-item">
                      <div className="deduction-left">
                        <span className="deduction-factor">{d.factor}</span>
                        <span className="deduction-desc">{d.description}</span>
                      </div>
                      <span className="deduction-points">{d.points} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="zero-deductions-banner">
                  <FiCheckCircle className="zero-deductions-icon" />
                  <span>No deductions applied! Appliance is new and fully covered.</span>
                </div>
              )}
            </div>
          </Card>

          {/* Service History Preview Card */}
          <Card
            title="Service & Maintenance History"
            subtitle={`Cumulative maintenance spend: ${formatCurrency(totalServiceCost)} (${serviceRecords.length} visits)`}
            className="detail-card"
            actions={
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  size="sm"
                  icon={FiPlus}
                  className="add-service-btn"
                  onClick={() => setIsAddServiceModalOpen(true)}
                >
                  + Add Service Record
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/service-records')}
                >
                  View All Service Records
                </Button>
              </div>
            }
          >
            {serviceRecords.length > 0 ? (
              <div className="service-records-table-wrapper">
                <table className="service-records-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Service Type</th>
                      <th>Provider</th>
                      <th>Cost</th>
                      <th>Status</th>
                      <th>Issue / Summary</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceRecords.map((srv) => (
                      <tr key={srv.id}>
                        <td>{formatDate(srv.serviceDate)}</td>
                        <td>
                          <strong className="srv-type-text">{srv.serviceType}</strong>
                        </td>
                        <td>{srv.provider}</td>
                        <td className="srv-cost-cell">
                          {srv.cost > 0 ? formatCurrency(srv.cost) : '₹0 (Free)'}
                        </td>
                        <td>
                          <Badge variant={getServiceStatusBadgeVariant(srv.status)} size="sm" dot>
                            {getServiceStatusLabel(srv.status)}
                          </Badge>
                        </td>
                        <td
                          style={{
                            maxWidth: '180px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={srv.issueDescription || srv.description || srv.workPerformed}
                        >
                          {srv.issueDescription || srv.description || srv.workPerformed || 'Routine visit'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/service-records/${srv.id}`)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-sub-card">
                <FiTool className="empty-sub-icon" />
                <p>No service records yet.</p>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={FiPlus}
                    className="add-service-btn"
                    onClick={() => setIsAddServiceModalOpen(true)}
                  >
                    + Add Service Record
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/service-records')}
                  >
                    View All Service Records
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Warranty, Documents, Recommendations & Quick Actions */}
        <div className="detail-col-sidebar">
          {/* Warranty Status Card */}
          <Card title="Warranty Information" className="detail-card warranty-detail-card">
            {warranty ? (
              <div className="warranty-detail-body">
                <div className="warranty-status-header">
                  <div className="warranty-provider-info">
                    <span className="warranty-plan-name">{warranty.type}</span>
                    <span className="warranty-provider-name">{warranty.provider}</span>
                  </div>
                  <Badge variant={warrantyBadgeVariant} size="md" dot>
                    {warrantyStatusLabel}
                  </Badge>
                </div>

                <div className="warranty-dates-card">
                  <div className="date-block">
                    <span className="date-label">Start Date</span>
                    <span className="date-val">{formatDate(warranty.startDate)}</span>
                  </div>
                  <div className="date-divider">→</div>
                  <div className="date-block">
                    <span className="date-label">Expiry Date</span>
                    <span className="date-val bold">{formatDate(warranty.endDate)}</span>
                  </div>
                </div>

                <div className="warranty-timing-alert">
                  <FiClock className="clock-icon" />
                  <span>
                    {warranty.daysRemaining > 0
                      ? `${warranty.daysRemaining} days remaining in coverage`
                      : 'Coverage expired'}
                  </span>
                </div>

                {warranty.coverageDetails && (
                  <div className="warranty-coverage-box">
                    <span className="info-label">Coverage Scope</span>
                    <p className="coverage-text">{warranty.coverageDetails}</p>
                  </div>
                )}

                {warranty.supportContact && (
                  <div className="warranty-support-row">
                    <FiPhone className="phone-icon" />
                    <span className="support-label">Support Helpline:</span>
                    <a href={`tel:${warranty.supportContact}`} className="support-link">
                      {warranty.supportContact}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-sub-card">
                <FiShield className="empty-sub-icon" />
                <p>No warranty registered for this product.</p>
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/warranties?addProductId=${product.id}`)}
                  >
                    Add Warranty
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Attached Documents Card */}
          <Card
            title="Attached Documents"
            subtitle={`${documents.length} files on record`}
            className="detail-card"
            actions={
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button
                  variant="outline"
                  size="sm"
                  icon={FiPlus}
                  onClick={() => setIsDocUploadModalOpen(true)}
                >
                  Upload
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={FiExternalLink}
                  onClick={() => navigate('/documents')}
                  title="View all documents in vault"
                >
                  Vault
                </Button>
              </div>
            }
          >
            {documents.length > 0 ? (
              <div className="docs-list-group">
                {documents.map((doc) => (
                  <div key={doc.id} className="doc-item-row">
                    <div className="doc-icon-box">
                      <FiFileText />
                    </div>
                    <div className="doc-info-block">
                      <span
                        className="doc-name-text cursor-pointer hover:underline"
                        title={doc.fileName}
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        {doc.fileName}
                      </span>
                      <div className="doc-meta-row">
                        <Badge variant={getDocumentTypeBadgeVariant(doc.documentType)} size="sm">
                          {doc.documentType}
                        </Badge>
                        <OCRStatusBadge status={doc.ocrStatus} />
                        <span className="doc-size-text">{formatFileSize(doc.fileSize)}</span>
                        <span className="doc-date-text">{formatDate(doc.uploadedAt)}</span>
                      </div>
                    </div>
                    <div className="doc-actions-inline" style={{ display: 'flex', gap: '4px' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={FiEye}
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        title="View Document Details"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={FiCamera}
                        onClick={() => navigate(`/ocr?documentId=${doc.id}`)}
                        title="Scan with OCR"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-sub-card">
                <FiFolder className="empty-sub-icon" />
                <p>No invoices or warranty receipts attached yet.</p>
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={FiPlus}
                    onClick={() => setIsDocUploadModalOpen(true)}
                  >
                    Upload Document
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Smart Recommendations for this Product */}
          {recommendations.length > 0 && (
            <Card
              title="Smart Recommendations"
              subtitle="Tailored care suggestions"
              className="detail-card recommendations-card"
            >
              <div className="recs-list-group">
                {recommendations.map((rec) => (
                  <div key={rec.id} className={`rec-item rec-${rec.severity}`}>
                    <div className="rec-header">
                      <FiZap className="rec-icon" />
                      <span className="rec-title">{rec.title}</span>
                    </div>
                    <p className="rec-msg">{rec.message}</p>
                    {rec.actionText && (
                      <span className="rec-action-hint">Suggested: {rec.actionText}</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Actions Card */}
          <Card title="Quick Actions" className="detail-card">
            <div className="quick-actions-list">
              <Button
                variant="outline"
                icon={FiSmartphone}
                block
                onClick={() => navigate(`/qr?productId=${product.id}`)}
              >
                Open QR Product Passport
              </Button>
              <Button
                variant="secondary"
                icon={FiEdit2}
                block
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit Product Information
              </Button>
              <Button
                variant="danger"
                icon={FiTrash2}
                block
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete from Inventory
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Product Modal */}
      <ProductFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialValues={product}
        onSubmit={handleEditSubmit}
        isEdit={true}
        loading={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={isDeleting}
      />

      {/* Add Service Record Modal */}
      {isAddServiceModalOpen && (
        <ServiceRecordFormModal
          isOpen={isAddServiceModalOpen}
          onClose={() => setIsAddServiceModalOpen(false)}
          initialProductId={product.id}
          products={[product]}
          onSubmit={handleAddServiceSubmit}
          isEdit={false}
          loading={isServiceSubmitting}
        />
      )}

      {/* Upload Document Modal */}
      {isDocUploadModalOpen && (
        <DocumentUploadModal
          isOpen={isDocUploadModalOpen}
          onClose={() => setIsDocUploadModalOpen(false)}
          products={[product]}
          initialProductId={product.id}
          onSubmit={handleUploadDocSubmit}
          loading={isDocUploading}
          existingDocuments={documents}
        />
      )}
    </div>
  );
}
