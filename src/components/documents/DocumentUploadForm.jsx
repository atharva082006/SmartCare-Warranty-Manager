import React, { useState, useRef, useEffect } from 'react';
import {
  FiUploadCloud,
  FiFileText,
  FiCheck,
  FiAlertCircle,
  FiX,
  FiPaperclip,
} from 'react-icons/fi';
import Button from '../common/Button/Button';
import Input from '../common/Input/Input';
import Select from '../common/Select/Select';
import {
  DOCUMENT_TYPES,
  validateUploadedFile,
  getFileTypeFromFileName,
  ALLOWED_EXTENSIONS,
} from '../../utils/documentUtils';
import { formatFileSize } from '../../utils/formatters';
import './DocumentUploadForm.css';

export default function DocumentUploadForm({
  products = [],
  initialProductId = '',
  onSubmit,
  onCancel,
  loading = false,
  existingDocuments = [],
}) {
  const fileInputRef = useRef(null);

  const [productId, setProductId] = useState(() => initialProductId || (products[0]?.id || ''));

  useEffect(() => {
    if (initialProductId) {
      setProductId(initialProductId);
    } else if (!productId && products.length > 0) {
      setProductId(products[0].id);
    }
  }, [initialProductId, products, productId]);
  const [documentType, setDocumentType] = useState('Invoice');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState({});

  const handleFileSelection = (file) => {
    if (!file) return;

    const validation = validateUploadedFile(file);
    if (!validation.isValid) {
      setErrors((prev) => ({ ...prev, file: validation.error }));
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    // Check duplicate warning against existing documents
    if (productId && existingDocuments.length > 0) {
      const isDuplicate = existingDocuments.some(
        (d) =>
          String(d.productId) === String(productId) &&
          String(d.fileName || '').toLowerCase() === file.name.trim().toLowerCase()
      );
      if (isDuplicate) {
        setErrors((prev) => ({
          ...prev,
          file: `Warning: A document named "${file.name}" is already uploaded for this product.`,
        }));
        // Still allow selection or prompt user
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.file;
          return next;
        });
      }
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.file;
        return next;
      });
    }

    setSelectedFile(file);

    // Create safe object URL for preview if browser supports
    try {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } catch {
      setPreviewUrl('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleFileSelection(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!productId) {
      nextErrors.productId = 'Please select a product for this document.';
    }

    if (!documentType) {
      nextErrors.documentType = 'Please select a document category.';
    }

    if (!selectedFile) {
      nextErrors.file = 'Please choose a document file to upload.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      productId,
      fileName: selectedFile.name,
      documentType,
      fileSize: selectedFile.size,
      mimeType: selectedFile.type || 'application/pdf',
      fileType: getFileTypeFromFileName(selectedFile.name, selectedFile.type),
      uploadedAt: new Date().toISOString(),
      description: description.trim(),
      fileUrl: previewUrl || '',
      ocrStatus: 'Not Processed',
      ocrProcessedAt: null,
      ocrExtractedText: '',
      ocrStructuredData: null,
      file: selectedFile,
    };

    onSubmit(payload);
  };

  const productOptions = products.map((p) => {
    let brandLabel = p.brand || '';
    if (brandLabel && p.modelNumber) {
      brandLabel += ` • ${p.modelNumber}`;
    } else if (!brandLabel && p.modelNumber) {
      brandLabel = p.modelNumber;
    }
    const label = brandLabel ? `${p.name} (${brandLabel})` : p.name;
    return {
      value: p.id,
      label,
    };
  });

  const typeOptions = DOCUMENT_TYPES.map((t) => ({ value: t, label: t }));

  return (
    <form className="document-upload-form" onSubmit={handleSubmit}>
      <div className="upload-form-grid">
        {/* Product Selector */}
        <div className="form-col-span-2">
          <Select
            label="Associated Product"
            name="productId"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              if (errors.productId) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.productId;
                  return next;
                });
              }
            }}
            options={productOptions}
            placeholder={products.length === 0 ? 'No products available' : 'Select an option'}
            disabled={products.length === 0}
            required
            error={errors.productId}
            helperText={
              products.length === 0
                ? 'No products found. Please add a product first.'
                : 'Link this invoice or warranty card to an inventory appliance'
            }
          />
        </div>

        {/* Document Type */}
        <div className="form-col-span-2">
          <Select
            label="Document Category"
            name="documentType"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            options={typeOptions}
            required
            error={errors.documentType}
          />
        </div>

        {/* Drag & Drop File Upload Zone */}
        <div className="form-col-span-2">
          <label className="input-label required-label">
            Document File <span className="req-star">*</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            name="documentFile"
            id="doc-file-input"
            className="hidden-file-input"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
          />

          {!selectedFile ? (
            <div
              className={`file-dropzone ${dragActive ? 'drag-active' : ''} ${
                errors.file ? 'has-error' : ''
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dropzone-icon-box">
                <FiUploadCloud />
              </div>
              <div className="dropzone-text-block">
                <p className="dropzone-primary-text">
                  <strong>Click to browse</strong> or drag & drop document here
                </p>
                <p className="dropzone-secondary-text">
                  Supported formats: PDF, JPG, PNG, WEBP (Max 10 MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="selected-file-card">
              <div className="file-info-col">
                <div className="file-badge-icon">
                  <FiPaperclip />
                </div>
                <div className="file-meta-col">
                  <span className="selected-file-name" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                  <span className="selected-file-size">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Document'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="remove-file-btn"
                onClick={removeSelectedFile}
                aria-label="Remove selected file"
              >
                <FiX />
              </button>
            </div>
          )}

          {errors.file && (
            <p className="field-error-msg doc-file-error" role="alert">
              <FiAlertCircle aria-hidden="true" />
              <span>{errors.file}</span>
            </p>
          )}
        </div>

        {/* Description / Notes */}
        <div className="form-col-span-2">
          <label htmlFor="doc-description" className="input-label">
            Notes / Description (Optional)
          </label>
          <textarea
            id="doc-description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Official 5-year compressor seal bill stamped by Croma Bangalore"
            rows={2}
            className="doc-textarea"
          />
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="upload-form-actions">
        {onCancel && (
          <Button
            variant="secondary"
            type="button"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          type="submit"
          loading={loading}
          icon={FiUploadCloud}
        >
          Upload Document
        </Button>
      </div>
    </form>
  );
}
