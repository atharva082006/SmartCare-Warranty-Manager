import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus,
  FiCamera,
  FiRefreshCw,
  FiAlertCircle,
  FiFileText,
} from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader/PageHeader';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import ErrorState from '../components/common/ErrorState/ErrorState';

// Analytics Domain Components
import AnalyticsKpiCards from '../components/analytics/AnalyticsKpiCards';
import AttentionRequiredSection from '../components/analytics/AttentionRequiredSection';
import WarrantyAnalyticsSection from '../components/analytics/WarrantyAnalyticsSection';
import ServiceAnalyticsSection from '../components/analytics/ServiceAnalyticsSection';
import ProductHealthAnalyticsSection from '../components/analytics/ProductHealthAnalyticsSection';
import ProductAnalyticsSection from '../components/analytics/ProductAnalyticsSection';
import DocumentAnalyticsSection from '../components/analytics/DocumentAnalyticsSection';
import AnalyticsFilterBar from '../components/analytics/AnalyticsFilterBar';

// Services
import { analyticsService } from '../services/analyticsService';
import { productService } from '../services/productService';

import './AnalyticsPage.css';

/**
 * Analytics & Insights Page.
 * Aggregates all KPI metrics, warranty distributions, maintenance spend trends,
 * deterministic fleet health scores, document vault stats, and actionable attention items.
 */
export default function AnalyticsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availableCategories, setAvailableCategories] = useState([]);

  // Data states
  const [overviewStats, setOverviewStats] = useState(null);
  const [warrantyData, setWarrantyData] = useState(null);
  const [serviceData, setServiceData] = useState(null);
  const [productData, setProductData] = useState(null);
  const [documentData, setDocumentData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [attentionItems, setAttentionItems] = useState([]);

  // Fetch available categories once on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const products = await productService.getProducts();
        const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
        setAvailableCategories(cats);
      } catch (err) {
        console.error('Failed to load product categories for filter:', err);
      }
    }
    loadCategories();
  }, []);

  // Load analytics derived from services
  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        category: selectedCategory,
      };

      const [
        stats,
        warrAnalytics,
        srvAnalytics,
        prodAnalytics,
        docAnalytics,
        healthAnalytics,
        attItems,
      ] = await Promise.all([
        analyticsService.getOverviewStats(filters),
        analyticsService.getWarrantyAnalytics(filters),
        analyticsService.getServiceAnalytics(filters),
        analyticsService.getProductAnalytics(filters),
        analyticsService.getDocumentAnalytics(),
        analyticsService.getProductHealthAnalytics(filters),
        analyticsService.getAttentionItems(),
      ]);

      setOverviewStats(stats);
      setWarrantyData(warrAnalytics);
      setServiceData(srvAnalytics);
      setProductData(prodAnalytics);
      setDocumentData(docAnalytics);
      setHealthData(healthAnalytics);
      setAttentionItems(attItems);
    } catch (err) {
      console.error('Failed to fetch analytics metrics:', err);
      setError('Unable to load analytics data from the SmartCare service layer. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleResetFilters = () => {
    setSelectedCategory('all');
  };

  const hasActiveFilters = selectedCategory !== 'all';

  return (
    <div className="analytics-page">
      {/* Page Header */}
      <PageHeader
        title="Analytics & Insights"
        subtitle="Understand your products, warranties, service activity, and overall asset health."
        actions={
          <div className="analytics-header-actions">
            <Button
              variant="outline"
              size="sm"
              icon={FiRefreshCw}
              onClick={loadAnalytics}
              disabled={loading}
              title="Refresh all metrics from live storage"
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={FiCamera}
              onClick={() => navigate('/ocr')}
            >
              Scan Invoice
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={FiPlus}
              onClick={() => navigate('/products/new')}
            >
              Add Product
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <AnalyticsFilterBar
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        availableCategories={availableCategories}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Loading or Error State */}
      {loading ? (
        <Card className="analytics-loading-card">
          <LoadingSpinner text="Computing real-time analytics from SmartCare services..." />
        </Card>
      ) : error ? (
        <ErrorState
          title="Unable to Load Analytics"
          message={error}
          onRetry={loadAnalytics}
        />
      ) : (
        <>
          {/* Section 1: Top Overview KPI Cards */}
          <AnalyticsKpiCards stats={overviewStats} loading={false} />

          {/* Section 2: Actionable Attention Required */}
          <AttentionRequiredSection items={attentionItems} loading={false} />

          {/* Section 3: Warranty Analytics */}
          <WarrantyAnalyticsSection data={warrantyData} loading={false} />

          {/* Section 4: Maintenance & Service Analytics */}
          <ServiceAnalyticsSection data={serviceData} loading={false} />

          {/* Section 5: Fleet Health Score Analytics */}
          <ProductHealthAnalyticsSection data={healthData} loading={false} />

          {/* Section 6: Product Category & Inventory Valuations */}
          <ProductAnalyticsSection data={productData} loading={false} />

          {/* Section 7: Documents & OCR Digitization */}
          <DocumentAnalyticsSection data={documentData} loading={false} />
        </>
      )}
    </div>
  );
}
