import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFolder, FiCamera, FiFileText, FiCheckCircle, FiClock, FiArrowRight } from 'react-icons/fi';
import Card from '../common/Card/Card';
import Badge from '../common/Badge/Badge';
import Button from '../common/Button/Button';
import BarChart from './charts/BarChart';
import './DocumentAnalyticsSection.css';

/**
 * Compact Documents & OCR Analytics Section.
 * Visualizes total files, document classifications, and OCR extraction completion metrics.
 */
export default function DocumentAnalyticsSection({ data = {}, loading = false }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card title="Documents & OCR Analytics" className="doc-analytics-card">
        <div className="kpi-skeleton-line long" />
      </Card>
    );
  }

  const {
    totalDocuments = 0,
    warrantyDocuments = 0,
    serviceDocuments = 0,
    invoiceDocuments = 0,
    ocrCompleted = 0,
    ocrPending = 0,
    ocrSuccessRate = 0,
    typeDistribution = { labels: [], counts: [] },
  } = data;

  return (
    <Card
      id="section-documents"
      title="Documents & OCR Digitization"
      subtitle={`${totalDocuments} documents catalogued in vault • ${ocrCompleted} scanned with OCR`}
      className="doc-analytics-card"
      actions={
        <div className="doc-card-actions">
          <Button
            variant="ghost"
            size="sm"
            icon={FiCamera}
            onClick={() => navigate('/ocr')}
          >
            Scanner
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={FiArrowRight}
            onClick={() => navigate('/documents')}
          >
            Vault
          </Button>
        </div>
      }
    >
      <div className="doc-analytics-grid">
        {/* KPI Mini-Cards */}
        <div className="doc-metrics-strip">
          <div className="doc-mini-kpi">
            <div className="mini-icon icon-vault">
              <FiFolder />
            </div>
            <div className="mini-content">
              <span className="mini-label">Total Documents</span>
              <span className="mini-val">{totalDocuments}</span>
            </div>
          </div>

          <div className="doc-mini-kpi">
            <div className="mini-icon icon-ocr-done">
              <FiCheckCircle />
            </div>
            <div className="mini-content">
              <span className="mini-label">OCR Processed</span>
              <span className="mini-val text-success">{ocrCompleted}</span>
              <span className="mini-hint">{ocrSuccessRate}% of vault</span>
            </div>
          </div>

          <div className="doc-mini-kpi">
            <div className="mini-icon icon-ocr-pend">
              <FiClock />
            </div>
            <div className="mini-content">
              <span className="mini-label">OCR Pending</span>
              <span className="mini-val text-warning">{ocrPending}</span>
              <span className="mini-hint">unprocessed</span>
            </div>
          </div>

          <div className="doc-mini-kpi">
            <div className="mini-icon icon-warr-doc">
              <FiFileText />
            </div>
            <div className="mini-content">
              <span className="mini-label">Warranty / Invoices</span>
              <span className="mini-val">{warrantyDocuments + invoiceDocuments}</span>
              <span className="mini-hint">{warrantyDocuments} cards, {invoiceDocuments} bills</span>
            </div>
          </div>
        </div>

        {/* Right side: Type distribution bar chart */}
        <div className="doc-chart-wrapper">
          <h4 className="analytics-subheading">Document Types Distribution</h4>
          <BarChart
            labels={typeDistribution.labels}
            values={typeDistribution.counts}
            colors={['#0284c7', '#007bff', '#28a745', '#ffc107', '#6f42c1']}
            layout="horizontal"
            emptyMessage="No documents recorded."
          />
        </div>
      </div>
    </Card>
  );
}
