import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBox, FiTag, FiDollarSign, FiArrowRight } from 'react-icons/fi';
import Card from '../common/Card/Card';
import Button from '../common/Button/Button';
import BarChart from './charts/BarChart';
import DoughnutChart from './charts/DoughnutChart';
import './ProductAnalyticsSection.css';

/**
 * Product Analytics Section.
 * Visualizes products by category, products by brand, inventory asset values,
 * and warranty coverage ratios.
 */
export default function ProductAnalyticsSection({ data = {}, loading = false }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card title="Product Analytics" className="product-analytics-card">
        <div className="kpi-skeleton-line long" />
      </Card>
    );
  }

  const {
    totalProducts = 0,
    totalInventoryValue = 0,
    formattedInventoryValue = '₹0',
    averageProductValue = 0,
    formattedAverageProductValue = '₹0',
    productsByCategory = { labels: [], counts: [], percentages: [] },
    productsByBrand = { labels: [], counts: [], percentages: [] },
    productsWithWarranty = 0,
    warrantyCoveragePercentage = 0,
    productsWithoutWarranty = 0,
    productsWithServiceHistory = 0,
    serviceHistoryPercentage = 0,
  } = data;

  // Category chart colors
  const categoryColors = ['#007bff', '#28a745', '#17a2b8', '#ffc107', '#6f42c1', '#fd7e14'];

  // Warranty protection doughnut slices
  const protectionData = [
    {
      label: 'Protected',
      value: productsWithWarranty,
      color: '#28a745',
    },
    {
      label: 'Unprotected',
      value: productsWithoutWarranty,
      color: '#dc3545',
    },
  ];

  return (
    <Card
      id="section-products"
      title="Product Inventory & Category Breakdown"
      subtitle={`Inventory valuation of ${formattedInventoryValue} across ${totalProducts} catalogued appliances`}
      className="product-analytics-card"
      actions={
        <Button
          variant="ghost"
          size="sm"
          icon={FiArrowRight}
          onClick={() => navigate('/products')}
        >
          View Inventory
        </Button>
      }
    >
      {/* Inventory Valuation Header Strip */}
      <div className="prod-valuation-strip">
        <div className="val-strip-item">
          <span className="val-strip-label">Total Inventory Value</span>
          <span className="val-strip-number">{formattedInventoryValue}</span>
        </div>
        <div className="val-strip-divider" />
        <div className="val-strip-item">
          <span className="val-strip-label">Average Unit Cost</span>
          <span className="val-strip-number">{formattedAverageProductValue}</span>
        </div>
        <div className="val-strip-divider" />
        <div className="val-strip-item">
          <span className="val-strip-label">Warranty Protection Ratio</span>
          <span className="val-strip-number text-success">{warrantyCoveragePercentage}%</span>
        </div>
        <div className="val-strip-divider" />
        <div className="val-strip-item">
          <span className="val-strip-label">Service History Ratio</span>
          <span className="val-strip-number">{serviceHistoryPercentage}%</span>
        </div>
      </div>

      <div className="product-analytics-grid">
        {/* Left Column: Products by Category */}
        <div className="prod-chart-col">
          <h4 className="analytics-subheading">
            <FiBox /> Products by Category
          </h4>
          <BarChart
            labels={productsByCategory.labels}
            values={productsByCategory.counts}
            colors={categoryColors}
            layout="horizontal"
            emptyMessage="No category records available."
          />
        </div>

        {/* Right Column: Products by Brand & Protection Split */}
        <div className="prod-chart-col">
          <h4 className="analytics-subheading">
            <FiTag /> Products by Brand
          </h4>
          <BarChart
            labels={productsByBrand.labels}
            values={productsByBrand.counts}
            colors="#007bff"
            layout="horizontal"
            emptyMessage="No brand records available."
          />
        </div>
      </div>
    </Card>
  );
}
