import React from 'react';
import { FiSearch, FiX, FiRotateCcw } from 'react-icons/fi';
import Button from '../common/Button/Button';
import './ServiceRecordFilterBar.css';

export default function ServiceRecordFilterBar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  selectedStatus,
  onStatusChange,
  selectedType,
  onTypeChange,
  availableTypes = [],
  selectedProvider,
  onProviderChange,
  availableProviders = [],
  selectedCategory,
  onCategoryChange,
  availableCategories = [],
  sortBy,
  onSortChange,
  onResetFilters,
  hasActiveFilters,
  totalResults = 0,
  totalCount = 0,
}) {
  return (
    <div className="service-filter-bar">
      {/* Top Row: Search and Sort */}
      <div className="filter-top-row">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by product, ID, brand, provider, type, issue, or work..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={onClearSearch}
              aria-label="Clear search"
            >
              <FiX />
            </button>
          )}
        </div>

        <div className="sort-wrapper">
          <label htmlFor="service-sort-select" className="sort-label">
            Sort by:
          </label>
          <select
            id="service-sort-select"
            className="filter-select sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="date_desc">Service Date — Newest</option>
            <option value="date_asc">Service Date — Oldest</option>
            <option value="cost_desc">Service Cost — Highest</option>
            <option value="cost_asc">Service Cost — Lowest</option>
            <option value="name_asc">Product Name — A–Z</option>
            <option value="name_desc">Product Name — Z–A</option>
            <option value="provider_asc">Service Provider — A–Z</option>
            <option value="provider_desc">Service Provider — Z–A</option>
          </select>
        </div>
      </div>

      {/* Bottom Row: Detailed Filter Dropdowns & Reset */}
      <div className="filter-bottom-row">
        <div className="filter-dropdowns-group">
          {/* Status Filter */}
          <div className="filter-item">
            <label className="filter-item-label" htmlFor="filter-service-status">
              Status
            </label>
            <select
              id="filter-service-status"
              className="filter-select"
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Service Type Filter */}
          <div className="filter-item">
            <label className="filter-item-label" htmlFor="filter-service-type">
              Service Type
            </label>
            <select
              id="filter-service-type"
              className="filter-select"
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
            >
              <option value="all">All Types</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Provider Filter */}
          <div className="filter-item">
            <label className="filter-item-label" htmlFor="filter-service-provider">
              Provider
            </label>
            <select
              id="filter-service-provider"
              className="filter-select"
              value={selectedProvider}
              onChange={(e) => onProviderChange(e.target.value)}
            >
              <option value="all">All Providers</option>
              {availableProviders.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          {/* Product Category Filter */}
          <div className="filter-item">
            <label className="filter-item-label" htmlFor="filter-service-category">
              Category
            </label>
            <select
              id="filter-service-category"
              className="filter-select"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
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

        <div className="filter-meta-group">
          <span className="results-count-text">
            Showing <strong>{totalResults}</strong> of <strong>{totalCount}</strong> service records
          </span>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              icon={FiRotateCcw}
              onClick={onResetFilters}
              className="reset-filters-btn"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
