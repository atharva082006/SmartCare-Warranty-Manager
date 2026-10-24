import React, { useState } from 'react';
import './BarChart.css';

/**
 * Accessible, zero-dependency SVG Bar Chart.
 * Supports vertical and horizontal layouts, animated bars, hover values, and accessible labels.
 */
export default function BarChart({
  labels = [],
  values = [],
  formattedValues = [],
  colors = 'var(--color-primary, #007bff)',
  height = 200,
  layout = 'vertical', // 'vertical' | 'horizontal'
  emptyMessage = 'No chart records available.',
  valuePrefix = '',
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const hasData =
    values &&
    values.length > 0 &&
    values.some((v) => Number(v) > 0);

  if (!hasData) {
    return (
      <div className="bar-chart-empty" style={{ minHeight: height }}>
        <p className="bar-chart-empty-text">{emptyMessage}</p>
      </div>
    );
  }

  const maxValue = Math.max(...values.map((v) => Number(v) || 0), 1);

  const getColor = (idx) => {
    if (Array.isArray(colors)) {
      return colors[idx % colors.length];
    }
    return colors;
  };

  if (layout === 'horizontal') {
    return (
      <div className="bar-chart-horizontal-container">
        {labels.map((label, idx) => {
          const val = Number(values[idx]) || 0;
          const pct = Math.round((val / maxValue) * 100);
          const formatted = formattedValues[idx] || `${valuePrefix}${val.toLocaleString('en-IN')}`;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              className={`h-bar-row ${isHovered ? 'h-bar-row-active' : ''}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              tabIndex="0"
              onFocus={() => setHoveredIdx(idx)}
              onBlur={() => setHoveredIdx(null)}
              aria-label={`${label}: ${formatted}`}
            >
              <div className="h-bar-label-col" title={label}>
                <span className="h-bar-label">{label}</span>
              </div>
              <div className="h-bar-track-col">
                <div
                  className="h-bar-fill"
                  style={{
                    width: `${Math.max(4, pct)}%`,
                    backgroundColor: getColor(idx),
                  }}
                />
              </div>
              <div className="h-bar-value-col">
                <span className="h-bar-value">{formatted}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical layout (SVG)
  const chartHeight = height;
  const paddingBottom = 32;
  const paddingTop = 24;
  const plotHeight = chartHeight - paddingBottom - paddingTop;
  const barWidthPercent = Math.min(48, Math.max(16, 80 / (labels.length || 1)));

  return (
    <div className="bar-chart-vertical-wrapper" style={{ height: chartHeight }}>
      <div className="bar-chart-plot-area">
        {labels.map((label, idx) => {
          const val = Number(values[idx]) || 0;
          const heightRatio = val / maxValue;
          const barHeightPx = Math.max(val > 0 ? 4 : 0, Math.round(heightRatio * plotHeight));
          const formatted = formattedValues[idx] || `${valuePrefix}${val.toLocaleString('en-IN')}`;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              className={`v-bar-column ${isHovered ? 'v-bar-active' : ''}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              tabIndex="0"
              onFocus={() => setHoveredIdx(idx)}
              onBlur={() => setHoveredIdx(null)}
              aria-label={`${label}: ${formatted}`}
            >
              <div className="v-bar-pillar-wrap">
                {/* Tooltip / value bubble above bar */}
                <div className={`v-bar-tooltip ${isHovered ? 'tooltip-visible' : ''}`}>
                  {formatted}
                </div>
                <div
                  className="v-bar-fill"
                  style={{
                    height: `${barHeightPx}px`,
                    width: `${barWidthPercent}%`,
                    backgroundColor: getColor(idx),
                  }}
                />
              </div>
              <span className="v-bar-label" title={label}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
