import React from 'react';
import { FiSearch, FiX, FiRotateCcw } from 'react-icons/fi';
import Button from '../common/Button/Button';
import './ProductFilterBar.css';

export default function ProductFilterBar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  selectedCategory,
  onCategoryChange,
  availableCategories = [],
  selectedBrand,
  onBrandChange,
  availableBrands = [],
  selectedWarrantyStatus,
  onWarrantyStatusChange,
  selectedHealthStatus,
  onHealthStatusChange,
  sortBy,
  onSortChange,
  onResetFilters,
  hasActiveFilters,
  totalResults = 0,
  totalCount = 0,
}) {
  return (
    <div className="product-filter-bar">
      {/* Top Row: Search and Sort */}
      <div className="filter-top-row">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by product name, brand, model, or serial number..."
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
          <label htmlFor="product-sort-select" className="sort-label">
            Sort by:
          </label>
          <select
            id="product-sort-select"
            className="filter-select sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="recent">Recently Added</option>
            <option value="name_asc">Name (A – Z)</option>
            <option value="date_desc">Purchase Date (Newest)</option>
            <option value="date_asc">Purchase Date (Oldest)</option>
            <option value="price_asc">Price (Low to High)</option>
            <option value="price_desc">Price (High to Low)</option>
            <option value="health_desc">Health Score (High to Low)</option>
            <option value="warranty_soonest">Warranty Expiry (Soonest)</option>
          </select>
        </div>
      </div>

      {/* Bottom Row: Detailed Filter Dropdowns & Reset */}
      <div className="filter-bottom-row">
        <div className="filter-dropdowns-group">
          <div className="filter-item">
            <label className="filter-item-label" htmlFor="filter-category">Category</label>
            <select
              id="filter-category"
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

          <div className="filter-item">
            <label className="filter-item-label" htmlFor="filter-brand">Brand</label>
            <select
              id="filter-brand"
              className="filter-select"
              value={selectedBrand}
              onChange={(e) => onBrandChange(e.target.value)}
            >
              <option value="all">All Brands</option>
              {availableBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label className="filter-item-label" htmlFor="filter-warranty">Warranty</label>
            <select
              id="filter-warranty"
              className="filter-select"
              value={selectedWarrantyStatus}
              onChange={(e) => onWarrantyStatusChange(e.target.value)}
            >
              <option value="all">All Warranties</option>
              <option value="active">Active</option>
              <option value="expiringSoon">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="filter-item">
            <label className="filter-item-label" htmlFor="filter-health">Health Status</label>
            <select
              id="filter-health"
              className="filter-select"
              value={selectedHealthStatus}
              onChange={(e) => onHealthStatusChange(e.target.value)}
            >
              <option value="all">All Health</option>
              <option value="excellent">Excellent (80-100)</option>
              <option value="good">Good (60-79)</option>
              <option value="fair">Fair (40-59)</option>
              <option value="poor">Poor (20-39)</option>
              <option value="critical">Critical (0-19)</option>
            </select>
          </div>
        </div>

        <div className="filter-meta-group">
          <span className="results-count-text">
            Showing <strong>{totalResults}</strong> of <strong>{totalCount}</strong> products
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
