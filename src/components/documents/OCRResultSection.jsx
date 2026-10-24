import React, { useState } from 'react';
import {
  FiCpu,
  FiCamera,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiCopy,
  FiCheck,
  FiShield,
  FiTool,
  FiFileText,
} from 'react-icons/fi';
import Button from '../common/Button/Button';
import Badge from '../common/Badge/Badge';
import Card from '../common/Card/Card';
import OCRStatusBadge from './OCRStatusBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import './OCRResultSection.css';

export default function OCRResultSection({
  document,
  onRunOcr,
  isProcessing = false,
  onCreateWarranty,
  onCreateServiceRecord,
}) {
  const [copied, setCopied] = useState(false);

  if (!document) return null;

  const ocrStatus = isProcessing ? 'Processing' : document.ocrStatus || 'Not Processed';
  const hasExtractedText = Boolean(document.ocrExtractedText);
  const structuredData = document.ocrStructuredData;

  const handleCopyText = () => {
    if (!document.ocrExtractedText) return;
    navigator.clipboard?.writeText(document.ocrExtractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check which action buttons to offer
  const isWarrantyDoc =
    document.documentType === 'Warranty Card' ||
    (structuredData && (structuredData.warrantyStart || structuredData.warrantyEnd));

  const isServiceDoc =
    document.documentType === 'Service Invoice' ||
    document.documentType === 'Service Report' ||
    document.documentType === 'Service Receipt' ||
    (structuredData && (structuredData.serviceCost !== undefined || structuredData.workPerformed));

  return (
    <Card
      title="Optical Character Recognition (Demo OCR)"
      subtitle="Automated scan & key-value entity extraction for warranty & service paperwork"
      className="ocr-result-card"
      actions={
        <div className="ocr-header-actions">
          <OCRStatusBadge status={ocrStatus} size="md" />
          <Button
            variant={ocrStatus === 'Completed' ? 'outline' : 'primary'}
            size="sm"
            icon={FiCamera}
            loading={isProcessing}
            disabled={isProcessing}
            onClick={onRunOcr}
          >
            {isProcessing
              ? 'Processing document...'
              : ocrStatus === 'Completed'
              ? 'Re-run Demo OCR'
              : 'Run Demo OCR'}
          </Button>
        </div>
      }
    >
      <div className="ocr-section-body">
        {/* Processing State */}
        {isProcessing && (
          <div className="ocr-processing-banner">
            <div className="ocr-scanner-animation" />
            <div className="ocr-processing-text">
              <h4>Processing document with Demo OCR engine...</h4>
              <p>Analyzing text layout, scanning bounding boxes, and extracting metadata entities.</p>
            </div>
          </div>
        )}

        {/* Failed State */}
        {ocrStatus === 'Failed' && !isProcessing && (
          <div className="ocr-failed-banner">
            <FiAlertCircle className="ocr-failed-icon" />
            <div>
              <h4>OCR Processing Failed</h4>
              <p>Document quality was unreadable or layout could not be recognized. Please try re-running OCR.</p>
            </div>
            <Button variant="danger" size="sm" icon={FiCamera} onClick={onRunOcr}>
              Retry OCR
            </Button>
          </div>
        )}

        {/* Not Processed Idle State */}
        {ocrStatus === 'Not Processed' && !isProcessing && (
          <div className="ocr-idle-banner">
            <div className="ocr-idle-icon-box">
              <FiCpu />
            </div>
            <div className="ocr-idle-info">
              <h4>Digitize this document with Demo OCR</h4>
              <p>
                Extract text, invoice numbers, warranty validity dates, and technician service charges automatically with one click.
              </p>
            </div>
            <Button variant="primary" size="sm" icon={FiCamera} onClick={onRunOcr}>
              Run Demo OCR
            </Button>
          </div>
        )}

        {/* Completed State: Structured Entities + Extracted Text */}
        {ocrStatus === 'Completed' && (
          <div className="ocr-completed-content">
            {/* 1. Structured Extracted Key-Value Fields */}
            {structuredData && (
              <div className="ocr-structured-box">
                <div className="structured-header">
                  <div className="structured-title-row">
                    <FiCheckCircle className="check-icon" />
                    <h4>Recognized Metadata Entities</h4>
                  </div>
                  <span className="demo-ocr-tag">Simulated OCR</span>
                </div>

                <div className="structured-fields-grid">
                  {/* Common / Product info */}
                  {structuredData.manufacturer && (
                    <div className="entity-item">
                      <span className="entity-label">Manufacturer</span>
                      <span className="entity-value bold">{structuredData.manufacturer}</span>
                    </div>
                  )}

                  {structuredData.model && (
                    <div className="entity-item">
                      <span className="entity-label">Model Designation</span>
                      <span className="entity-value code-font">{structuredData.model}</span>
                    </div>
                  )}

                  {structuredData.serialNumber && (
                    <div className="entity-item">
                      <span className="entity-label">Serial Number</span>
                      <span className="entity-value code-font">{structuredData.serialNumber}</span>
                    </div>
                  )}

                  {/* Invoice specific */}
                  {structuredData.invoiceNumber && (
                    <div className="entity-item">
                      <span className="entity-label">Invoice Number</span>
                      <span className="entity-value code-font">{structuredData.invoiceNumber}</span>
                    </div>
                  )}

                  {structuredData.seller && (
                    <div className="entity-item">
                      <span className="entity-label">Authorized Seller</span>
                      <span className="entity-value">{structuredData.seller}</span>
                    </div>
                  )}

                  {structuredData.purchaseDate && (
                    <div className="entity-item">
                      <span className="entity-label">Purchase Date</span>
                      <span className="entity-value">{formatDate(structuredData.purchaseDate)}</span>
                    </div>
                  )}

                  {structuredData.amount !== undefined && (
                    <div className="entity-item">
                      <span className="entity-label">Invoice Amount</span>
                      <span className="entity-value price-text">{formatCurrency(structuredData.amount)}</span>
                    </div>
                  )}

                  {/* Warranty specific */}
                  {structuredData.provider && (
                    <div className="entity-item">
                      <span className="entity-label">Warranty Provider</span>
                      <span className="entity-value">{structuredData.provider}</span>
                    </div>
                  )}

                  {structuredData.warrantyStart && (
                    <div className="entity-item">
                      <span className="entity-label">Coverage Start</span>
                      <span className="entity-value">{formatDate(structuredData.warrantyStart)}</span>
                    </div>
                  )}

                  {structuredData.warrantyEnd && (
                    <div className="entity-item">
                      <span className="entity-label">Coverage End</span>
                      <span className="entity-value bold">{formatDate(structuredData.warrantyEnd)}</span>
                    </div>
                  )}

                  {/* Service specific */}
                  {structuredData.serviceProvider && (
                    <div className="entity-item">
                      <span className="entity-label">Service Provider</span>
                      <span className="entity-value">{structuredData.serviceProvider}</span>
                    </div>
                  )}

                  {structuredData.serviceDate && (
                    <div className="entity-item">
                      <span className="entity-label">Service Date</span>
                      <span className="entity-value">{formatDate(structuredData.serviceDate)}</span>
                    </div>
                  )}

                  {structuredData.serviceCost !== undefined && (
                    <div className="entity-item">
                      <span className="entity-label">Service Cost</span>
                      <span className="entity-value price-text">{formatCurrency(structuredData.serviceCost)}</span>
                    </div>
                  )}

                  {structuredData.issue && (
                    <div className="entity-item full-width">
                      <span className="entity-label">Reported Issue</span>
                      <span className="entity-value">{structuredData.issue}</span>
                    </div>
                  )}

                  {structuredData.workPerformed && (
                    <div className="entity-item full-width">
                      <span className="entity-label">Work Performed</span>
                      <span className="entity-value">{structuredData.workPerformed}</span>
                    </div>
                  )}

                  {structuredData.coverageScope && (
                    <div className="entity-item full-width">
                      <span className="entity-label">Coverage Scope</span>
                      <span className="entity-value">{structuredData.coverageScope}</span>
                    </div>
                  )}
                </div>

                {/* Workflow integration actions */}
                <div className="ocr-integration-actions">
                  {isWarrantyDoc && onCreateWarranty && (
                    <div className="integration-prompt-row">
                      <div className="integration-info">
                        <FiShield className="prompt-icon shield-color" />
                        <span>Ready to register this warranty in SmartCare?</span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={FiShield}
                        onClick={() => onCreateWarranty(structuredData)}
                      >
                        Create Warranty from OCR
                      </Button>
                    </div>
                  )}

                  {isServiceDoc && onCreateServiceRecord && (
                    <div className="integration-prompt-row">
                      <div className="integration-info">
                        <FiTool className="prompt-icon tool-color" />
                        <span>Ready to log this service record in SmartCare?</span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={FiTool}
                        onClick={() => onCreateServiceRecord(structuredData)}
                      >
                        Create Service Record from OCR
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Raw Extracted Text Block */}
            {hasExtractedText && (
              <div className="ocr-raw-text-card">
                <div className="raw-text-header">
                  <div className="raw-header-left">
                    <FiFileText />
                    <span>Raw Extracted Text</span>
                  </div>
                  <button
                    type="button"
                    className="copy-text-btn"
                    onClick={handleCopyText}
                    aria-label="Copy extracted OCR text"
                  >
                    {copied ? (
                      <>
                        <FiCheck className="copied-icon" /> Copied!
                      </>
                    ) : (
                      <>
                        <FiCopy /> Copy Text
                      </>
                    )}
                  </button>
                </div>
                <pre className="raw-ocr-text-view raw-text-content">
                  {document.ocrExtractedText}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
