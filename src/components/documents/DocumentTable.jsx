import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiFileText,
  FiEye,
  FiCamera,
  FiDownload,
  FiTrash2,
  FiExternalLink,
  FiCheckCircle,
} from 'react-icons/fi';
import Button from '../common/Button/Button';
import Badge from '../common/Badge/Badge';
import OCRStatusBadge from './OCRStatusBadge';
import { formatDate, formatFileSize } from '../../utils/formatters';
import {
  getDocumentTypeBadgeVariant,
  getFileTypeBadgeVariant,
} from '../../utils/documentUtils';
import './DocumentTable.css';

export default function DocumentTable({
  documents = [],
  onViewDocument,
  onRunOcr,
  onDownloadDocument,
  onDeleteDocument,
  processingOcrId = null,
}) {
  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <div className="document-list-container">
      {/* 1. Desktop Table (>= 640px) */}
      <div className="document-table-wrapper">
        <table className="document-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Product</th>
              <th>Type</th>
              <th>File Size</th>
              <th>Upload Date</th>
              <th>OCR Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const prod = doc.product;
              const isOcrProcessing = processingOcrId === doc.id || doc.ocrStatus === 'Processing';

              return (
                <tr key={doc.id} className="document-row">
                  {/* Document Column */}
                  <td className="doc-main-cell">
                    <div className="doc-main-item">
                      <div className="doc-icon-wrapper">
                        <FiFileText className="doc-file-icon" />
                      </div>
                      <div className="doc-meta-text">
                        <Link
                          to={`/documents/${doc.id}`}
                          className="doc-name-link"
                          title={doc.fileName}
                        >
                          {doc.fileName}
                        </Link>
                        <div className="doc-submeta">
                          <span className="doc-id-code">{doc.id}</span>
                          <Badge
                            variant={getFileTypeBadgeVariant(doc.fileType)}
                            size="sm"
                          >
                            {doc.fileType || 'DOC'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Product Column */}
                  <td className="doc-product-cell">
                    {prod ? (
                      <div className="doc-product-meta">
                        <Link
                          to={`/products/${prod.id}`}
                          className="doc-product-link"
                          title={prod.name}
                        >
                          {prod.name}
                        </Link>
                        <span className="doc-product-sub">
                          {prod.brand} • {prod.category}
                        </span>
                      </div>
                    ) : (
                      <span className="doc-unassigned-text">
                        {doc.productId || 'Unassigned'}
                      </span>
                    )}
                  </td>

                  {/* Document Type */}
                  <td>
                    <Badge
                      variant={getDocumentTypeBadgeVariant(doc.documentType)}
                      size="sm"
                    >
                      {doc.documentType}
                    </Badge>
                  </td>

                  {/* File Size */}
                  <td className="doc-size-cell">
                    {formatFileSize(doc.fileSize)}
                  </td>

                  {/* Upload Date */}
                  <td className="doc-date-cell">
                    {formatDate(doc.uploadedAt)}
                  </td>

                  {/* OCR Status */}
                  <td>
                    <OCRStatusBadge status={isOcrProcessing ? 'Processing' : doc.ocrStatus} />
                  </td>

                  {/* Action Buttons */}
                  <td className="doc-actions-cell" style={{ textAlign: 'right' }}>
                    <div className="table-actions-group">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={FiEye}
                        className="table-action-btn view-btn"
                        title="View Document Details"
                        onClick={() => onViewDocument(doc)}
                      >
                        View
                      </Button>

                      {/* OCR Trigger Action */}
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={doc.ocrStatus === 'Completed' ? FiCheckCircle : FiCamera}
                        loading={isOcrProcessing}
                        disabled={isOcrProcessing}
                        className={`table-action-btn ocr-btn ${doc.ocrStatus === 'Completed' ? 'ocr-done' : ''}`}
                        title={
                          doc.ocrStatus === 'Completed'
                            ? 'Re-run Demo OCR'
                            : 'Run Demo OCR'
                        }
                        onClick={() => onRunOcr(doc)}
                      >
                        {doc.ocrStatus === 'Completed' ? 'Re-OCR' : 'OCR'}
                      </Button>

                      {/* Download Action */}
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={doc.fileUrl?.startsWith('http') ? FiExternalLink : FiDownload}
                        className="table-action-btn download-btn"
                        title="Download or open document"
                        onClick={() => onDownloadDocument(doc)}
                      >
                        Open
                      </Button>

                      {/* Delete Action */}
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={FiTrash2}
                        className="table-action-btn delete-btn"
                        title="Delete Document"
                        onClick={() => onDeleteDocument(doc)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2. Mobile Cards (< 640px) */}
      <div className="mobile-documents-container">
        {documents.map((doc) => {
          const prod = doc.product;
          const isOcrProcessing = processingOcrId === doc.id || doc.ocrStatus === 'Processing';

          return (
            <div key={doc.id} className="mobile-doc-card">
              <div className="mobile-doc-header">
                <div className="mobile-doc-title-row">
                  <FiFileText className="mobile-doc-icon" />
                  <Link
                    to={`/documents/${doc.id}`}
                    className="mobile-doc-title"
                  >
                    {doc.fileName}
                  </Link>
                </div>
                <div className="mobile-badges-row">
                  <Badge
                    variant={getDocumentTypeBadgeVariant(doc.documentType)}
                    size="sm"
                  >
                    {doc.documentType}
                  </Badge>
                  <OCRStatusBadge status={isOcrProcessing ? 'Processing' : doc.ocrStatus} />
                </div>
              </div>

              <div className="mobile-doc-body">
                {prod && (
                  <div className="mobile-meta-item">
                    <span className="mobile-meta-label">Product:</span>
                    <Link
                      to={`/products/${prod.id}`}
                      className="mobile-product-link"
                    >
                      {prod.name} ({prod.brand})
                    </Link>
                  </div>
                )}

                <div className="mobile-meta-grid">
                  <div className="mobile-meta-item">
                    <span className="mobile-meta-label">File Type:</span>
                    <Badge
                      variant={getFileTypeBadgeVariant(doc.fileType)}
                      size="sm"
                    >
                      {doc.fileType || 'DOC'}
                    </Badge>
                  </div>
                  <div className="mobile-meta-item">
                    <span className="mobile-meta-label">Size:</span>
                    <span className="mobile-meta-val">
                      {formatFileSize(doc.fileSize)}
                    </span>
                  </div>
                  <div className="mobile-meta-item">
                    <span className="mobile-meta-label">Uploaded:</span>
                    <span className="mobile-meta-val">
                      {formatDate(doc.uploadedAt)}
                    </span>
                  </div>
                  <div className="mobile-meta-item">
                    <span className="mobile-meta-label">Doc ID:</span>
                    <span className="mobile-meta-val code-font">
                      {doc.id}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mobile-doc-actions">
                <Button
                  variant="outline"
                  size="sm"
                  icon={FiEye}
                  onClick={() => onViewDocument(doc)}
                >
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={FiCamera}
                  loading={isOcrProcessing}
                  disabled={isOcrProcessing}
                  onClick={() => onRunOcr(doc)}
                >
                  {doc.ocrStatus === 'Completed' ? 'Re-OCR' : 'OCR'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={FiDownload}
                  onClick={() => onDownloadDocument(doc)}
                >
                  Open
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={FiTrash2}
                  onClick={() => onDeleteDocument(doc)}
                >
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
