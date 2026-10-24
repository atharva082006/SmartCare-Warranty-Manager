/**
 * Document Service
 * Connects to Flask backend API (/api/v1/documents)
 * Handles document uploads (multipart/form-data), authenticated blob streaming,
 * metadata updates, and search/filtering.
 *
 * SECURITY: All document viewing and downloads strictly use standard
 * Authorization: Bearer <JWT> headers. JWT access tokens are NEVER placed
 * in URL query parameters, path variables, or hash fragments.
 */

import { apiClient } from './apiClient.js';
import { getFileTypeFromFileName } from '../utils/documentUtils.js';
import { productService } from './productService.js';

/**
 * Adapt backend document model to frontend document representation.
 * Notice: fileUrl does NOT contain any JWT token or query parameter.
 */
export function adaptDocument(doc) {
  if (!doc) return null;
  const id = doc.id;
  const productId =
    doc.product_id !== undefined ? doc.product_id : doc.productId;
  const fileName = doc.file_name || doc.fileName || 'Untitled_Document.pdf';
  const mimeType = doc.mime_type || doc.mimeType || 'application/pdf';
  const fileType = doc.fileType || getFileTypeFromFileName(fileName, mimeType);
  const fileSize =
    Number(doc.file_size !== undefined ? doc.file_size : doc.fileSize) || 0;
  const documentType = doc.document_type || doc.documentType || 'Invoice';
  const uploadedAt =
    doc.upload_date || doc.uploadedAt || doc.created_at || new Date().toISOString();
  const description = doc.description || '';

  // Preserve static mock asset path if present; otherwise null (files fetched via authenticated blob)
  const fileUrl =
    typeof doc.fileUrl === 'string' &&
    (doc.fileUrl.startsWith('/mock-files') ||
      doc.fileUrl.startsWith('data:') ||
      doc.fileUrl.startsWith('blob:'))
      ? doc.fileUrl
      : null;

  // OCR properties
  let ocrStatus = doc.ocr_status || doc.ocrStatus || 'Not Processed';
  if (ocrStatus === 'COMPLETED') ocrStatus = 'Completed';
  else if (ocrStatus === 'PROCESSING') ocrStatus = 'Processing';
  else if (ocrStatus === 'FAILED') ocrStatus = 'Failed';
  else if (ocrStatus === 'PENDING') ocrStatus = 'Pending';

  return {
    ...doc,
    id,
    productId,
    product_id: productId,
    fileName,
    file_name: fileName,
    name: doc.name || fileName,
    documentType,
    document_type: documentType,
    fileSize,
    file_size: fileSize,
    mimeType,
    mime_type: mimeType,
    fileType,
    uploadedAt,
    upload_date: uploadedAt,
    description,
    fileUrl,
    ocrStatus,
    ocrProcessedAt: doc.ocr_processed_at || doc.ocrProcessedAt || null,
    ocrExtractedText: doc.ocr_extracted_text || doc.ocrExtractedText || '',
    ocrStructuredData: doc.ocr_structured_data || doc.ocrStructuredData || null,
  };
}

