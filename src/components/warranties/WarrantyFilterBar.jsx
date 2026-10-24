import React from 'react';
import { FiSearch, FiX, FiRotateCcw } from 'react-icons/fi';
import Button from '../common/Button/Button';
import './WarrantyFilterBar.css';

export default function WarrantyFilterBar({
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
    <div className="warranty-filter-bar">
      {/* Top Row: Search and Sort */}
      <div className="filter-top-row">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by product, ID, brand, provider, or warranty type..."
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
          <label htmlFor="warranty-sort-select" className="sort-label">
            Sort by:
          </label>
          <select
            id="warranty-sort-select"
            className="filter-select sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="expiry_soonest">Expiry Date — Soonest</option>
            <option value="expiry_latest">Expiry Date — Latest</option>
            <option value="start_desc">Start Date — Newest</option>
            <option value="start_asc">Start Date — Oldest</option>
            <option value="name_asc">Product Name — A–Z</option>
            <option value="name_desc">Product Name — Z–A</option>
            <option value="days_asc">Days Remaining — Lowest</option>
            <option value="days_desc">Days Remaining — Highest</option>
          </select>
        </div>
      </div>

      {/* Bottom Row: Detailed Filter Dropdowns & Reset */}
      <div className="filter-bottom-row">
        <div className="filter-dropdowns-group">
          {/* Status Filter */}
          <div className="filter-item">
            <label className="filter-item-label" htmlFor="filter-warranty-status">
              Status
            </label>
            <select
              id="filter-warranty-status"
              className="filter-select"
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiringSoon">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Warranty Type Filter */}
          <div className="filter-item">
            <label className="filter-item-label" htmlFor="filter-warranty-type">
              Warranty Type
            </label>
            <select
              id="filter-warranty-type"
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
            <label className="filter-item-label" htmlFor="filter-warranty-provider">
              Provider
            </label>
            <select
              id="filter-warranty-provider"
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
            <label className="filter-item-label" htmlFor="filter-product-category">
              Category
            </label>
            <select
              id="filter-product-category"
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
            Showing <strong>{totalResults}</strong> of <strong>{totalCount}</strong> warranties
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
