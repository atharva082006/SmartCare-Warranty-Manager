import React from 'react';
import { FiFilter, FiRefreshCw } from 'react-icons/fi';
import Button from '../common/Button/Button';
import './AnalyticsFilterBar.css';

/**
 * Clean, lightweight filter bar for the Analytics page.
 * Allows filtering charts and KPIs by Product Category, with a quick reset button.
 */
export default function AnalyticsFilterBar({
  selectedCategory = 'all',
  onCategoryChange,
  availableCategories = [],
  onResetFilters,
  hasActiveFilters = false,
}) {
  return (
    <div className="analytics-filter-bar">
      <div className="analytics-filter-left">
        <div className="filter-label-group">
          <FiFilter className="filter-icon" />
          <span className="filter-title">Filter By:</span>
        </div>

        <div className="filter-control-item">
          <label htmlFor="analytics-category-select" className="sr-only">
            Product Category
          </label>
          <select
            id="analytics-category-select"
            className="analytics-select-input"
            value={selectedCategory}
            onChange={(e) => onCategoryChange && onCategoryChange(e.target.value)}
          >
            <option value="all">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="analytics-filter-right">
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            icon={FiRefreshCw}
            onClick={onResetFilters}
          >
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}
