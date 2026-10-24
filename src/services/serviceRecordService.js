/**
 * Service Record Service
 * Connects to Flask backend API (/api/v1/service-records)
 * Handles maintenance logs, repair history, cost aggregations, and status adaptation.
 */

import { apiClient } from './apiClient.js';
import { productService } from './productService.js';

/**
 * Adapt backend service record to frontend format
 */
export function adaptServiceRecord(r) {
  if (!r) return null;
  const id = r.id;
  const productId = r.product_id !== undefined ? r.product_id : r.productId;
  const serviceDate = r.service_date || r.serviceDate || '';
  const cost = Number(r.cost !== undefined ? r.cost : 0) || 0;
  const serviceType = r.type || r.serviceType || 'Maintenance';
  const provider = r.provider || 'Authorized Service Center';
  const desc = r.description || r.issueDescription || '';
  const work = r.workPerformed || desc;

  let status = r.status || 'Completed';
  const upperStatus = String(status).toUpperCase();
  if (upperStatus === 'COMPLETED') status = 'Completed';
  else if (upperStatus === 'PENDING') status = 'Scheduled';
  else if (upperStatus === 'CANCELLED') status = 'Cancelled';

  return {
    ...r,
    id,
    productId,
    product_id: productId,
    serviceDate,
    service_date: serviceDate,
    cost,
    serviceType,
    type: serviceType,
    provider,
    description: desc,
    issueDescription: desc,
    workPerformed: work,
    partsReplaced: Array.isArray(r.partsReplaced)
      ? r.partsReplaced
      : typeof r.partsReplaced === 'string' && r.partsReplaced.trim()
      ? r.partsReplaced.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    status,
    rawStatus: r.status,
    notes: r.notes || '',
    nextServiceDate: r.nextServiceDate || '',
    createdAt: r.created_at || r.createdAt || '',
    updatedAt: r.updated_at || r.updatedAt || '',
  };
}

/**
 * Format frontend form payload for backend API
 */
export function serviceRecordToBackendPayload(data) {
  let status = data.status || 'COMPLETED';
  const upper = String(status).toUpperCase();
  if (upper === 'COMPLETED') status = 'COMPLETED';
  else if (
    upper === 'SCHEDULED' ||
    upper === 'IN PROGRESS' ||
    upper === 'PENDING'
  ) {
    status = 'PENDING';
  } else if (upper === 'CANCELLED' || upper === 'CANCELED') {
    status = 'CANCELLED';
  } else {
    status = 'COMPLETED';
  }

  const payload = {
    service_date: data.serviceDate || data.service_date,
    cost: Number(data.cost) || 0,
    type: data.serviceType || data.type || 'Maintenance',
    provider: data.provider
      ? String(data.provider).trim()
      : 'Authorized Service Center',
    description: (
      data.issueDescription ||
      data.description ||
      data.workPerformed ||
      ''
    ).trim(),
    status,
  };

  if (data.productId !== undefined || data.product_id !== undefined) {
    payload.product_id = Number(data.productId || data.product_id);
  }

  return payload;
}

export const serviceRecordService = {
  /**
   * Retrieve all service records for authenticated user, sorted by date descending
   */
  async getServiceRecords(filters = {}) {
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

    const response = await apiClient.get('/service-records', { params });
    const rawList = Array.isArray(response?.service_records)
      ? response.service_records
      : Array.isArray(response)
      ? response
      : [];

    let adapted = rawList.map(adaptServiceRecord);

    if (filters.status && filters.status !== 'all') {
      adapted = adapted.filter(
        (r) => r.status.toLowerCase() === filters.status.toLowerCase()
      );
    }

    if (filters.serviceType && filters.serviceType !== 'all') {
      adapted = adapted.filter(
        (r) => r.serviceType.toLowerCase() === filters.serviceType.toLowerCase()
      );
    }

    // Sort newest serviceDate first
    return [...adapted].sort(
      (a, b) => new Date(b.serviceDate) - new Date(a.serviceDate)
    );
  },

  /**
   * Retrieve single service record by ID
   */
  async getServiceRecordById(id) {
    if (typeof id === 'number' || /^\d+$/.test(String(id))) {
      try {
        const response = await apiClient.get(`/service-records/${id}`);
        return adaptServiceRecord(response);
      } catch (err) {
        if (err.status !== 404) throw err;
      }
    }

    const list = await this.getServiceRecords();
    const found = list.find((r) => String(r.id) === String(id));
    if (!found) {
      throw new Error(`Service record not found with ID: ${id}`);
    }
    return found;
  },

  /**
   * Retrieve all service records for a specific product
   */
  async getServiceRecordsByProduct(productId) {
    return this.getServiceRecords({ productId });
  },

  /**
   * Alias: Retrieve all service records for a specific product ID
   */
  async getServiceRecordsByProductId(productId) {
    return this.getServiceRecordsByProduct(productId);
  },

  /**
   * Create a new service record via backend API
   */
  async createServiceRecord(serviceData) {
    let productId = serviceData.productId || serviceData.product_id;
    if (typeof productId === 'string' && !/^\d+$/.test(productId)) {
      const prod = await productService.getProductById(productId);
      productId = prod.id;
    }

    const payload = serviceRecordToBackendPayload({
      ...serviceData,
      productId,
    });

    const response = await apiClient.post('/service-records', payload);
    return adaptServiceRecord(response);
  },

  /**
   * Update existing service record by ID
   */
  async updateServiceRecord(id, updates) {
    let numericId = id;
    if (!/^\d+$/.test(String(id))) {
      const record = await this.getServiceRecordById(id);
      numericId = record.id;
    }

    const payload = serviceRecordToBackendPayload(updates);
    delete payload.product_id; // prevent accidentally mutating parent product unless intended

    const response = await apiClient.put(
      `/service-records/${numericId}`,
      payload
    );
    return adaptServiceRecord(response);
  },

  /**
   * Delete service record by ID
   */
  async deleteServiceRecord(id) {
    let numericId = id;
    if (!/^\d+$/.test(String(id))) {
      const record = await this.getServiceRecordById(id);
      numericId = record.id;
    }

    const response = await apiClient.delete(`/service-records/${numericId}`);
    return { success: true, deletedId: numericId, ...(response || {}) };
  },
};

export default serviceRecordService;
