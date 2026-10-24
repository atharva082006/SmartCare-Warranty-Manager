import React from 'react';
import Card from '../common/Card/Card';
import './WarrantyStatusOverview.css';

export default function WarrantyStatusOverview({ stats }) {
  const {
    totalWarranties = 0,
    active = 0,
    expiringSoon = 0,
    expired = 0,
    coverageRate = 0,
  } = stats || {};

  const total = totalWarranties > 0 ? totalWarranties : 1;
  const activePct = Math.round((active / total) * 100);
  const expiringPct = Math.round((expiringSoon / total) * 100);
  const expiredPct = Math.round((expired / total) * 100);

  return (
    <Card className="warranty-status-overview-card">
      <div className="overview-header-row">
        <div className="overview-title-group">
          <h3 className="overview-title">Warranty Protection Distribution</h3>
          <p className="overview-subtitle">
            Overall fleet protection rate: <strong>{coverageRate}%</strong> under active or extended coverage
          </p>
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="segmented-bar-track" role="progressbar" aria-label="Warranty Status Distribution">
        {activePct > 0 && (
          <div
            className="segmented-bar-fill fill-active"
            style={{ width: `${activePct}%` }}
            title={`Active: ${active} (${activePct}%)`}
          />
        )}
        {expiringPct > 0 && (
          <div
            className="segmented-bar-fill fill-expiring"
            style={{ width: `${expiringPct}%` }}
            title={`Expiring Soon: ${expiringSoon} (${expiringPct}%)`}
          />
        )}
        {expiredPct > 0 && (
          <div
            className="segmented-bar-fill fill-expired"
            style={{ width: `${expiredPct}%` }}
            title={`Expired: ${expired} (${expiredPct}%)`}
          />
        )}
      </div>

      {/* Status Metrics Legend Cards */}
      <div className="overview-legend-grid">
        <div className="legend-item legend-active">
          <div className="legend-indicator" />
          <div className="legend-text-col">
            <span className="legend-label">Active & Protected</span>
            <div className="legend-values">
              <span className="legend-count">{active}</span>
              <span className="legend-pct">({activePct}%)</span>
            </div>
          </div>
        </div>

        <div className="legend-item legend-expiring">
          <div className="legend-indicator" />
          <div className="legend-text-col">
            <span className="legend-label">Expiring Soon (≤30 Days)</span>
            <div className="legend-values">
              <span className="legend-count">{expiringSoon}</span>
              <span className="legend-pct">({expiringPct}%)</span>
            </div>
          </div>
        </div>

        <div className="legend-item legend-expired">
          <div className="legend-indicator" />
          <div className="legend-text-col">
            <span className="legend-label">Expired / Unprotected</span>
            <div className="legend-values">
              <span className="legend-count">{expired}</span>
              <span className="legend-pct">({expiredPct}%)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
