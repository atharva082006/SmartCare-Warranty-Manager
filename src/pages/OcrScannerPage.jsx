import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiCamera,
  FiFileText,
  FiUploadCloud,
  FiCheckCircle,
  FiCpu,
  FiArrowRight,
  FiShield,
  FiTool,
  FiCopy,
  FiExternalLink,
  FiRefreshCw,
  FiAlertCircle,
} from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader/PageHeader';
import Card from '../components/common/Card/Card';
import Button from '../components/common/Button/Button';
import Badge from '../components/common/Badge/Badge';
import Select from '../components/common/Select/Select';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import ErrorState from '../components/common/ErrorState/ErrorState';
import { useToast } from '../hooks/useToast';

import OCRStatusBadge from '../components/documents/OCRStatusBadge';
import DocumentPreview from '../components/documents/DocumentPreview';
import WarrantyFormModal from '../components/warranties/WarrantyFormModal';
import ServiceRecordFormModal from '../components/serviceRecords/ServiceRecordFormModal';

import { documentService } from '../services/documentService';
import { productService } from '../services/productService';
import { ocrService } from '../services/ocrService';
import { warrantyService } from '../services/warrantyService';
import { serviceRecordService } from '../services/serviceRecordService';
import { formatCurrency, formatDate, formatFileSize } from '../utils/formatters';

import './OcrScannerPage.css';

