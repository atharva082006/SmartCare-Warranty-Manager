import React from 'react';
import { FiSearch, FiX, FiFilter, FiRotateCcw } from 'react-icons/fi';
import Button from '../common/Button/Button';
import { DOCUMENT_TYPES, OCR_STATUSES } from '../../utils/documentUtils';
import './DocumentFilterBar.css';

export default function DocumentFilterBar({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedCategory,
  onCategoryChange,
  selectedOcrStatus,
  onOcrStatusChange,
  selectedFileType,
  onFileTypeChange,
  sortBy,
  onSortChange,
  availableCategories = [],
  availableFileTypes = ['PDF', 'JPG', 'PNG', 'WEBP'],
  activeFilterCount = 0,
  onResetFilters,
}) {
  return (
    <div className="doc-filter-bar-container">
      {/* Search and Quick Filters Row */}
      <div className="doc-search-row">
        <div className="doc-search-input-wrapper">
          <FiSearch className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by document name, product, brand, category, OCR text..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search documents"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => onSearchChange('')}
              aria-label="Clear search query"
            >
              <FiX />
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="doc-sort-wrapper">
          <label htmlFor="document-sort-select" className="sort-label">
            Sort by:
          </label>
          <select
            id="document-sort-select"
            className="filter-select sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort documents"
          >
            <option value="date_desc">Upload Date — Newest</option>
            <option value="date_asc">Upload Date — Oldest</option>
            <option value="name_asc">File Name — A–Z</option>
            <option value="name_desc">File Name — Z–A</option>
            <option value="size_desc">File Size — Largest</option>
            <option value="size_asc">File Size — Smallest</option>
            <option value="product_asc">Product Name — A–Z</option>
            <option value="product_desc">Product Name — Z–A</option>
          </select>
        </div>
      </div>

      {/* Dropdown Filters Row */}
      <div className="doc-filters-row">
        <div className="filter-group">
          <label htmlFor="filter-document-type" className="filter-label">
            Document Type:
          </label>
          <select
            id="filter-document-type"
            className="filter-select"
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            <option value="all">All Document Types</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-product-category" className="filter-label">
            Product Category:
          </label>
          <select
            id="filter-product-category"
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="all">All Product Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-ocr-status" className="filter-label">
            OCR Status:
          </label>
          <select
            id="filter-ocr-status"
            className="filter-select"
            value={selectedOcrStatus}
            onChange={(e) => onOcrStatusChange(e.target.value)}
          >
            <option value="all">All OCR Statuses</option>
            {OCR_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-file-type" className="filter-label">
            File Type:
          </label>
          <select
            id="filter-file-type"
            className="filter-select"
            value={selectedFileType}
            onChange={(e) => onFileTypeChange(e.target.value)}
          >
            <option value="all">All File Types</option>
            {availableFileTypes.map((ft) => (
              <option key={ft} value={ft}>
                {ft}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filter Count and Reset Button */}
        {activeFilterCount > 0 && (
          <div className="filter-actions-group">
            <span className="active-filters-badge">
              <FiFilter /> {activeFilterCount} active
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={FiRotateCcw}
              onClick={onResetFilters}
              className="reset-filters-btn"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
