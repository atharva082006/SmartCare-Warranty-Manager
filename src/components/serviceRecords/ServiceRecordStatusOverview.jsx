import React from 'react';
import Card from '../common/Card/Card';
import './ServiceRecordStatusOverview.css';

export default function ServiceRecordStatusOverview({ stats }) {
  const {
    totalRecords = 0,
    completed = 0,
    scheduled = 0,
    inProgress = 0,
    cancelled = 0,
    completionRate = 0,
  } = stats || {};

  const total = totalRecords > 0 ? totalRecords : 1;
  const completedPct = Math.round((completed / total) * 100);
  const scheduledPct = Math.round((scheduled / total) * 100);
  const inProgressPct = Math.round((inProgress / total) * 100);
  const cancelledPct = Math.round((cancelled / total) * 100);

  return (
    <Card className="service-status-overview-card">
      <div className="overview-header-row">
        <div className="overview-title-group">
          <h3 className="overview-title">Service Status Distribution</h3>
          <p className="overview-subtitle">
            Overall service completion rate: <strong>{completionRate}%</strong> successfully serviced
          </p>
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="segmented-bar-track" role="progressbar" aria-label="Service Status Distribution">
        {completedPct > 0 && (
          <div
            className="segmented-bar-fill fill-completed"
            style={{ width: `${completedPct}%` }}
            title={`Completed: ${completed} (${completedPct}%)`}
          />
        )}
        {scheduledPct > 0 && (
          <div
            className="segmented-bar-fill fill-scheduled"
            style={{ width: `${scheduledPct}%` }}
            title={`Scheduled: ${scheduled} (${scheduledPct}%)`}
          />
        )}
        {inProgressPct > 0 && (
          <div
            className="segmented-bar-fill fill-in-progress"
            style={{ width: `${inProgressPct}%` }}
            title={`In Progress: ${inProgress} (${inProgressPct}%)`}
          />
        )}
        {cancelledPct > 0 && (
          <div
            className="segmented-bar-fill fill-cancelled"
            style={{ width: `${cancelledPct}%` }}
            title={`Cancelled: ${cancelled} (${cancelledPct}%)`}
          />
        )}
      </div>

      {/* Status Metrics Legend Cards */}
      <div className="overview-legend-grid">
        <div className="legend-item legend-completed">
          <div className="legend-indicator" />
          <div className="legend-text-col">
            <span className="legend-label">Completed</span>
            <div className="legend-values">
              <span className="legend-count">{completed}</span>
              <span className="legend-pct">({completedPct}%)</span>
            </div>
          </div>
        </div>

        <div className="legend-item legend-scheduled">
          <div className="legend-indicator" />
          <div className="legend-text-col">
            <span className="legend-label">Scheduled</span>
            <div className="legend-values">
              <span className="legend-count">{scheduled}</span>
              <span className="legend-pct">({scheduledPct}%)</span>
            </div>
          </div>
        </div>

        <div className="legend-item legend-in-progress">
          <div className="legend-indicator" />
          <div className="legend-text-col">
            <span className="legend-label">In Progress</span>
            <div className="legend-values">
              <span className="legend-count">{inProgress}</span>
              <span className="legend-pct">({inProgressPct}%)</span>
            </div>
          </div>
        </div>

        <div className="legend-item legend-cancelled">
          <div className="legend-indicator" />
          <div className="legend-text-col">
            <span className="legend-label">Cancelled</span>
            <div className="legend-values">
              <span className="legend-count">{cancelled}</span>
              <span className="legend-pct">({cancelledPct}%)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
