import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FiPlus, FiBox, FiSearch } from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader/PageHeader';
import Button from '../components/common/Button/Button';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Card from '../components/common/Card/Card';
import EmptyState from '../components/common/EmptyState/EmptyState';
import ErrorState from '../components/common/ErrorState/ErrorState';
import ConfirmDialog from '../components/common/ConfirmDialog/ConfirmDialog';
import { useToast } from '../hooks/useToast';

import ProductSummaryCards from '../components/products/ProductSummaryCards';
import ProductFilterBar from '../components/products/ProductFilterBar';
import ProductTable from '../components/products/ProductTable';
import ProductFormModal from '../components/products/ProductFormModal';

import { productService } from '../services/productService';
import { warrantyService } from '../services/warrantyService';
import { serviceRecordService } from '../services/serviceRecordService';
import { getHealthStatus, calculateHealthScore } from '../utils/healthScoreUtils';

import './ProductsPage.css';

export default function ProductsPage() {
  const toast = useToast();

  // Data state
  const [products, setProducts] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedWarrantyStatus, setSelectedWarrantyStatus] = useState('all');
  const [selectedHealthStatus, setSelectedHealthStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Modal & Dialog state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch products and warranties via service layer
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedProducts, fetchedWarranties, fetchedServices] = await Promise.all([
        productService.getProducts(),
        warrantyService.getWarranties(),
        serviceRecordService.getServiceRecords(),
      ]);

      setProducts(fetchedProducts);
      setWarranties(fetchedWarranties);
      setServices(fetchedServices);
      setError(null);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Unable to load products. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine products with their attached warranty and deterministic health score
  const combinedProducts = useMemo(() => {
    const warrantyMap = new Map();
    warranties.forEach((w) => {
      warrantyMap.set(w.productId, w);
      if (w.id) warrantyMap.set(w.id, w);
    });

    const servicesMap = new Map();
    services.forEach((s) => {
      if (!servicesMap.has(s.productId)) servicesMap.set(s.productId, []);
      servicesMap.get(s.productId).push(s);
    });

    return products.map((product) => {
      const matchedWarranty =
        warrantyMap.get(product.id) ||
        warrantyMap.get(product.productId) ||
        (product.warrantyId ? warrantyMap.get(product.warrantyId) : null);

      const matchedServices =
        servicesMap.get(product.id) ||
        servicesMap.get(product.productId) ||
        [];

      const healthAnalysis = calculateHealthScore(product, matchedWarranty, matchedServices);

      return {
        ...product,
        warranty: matchedWarranty || null,
        healthScore: healthAnalysis.score,
        healthAnalysis,
      };
    });
  }, [products, warranties, services]);

  // Derive distinct categories and brands for filter dropdowns
  const availableCategories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const availableBrands = useMemo(() => {
    const set = new Set(products.map((p) => p.brand).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  // Aggregate summary metrics
  const summaryMetrics = useMemo(() => {
    if (combinedProducts.length === 0) {
      return {
        totalProducts: 0,
        activeProducts: 0,
        needingAttention: 0,
        averageHealthScore: 100,
      };
    }

    const total = combinedProducts.length;
    let activeWarrantiesCount = 0;
    let needingAttentionCount = 0;
    let scoreSum = 0;

    combinedProducts.forEach((p) => {
      const status = p.warranty?.status;
      const score = p.healthScore ?? 100;
      scoreSum += score;

      if (status === 'active') {
        activeWarrantiesCount++;
      }

      if (status === 'expiringSoon' || status === 'expired' || score < 60) {
        needingAttentionCount++;
      }
    });

    return {
      totalProducts: total,
      activeProducts: activeWarrantiesCount,
      needingAttention: needingAttentionCount,
      averageHealthScore: Math.round(scoreSum / total),
    };
  }, [combinedProducts]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...combinedProducts];

    // 1. Text Search across name, brand, model, serial, and ID
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) => {
        const name = String(p.name ?? '').toLowerCase();
        const brand = String(p.brand ?? '').toLowerCase();
        const model = String(p.modelNumber ?? p.model ?? '').toLowerCase();
        const serial = String(p.serialNumber ?? p.serial_number ?? '').toLowerCase();
        const productCode = String(p.productId ?? p.product_code ?? '').toLowerCase();
        const id = String(p.id ?? '').toLowerCase();

        return (
          name.includes(q) ||
          brand.includes(q) ||
          model.includes(q) ||
          serial.includes(q) ||
          productCode.includes(q) ||
          id.includes(q)
        );
      });
    }

    // 2. Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(
        (p) => p.category && String(p.category).toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // 3. Brand filter
    if (selectedBrand !== 'all') {
      result = result.filter(
        (p) => p.brand && String(p.brand).toLowerCase() === selectedBrand.toLowerCase()
      );
    }

    // 4. Warranty Status filter
    if (selectedWarrantyStatus !== 'all') {
      result = result.filter((p) => {
        const status = p.warranty?.status || 'expired';
        return String(status).toLowerCase() === selectedWarrantyStatus.toLowerCase();
      });
    }

    // 5. Health Status filter
    if (selectedHealthStatus !== 'all') {
      result = result.filter((p) => {
        const score = p.healthScore ?? 100;
        const healthCategory = getHealthStatus(score);
        return healthCategory === selectedHealthStatus;
      });
    }

    // 6. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'date_desc':
          return new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0);
        case 'date_asc':
          return new Date(a.purchaseDate || 0) - new Date(b.purchaseDate || 0);
        case 'price_asc':
          return (Number(a.purchasePrice) || 0) - (Number(b.purchasePrice) || 0);
        case 'price_desc':
          return (Number(b.purchasePrice) || 0) - (Number(a.purchasePrice) || 0);
        case 'health_desc':
          return (Number(b.healthScore) || 0) - (Number(a.healthScore) || 0);
        case 'warranty_soonest': {
          const aDays = a.warranty?.daysRemaining ?? -9999;
          const bDays = b.warranty?.daysRemaining ?? -9999;
          return aDays - bDays;
        }
        case 'recent':
        default:
          return new Date(b.createdAt || b.purchaseDate || 0) - new Date(a.createdAt || a.purchaseDate || 0);
      }
    });

    return result;
  }, [
    combinedProducts,
    searchQuery,
    selectedCategory,
    selectedBrand,
    selectedWarrantyStatus,
    selectedHealthStatus,
    sortBy,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== 'all' ||
    selectedBrand !== 'all' ||
    selectedWarrantyStatus !== 'all' ||
    selectedHealthStatus !== 'all' ||
    sortBy !== 'recent';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSelectedWarrantyStatus('all');
    setSelectedHealthStatus('all');
    setSortBy('recent');
  };

  // Add Product Handler
  const handleAddProduct = async (formData) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const newProduct = await productService.createProduct({
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        modelNumber: formData.modelNumber,
        serialNumber: formData.serialNumber,
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice,
        notes: formData.notes,
      });

      // If warranty registration was checked, create matching warranty
      if (formData.warrantyDetails) {
        const purchaseDate = new Date(formData.purchaseDate);
        const endDate = new Date(purchaseDate);
        endDate.setMonth(endDate.getMonth() + formData.warrantyDetails.durationMonths);

        await warrantyService.createWarranty({
          productId: newProduct.id,
          provider: formData.warrantyDetails.provider,
          type: formData.warrantyDetails.type,
          durationMonths: formData.warrantyDetails.durationMonths,
          startDate: formData.purchaseDate,
          endDate: endDate.toISOString().split('T')[0],
          coverageDetails: `Comprehensive coverage provided by ${formData.warrantyDetails.provider}.`,
        });
      }

      toast.success(`"${newProduct.name}" has been registered successfully!`);
      setIsAddModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to create product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Product Handler
  const handleEditProduct = async (formData) => {
    if (!editingProduct || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await productService.updateProduct(editingProduct.id, {
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        modelNumber: formData.modelNumber,
        serialNumber: formData.serialNumber,
        purchaseDate: formData.purchaseDate,
        purchasePrice: formData.purchasePrice,
        notes: formData.notes,
      });

      toast.success(`"${formData.name}" updated successfully!`);
      setEditingProduct(null);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update product details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Product Handler
  const handleDeleteConfirm = async () => {
    if (!deletingProduct || isDeleting) return;
    try {
      setIsDeleting(true);
      await productService.deleteProduct(deletingProduct.id);
      toast.success(`"${deletingProduct.name}" removed from inventory.`);
      setDeletingProduct(null);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="products-page">
      {/* Page Header */}
      <PageHeader
        title="Products"
        subtitle="Manage all your registered products and their warranty information."
        actions={
          <Button
            variant="primary"
            icon={FiPlus}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Product
          </Button>
        }
      />

      {/* KPI Summary Cards */}
      <ProductSummaryCards summary={summaryMetrics} loading={loading} />

      {/* Main Content Area */}
      {loading ? (
        <Card className="products-loading-card">
          <LoadingSpinner text="Loading products from SmartCare service layer..." />
        </Card>
      ) : error ? (
        <ErrorState
          title="Unable to load products"
          message={error}
          onRetry={loadData}
          retryLabel="Retry"
        />
      ) : combinedProducts.length === 0 ? (
        /* Empty State: Zero registered products in database */
        <Card className="products-empty-card">
          <EmptyState
            icon={FiBox}
            title="No products registered yet"
            description="Start by adding your first appliance, laptop, or gadget to track warranties and maintenance."
            actionLabel="Add Your First Product"
            actionIcon={FiPlus}
            onAction={() => setIsAddModalOpen(true)}
          />
        </Card>
      ) : (
        <>
          {/* Search, Filter, and Sort Controls */}
          <ProductFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearSearch={() => setSearchQuery('')}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            availableCategories={availableCategories}
            selectedBrand={selectedBrand}
            onBrandChange={setSelectedBrand}
            availableBrands={availableBrands}
            selectedWarrantyStatus={selectedWarrantyStatus}
            onWarrantyStatusChange={setSelectedWarrantyStatus}
            selectedHealthStatus={selectedHealthStatus}
            onHealthStatusChange={setSelectedHealthStatus}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
            totalResults={filteredProducts.length}
            totalCount={combinedProducts.length}
          />

          {/* Product Listing */}
          {filteredProducts.length === 0 ? (
            /* Empty State: No search/filter matches */
            <Card className="products-filter-empty-card">
              <EmptyState
                icon={FiSearch}
                title="No products match your filters"
                description="Try clearing your search query or adjusting your category, brand, and warranty filters."
                actionLabel="Reset All Filters"
                onAction={handleResetFilters}
              />
            </Card>
          ) : (
            <ProductTable
              products={filteredProducts}
              onEditProduct={(prod) => setEditingProduct(prod)}
              onDeleteProduct={(prod) => setDeletingProduct(prod)}
            />
          )}
        </>
      )}

      {/* Add Product Modal */}
      <ProductFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddProduct}
        isEdit={false}
        loading={isSubmitting}
      />

      {/* Edit Product Modal */}
      {editingProduct && (
        <ProductFormModal
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          initialValues={editingProduct}
          onSubmit={handleEditProduct}
          isEdit={true}
          loading={isSubmitting}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? This action will remove the product and cannot be undone.`}
        confirmText="Delete Product"
        cancelText="Keep Product"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
