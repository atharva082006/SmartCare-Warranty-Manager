import React from 'react';
import { FiFileText, FiShield, FiTool, FiCheckCircle } from 'react-icons/fi';
import { formatFileSize } from '../../utils/formatters';
import './DocumentKpiCards.css';

export default function DocumentKpiCards({ stats, loading = false }) {
  const total = stats?.totalDocuments || 0;
  const warranty = stats?.warrantyDocuments || 0;
  const service = stats?.serviceDocuments || 0;
  const ocrDone = stats?.ocrCompleted || 0;
  const ocrPending = stats?.ocrPending || 0;
  const storageFormatted = formatFileSize(stats?.totalStorageBytes || 0);

  const cards = [
    {
      id: 'kpi-total-docs',
      title: 'Total Documents',
      value: loading ? '—' : total,
      subtext: loading ? 'Calculating storage...' : `${storageFormatted} total storage`,
      icon: FiFileText,
      color: 'blue',
    },
    {
      id: 'kpi-warranty-docs',
      title: 'Warranty Documents',
      value: loading ? '—' : warranty,
      subtext: total > 0 ? `${Math.round((warranty / total) * 100)}% of document vault` : '0% of vault',
      icon: FiShield,
      color: 'green',
    },
    {
      id: 'kpi-service-docs',
      title: 'Service Documents',
      value: loading ? '—' : service,
      subtext: total > 0 ? `${Math.round((service / total) * 100)}% maintenance receipts` : '0% receipts',
      icon: FiTool,
      color: 'orange',
    },
    {
      id: 'kpi-ocr-docs',
      title: 'Documents with OCR',
      value: loading ? '—' : ocrDone,
      subtext: ocrPending > 0 ? `${ocrPending} documents awaiting OCR` : 'All documents digitized',
      icon: FiCheckCircle,
      color: 'purple',
    },
  ];

  return (
    <div className="document-kpi-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.id} id={card.id} className={`document-kpi-card color-${card.color}`}>
            <div className="kpi-card-content">
              <span className="kpi-label">{card.title}</span>
              <span className="kpi-value">{card.value}</span>
              <span className="kpi-subtext">{card.subtext}</span>
            </div>
            <div className="kpi-icon-container">
              <Icon />
            </div>
          </div>
        );
      })}
    </div>
  );
}
