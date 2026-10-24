import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiPlus, FiCamera, FiFileText } from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader/PageHeader';
import Button from '../components/common/Button/Button';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Card from '../components/common/Card/Card';
import EmptyState from '../components/common/EmptyState/EmptyState';
import ErrorState from '../components/common/ErrorState/ErrorState';
import ConfirmDialog from '../components/common/ConfirmDialog/ConfirmDialog';
import { useToast } from '../hooks/useToast';

import DocumentKpiCards from '../components/documents/DocumentKpiCards';
import DocumentFilterBar from '../components/documents/DocumentFilterBar';
import DocumentTable from '../components/documents/DocumentTable';
import DocumentUploadModal from '../components/documents/DocumentUploadModal';

import { documentService } from '../services/documentService';
import { productService } from '../services/productService';
import { ocrService } from '../services/ocrService';

import './DocumentsPage.css';

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  // Data state
  const [documents, setDocuments] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search state
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [selectedType, setSelectedType] = useState(() => searchParams.get('type') || 'all');
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'all');
  const [selectedOcrStatus, setSelectedOcrStatus] = useState(() => searchParams.get('ocrStatus') || 'all');
  const [selectedFileType, setSelectedFileType] = useState(() => searchParams.get('fileType') || 'all');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || 'date_desc');

  // Modal and Operation state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(() => Boolean(searchParams.get('upload')));
  const [preselectedProductId, setPreselectedProductId] = useState(() => searchParams.get('productId') || '');
  const [deletingDocument, setDeletingDocument] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [processingOcrId, setProcessingOcrId] = useState(null);

  // Load all documents, products, and statistics independently
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Execute each service call independently, isolating both synchronous throws and promise rejections
      const docsPromise = Promise.resolve().then(() => documentService.getDocuments());
      const productsPromise = Promise.resolve().then(() => productService.getProducts());
      const statsPromise = Promise.resolve().then(() => documentService.getDocumentStats());

      const [fetchedDocsResult, fetchedProductsResult, fetchedStatsResult] =
        await Promise.allSettled([docsPromise, productsPromise, statsPromise]);

      let loadedDocs = [];
      let docsError = null;

      // 1. Process documents
      if (fetchedDocsResult.status === 'fulfilled') {
        loadedDocs = fetchedDocsResult.value || [];
        setDocuments(loadedDocs);
      } else {
        docsError = fetchedDocsResult.reason;
      }

      // 2. Process products
      if (fetchedProductsResult.status === 'fulfilled') {
        setProducts(fetchedProductsResult.value || []);
      }

      // 3. Process statistics with fallback calculation from loaded documents
      if (fetchedStatsResult.status === 'fulfilled' && fetchedStatsResult.value) {
        setStats(fetchedStatsResult.value);
      } else if (fetchedDocsResult.status === 'fulfilled') {
        // Fallback: derive statistics directly from loaded documents
        const totalDocuments = loadedDocs.length;
        const warrantyDocuments = loadedDocs.filter((d) => {
          const type = String(d?.documentType || d?.document_type || '').toLowerCase();
          return type === 'warranty card' || type === 'warranty';
        }).length;
        const serviceDocuments = loadedDocs.filter((d) => {
          const type = String(d?.documentType || d?.document_type || '').toLowerCase();
          return type === 'service invoice' || type === 'service report';
        }).length;
        const ocrCompleted = loadedDocs.filter((d) => {
          const st = String(d?.ocrStatus || d?.ocr_status || '').toLowerCase();
          return st === 'completed';
        }).length;
        const ocrPending = loadedDocs.filter((d) => {
          const st = String(d?.ocrStatus || d?.ocr_status || '').toLowerCase();
          return st === 'pending' || st === 'processing';
        }).length;
        const totalStorageBytes = loadedDocs.reduce(
          (sum, d) => sum + (Number(d?.fileSize !== undefined ? d?.fileSize : d?.file_size) || 0),
          0
        );

        setStats({
          totalDocuments,
          warrantyDocuments,
          serviceDocuments,
          ocrCompleted,
          ocrPending,
          totalStorageBytes,
        });
      } else {
        setStats(null);
      }

      // 4. Critical error check: If documents failed, bubble error up for ErrorState & retry
      if (docsError) {
        throw docsError;
      }
    } catch (err) {
      setError(err?.message || 'Could not load documents. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dynamic filter options based on products in inventory
  const availableCategories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Compute active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedType !== 'all') count++;
    if (selectedCategory !== 'all') count++;
    if (selectedOcrStatus !== 'all') count++;
    if (selectedFileType !== 'all') count++;
    return count;
  }, [searchQuery, selectedType, selectedCategory, selectedOcrStatus, selectedFileType]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedOcrStatus('all');
    setSelectedFileType('all');
    setSortBy('date_desc');
  };

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    // Search query filter (matches fileName, ID, product name, brand, documentType, fileType, OCR text, description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((doc) => {
        const prod = doc.product || {};
        return (
          String(doc.fileName ?? '').toLowerCase().includes(q) ||
          String(doc.id ?? '').toLowerCase().includes(q) ||
          String(doc.documentType ?? '').toLowerCase().includes(q) ||
          String(doc.fileType ?? '').toLowerCase().includes(q) ||
          String(doc.description ?? '').toLowerCase().includes(q) ||
          String(doc.ocrExtractedText ?? '').toLowerCase().includes(q) ||
          String(prod.name ?? '').toLowerCase().includes(q) ||
          String(prod.brand ?? '').toLowerCase().includes(q) ||
          String(prod.category ?? '').toLowerCase().includes(q) ||
          String(doc.productId ?? '').toLowerCase().includes(q) ||
          String(prod.productId ?? prod.product_code ?? '').toLowerCase().includes(q)
        );
      });
    }

    // Document Type filter
    if (selectedType !== 'all') {
      result = result.filter((doc) => doc.documentType === selectedType);
    }

    // Product Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((doc) => doc.product?.category === selectedCategory);
    }

    // OCR Status filter
    if (selectedOcrStatus !== 'all') {
      result = result.filter((doc) => doc.ocrStatus === selectedOcrStatus);
    }

    // File Type filter
    if (selectedFileType !== 'all') {
      result = result.filter((doc) => doc.fileType?.toUpperCase() === selectedFileType.toUpperCase());
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
        case 'uploadedAt_desc':
          return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
        case 'date_asc':
        case 'uploadedAt_asc':
          return new Date(a.uploadedAt || 0) - new Date(b.uploadedAt || 0);
        case 'name_asc':
        case 'fileName_asc':
          return (a.fileName || '').localeCompare(b.fileName || '');
        case 'name_desc':
        case 'fileName_desc':
          return (b.fileName || '').localeCompare(a.fileName || '');
        case 'size_desc':
        case 'fileSize_desc':
          return (b.fileSize || 0) - (a.fileSize || 0);
        case 'size_asc':
        case 'fileSize_asc':
          return (a.fileSize || 0) - (b.fileSize || 0);
        case 'product_asc':
          return (a.product?.name || '').localeCompare(b.product?.name || '');
        case 'product_desc':
          return (b.product?.name || '').localeCompare(a.product?.name || '');
        case 'ocrStatus_asc':
          return (a.ocrStatus || '').localeCompare(b.ocrStatus || '');
        default:
          return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
      }
    });

    return result;
  }, [documents, searchQuery, selectedType, selectedCategory, selectedOcrStatus, selectedFileType, sortBy]);

  // Actions
  const handleViewDocument = (doc) => {
    navigate(`/documents/${doc.id}`);
  };

  const handleRunOcr = async (doc) => {
    if (processingOcrId) return;
    try {
      setProcessingOcrId(doc.id);
      toast.info(`Extracting text and metadata from "${doc.fileName}" via Demo OCR...`);

      const result = await ocrService.processDocument(doc.id);
      toast.success(`OCR completed for "${doc.fileName}". Extracted ${Object.keys(result.structuredData || {}).length} data fields.`);

      // Refresh documents and stats to reflect new status
      await loadData();
    } catch (err) {
      toast.error(err.message || 'OCR processing failed.');
    } finally {
      setProcessingOcrId(null);
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      toast.info(`Downloading "${doc.fileName}"...`);
      await documentService.downloadDocument(doc.id, doc.fileName);
      toast.success(`Downloaded "${doc.fileName}"`);
    } catch (err) {
      toast.error('Failed to download document file.');
    }
  };

  const handleDeleteDocument = (doc) => {
    setDeletingDocument(doc);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDocument || isDeleting) return;
    try {
      setIsDeleting(true);
      await documentService.deleteDocument(deletingDocument.id);
      toast.success(`Document "${deletingDocument.fileName}" deleted.`);
      setDeletingDocument(null);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Upload handler
  const handleUploadSubmit = async (formData) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const created = await documentService.createDocument(formData);
      toast.success(`"${created.fileName}" has been successfully uploaded.`);
      setIsUploadModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to upload document.');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="documents-page">
      {/* 1. Page Header */}
      <PageHeader
        title="Documents"
        subtitle="Store and manage invoices, warranty cards, receipts, and service manuals"
        actions={
          <div className="doc-page-header-actions">
            <Button
              variant="outline"
              icon={FiCamera}
              onClick={() => navigate('/ocr')}
              title="Open Demo OCR Scanner Studio"
            >
              OCR Scanner
            </Button>
            <Button
              variant="primary"
              icon={FiPlus}
              onClick={() => setIsUploadModalOpen(true)}
            >
              Upload Document
            </Button>
          </div>
        }
      />

      {/* 2. Loading / Error States */}
      {loading && !documents.length ? (
        <Card className="doc-loading-card">
          <LoadingSpinner text="Loading your product documents and vault data..." />
        </Card>
      ) : error ? (
        <ErrorState
          title="Unable to load documents"
          message={error}
          onRetry={loadData}
          retryLabel="Retry"
        />
      ) : (
        <>
          {/* 3. KPI Statistics Cards */}
          <DocumentKpiCards stats={stats} loading={loading} />

          {/* 4. Filter and Search Controls */}
          <DocumentFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedOcrStatus={selectedOcrStatus}
            onOcrStatusChange={setSelectedOcrStatus}
            selectedFileType={selectedFileType}
            onFileTypeChange={setSelectedFileType}
            sortBy={sortBy}
            onSortChange={setSortBy}
            availableCategories={availableCategories}
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
          />

          {/* 5. Document List Table & Mobile Cards */}
          {filteredDocuments.length > 0 ? (
            <Card className="document-table-card">
              <DocumentTable
                documents={filteredDocuments}
                onViewDocument={handleViewDocument}
                onRunOcr={handleRunOcr}
                onDownloadDocument={handleDownloadDocument}
                onDeleteDocument={handleDeleteDocument}
                processingOcrId={processingOcrId}
              />
            </Card>
          ) : (
            <Card className="document-empty-card">
              <EmptyState
                icon={FiFileText}
                title={
                  activeFilterCount > 0
                    ? 'No matching documents found'
                    : 'No documents in your vault'
                }
                description={
                  activeFilterCount > 0
                    ? 'Try adjusting your search terms or filter criteria to find the document you need.'
                    : 'Upload purchase receipts, warranty cards, invoices, or service reports to keep your product records organized.'
                }
                actionLabel={activeFilterCount > 0 ? 'Reset All Filters' : 'Upload First Document'}
                actionIcon={activeFilterCount > 0 ? undefined : FiPlus}
                onAction={activeFilterCount > 0 ? handleResetFilters : () => setIsUploadModalOpen(true)}
              />
            </Card>
          )}
        </>
      )}

      {/* 6. Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setPreselectedProductId('');
        }}
        products={products}
        initialProductId={preselectedProductId}
        onSubmit={handleUploadSubmit}
        loading={isSubmitting}
        existingDocuments={documents}
      />

      {/* 7. Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingDocument)}
        title="Delete Document"
        message={
          deletingDocument
            ? `Are you sure you want to delete "${deletingDocument.fileName}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete Document"
        cancelText="Keep Document"
        variant="danger"
        confirmLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingDocument(null)}
      />
    </div>
  );
}
