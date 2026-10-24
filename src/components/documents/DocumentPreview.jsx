import React, { useState, useEffect } from 'react';
import {
  FiFileText,
  FiExternalLink,
  FiDownload,
  FiMaximize2,
  FiAlertCircle,
  FiImage,
} from 'react-icons/fi';
import Button from '../common/Button/Button';
import LoadingSpinner from '../common/LoadingSpinner/LoadingSpinner';
import { isImageFile, isPdfFile } from '../../utils/documentUtils';
import { formatFileSize } from '../../utils/formatters';
import { documentService } from '../../services/documentService';
import './DocumentPreview.css';

export default function DocumentPreview({ document, onDownload, onOpen }) {
  const [imageError, setImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageBlobUrl, setImageBlobUrl] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);

  // Securely load image as an authenticated Blob Object URL with automatic revocation
  useEffect(() => {
    let isSubscribed = true;
    let currentObjectUrl = null;

    setImageError(false);

    if (document && isImageFile(document.fileName, document.mimeType)) {
      // 1. Static mock or local data/blob URL support
      if (
        typeof document.fileUrl === 'string' &&
        (document.fileUrl.startsWith('blob:') ||
          document.fileUrl.startsWith('data:') ||
          document.fileUrl.startsWith('/mock-files'))
      ) {
        setImageBlobUrl(document.fileUrl);
        return;
      }

      // 2. Authenticated backend fetch (sends Authorization: Bearer <token>)
      if (document.id) {
        setLoadingImage(true);
        documentService
          .getDocumentBlob(document.id)
          .then(({ blob }) => {
            if (isSubscribed) {
              currentObjectUrl = window.URL.createObjectURL(blob);
              setImageBlobUrl(currentObjectUrl);
            }
          })
          .catch((err) => {
            console.error('Failed to load authenticated image preview blob:', err);
            if (isSubscribed) setImageError(true);
          })
          .finally(() => {
            if (isSubscribed) setLoadingImage(false);
          });
      }
    } else {
      setImageBlobUrl(null);
    }

    return () => {
      isSubscribed = false;
      if (currentObjectUrl) {
        window.URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [document?.id, document?.fileName, document?.mimeType, document?.fileUrl]);

  if (!document) {
    return (
      <div className="doc-preview-placeholder">
        <FiAlertCircle className="preview-placeholder-icon" />
        <p>No document selected for preview.</p>
      </div>
    );
  }

  const isImg = isImageFile(document.fileName, document.mimeType);
  const isPdf = isPdfFile(document.fileName, document.mimeType);

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload();
    } else if (document?.id) {
      documentService.downloadDocument(document.id, document.fileName);
    }
  };

  const handleOpenClick = () => {
    if (onOpen) {
      onOpen();
    } else if (document?.id) {
      documentService.openDocument(document.id);
    }
  };

  // 1. Image Preview
  if (isImg) {
    return (
      <div className={`doc-preview-card image-preview ${isZoomed ? 'zoomed' : ''}`}>
        <div className="preview-header">
          <div className="preview-title-block">
            <FiImage className="preview-header-icon" />
            <span className="preview-filename">{document.fileName}</span>
          </div>
          <div className="preview-actions">
            <Button
              variant="ghost"
              size="sm"
              icon={FiMaximize2}
              onClick={() => setIsZoomed((prev) => !prev)}
              title={isZoomed ? 'Reset zoom' : 'Fit to width'}
              disabled={loadingImage || imageError}
            >
              {isZoomed ? 'Fit' : 'Zoom'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={FiDownload}
              onClick={handleDownloadClick}
            >
              Download
            </Button>
          </div>
        </div>

        <div className="preview-media-container">
          {loadingImage ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <LoadingSpinner text="Loading authenticated preview..." />
            </div>
          ) : imageBlobUrl && !imageError ? (
            <img
              src={imageBlobUrl}
              alt={document.fileName}
              className="doc-preview-img"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="unsupported-message-box" style={{ padding: 'var(--space-6)' }}>
              <FiAlertCircle className="unsupported-icon" />
              <p className="unsupported-sub">Unable to render preview for this image.</p>
            </div>
          )}
        </div>

        <div className="preview-footer">
          <span>{document.fileType || 'Image'} • {formatFileSize(document.fileSize)}</span>
        </div>
      </div>
    );
  }

  // 2. PDF Preview
  if (isPdf) {
    return (
      <div className="doc-preview-card pdf-preview">
        <div className="preview-header">
          <div className="preview-title-block">
            <FiFileText className="preview-header-icon pdf-color" />
            <span className="preview-filename">{document.fileName}</span>
          </div>
          <div className="preview-actions">
            <Button
              variant="outline"
              size="sm"
              icon={FiExternalLink}
              onClick={handleOpenClick}
            >
              Open File
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={FiDownload}
              onClick={handleDownloadClick}
            >
              Download
            </Button>
          </div>
        </div>

        <div className="pdf-sheet-frame">
          <div className="pdf-sheet-page">
            <div className="pdf-sheet-topbar">
              <span className="pdf-badge">PDF DOCUMENT</span>
              <span className="pdf-sheet-pages">Page 1 of 1</span>
            </div>
            <div className="pdf-sheet-content">
              <FiFileText className="pdf-watermark-icon" />
              <h4 className="pdf-sheet-title">{document.fileName}</h4>
              <p className="pdf-sheet-desc">
                {document.description || 'Verified SmartCare digital invoice / warranty receipt.'}
              </p>
              <div className="pdf-sheet-meta">
                <span>File Size: {formatFileSize(document.fileSize)}</span>
                <span>Type: {document.documentType}</span>
                <span>ID: {document.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="preview-footer">
          <span>PDF Document • Secured local file reference</span>
        </div>
      </div>
    );
  }

  // 3. Fallback: Clean unsupported file placeholder
  return (
    <div className="doc-preview-card unsupported-preview">
      <div className="preview-header">
        <div className="preview-title-block">
          <FiFileText className="preview-header-icon" />
          <span className="preview-filename">{document.fileName}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={FiDownload}
          onClick={handleDownloadClick}
        >
          Download
        </Button>
      </div>

      <div className="unsupported-message-box">
        <FiAlertCircle className="unsupported-icon" />
        <h4 className="unsupported-title">Preview not available for this file type.</h4>
        <p className="unsupported-sub">
          File format "{document.fileType || 'binary'}" cannot be rendered directly in the browser viewport.
        </p>
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Button variant="secondary" size="sm" icon={FiDownload} onClick={handleDownloadClick}>
            Download File ({formatFileSize(document.fileSize)})
          </Button>
        </div>
      </div>
    </div>
  );
}
