/**
 * Product Service
 * Connects to Flask backend API (/api/v1/products)
 * Maps between database schema and frontend product representation.
 */

import { apiClient } from './apiClient.js';

/**
 * Adapt backend product record to frontend product entity
 */
export function adaptProduct(p) {
  if (!p) return null;
  const id = p.id;
  const productId = p.product_code || `PRD-${id}`;
  const modelNumber = p.model || p.model_number || p.modelNumber || '';
  const serialNumber = p.serial_number || p.serialNumber || '';
  const purchaseDate = p.purchase_date || p.purchaseDate || '';
  const purchasePrice =
    p.purchase_price !== null && p.purchase_price !== undefined
      ? Number(p.purchase_price)
      : Number(p.purchasePrice) || 0;
  const warrantyPeriod =
    p.warranty_period !== undefined ? p.warranty_period : p.warrantyPeriod;

  return {
    ...p,
    id,
    productId,
    product_code: productId,
    name: p.name || '',
    brand: p.brand || '',
    category: p.category || '',
    model: modelNumber,
    modelNumber,
    serial_number: serialNumber,
    serialNumber,
    purchase_date: purchaseDate,
    purchaseDate,
    purchase_price: purchasePrice,
    purchasePrice,
    warranty_period: warrantyPeriod,
    warrantyPeriod,
    warrantyId: p.warrantyId || (p.warranties && p.warranties[0]?.id) || null,
    warranties: p.warranties || [],
    healthScore:
      p.healthScore !== undefined
        ? p.healthScore
        : p.health_score !== undefined
        ? p.health_score
        : 100,
    notes: p.notes || '',
    createdAt: p.created_at || p.createdAt || '',
    updatedAt: p.updated_at || p.updatedAt || '',
  };
}

/**
 * Format frontend form payload for backend API
 */
export function productToBackendPayload(data) {
  const payload = {};
  if (data.name !== undefined) payload.name = String(data.name).trim();
  if (data.brand !== undefined) payload.brand = String(data.brand).trim();
  if (data.category !== undefined) payload.category = String(data.category).trim();

  if (data.modelNumber !== undefined || data.model !== undefined) {
    const m = data.modelNumber !== undefined ? data.modelNumber : data.model;
    payload.model = m ? String(m).trim() : null;
  }

  if (data.serialNumber !== undefined || data.serial_number !== undefined) {
    const s = data.serialNumber !== undefined ? data.serialNumber : data.serial_number;
    payload.serial_number = s ? String(s).trim() : null;
  }

  if (data.purchaseDate !== undefined || data.purchase_date !== undefined) {
    const pd = data.purchaseDate || data.purchase_date;
    payload.purchase_date = pd || null;
  }

  if (data.purchasePrice !== undefined || data.purchase_price !== undefined) {
    const priceVal =
      data.purchasePrice !== undefined ? data.purchasePrice : data.purchase_price;
    const price = Number(priceVal);
    payload.purchase_price = isNaN(price) ? 0 : price;
  }

  if (data.warrantyPeriod !== undefined || data.warranty_period !== undefined) {
    const wpVal =
      data.warrantyPeriod !== undefined ? data.warrantyPeriod : data.warranty_period;
    const wp = Number(wpVal);
    payload.warranty_period = isNaN(wp) ? null : wp;
  }

  if (data.notes !== undefined) {
    payload.notes = data.notes ? String(data.notes).trim() : null;
  }

  return payload;
}

export const productService = {
  /**
   * Retrieve all products for authenticated user
   */
  async getProducts(filters = {}) {
    const response = await apiClient.get('/products');
    const rawList = Array.isArray(response?.products)
      ? response.products
      : Array.isArray(response)
      ? response
      : [];

    let adapted = rawList.map(adaptProduct);

    if (filters.category && filters.category !== 'all') {
      adapted = adapted.filter(
        (p) => String(p.category ?? '').toLowerCase() === filters.category.toLowerCase()
      );
    }

    if (filters.brand && filters.brand !== 'all') {
      adapted = adapted.filter(
        (p) => String(p.brand ?? '').toLowerCase() === filters.brand.toLowerCase()
      );
    }

    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      adapted = adapted.filter(
        (p) =>
          String(p.name ?? '').toLowerCase().includes(q) ||
          String(p.brand ?? '').toLowerCase().includes(q) ||
          String(p.productId ?? p.product_code ?? '').toLowerCase().includes(q) ||
          String(p.modelNumber ?? p.model ?? '').toLowerCase().includes(q) ||
          String(p.serialNumber ?? p.serial_number ?? '').toLowerCase().includes(q) ||
          String(p.id ?? '').toLowerCase().includes(q)
      );
    }

    return adapted;
  },

  /**
   * Retrieve single product by ID (numeric or code string)
   */
  async getProductById(id) {
    if (typeof id === 'number' || /^\d+$/.test(String(id))) {
      try {
        const response = await apiClient.get(`/products/${id}`);
        return adaptProduct(response);
      } catch (err) {
        if (err.status !== 404) throw err;
      }
    }

    // Fallback: lookup by product_code or identifier in product list
    const products = await this.getProducts();
    const found = products.find(
      (p) =>
        String(p.id) === String(id) ||
        p.productId === id ||
        p.product_code === id
    );

    if (!found) {
      throw new Error(`Product not found with identifier: ${id}`);
    }
    return found;
  },

  /**
   * Create a new product via backend API
   */
  async createProduct(productData) {
    const payload = productToBackendPayload(productData);
    const response = await apiClient.post('/products', payload);
    return adaptProduct(response);
  },

  /**
   * Update existing product by ID
   */
  async updateProduct(id, updates) {
    let numericId = id;
    if (!/^\d+$/.test(String(id))) {
      const prod = await this.getProductById(id);
      numericId = prod.id;
    }

    const payload = productToBackendPayload(updates);
    const response = await apiClient.put(`/products/${numericId}`, payload);
    return adaptProduct(response);
  },

  /**
   * Delete product by ID
   */
  async deleteProduct(id) {
    let numericId = id;
    if (!/^\d+$/.test(String(id))) {
      const prod = await this.getProductById(id);
      numericId = prod.id;
    }

    const response = await apiClient.delete(`/products/${numericId}`);
    return { success: true, deletedId: numericId, ...(response || {}) };
  },

  /**
   * Search products by text query
   */
  async searchProducts(query) {
    return this.getProducts({ search: query });
  },

  /**
   * Filter products by category, brand, and search
   */
  async filterProducts(filters = {}) {
    return this.getProducts(filters);
  },
};

export default productService;
