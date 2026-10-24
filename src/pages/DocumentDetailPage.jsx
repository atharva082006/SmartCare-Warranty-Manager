import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiFileText,
  FiEdit2,
  FiTrash2,
  FiCamera,
  FiDownload,
  FiExternalLink,
  FiPackage,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiRefreshCw,
} from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader/PageHeader';
import Button from '../components/common/Button/Button';
import Badge from '../components/common/Badge/Badge';
import Card from '../components/common/Card/Card';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog/ConfirmDialog';
import { useToast } from '../hooks/useToast';

import OCRStatusBadge from '../components/documents/OCRStatusBadge';
import DocumentPreview from '../components/documents/DocumentPreview';
import OCRResultSection from '../components/documents/OCRResultSection';
import DocumentEditModal from '../components/documents/DocumentEditModal';
import WarrantyFormModal from '../components/warranties/WarrantyFormModal';
import ServiceRecordFormModal from '../components/serviceRecords/ServiceRecordFormModal';

import { documentService } from '../services/documentService';
import { productService } from '../services/productService';
import { warrantyService } from '../services/warrantyService';
import { serviceRecordService } from '../services/serviceRecordService';
import { ocrService } from '../services/ocrService';

import { formatDate, formatDateTime, formatFileSize } from '../utils/formatters';
import {
  getDocumentTypeBadgeVariant,
  getFileTypeBadgeVariant,
} from '../utils/documentUtils';

