import React, { useState } from 'react';
import './DoughnutChart.css';

/**
 * Accessible, zero-dependency SVG Doughnut Chart.
 * Renders smooth arcs with interactive hover states, center label, and detailed legend.
 */
export default function DoughnutChart({
  data = [], // [{ label: string, value: number, color: string }]
  centerLabel = 'Total',
  centerValue = null,
  emptyMessage = 'No distribution data available.',
  size = 200,
  strokeWidth = 32,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="doughnut-empty-state">
        <div className="doughnut-empty-ring" style={{ width: size, height: size }} />
        <p className="doughnut-empty-text">{emptyMessage}</p>
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Compute stroke-dasharray and stroke-dashoffset for each slice
  let accumulatedOffset = 0;
  const slices = data.map((item, idx) => {
    const val = Number(item.value) || 0;
    const pct = val / total;
    const sliceLength = pct * circumference;
    const strokeDasharray = `${sliceLength} ${circumference - sliceLength}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += sliceLength;

    return {
      ...item,
      percentage: Math.round(pct * 100),
      strokeDasharray,
      strokeDashoffset,
      index: idx,
    };
  });

  const activeItem = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="doughnut-chart-container">
      <div className="doughnut-svg-wrapper" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="doughnut-svg"
          role="img"
          aria-label={`Donut chart representing ${centerLabel}`}
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="var(--color-gray-100)"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {slices.map((slice) => {
            const isHovered = hoveredIndex === slice.index;
            return (
              <circle
                key={slice.index}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                className={`doughnut-slice ${isHovered ? 'slice-hovered' : ''}`}
                onMouseEnter={() => setHoveredIndex(slice.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                tabIndex="0"
                onFocus={() => setHoveredIndex(slice.index)}
                onBlur={() => setHoveredIndex(null)}
                aria-label={`${slice.label}: ${slice.value} (${slice.percentage}%)`}
              />
            );
          })}
        </svg>

        {/* Center Label */}
        <div className="doughnut-center-content">
          <span className="doughnut-center-value">
            {activeItem ? activeItem.value : centerValue !== null ? centerValue : total}
          </span>
          <span className="doughnut-center-label">
            {activeItem ? activeItem.label : centerLabel}
          </span>
          {activeItem && (
            <span className="doughnut-center-pct">{activeItem.percentage}%</span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="doughnut-legend">
        {slices.map((slice) => {
          const isHovered = hoveredIndex === slice.index;
          return (
            <div
              key={slice.index}
              className={`doughnut-legend-item ${isHovered ? 'legend-item-active' : ''}`}
              onMouseEnter={() => setHoveredIndex(slice.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="legend-indicator">
                <span
                  className="legend-color-dot"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="legend-label">{slice.label}</span>
              </div>
              <div className="legend-values">
                <span className="legend-count">{slice.value}</span>
                <span className="legend-percent">({slice.percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
