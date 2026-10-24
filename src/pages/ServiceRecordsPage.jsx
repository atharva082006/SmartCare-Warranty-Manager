import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiPlus, FiTool, FiSearch } from 'react-icons/fi';
import PageHeader from '../components/common/PageHeader/PageHeader';
import Button from '../components/common/Button/Button';
import LoadingSpinner from '../components/common/LoadingSpinner/LoadingSpinner';
import Card from '../components/common/Card/Card';
import EmptyState from '../components/common/EmptyState/EmptyState';
import ErrorState from '../components/common/ErrorState/ErrorState';
import ConfirmDialog from '../components/common/ConfirmDialog/ConfirmDialog';
import { useToast } from '../hooks/useToast';

import ServiceRecordKpiCards from '../components/serviceRecords/ServiceRecordKpiCards';
import ServiceRecordStatusOverview from '../components/serviceRecords/ServiceRecordStatusOverview';
import ServiceRecordFilterBar from '../components/serviceRecords/ServiceRecordFilterBar';
import ServiceRecordTable from '../components/serviceRecords/ServiceRecordTable';
import ServiceRecordFormModal from '../components/serviceRecords/ServiceRecordFormModal';

import { serviceRecordService } from '../services/serviceRecordService';
import { productService } from '../services/productService';

import './ServiceRecordsPage.css';

