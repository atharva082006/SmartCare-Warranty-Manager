import React, { useState } from 'react';
import './TrendLineChart.css';

/**
 * Accessible SVG Trend Line/Area Chart for temporal analytics (monthly spending).
 * Features gradient fill, data point tooltips, horizontal grid lines, and empty-state handling.
 */
export default function TrendLineChart({
  labels = [],
  values = [],
  formattedValues = [],
  strokeColor = '#007bff',
  fillColor = 'rgba(0, 123, 255, 0.12)',
  height = 220,
  emptyMessage = 'Not enough service history to display a meaningful trend.',
}) {
  const [activePoint, setActivePoint] = useState(null);

  const hasData =
    values &&
    values.length > 0 &&
    values.some((v) => Number(v) > 0);

  if (!hasData) {
    return (
      <div className="trend-chart-empty" style={{ minHeight: height }}>
        <p className="trend-empty-text">{emptyMessage}</p>
      </div>
    );
  }

  const svgWidth = 600;
  const svgHeight = height;
  const paddingLeft = 40;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const numPoints = values.length;
  const maxVal = Math.max(...values.map((v) => Number(v) || 0), 100);

  // Compute coordinate points
  const points = values.map((val, idx) => {
    const x = paddingLeft + (idx / Math.max(1, numPoints - 1)) * plotWidth;
    const y = paddingTop + plotHeight - ((Number(val) || 0) / maxVal) * plotHeight;
    return {
      x,
      y,
      val: Number(val) || 0,
      label: labels[idx] || `Period ${idx + 1}`,
      formatted: formattedValues[idx] || `₹${(Number(val) || 0).toLocaleString('en-IN')}`,
      index: idx,
    };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + plotHeight} L ${points[0].x} ${paddingTop + plotHeight} Z`;

  // Grid levels (3 levels: 0, 50%, 100%)
  const gridLevels = [0, 0.5, 1];

  return (
    <div className="trend-chart-container">
      <div className="trend-svg-wrapper">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="trend-svg"
          role="img"
          aria-label="Service spending monthly trend line chart"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & labels */}
          {gridLevels.map((lvl, idx) => {
            const y = paddingTop + plotHeight * (1 - lvl);
            const gridVal = Math.round(maxVal * lvl);
            return (
              <g key={idx} className="trend-grid-line-group">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="var(--color-gray-200, #e5e7eb)"
                  strokeDasharray={lvl > 0 ? '4 4' : undefined}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="trend-y-axis-label"
                >
                  {gridVal >= 1000 ? `₹${(gridVal / 1000).toFixed(0)}k` : `₹${gridVal}`}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#trendGradient)" />

          {/* Stroke path */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt) => {
            const isActive = activePoint?.index === pt.index;
            return (
              <g key={pt.index} className="trend-point-group">
                {/* Invisible hover hotspot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="14"
                  fill="transparent"
                  className="trend-hotspot"
                  onMouseEnter={() => setActivePoint(pt)}
                  onMouseLeave={() => setActivePoint(null)}
                  tabIndex="0"
                  onFocus={() => setActivePoint(pt)}
                  onBlur={() => setActivePoint(null)}
                  aria-label={`${pt.label}: ${pt.formatted}`}
                />
                {/* Visible dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isActive ? 6 : 4}
                  fill="#ffffff"
                  stroke={strokeColor}
                  strokeWidth={isActive ? 3 : 2}
                  className="trend-dot"
                />
              </g>
            );
          })}

          {/* X Axis Labels */}
          {points.map((pt, idx) => {
            // In mobile or tight space show alternate or key labels if too many
            const showLabel = numPoints <= 8 || idx % 2 === 0 || idx === numPoints - 1;
            if (!showLabel) return null;

            return (
              <text
                key={idx}
                x={pt.x}
                y={svgHeight - 12}
                textAnchor="middle"
                className="trend-x-axis-label"
              >
                {pt.label}
              </text>
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {activePoint && (
          <div
            className="trend-tooltip"
            style={{
              left: `${(activePoint.x / svgWidth) * 100}%`,
              top: `${(activePoint.y / svgHeight) * 100}%`,
            }}
          >
            <span className="tooltip-period">{activePoint.label}</span>
            <span className="tooltip-amount">{activePoint.formatted}</span>
          </div>
        )}
      </div>
    </div>
  );
}