export const documentService = {
  /**
   * Retrieve all documents, attaching resolved product metadata and applying filters
   */
  async getDocuments(filters = {}) {
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

    const response = await apiClient.get('/documents', { params });
    const rawList = Array.isArray(response?.documents)
      ? response.documents
      : Array.isArray(response)
      ? response
      : [];

    let docs = rawList.map(adaptDocument);

    // Resolve products for rich view metadata
    let allProducts = [];
    try {
      allProducts = await productService.getProducts();
    } catch {
      allProducts = [];
    }

    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    docs = docs.map((doc) => ({
      ...doc,
      product:
        productMap.get(doc.productId) ||
        productMap.get(Number(doc.productId)) ||
        null,
    }));

    // 1. Text Search across name, ID, product name, brand, documentType, fileType, ocrText
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      docs = docs.filter((d) => {
        const prod = d.product;
        const ocr = String(d.ocrExtractedText || '').toLowerCase();
        const desc = String(d.description || '').toLowerCase();

        return (
          String(d.id ?? '').toLowerCase().includes(q) ||
          String(d.fileName ?? '').toLowerCase().includes(q) ||
          String(d.documentType ?? '').toLowerCase().includes(q) ||
          String(d.fileType ?? '').toLowerCase().includes(q) ||
          String(d.productId ?? '').toLowerCase().includes(q) ||
          String(prod?.name ?? '').toLowerCase().includes(q) ||
          String(prod?.brand ?? '').toLowerCase().includes(q) ||
          String(prod?.productId ?? prod?.product_code ?? '').toLowerCase().includes(q) ||
          ocr.includes(q) ||
          desc.includes(q)
        );
      });
    }

    // 2. Document Type Filter
    if (filters.documentType && filters.documentType !== 'all') {
      docs = docs.filter(
        (d) =>
          d.documentType.toLowerCase() === filters.documentType.toLowerCase()
      );
    }

    // 3. Product Category Filter
    if (filters.productCategory && filters.productCategory !== 'all') {
      docs = docs.filter(
        (d) =>
          d.product &&
          d.product.category &&
          d.product.category.toLowerCase() ===
            filters.productCategory.toLowerCase()
      );
    }

    // 4. OCR Status Filter
    if (filters.ocrStatus && filters.ocrStatus !== 'all') {
      docs = docs.filter(
        (d) =>
          d.ocrStatus &&
          d.ocrStatus.toLowerCase() === filters.ocrStatus.toLowerCase()
      );
    }

    // 5. File Type Filter
    if (filters.fileType && filters.fileType !== 'all') {
      docs = docs.filter(
        (d) =>
          d.fileType &&
          d.fileType.toLowerCase() === filters.fileType.toLowerCase()
      );
    }

    // 6. Sorting
    const sortBy = filters.sortBy || 'date_desc';
    docs.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.uploadedAt || 0) - new Date(b.uploadedAt || 0);
        case 'name_asc':
          return (a.fileName || '').localeCompare(b.fileName || '');
        case 'name_desc':
          return (b.fileName || '').localeCompare(a.fileName || '');
        case 'size_desc':
          return (b.fileSize || 0) - (a.fileSize || 0);
        case 'size_asc':
          return (a.fileSize || 0) - (b.fileSize || 0);
        case 'product_asc': {
          const aName = a.product?.name || '';
          const bName = b.product?.name || '';
          return aName.localeCompare(bName);
        }
        case 'product_desc': {
          const aName = a.product?.name || '';
          const bName = b.product?.name || '';
          return bName.localeCompare(aName);
        }
        case 'date_desc':
        default:
          return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
      }
    });

    return docs;
  },

  /**
   * Retrieve document by ID with resolved product
   */
  async getDocumentById(id) {
    if (typeof id === 'number' || /^\d+$/.test(String(id))) {
      try {
        const response = await apiClient.get(`/documents/${id}`);
        const doc = adaptDocument(response);
        if (doc.productId) {
          try {
            const product = await productService.getProductById(doc.productId);
            doc.product = product;
          } catch {
            doc.product = null;
          }
        }
        return doc;
      } catch (err) {
        if (err.status !== 404) throw err;
      }
    }

    const list = await this.getDocuments();
    const found = list.find((d) => String(d.id) === String(id));
    if (!found) {
      throw new Error(`Document not found with ID: ${id}`);
    }
    return found;
  },

  /**
   * Retrieve documents by product ID
   */
  async getDocumentsByProduct(productId) {
    return this.getDocuments({ productId });
  },

  /**
   * Alias: Retrieve documents by product ID
   */
  async getDocumentsByProductId(productId) {
    return this.getDocuments({ productId });
  },

  /**
   * Retrieve summary statistics for documents owned by the authenticated user.
   * Derives metrics from the authenticated document collection.
   */
  async getDocumentStats() {
    const docs = await this.getDocuments();
    const safeDocs = Array.isArray(docs) ? docs : [];

    const totalDocuments = safeDocs.length;
    const warrantyDocuments = safeDocs.filter((d) => {
      const type = String(d?.documentType || d?.document_type || '').toLowerCase();
      return type === 'warranty card' || type === 'warranty';
    }).length;

    const serviceDocuments = safeDocs.filter((d) => {
      const type = String(d?.documentType || d?.document_type || '').toLowerCase();
      return type === 'service invoice' || type === 'service report';
    }).length;

    const ocrCompleted = safeDocs.filter((d) => {
      const st = String(d?.ocrStatus || d?.ocr_status || '').toLowerCase();
      return st === 'completed';
    }).length;

    const ocrPending = safeDocs.filter((d) => {
      const st = String(d?.ocrStatus || d?.ocr_status || '').toLowerCase();
      return st === 'pending' || st === 'processing';
    }).length;

    const totalStorageBytes = safeDocs.reduce((sum, d) => {
      const size = Number(d?.fileSize !== undefined ? d?.fileSize : d?.file_size) || 0;
      return sum + size;
    }, 0);

    return {
      totalDocuments,
      warrantyDocuments,
      serviceDocuments,
      ocrCompleted,
      ocrPending,
      totalStorageBytes,
    };
  },

  /**
   * Upload document file with metadata via multipart/form-data
   */
  async uploadDocument(uploadData) {
    let formData;

    if (uploadData instanceof FormData) {
      formData = uploadData;
    } else {
      formData = new FormData();
      let productId = uploadData.productId || uploadData.product_id;
      if (typeof productId === 'string' && !/^\d+$/.test(productId)) {
        const prod = await productService.getProductById(productId);
        productId = prod.id;
      }

      formData.append('product_id', String(productId));

      if (uploadData.file) {
        formData.append('file', uploadData.file);
      }

      const name =
        uploadData.name ||
        uploadData.fileName ||
        (uploadData.file && uploadData.file.name) ||
        'Document';
      formData.append('name', name);

      if (uploadData.documentType || uploadData.document_type) {
        formData.append(
          'document_type',
          uploadData.documentType || uploadData.document_type
        );
      }

      if (uploadData.description) {
        formData.append('description', uploadData.description);
      }
    }

    const response = await apiClient.upload('/documents', formData);
    return adaptDocument(response);
  },

  /**
   * Create document alias
   */
  async createDocument(data) {
    return this.uploadDocument(data);
  },

  /**
   * Update document metadata
   */
  async updateDocument(id, updates) {
    let numericId = id;
    if (!/^\d+$/.test(String(id))) {
      const doc = await this.getDocumentById(id);
      numericId = doc.id;
    }

    const payload = {};
    if (updates.name !== undefined || updates.fileName !== undefined) {
      payload.name = updates.name || updates.fileName;
    }
    if (
      updates.documentType !== undefined ||
      updates.document_type !== undefined
    ) {
      payload.document_type = updates.documentType || updates.document_type;
    }
    if (updates.description !== undefined) {
      payload.description = updates.description;
    }

    const response = await apiClient.put(`/documents/${numericId}`, payload);
    return adaptDocument(response);
  },

  /**
   * Delete document by ID
   */
  async deleteDocument(id) {
    let numericId = id;
    if (!/^\d+$/.test(String(id))) {
      const doc = await this.getDocumentById(id);
      numericId = doc.id;
    }

    const response = await apiClient.delete(`/documents/${numericId}`);
    return { success: true, deletedId: numericId, ...(response || {}) };
  },

  /**
   * Authenticated fetch for physical document file as a Blob.
   * Sends Authorization: Bearer <JWT> in the request header.
   */
  async getDocumentBlob(id, queryParams = {}) {
    let numericId = id;
    if (!/^\d+$/.test(String(id))) {
      const doc = await this.getDocumentById(id);
      numericId = doc.id;
    }

    return apiClient.downloadBlob(`/documents/${numericId}/file`, {
      params: queryParams,
    });
  },

  /**
   * Programmatically download document file with standard Authorization header.
   * Creates a temporary Object URL from the response Blob and cleans it up after download.
   */
  async downloadDocument(id, defaultFileName = 'document') {
    const { blob, filename } = await this.getDocumentBlob(id, {
      download: 'true',
    });

    const downloadName = filename || defaultFileName;
    const objectUrl = window.URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = objectUrl;
    a.download = downloadName;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);

    // Revoke object URL after trigger
    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 1000);

    return true;
  },

  /**
   * Open document in a new browser window/tab using an authenticated Blob Object URL.
   * Safely revokes the Object URL after the browser tab loads the resource.
   */
  async openDocument(id) {
    const { blob } = await this.getDocumentBlob(id);
    const objectUrl = window.URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');

    // Revoke after 60 seconds once tab has rendered
    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 60000);

    return objectUrl;
  },

  /**
   * Create an ephemeral Object URL for component rendering (caller responsible for revocation).
   */
  async getDocumentBlobUrl(id) {
    const { blob } = await this.getDocumentBlob(id);
    return window.URL.createObjectURL(blob);
  },
};

export default documentService;