export default function ServiceRecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  // Data state
  const [serviceRecords, setServiceRecords] = useState([]);
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
  const [sortBy, setSortBy] = useState('date_desc');

  // Modals & Dialogs state
  const [isAddModalOpen, setIsAddModalOpen] = useState(() => Boolean(searchParams.get('addProductId')));
  const [preselectedProductId, setPreselectedProductId] = useState(() => searchParams.get('addProductId') || '');
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load data via service layer
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedRecords, fetchedProducts, fetchedStats] = await Promise.all([
        serviceRecordService.getServiceRecords(),
        productService.getProducts(),
        serviceRecordService.getServiceRecordStats(),
      ]);

      setServiceRecords(fetchedRecords);
      setProducts(fetchedProducts);
      setStats(fetchedStats);
      setError(null);
    } catch (err) {
      console.error('Error loading service records:', err);
      setError('Unable to load service records. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine each service record with its corresponding product
  const combinedRecords = useMemo(() => {
    const productMap = new Map();
    products.forEach((p) => {
      productMap.set(p.id, p);
      if (p.productId) productMap.set(p.productId, p);
    });

    return serviceRecords.map((r) => ({
      ...r,
      product: productMap.get(r.productId) || null,
    }));
  }, [serviceRecords, products]);

  // Derive unique options for filter dropdowns
  const availableTypes = useMemo(() => {
    const set = new Set(serviceRecords.map((r) => r.serviceType).filter(Boolean));
    return Array.from(set).sort();
  }, [serviceRecords]);

  const availableProviders = useMemo(() => {
    const set = new Set(serviceRecords.map((r) => r.provider).filter(Boolean));
    return Array.from(set).sort();
  }, [serviceRecords]);

  const availableCategories = useMemo(() => {
    const set = new Set(
      combinedRecords.map((r) => r.product?.category).filter(Boolean)
    );
    return Array.from(set).sort();
  }, [combinedRecords]);

  // Filter and sort service records
  const filteredRecords = useMemo(() => {
    let result = [...combinedRecords];

    // 1. Text Search across product name, ID, brand, service record ID, provider, type, issue, work
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((r) => {
        const prod = r.product;
        const issue = String(r.issueDescription || r.description || '').toLowerCase();
        const work = String(r.workPerformed || '').toLowerCase();

        return (
          String(r.id ?? '').toLowerCase().includes(q) ||
          String(r.serviceType ?? '').toLowerCase().includes(q) ||
          String(r.provider ?? '').toLowerCase().includes(q) ||
          String(r.productId ?? '').toLowerCase().includes(q) ||
          String(prod?.name ?? '').toLowerCase().includes(q) ||
          String(prod?.brand ?? '').toLowerCase().includes(q) ||
          String(prod?.productId ?? prod?.product_code ?? '').toLowerCase().includes(q) ||
          issue.includes(q) ||
          work.includes(q)
        );
      });
    }

    // 2. Status Filter
    if (selectedStatus !== 'all') {
      result = result.filter(
        (r) => r.status && String(r.status).toLowerCase() === selectedStatus.toLowerCase()
      );
    }

    // 3. Service Type Filter
    if (selectedType !== 'all') {
      result = result.filter(
        (r) => r.serviceType && String(r.serviceType).toLowerCase() === selectedType.toLowerCase()
      );
    }

    // 4. Provider Filter
    if (selectedProvider !== 'all') {
      result = result.filter(
        (r) => r.provider && String(r.provider).toLowerCase() === selectedProvider.toLowerCase()
      );
    }

    // 5. Product Category Filter
    if (selectedCategory !== 'all') {
      result = result.filter(
        (r) =>
          r.product?.category &&
          String(r.product.category).toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // 6. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.serviceDate || 0) - new Date(b.serviceDate || 0);
        case 'cost_desc':
          return (Number(b.cost) || 0) - (Number(a.cost) || 0);
        case 'cost_asc':
          return (Number(a.cost) || 0) - (Number(b.cost) || 0);
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
        case 'provider_asc': {
          const aProv = a.provider || '';
          const bProv = b.provider || '';
          return aProv.localeCompare(bProv);
        }
        case 'provider_desc': {
          const aProv = a.provider || '';
          const bProv = b.provider || '';
          return bProv.localeCompare(aProv);
        }
        case 'date_desc':
        default:
          return new Date(b.serviceDate || 0) - new Date(a.serviceDate || 0);
      }
    });

    return result;
  }, [
    combinedRecords,
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
    sortBy !== 'date_desc';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedType('all');
    setSelectedProvider('all');
    setSelectedCategory('all');
    setSortBy('date_desc');
    setSearchParams({});
  };

  // Add Service Record Handler
  const handleAddRecord = async (formData) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await serviceRecordService.createServiceRecord(formData);

      toast.success('Service record logged successfully!');
      setIsAddModalOpen(false);
      setPreselectedProductId('');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Unable to save service record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Service Record Handler
  const handleEditRecord = async (formData) => {
    if (!editingRecord || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await serviceRecordService.updateServiceRecord(editingRecord.id, formData);

      toast.success('Service record updated successfully!');
      setEditingRecord(null);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Unable to update service record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Service Record Handler
  const handleDeleteConfirm = async () => {
    if (!deletingRecord || isDeleting) return;
    try {
      setIsDeleting(true);
      await serviceRecordService.deleteServiceRecord(deletingRecord.id);
      toast.success(`Service record ${deletingRecord.id} removed.`);
      setDeletingRecord(null);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Unable to delete service record. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="service-records-page">
      {/* Page Header */}
      <PageHeader
        title="Service Records"
        subtitle="Track repairs, maintenance, service costs, and service history for your products."
        actions={
          <Button
            variant="primary"
            icon={FiPlus}
            onClick={() => {
              setPreselectedProductId('');
              setIsAddModalOpen(true);
            }}
          >
            + Add Service Record
          </Button>
        }
      />

      {/* 4 KPI Summary Cards */}
      <ServiceRecordKpiCards stats={stats} loading={loading} />

      {/* Main Content Area */}
      {loading ? (
        <Card className="service-loading-card">
          <LoadingSpinner text="Loading service records from SmartCare service layer..." />
        </Card>
      ) : error ? (
        <ErrorState
          title="Unable to load service records"
          message={error}
          onRetry={loadData}
          retryLabel="Retry"
        />
      ) : combinedRecords.length === 0 ? (
        /* Empty State: Zero service records in system */
        <Card className="service-empty-card">
          <EmptyState
            icon={FiTool}
            title="No service records yet."
            description="Start by logging your first maintenance visit, repair, or inspection to track lifetime appliance costs."
            actionLabel="+ Add Service Record"
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
          <ServiceRecordStatusOverview stats={stats} />

          {/* Search, Filter, and Sort Controls */}
          <ServiceRecordFilterBar
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
            totalResults={filteredRecords.length}
            totalCount={combinedRecords.length}
          />

          {/* Service Records Listing (Desktop Table + Mobile Cards) */}
          {filteredRecords.length === 0 ? (
            /* Empty State: No search/filter matches */
            <Card className="service-filter-empty-card">
              <EmptyState
                icon={FiSearch}
                title={
                  searchQuery.trim()
                    ? 'No service records match your search.'
                    : 'No service records match the selected filters.'
                }
                description="Try clearing your search query or adjusting your status, service type, provider, or category filters."
                actionLabel="Reset All Filters"
                onAction={handleResetFilters}
              />
            </Card>
          ) : (
            <ServiceRecordTable
              serviceRecords={filteredRecords}
              onEditRecord={(record) => setEditingRecord(record)}
              onDeleteRecord={(record) => setDeletingRecord(record)}
            />
          )}
        </>
      )}

      {/* Add Service Record Modal */}
      <ServiceRecordFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setPreselectedProductId('');
        }}
        initialProductId={preselectedProductId}
        products={products}
        onSubmit={handleAddRecord}
        isEdit={false}
        loading={isSubmitting}
      />

      {/* Edit Service Record Modal */}
      {editingRecord && (
        <ServiceRecordFormModal
          isOpen={Boolean(editingRecord)}
          onClose={() => setEditingRecord(null)}
          initialValues={editingRecord}
          products={products}
          onSubmit={handleEditRecord}
          isEdit={true}
          loading={isSubmitting}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingRecord)}
        onClose={() => setDeletingRecord(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Service Record"
        message={
          deletingRecord
            ? `Are you sure you want to delete service record ${deletingRecord.id} for "${
                deletingRecord.product?.name || deletingRecord.productId
              }"? This action cannot be undone.`
            : 'Are you sure you want to delete this service record?'
        }
        confirmText="Delete Record"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