import './DocumentDetailPage.css';

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // Core Data
  const [document, setDocument] = useState(null);
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Operation states
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Quick Action Modals from OCR
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  const [warrantyPrefill, setWarrantyPrefill] = useState(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [servicePrefill, setServicePrefill] = useState(null);
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);

  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Fetch document details and associated product
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const doc = await documentService.getDocumentById(id);
      if (!doc) {
        setError('Document not found in vault.');
        return;
      }
      setDocument(doc);

      // Fetch products safely (do not fail document detail if product list fails)
      try {
        const products = await productService.getProducts();
        setAllProducts(products || []);

        if (doc.productId) {
          const prod = (products || []).find((p) => p.id === doc.productId);
          setProduct(prod || null);
        }
      } catch {
        setAllProducts([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load document.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Run Demo OCR
  const handleRunOcr = async () => {
    if (!document || isProcessingOcr) return;
    try {
      setIsProcessingOcr(true);
      toast.info(`Extracting text and structured data from "${document.fileName}"...`);
      await ocrService.processDocument(document.id);
      toast.success(`OCR scan completed! Extracted structured metadata.`);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'OCR processing failed.');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // Download Document using authenticated Blob
  const handleDownload = async () => {
    if (!document) return;
    try {
      toast.info(`Downloading "${document.fileName}"...`);
      await documentService.downloadDocument(document.id, document.fileName);
      toast.success(`Downloaded "${document.fileName}"`);
    } catch (err) {
      toast.error('Failed to download document file.');
    }
  };

  // Open Document in new tab using authenticated Blob Object URL
  const handleOpen = async () => {
    if (!document) return;
    try {
      toast.info(`Opening "${document.fileName}"...`);
      await documentService.openDocument(document.id);
    } catch (err) {
      toast.error('Failed to open document file.');
    }
  };

  // Edit metadata
  const handleSaveEdit = async (updatedData) => {
    if (isSavingEdit || !document) return;
    try {
      setIsSavingEdit(true);
      await documentService.updateDocument(document.id, updatedData);
      toast.success('Document metadata updated successfully.');
      setIsEditModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update document.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete document
  const handleConfirmDelete = async () => {
    if (isDeleting || !document) return;
    try {
      setIsDeleting(true);
      await documentService.deleteDocument(document.id);
      toast.success(`"${document.fileName}" has been deleted.`);
      setIsDeleteDialogOpen(false);
      navigate('/documents');
    } catch (err) {
      toast.error(err.message || 'Failed to delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Action: Create Warranty from OCR
  const handleCreateWarrantyFromOcr = () => {
    const s = document?.ocrStructuredData || {};
    const prefill = {
      productId: document.productId || (allProducts[0]?.id || ''),
      provider: s.provider || s.vendor || product?.brand || '',
      type: s.warrantyPeriod || 'Comprehensive Manufacturer Warranty',
      startDate: s.purchaseDate || new Date().toISOString().split('T')[0],
      durationMonths: s.warrantyPeriod?.includes('2') ? '24' : '12',
      terms: `Extracted via SmartCare OCR from invoice ${document.fileName}. ${s.invoiceNumber ? `Invoice #${s.invoiceNumber}.` : ''}`,
    };
    setWarrantyPrefill(prefill);
    setIsWarrantyModalOpen(true);
  };

  const handleSubmitWarranty = async (formData) => {
    if (isSubmittingRecord) return;
    try {
      setIsSubmittingRecord(true);
      await warrantyService.createWarranty(formData);
      toast.success('Warranty policy registered successfully from OCR metadata!');
      setIsWarrantyModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to create warranty.');
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  // Action: Create Service Record from OCR
  const handleCreateServiceFromOcr = () => {
    const s = document?.ocrStructuredData || {};
    const prefill = {
      productId: document.productId || (allProducts[0]?.id || ''),
      provider: s.serviceCenter || s.serviceProvider || s.vendor || product?.brand || 'Authorized Service',
      serviceType: s.serviceType || 'Maintenance',
      serviceDate: s.serviceDate || s.purchaseDate || new Date().toISOString().split('T')[0],
      cost: s.serviceCost !== undefined ? String(s.serviceCost) : (s.totalCost !== undefined ? String(s.totalCost) : (s.amount !== undefined ? String(s.amount) : '0')),
      issueDescription: s.issue || s.issueReported || `Service for ${product?.name || document.fileName}`,
      workPerformed: s.workPerformed || 'Inspection, cleaning, and routine calibration',
      notes: `Extracted via SmartCare OCR from ${document.fileName}`,
    };
    setServicePrefill(prefill);
    setIsServiceModalOpen(true);
  };

  const handleSubmitService = async (formData) => {
    if (isSubmittingRecord) return;
    try {
      setIsSubmittingRecord(true);
      await serviceRecordService.createServiceRecord(formData);
      toast.success('Service record logged successfully from OCR metadata!');
      setIsServiceModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to create service record.');
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  if (loading) {
    return (
      <div className="document-detail-page">
        <Card className="detail-loading-card">
          <LoadingSpinner text="Fetching document details and OCR records..." />
        </Card>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="document-detail-page">
        <Card className="detail-error-card">
          <FiAlertCircle className="detail-error-icon" />
          <h2>Document Not Found</h2>
          <p>{error || 'The requested document does not exist in your vault.'}</p>
          <div className="detail-error-actions">
            <Button variant="secondary" icon={FiRefreshCw} onClick={loadData}>
              Retry
            </Button>
            <Button variant="outline" icon={FiArrowLeft} onClick={() => navigate('/documents')}>
              Back to Documents
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const typeVariant = getDocumentTypeBadgeVariant(document.documentType);
  const fileTypeVariant = getFileTypeBadgeVariant(document.fileType);

  return (
    <div className="document-detail-page">
      {/* 1. Breadcrumb Navigation */}
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/documents" className="breadcrumb-link">
          <FiArrowLeft /> Documents
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{document.fileName}</span>
      </nav>

      {/* 2. Page Header */}
      <PageHeader
        title={document.fileName}
        subtitle={
          <span className="doc-detail-header-sub">
            <Badge variant={typeVariant} size="sm">
              {document.documentType}
            </Badge>
            <Badge variant={fileTypeVariant} size="sm">
              {document.fileType}
            </Badge>
            <OCRStatusBadge status={document.ocrStatus} />
            <span className="doc-detail-filesize">• {formatFileSize(document.fileSize)}</span>
          </span>
        }
        actions={
          <div className="detail-header-actions">
            {document.ocrStatus !== 'Completed' ? (
              <Button
                variant="primary"
                icon={FiCamera}
                onClick={handleRunOcr}
                loading={isProcessingOcr}
              >
                Run Demo OCR
              </Button>
            ) : (
              <Button
                variant="outline"
                icon={FiCamera}
                onClick={handleRunOcr}
                loading={isProcessingOcr}
                title="Re-run text and structured data extraction"
              >
                Re-run OCR
              </Button>
            )}
            <Button
              variant="secondary"
              icon={FiDownload}
              onClick={handleDownload}
            >
              Download
            </Button>
            <Button
              variant="outline"
              icon={FiEdit2}
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              icon={FiTrash2}
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </div>
        }
      />

      {/* 3. Two-Column Layout Grid */}
      <div className="doc-detail-grid">
        {/* LEFT COLUMN: Document Preview & OCR Results */}
        <div className="doc-detail-main">
          {/* Document Preview Card */}
          <Card title="Document Preview" className="doc-preview-card">
            <DocumentPreview
              document={document}
              onDownload={handleDownload}
              onOpen={handleOpen}
            />
          </Card>

          {/* OCR Result Section Card */}
          <Card title="Optical Character Recognition (OCR)" className="doc-ocr-card">
            <OCRResultSection
              document={document}
              onRunOcr={handleRunOcr}
              onCreateWarranty={handleCreateWarrantyFromOcr}
              onCreateServiceRecord={handleCreateServiceFromOcr}
              isProcessing={isProcessingOcr}
            />
          </Card>
        </div>

        {/* RIGHT COLUMN: Metadata & Associated Product */}
        <div className="doc-detail-sidebar">
          {/* Metadata Card */}
          <Card title="File Metadata" className="detail-card">
            <div className="doc-meta-grid">
              <div className="doc-meta-item">
                <span className="meta-label">Document ID</span>
                <span className="meta-value font-mono">{document.id}</span>
              </div>
              <div className="doc-meta-item">
                <span className="meta-label">Original Filename</span>
                <span className="meta-value filename-wrap">{document.fileName}</span>
              </div>
              <div className="doc-meta-item">
                <span className="meta-label">Category / Type</span>
                <span className="meta-value">
                  <Badge variant={typeVariant} size="sm">
                    {document.documentType}
                  </Badge>
                </span>
              </div>
              <div className="doc-meta-item">
                <span className="meta-label">File Format</span>
                <span className="meta-value">{document.mimeType || document.fileType}</span>
              </div>
              <div className="doc-meta-item">
                <span className="meta-label">File Size</span>
                <span className="meta-value">{formatFileSize(document.fileSize)}</span>
              </div>
              <div className="doc-meta-item">
                <span className="meta-label">Uploaded At</span>
                <span className="meta-value">{formatDateTime(document.uploadedAt)}</span>
              </div>
              <div className="doc-meta-item">
                <span className="meta-label">OCR Processed</span>
                <span className="meta-value">
                  {document.ocrProcessedAt
                    ? formatDateTime(document.ocrProcessedAt)
                    : 'Not yet processed'}
                </span>
              </div>
              {document.description && (
                <div className="doc-meta-item full-width">
                  <span className="meta-label">Notes & Description</span>
                  <p className="meta-description">{document.description}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Associated Product Card */}
          <Card
            title="Associated Product"
            className="detail-card"
            actions={
              product ? (
                <Link to={`/products/${product.id}`} className="view-product-link">
                  <Button variant="ghost" size="sm" icon={FiExternalLink}>
                    View Product
                  </Button>
                </Link>
              ) : null
            }
          >
            {product ? (
              <div className="linked-product-box">
                <div className="linked-product-header">
                  <div className="linked-product-icon">
                    <FiPackage />
                  </div>
                  <div>
                    <h4 className="linked-product-name">{product.name}</h4>
                    <p className="linked-product-sub">
                      {product.brand} • {product.modelNumber || 'No Model'}
                    </p>
                  </div>
                </div>
                <div className="linked-product-details">
                  <div className="linked-product-detail-row">
                    <span className="label">Category:</span>
                    <Badge variant="neutral" size="sm">
                      {product.category}
                    </Badge>
                  </div>
                  <div className="linked-product-detail-row">
                    <span className="label">Serial Number:</span>
                    <span className="value font-mono">{product.serialNumber || 'N/A'}</span>
                  </div>
                  <div className="linked-product-detail-row">
                    <span className="label">Purchase Date:</span>
                    <span className="value">{formatDate(product.purchaseDate)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="unlinked-product-box">
                <FiInfo />
                <p>No product linked to this document.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  Link to Product
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 4. Edit Metadata Modal */}
      <DocumentEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        document={document}
        products={allProducts}
        onSubmit={handleSaveEdit}
        loading={isSavingEdit}
      />

      {/* 5. Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="Delete Document"
        message={`Are you sure you want to permanently delete "${document.fileName}"? This action cannot be undone.`}
        confirmText="Delete Document"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* 6. Quick Action: Register Warranty from OCR */}
      <WarrantyFormModal
        isOpen={isWarrantyModalOpen}
        onClose={() => setIsWarrantyModalOpen(false)}
        initialValues={warrantyPrefill}
        initialProductId={document.productId}
        products={allProducts}
        onSubmit={handleSubmitWarranty}
        loading={isSubmittingRecord}
      />

      {/* 7. Quick Action: Log Service Record from OCR */}
      <ServiceRecordFormModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        initialValues={servicePrefill}
        initialProductId={document.productId}
        products={allProducts}
        onSubmit={handleSubmitService}
        loading={isSubmittingRecord}
      />
    </div>
  );
}