export default function OcrScannerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  // Data state
  const [documents, setDocuments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  // Active scan state
  const [selectedDocId, setSelectedDocId] = useState(() => searchParams.get('documentId') || '');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [scanStep, setScanStep] = useState('idle'); // idle, processing, complete
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStageLabel, setScanStageLabel] = useState('');
  const [ocrResult, setOcrResult] = useState(null);

  // Quick Action Modals
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  const [warrantyPrefill, setWarrantyPrefill] = useState(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [servicePrefill, setServicePrefill] = useState(null);
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);

  // Load documents and products
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError(null);
      const [docsRes, prodsRes] = await Promise.allSettled([
        documentService.getDocuments(),
        productService.getProducts(),
      ]);

      if (docsRes.status === 'rejected' && prodsRes.status === 'rejected') {
        throw docsRes.reason || new Error('Failed to load documents and products');
      }

      const docs = docsRes.status === 'fulfilled' ? docsRes.value : [];
      const prods = prodsRes.status === 'fulfilled' ? prodsRes.value : [];
      setDocuments(docs);
      setProducts(prods);

      // Auto-select document if passed in query param or pick first pending/first available
      const initialId = searchParams.get('documentId');
      if (initialId) {
        const found = docs.find((d) => d.id === initialId);
        if (found) {
          setSelectedDocId(found.id);
          setSelectedDoc(found);
          if (found.ocrStatus === 'Completed' && found.ocrStructuredData) {
            setOcrResult({
              rawText: found.ocrExtractedText,
              structuredData: found.ocrStructuredData,
              confidence: 0.96,
            });
            setScanStep('complete');
          }
        }
      } else if (docs.length > 0 && !selectedDocId) {
        // Prefer one that is Not Processed
        const pending = docs.find((d) => d.ocrStatus !== 'Completed') || docs[0];
        setSelectedDocId(pending.id);
        setSelectedDoc(pending);
        if (pending.ocrStatus === 'Completed' && pending.ocrStructuredData) {
          setOcrResult({
            rawText: pending.ocrExtractedText,
            structuredData: pending.ocrStructuredData,
            confidence: 0.95,
          });
          setScanStep('complete');
        }
      }
    } catch (err) {
      console.error('Failed to load documents for OCR studio:', err);
      setPageError(err?.message || 'Failed to load documents for OCR studio.');
      toast.error('Could not load documents.');
    } finally {
      setLoading(false);
    }
  }, [searchParams, selectedDocId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle changing document selection
  const handleSelectDocument = (docId) => {
    setSelectedDocId(docId);
    const doc = documents.find((d) => d.id === docId);
    setSelectedDoc(doc || null);
    if (doc?.ocrStatus === 'Completed' && doc?.ocrStructuredData) {
      setOcrResult({
        rawText: doc.ocrExtractedText,
        structuredData: doc.ocrStructuredData,
        confidence: 0.95,
      });
      setScanStep('complete');
    } else {
      setOcrResult(null);
      setScanStep('idle');
      setScanProgress(0);
    }
  };

  // Run Simulated Scan
  const handleStartScan = async () => {
    if (scanStep === 'processing' || isSubmittingRecord) return;
    if (!selectedDoc) {
      toast.warning('Please select a document to scan.');
      return;
    }

    setScanStep('processing');
    setScanProgress(15);
    setScanStageLabel('Step 1/3: Image preprocessing & perspective correction...');

    try {
      await new Promise((r) => setTimeout(r, 250));
      setScanProgress(55);
      setScanStageLabel('Step 2/3: Neural character recognition & layout parsing...');

      await new Promise((r) => setTimeout(r, 300));
      setScanProgress(85);
      setScanStageLabel('Step 3/3: Entity extraction (Invoice #, dates, serial, amount)...');

      const response = await ocrService.processDocument(selectedDoc.id);
      const extractedOcr = response?.ocrResult || response;

      setScanProgress(100);
      setScanStageLabel('Extraction complete!');
      setOcrResult({
        rawText: extractedOcr.ocrExtractedText || extractedOcr.rawText || '',
        structuredData: extractedOcr.ocrStructuredData || extractedOcr.structuredData || null,
        confidence: 0.96,
      });
      setScanStep('complete');
      toast.success(`OCR scan finished for "${selectedDoc.fileName}"!`);

      // Refresh document list in background
      const updatedDocs = await documentService.getDocuments();
      setDocuments(updatedDocs);
      const updated = updatedDocs.find((d) => d.id === selectedDoc.id);
      if (updated) setSelectedDoc(updated);
    } catch (err) {
      console.error('OCR scan failed:', err);
      toast.error(err.message || 'OCR scan failed.');
      setScanStep('idle');
    }
  };

  // Copy raw text
  const handleCopyText = () => {
    if (!ocrResult?.rawText) return;
    navigator.clipboard.writeText(ocrResult.rawText);
    toast.success('Extracted text copied to clipboard.');
  };

  // Actions: Warranty & Service Record creation
  const handleOpenWarrantyModal = () => {
    const s = ocrResult?.structuredData || selectedDoc?.ocrStructuredData || {};
    const prod = selectedDoc?.product;
    setWarrantyPrefill({
      productId: selectedDoc?.productId || (products[0]?.id || ''),
      provider: s.vendor || prod?.brand || '',
      type: s.warrantyPeriod || 'Comprehensive Manufacturer Warranty',
      startDate: s.purchaseDate || new Date().toISOString().split('T')[0],
      durationMonths: s.warrantyPeriod?.includes('2') ? '24' : '12',
      terms: `Extracted via SmartCare OCR from ${selectedDoc?.fileName}. ${s.invoiceNumber ? `Invoice #${s.invoiceNumber}` : ''}`,
    });
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
      console.error('Failed to register warranty:', err);
      toast.error(err.message || 'Failed to register warranty.');
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  const handleOpenServiceModal = () => {
    const s = ocrResult?.structuredData || selectedDoc?.ocrStructuredData || {};
    const prod = selectedDoc?.product;
    setServicePrefill({
      productId: selectedDoc?.productId || (products[0]?.id || ''),
      provider: s.serviceCenter || s.vendor || prod?.brand || 'Authorized Service',
      serviceType: s.serviceType || 'Maintenance',
      serviceDate: s.serviceDate || s.purchaseDate || new Date().toISOString().split('T')[0],
      cost: s.totalCost !== undefined ? String(s.totalCost) : '0',
      issueDescription: s.issueReported || `Service for ${prod?.name || selectedDoc?.fileName}`,
      workPerformed: s.workPerformed || 'Inspection, cleaning, and routine calibration',
      notes: `Extracted via SmartCare OCR from ${selectedDoc?.fileName}`,
    });
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
      console.error('Failed to log service record:', err);
      toast.error(err.message || 'Failed to log service record.');
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  const documentOptions = documents.map((d) => ({
    value: d.id,
    label: `${d.fileName} (${d.documentType} • ${d.product?.name || 'Unassigned'}) [${d.ocrStatus}]`,
  }));

  const structuredData = ocrResult?.structuredData || selectedDoc?.ocrStructuredData;

  return (
    <div className="ocr-scanner-page">
      {/* 1. Page Header */}
      <PageHeader
        title="OCR Scanner Studio"
        subtitle="Simulate automated optical character recognition to extract invoices, warranty cards, and maintenance receipts into structured product records."
        actions={
          <div className="ocr-header-actions">
            <Button
              variant="outline"
              icon={FiFileText}
              onClick={() => navigate('/documents')}
            >
              Document Vault
            </Button>
          </div>
        }
      />

      {loading ? (
        <Card className="ocr-loading-card">
          <LoadingSpinner text="Loading documents and OCR studio..." />
        </Card>
      ) : pageError && documents.length === 0 ? (
        <ErrorState
          title="OCR Studio Unavailable"
          message={pageError}
          onRetry={loadData}
        />
      ) : (
        <div className="ocr-studio-grid">
          {/* LEFT COLUMN: Document Selection & Live Scanner Preview */}
          <div className="ocr-studio-left">
            {/* Document Selector Card */}
            <Card title="Select Document to Scan" className="ocr-card">
              <div className="doc-select-box">
                <Select
                  label="Document from Vault"
                  name="selectedDocument"
                  value={selectedDocId}
                  onChange={(e) => handleSelectDocument(e.target.value)}
                  options={documentOptions}
                />

                {selectedDoc && (
                  <div className="selected-doc-summary">
                    <div className="summary-row">
                      <span className="summary-label">Category:</span>
                      <Badge variant="primary" size="sm">
                        {selectedDoc.documentType}
                      </Badge>
                      <span className="summary-label">Format:</span>
                      <Badge variant="neutral" size="sm">
                        {selectedDoc.fileType}
                      </Badge>
                      <span className="summary-label">OCR Status:</span>
                      <OCRStatusBadge status={selectedDoc.ocrStatus} />
                    </div>
                    {selectedDoc.product && (
                      <div className="summary-row product-row">
                        <span className="summary-label">Product:</span>
                        <span className="summary-val">
                          <strong>{selectedDoc.product.name}</strong> ({selectedDoc.product.brand})
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="scan-controls-row">
                  <Button
                    variant="primary"
                    icon={FiCamera}
                    onClick={handleStartScan}
                    loading={scanStep === 'processing'}
                    disabled={!selectedDoc || scanStep === 'processing'}
                  >
                    {selectedDoc?.ocrStatus === 'Completed' ? 'Re-run OCR Scan' : 'Run OCR Scan'}
                  </Button>
                  {selectedDoc && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={FiExternalLink}
                      onClick={() => navigate(`/documents/${selectedDoc.id}`)}
                    >
                      View in Vault
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Document Preview Card */}
            {selectedDoc && (
              <Card title="Source Document" className="ocr-card">
                <DocumentPreview document={selectedDoc} />
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN: OCR Processing & Extraction Results */}
          <div className="ocr-studio-right">
            {scanStep === 'processing' && (
              <Card className="ocr-processing-card">
                <div className="scanner-animation-wrapper">
                  <div className="scanner-laser-line" />
                  <div className="scanner-icon-bubble">
                    <FiCpu className="spin-slow" />
                  </div>
                  <h3>Optical Character Recognition in Progress</h3>
                  <p className="scanner-stage-text">{scanStageLabel}</p>

                  <div className="scanner-progress-track">
                    <div
                      className="scanner-progress-fill"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <span className="scanner-progress-pct">{scanProgress}%</span>
                </div>
              </Card>
            )}

            {scanStep !== 'processing' && !structuredData && (
              <Card className="ocr-idle-card">
                <div className="ocr-idle-content">
                  <div className="ocr-idle-icon">
                    <FiCamera />
                  </div>
                  <h3>Ready to Scan</h3>
                  <p>
                    Select an invoice, warranty certificate, or receipt from the list on the left
                    and click <strong>Run OCR Scan</strong> to parse text and extract structured
                    information.
                  </p>
                  <div className="ocr-features-pill-group">
                    <span className="feature-pill">
                      <FiCheckCircle /> Automatic Invoice Parsing
                    </span>
                    <span className="feature-pill">
                      <FiCheckCircle /> Serial Number Detection
                    </span>
                    <span className="feature-pill">
                      <FiCheckCircle /> 1-Click Warranty Generation
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {scanStep !== 'processing' && structuredData && (
              <div className="ocr-results-container">
                {/* Result Status Banner */}
                <Card className="ocr-result-banner-card">
                  <div className="ocr-banner-header">
                    <div className="banner-title-area">
                      <FiCheckCircle className="banner-icon-success" />
                      <div>
                        <h3>OCR Recognition Successful</h3>
                        <p>Confidence score: <strong>96%</strong> • Extracted structured entities</p>
                      </div>
                    </div>
                    <div className="banner-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={FiShield}
                        onClick={handleOpenWarrantyModal}
                      >
                        Create Warranty
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={FiTool}
                        onClick={handleOpenServiceModal}
                      >
                        Create Service Record
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Structured Entities Card */}
                <Card title="Extracted Data Fields" className="ocr-card">
                  <div className="ocr-entities-grid">
                    <div className="entity-item">
                      <span className="entity-label">Product / Model</span>
                      <span className="entity-val font-semibold">
                        {structuredData.productName || structuredData.product || structuredData.model || 'N/A'}
                      </span>
                    </div>

                    <div className="entity-item">
                      <span className="entity-label">Brand / Manufacturer</span>
                      <span className="entity-val font-semibold">
                        {structuredData.brand || structuredData.manufacturer || 'N/A'}
                      </span>
                    </div>

                    <div className="entity-item">
                      <span className="entity-label">Model Designation</span>
                      <span className="entity-val font-mono">
                        {structuredData.modelNumber || structuredData.model || 'N/A'}
                      </span>
                    </div>

                    <div className="entity-item">
                      <span className="entity-label">Serial Number</span>
                      <span className="entity-val font-mono">
                        {structuredData.serialNumber || 'N/A'}
                      </span>
                    </div>

                    <div className="entity-item">
                      <span className="entity-label">Date (Purchase / Service)</span>
                      <span className="entity-val">
                        {formatDate(structuredData.purchaseDate || structuredData.serviceDate || structuredData.warrantyStart)}
                      </span>
                    </div>

                    <div className="entity-item">
                      <span className="entity-label">Amount / Cost</span>
                      <span className="entity-val font-semibold text-primary">
                        {formatCurrency(structuredData.purchasePrice || structuredData.amount || structuredData.serviceCost || 0)}
                      </span>
                    </div>

                    <div className="entity-item">
                      <span className="entity-label">Coverage / Plan</span>
                      <span className="entity-val">
                        {structuredData.warrantyPeriod || structuredData.coverageScope || structuredData.serviceProvider || 'Standard'}
                      </span>
                    </div>

                    <div className="entity-item">
                      <span className="entity-label">Store / Service Center</span>
                      <span className="entity-val">
                        {structuredData.seller || structuredData.vendor || structuredData.serviceProvider || structuredData.provider || 'N/A'}
                      </span>
                    </div>

                    {(structuredData.invoiceNumber || structuredData.jobCardNo) && (
                      <div className="entity-item">
                        <span className="entity-label">Reference / Job No.</span>
                        <span className="entity-val font-mono">
                          {structuredData.invoiceNumber || structuredData.jobCardNo}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Raw Extracted Text Card */}
                {(ocrResult?.rawText || selectedDoc?.ocrExtractedText) && (
                  <Card
                    title="Raw Extracted OCR Text"
                    className="ocr-card"
                    actions={
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={FiCopy}
                        onClick={handleCopyText}
                      >
                        Copy Text
                      </Button>
                    }
                  >
                    <pre className="raw-ocr-text-box">
                      {ocrResult?.rawText || selectedDoc?.ocrExtractedText}
                    </pre>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Action: Register Warranty Modal */}
      <WarrantyFormModal
        isOpen={isWarrantyModalOpen}
        onClose={() => setIsWarrantyModalOpen(false)}
        initialValues={warrantyPrefill}
        initialProductId={selectedDoc?.productId}
        products={products}
        onSubmit={handleSubmitWarranty}
        loading={isSubmittingRecord}
      />

      {/* Quick Action: Log Service Record Modal */}
      <ServiceRecordFormModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        initialValues={servicePrefill}
        initialProductId={selectedDoc?.productId}
        products={products}
        onSubmit={handleSubmitService}
        loading={isSubmittingRecord}
      />
    </div>
  );
}
