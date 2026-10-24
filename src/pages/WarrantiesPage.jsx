import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiPlus, FiShield, FiSearch } from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader/PageHeader';
import Button from '../components/common/Button/Button';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Card from '../components/common/Card/Card';
import EmptyState from '../components/common/EmptyState/EmptyState';
import ErrorState from '../components/common/ErrorState/ErrorState';
import ConfirmDialog from '../components/common/ConfirmDialog/ConfirmDialog';
import { useToast } from '../hooks/useToast';

import WarrantyKpiCards from '../components/warranties/WarrantyKpiCards';
import WarrantyStatusOverview from '../components/warranties/WarrantyStatusOverview';
import WarrantyExpiringSoonSection from '../components/warranties/WarrantyExpiringSoonSection';
import WarrantyFilterBar from '../components/warranties/WarrantyFilterBar';
import WarrantyTable from '../components/warranties/WarrantyTable';
import WarrantyFormModal from '../components/warranties/WarrantyFormModal';

import { warrantyService } from '../services/warrantyService';
import { productService } from '../services/productService';

import './WarrantiesPage.css';

export default function WarrantiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  // Data state
  const [warranties, setWarranties] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(() => searchParams.get('status') || 'all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('expiry_soonest');

  // Modals & Dialogs state
  const [isAddModalOpen, setIsAddModalOpen] = useState(() => Boolean(searchParams.get('addProductId')));
  const [preselectedProductId, setPreselectedProductId] = useState(() => searchParams.get('addProductId') || '');
  const [editingWarranty, setEditingWarranty] = useState(null);
  const [deletingWarranty, setDeletingWarranty] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch warranties and products via service layer
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedWarranties, fetchedProducts, fetchedStats] = await Promise.all([
        warrantyService.getWarranties(),
        productService.getProducts(),
        warrantyService.getWarrantyStats(),
      ]);

      setWarranties(fetchedWarranties);
      setProducts(fetchedProducts);
      setStats(fetchedStats);
      setError(null);
    } catch (err) {
      console.error('Error loading warranties:', err);
      setError('Unable to load warranties. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine each warranty with its corresponding product
  const combinedWarranties = useMemo(() => {
    const productMap = new Map();
    products.forEach((p) => {
      productMap.set(p.id, p);
      if (p.productId) productMap.set(p.productId, p);
    });

    return warranties.map((w) => ({
      ...w,
      product: productMap.get(w.productId) || null,
    }));
  }, [warranties, products]);

  // Derive unique options for filter dropdowns
  const availableTypes = useMemo(() => {
    const set = new Set(warranties.map((w) => w.type).filter(Boolean));
    return Array.from(set).sort();
  }, [warranties]);

  const availableProviders = useMemo(() => {
    const set = new Set(warranties.map((w) => w.provider).filter(Boolean));
    return Array.from(set).sort();
  }, [warranties]);

  const availableCategories = useMemo(() => {
    const set = new Set(
      combinedWarranties.map((w) => w.product?.category).filter(Boolean)
    );
    return Array.from(set).sort();
  }, [combinedWarranties]);

  // Warranties expiring soon list (<= 30 days)
  const expiringSoonList = useMemo(() => {
    return combinedWarranties
      .filter((w) => w.status === 'expiringSoon')
      .sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999));
  }, [combinedWarranties]);

  // Filter and sort warranties
  const filteredWarranties = useMemo(() => {
    let result = [...combinedWarranties];

    // 1. Text Search across product name, product ID, brand, provider, type, warranty ID
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((w) => {
        const prod = w.product;
        return (
          String(w.id ?? '').toLowerCase().includes(q) ||
          String(w.type ?? '').toLowerCase().includes(q) ||
          String(w.provider ?? '').toLowerCase().includes(q) ||
          String(w.productId ?? '').toLowerCase().includes(q) ||
          String(prod?.name ?? '').toLowerCase().includes(q) ||
          String(prod?.brand ?? '').toLowerCase().includes(q) ||
          String(prod?.productId ?? prod?.product_code ?? '').toLowerCase().includes(q)
        );
      });
    }

    // 2. Status Filter
    if (selectedStatus !== 'all') {
      result = result.filter(
        (w) => w.status && String(w.status).toLowerCase() === selectedStatus.toLowerCase()
      );
    }

    // 3. Warranty Type Filter
    if (selectedType !== 'all') {
      result = result.filter(
        (w) => w.type && String(w.type).toLowerCase() === selectedType.toLowerCase()
      );
    }

    // 4. Provider Filter
    if (selectedProvider !== 'all') {
      result = result.filter(
        (w) => w.provider && String(w.provider).toLowerCase() === selectedProvider.toLowerCase()
      );
    }

    // 5. Product Category Filter
    if (selectedCategory !== 'all') {
      result = result.filter(
        (w) =>
          w.product?.category &&
          String(w.product.category).toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // 6. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'expiry_latest':
          return new Date(b.endDate || 0) - new Date(a.endDate || 0);
        case 'start_desc':
          return new Date(b.startDate || 0) - new Date(a.startDate || 0);
        case 'start_asc':
          return new Date(a.startDate || 0) - new Date(b.startDate || 0);
        case 'name_asc': {
          const aName = a.product?.name || '';
          const bName = b.product?.name || '';
          return aName.localeCompare(bName);
        }
        case 'name_desc': {
          const aName = a.product?.name || '';
          const bName = b.product?.name || '';
          return bName.localeCompare(aName);
        }
        case 'days_asc':
          return (a.daysRemaining ?? -9999) - (b.daysRemaining ?? -9999);
        case 'days_desc':
          return (b.daysRemaining ?? -9999) - (a.daysRemaining ?? -9999);
        case 'expiry_soonest':
        default:
          return new Date(a.endDate || 0) - new Date(b.endDate || 0);
      }
    });

    return result;
  }, [
    combinedWarranties,
    searchQuery,
    selectedStatus,
    selectedType,
    selectedProvider,
    selectedCategory,
    sortBy,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedStatus !== 'all' ||
    selectedType !== 'all' ||
    selectedProvider !== 'all' ||
    selectedCategory !== 'all' ||
    sortBy !== 'expiry_soonest';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedType('all');
    setSelectedProvider('all');
    setSelectedCategory('all');
    setSortBy('expiry_soonest');
    // Clear url query params
    setSearchParams({});
  };

  // Add Warranty Handler
  const handleAddWarranty = async (formData) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const newWarranty = await warrantyService.createWarranty({
        productId: formData.productId,
        type: formData.type,
        provider: formData.provider,
        startDate: formData.startDate,
        endDate: formData.endDate,
        durationMonths: formData.durationMonths,
        coverageDetails: formData.coverageDetails,
        supportContact: formData.supportContact,
        terms: formData.terms,
      });

      // Update product's warrantyId reference if product exists
      try {
        await productService.updateProduct(formData.productId, {
          warrantyId: newWarranty.id,
        });
      } catch (e) {
        // Safe optional link update
      }

      toast.success('Warranty registered successfully!');
      setIsAddModalOpen(false);
      setPreselectedProductId('');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Unable to save warranty. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Warranty Handler
  const handleEditWarranty = async (formData) => {
    if (!editingWarranty || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await warrantyService.updateWarranty(editingWarranty.id, {
        productId: formData.productId,
        type: formData.type,
        provider: formData.provider,
        startDate: formData.startDate,
        endDate: formData.endDate,
        durationMonths: formData.durationMonths,
        coverageDetails: formData.coverageDetails,
        supportContact: formData.supportContact,
        terms: formData.terms,
      });

      toast.success('Warranty details updated successfully!');
      setEditingWarranty(null);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Unable to update warranty. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Warranty Handler
  const handleDeleteConfirm = async () => {
    if (!deletingWarranty || isDeleting) return;
    try {
      setIsDeleting(true);
      await warrantyService.deleteWarranty(deletingWarranty.id);
      toast.success('Warranty record removed from SmartCare.');
      setDeletingWarranty(null);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Unable to delete warranty. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="warranties-page">
      {/* Page Header */}
      <PageHeader
        title="Warranties"
        subtitle="Track warranty coverage, expiration dates, and protection status for your products."
        actions={
          <Button
            variant="primary"
            icon={FiPlus}
            onClick={() => {
              setPreselectedProductId('');
              setIsAddModalOpen(true);
            }}
          >
            Add Warranty
          </Button>
        }
      />

      {/* 4 KPI Summary Cards */}
      <WarrantyKpiCards stats={stats} loading={loading} />

      {/* Main Content Area */}
      {loading ? (
        <Card className="warranties-loading-card">
          <LoadingSpinner text="Loading warranties from SmartCare service layer..." />
        </Card>
      ) : error ? (
        <ErrorState
          title="Unable to load warranties"
          message={error}
          onRetry={loadData}
          retryLabel="Retry"
        />
      ) : combinedWarranties.length === 0 ? (
        /* Empty State: Zero warranties in system */
        <Card className="warranties-empty-card">
          <EmptyState
            icon={FiShield}
            title="No warranties registered yet."
            description="Start by adding your first warranty certificate or manufacturer guarantee to track expiration dates."
            actionLabel="Add Your First Warranty"
            actionIcon={FiPlus}
            onAction={() => {
              setPreselectedProductId('');
              setIsAddModalOpen(true);
            }}
          />
        </Card>
      ) : (
        <>
          {/* Status Overview Distribution Card */}
          <WarrantyStatusOverview stats={stats} />

          {/* Expiring Soon Highlight Section */}
          <WarrantyExpiringSoonSection expiringWarranties={expiringSoonList} />

          {/* Search, Filter, and Sort Controls */}
          <WarrantyFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearSearch={() => setSearchQuery('')}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            availableTypes={availableTypes}
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            availableProviders={availableProviders}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            availableCategories={availableCategories}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
            totalResults={filteredWarranties.length}
            totalCount={combinedWarranties.length}
          />

          {/* Warranty Listing (Desktop Table + Mobile Cards) */}
          {filteredWarranties.length === 0 ? (
            /* Empty State: No search/filter matches */
            <Card className="warranties-filter-empty-card">
              <EmptyState
                icon={FiSearch}
                title={searchQuery.trim() ? "No warranties match your search." : "No warranties match the selected filters."}
                description="Try clearing your search query or adjusting your status, warranty type, provider, or category filters."
                actionLabel="Reset All Filters"
                onAction={handleResetFilters}
              />
            </Card>
          ) : (
            <WarrantyTable
              warranties={filteredWarranties}
              onEditWarranty={(w) => setEditingWarranty(w)}
              onDeleteWarranty={(w) => setDeletingWarranty(w)}
            />
          )}
        </>
      )}

      {/* Add Warranty Modal */}
      <WarrantyFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setPreselectedProductId('');
        }}
        initialProductId={preselectedProductId}
        products={products}
        onSubmit={handleAddWarranty}
        isEdit={false}
        loading={isSubmitting}
      />

      {/* Edit Warranty Modal */}
      {editingWarranty && (
        <WarrantyFormModal
          isOpen={Boolean(editingWarranty)}
          onClose={() => setEditingWarranty(null)}
          initialValues={editingWarranty}
          products={products}
          onSubmit={handleEditWarranty}
          isEdit={true}
          loading={isSubmitting}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingWarranty)}
        onClose={() => setDeletingWarranty(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Warranty"
        message="Deleting this warranty will remove the warranty record from SmartCare. Are you sure you want to proceed?"
        confirmText="Delete Warranty"
        cancelText="Keep Warranty"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
