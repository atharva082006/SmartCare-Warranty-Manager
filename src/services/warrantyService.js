/**
 * Warranty Service
 * Connects to Flask backend API (/api/v1/warranties)
 * Manages warranty records, coverage details, and dynamic status adaptation.
 */

import { apiClient } from './apiClient.js';
import { productService } from './productService.js';
import { calculateWarrantyStatus, getDaysRemaining } from '../utils/warrantyUtils.js';

/**
 * Normalize backend uppercase status (ACTIVE, EXPIRING_SOON, EXPIRED)
 * into frontend lowercase/camelCase format (active, expiringSoon, expired).
 */
export function normalizeWarrantyStatus(status) {
  if (!status) return 'active';
  const s = String(status).toUpperCase();
  if (s === 'ACTIVE') return 'active';
  if (s === 'EXPIRING_SOON') return 'expiringSoon';
  if (s === 'EXPIRED') return 'expired';
  return status.toLowerCase();
}

/**
 * Adapt backend warranty record to frontend format
 */
export function adaptWarranty(w) {
  if (!w) return null;
  const id = w.id;
  const productId = w.product_id !== undefined ? w.product_id : w.productId;
  const startDate = w.start_date || w.startDate || '';
  const endDate = w.end_date || w.endDate || '';
  const coverage = w.coverage || w.coverageDetails || 'Standard manufacturer coverage';
  const type = w.type || 'Standard Warranty';
  const provider = w.provider || 'Authorized Brand Service';

  // Compute days remaining and normalized status
  const daysRemaining =
    w.days_remaining !== undefined
      ? w.days_remaining
      : w.daysRemaining !== undefined
      ? w.daysRemaining
      : getDaysRemaining(endDate);

  const status = w.status
    ? normalizeWarrantyStatus(w.status)
    : calculateWarrantyStatus(startDate, endDate);

  return {
    ...w,
    id,
    productId,
    product_id: productId,
    startDate,
    start_date: startDate,
    endDate,
    end_date: endDate,
    type,
    provider,
    coverage,
    coverageDetails: coverage,
    status,
    rawStatus: w.status || 'ACTIVE',
    daysRemaining,
    days_remaining: daysRemaining,
    durationMonths: w.durationMonths || 12,
    supportContact: w.supportContact || '',
    isActive: w.is_active !== undefined ? w.is_active : status !== 'expired',
    createdAt: w.created_at || w.createdAt || '',
    updatedAt: w.updated_at || w.updatedAt || '',
  };
}

export const warrantyService = {
  /**
   * Retrieve all warranties for authenticated user
   */
  async getWarranties(filters = {}) {
    let params = {};
    if (filters.productId || filters.product_id) {
      let pid = filters.productId || filters.product_id;
      if (typeof pid === 'string' && !/^\d+$/.test(pid)) {
        try {
          const prod = await productService.getProductById(pid);
          pid = prod.id;
        } catch {
          // Ignored
        }
      }
      params.product_id = pid;
    }

    const response = await apiClient.get('/warranties', { params });
    const rawList = Array.isArray(response?.warranties)
      ? response.warranties
      : Array.isArray(response)
      ? response
      : [];

    let adapted = rawList.map(adaptWarranty);

    if (filters.status && filters.status !== 'all') {
      adapted = adapted.filter((w) => w.status === filters.status);
    }

    return adapted;
  },

  /**
   * Retrieve single warranty by ID
   */
  async getWarrantyById(id) {
    if (typeof id === 'number' || /^\d+$/.test(String(id))) {
      try {
        const response = await apiClient.get(`/warranties/${id}`);
        return adaptWarranty(response);
      } catch (err) {
        if (err.status !== 404) throw err;
      }
    }

    const list = await this.getWarranties();
    const found = list.find((w) => String(w.id) === String(id));
    if (!found) {
      throw new Error(`Warranty not found with identifier: ${id}`);
    }
    return found;
  },

  /**
   * Retrieve warranties for a specific product
   */
  async getWarrantiesByProduct(productId) {
    return this.getWarranties({ productId });
  },

  /**
   * Retrieve active warranties only
   */
  async getActiveWarranties() {
    const list = await this.getWarranties();
    return list.filter((w) => w.status === 'active');
  },

  /**
   * Retrieve warranties expiring soon (<= 30 days)
   */
  async getExpiringWarranties() {
    const list = await this.getWarranties();
    return list.filter((w) => w.status === 'expiringSoon');
  },

  /**
   * Retrieve expired warranties
   */
  async getExpiredWarranties() {
    const list = await this.getWarranties();
    return list.filter((w) => w.status === 'expired');
  },

  /**
   * Create new warranty record via backend API
   */
  async createWarranty(warrantyData) {
    let productId = warrantyData.productId || warrantyData.product_id;
    if (typeof productId === 'string' && !/^\d+$/.test(productId)) {
      const prod = await productService.getProductById(productId);
      productId = prod.id;
    }

    const payload = {
      product_id: Number(productId),
      start_date: warrantyData.startDate || warrantyData.start_date,
      end_date: warrantyData.endDate || warrantyData.end_date,
      type: warrantyData.type || 'Comprehensive Manufacturer Warranty',
      coverage:
        warrantyData.coverageDetails ||
        warrantyData.coverage ||
        'Standard manufacturer coverage',
      is_active: warrantyData.isActive !== undefined ? warrantyData.isActive : true,
    };

    const response = await apiClient.post('/warranties', payload);
    return adaptWarranty(response);
  },

  /**
   * Update existing warranty by ID
   */
  async updateWarranty(id, updates) {
    let numericId = id;
    if (!/^\d+$/.test(String(id))) {
      const w = await this.getWarrantyById(id);
      numericId = w.id;
    }

    const payload = {};
    if (updates.startDate !== undefined || updates.start_date !== undefined) {
      payload.start_date = updates.startDate || updates.start_date;
    }
    if (updates.endDate !== undefined || updates.end_date !== undefined) {
      payload.end_date = updates.endDate || updates.end_date;
    }
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.coverage !== undefined || updates.coverageDetails !== undefined) {
      payload.coverage =
        updates.coverageDetails !== undefined
          ? updates.coverageDetails
          : updates.coverage;
    }
    if (updates.isActive !== undefined || updates.is_active !== undefined) {
      payload.is_active =
        updates.isActive !== undefined ? updates.isActive : updates.is_active;
    }

    const response = await apiClient.put(`/warranties/${numericId}`, payload);
    return adaptWarranty(response);
  },

  /**
   * Delete warranty by ID
   */
  async deleteWarranty(id) {
    let numericId = id;
    if (!/^\d+$/.test(String(id))) {
      const w = await this.getWarrantyById(id);
      numericId = w.id;
    }

    const response = await apiClient.delete(`/warranties/${numericId}`);
    return { success: true, deletedId: numericId, ...(response || {}) };
  },
};

export default warrantyService;
