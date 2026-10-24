/**
 * OCR Service
 * Connects to Flask backend API (/api/v1/ocr/*)
 * Triggers optical character recognition on document uploads, retrieves
 * extracted text, parses structured entities, and normalizes prefill data.
 */

import { apiClient } from './apiClient.js';
import { documentService } from './documentService.js';

/**
 * Adapt backend OCR entities to support both camelCase and snake_case
 */
export function adaptOcrEntities(entities = {}) {
  const e = entities || {};

  const serial = e.serial_number || e.serialNumber || '';
  const model = e.model_number || e.model || '';
  const brand = e.brand || e.manufacturer || '';
  const prodName = e.product_name || e.product || '';
  const invNumber = e.invoice_number || e.invoiceNumber || '';
  const purchaseDate = e.purchase_date || e.purchaseDate || '';
  const wStart =
    e.warranty_start_date || e.warrantyStart || purchaseDate || '';
  const wEnd = e.warranty_end_date || e.warrantyEnd || '';
  const price = e.purchase_price || e.amount || e.totalCost || '';
  const vendor = e.vendor || e.seller || e.provider || brand || '';

  return {
    ...e,
    serialNumber: serial,
    serial_number: serial,
    model: model,
    modelNumber: model,
    model_number: model,
    manufacturer: brand,
    brand: brand,
    product: prodName,
    productName: prodName,
    product_name: prodName,
    invoiceNumber: invNumber,
    invoice_number: invNumber,
    purchaseDate: purchaseDate,
    purchase_date: purchaseDate,
    warrantyStart: wStart,
    warranty_start_date: wStart,
    warrantyEnd: wEnd,
    warranty_end_date: wEnd,
    amount: price,
    totalCost: price,
    purchasePrice: price,
    purchase_price: price,
    seller: vendor,
    vendor: vendor,
    provider: vendor,
    serviceCenter: vendor,
    serviceProvider: vendor,
    serviceDate: purchaseDate,
    phone: e.phone || '',
    email: e.email || '',
  };
}

export const ocrService = {
  /**
   * Run real OCR processing on document via backend API
   */
  async processDocument(docOrId) {
    let documentId = typeof docOrId === 'object' ? docOrId?.id : docOrId;

    if (!documentId) {
      throw new Error('Valid document object or ID required for OCR processing.');
    }

    if (!/^\d+$/.test(String(documentId))) {
      const doc = await documentService.getDocumentById(documentId);
      documentId = doc.id;
    }

    const response = await apiClient.post(`/ocr/documents/${documentId}/process`);
    const rawResult = response?.ocr_result || response;

    const rawText =
      rawResult.extracted_text || rawResult.raw_text || '';
    const structuredData = adaptOcrEntities(
      rawResult.entities || rawResult.entities_json || {}
    );

    let status = rawResult.status || 'COMPLETED';
    if (status === 'COMPLETED') status = 'Completed';
    else if (status === 'FAILED') status = 'Failed';
    else if (status === 'PROCESSING') status = 'Processing';
    else status = 'Pending';

    const ocrResult = {
      id: rawResult.id,
      documentId,
      status,
      ocrStatus: status,
      processedAt: rawResult.processed_at,
      ocrProcessedAt: rawResult.processed_at,
      rawText,
      ocrExtractedText: rawText,
      structuredData,
      ocrStructuredData: structuredData,
      confidence: 0.96,
      error_message: rawResult.error_message || null,
    };

    // Retrieve fresh document entity
    let updatedDoc = null;
    try {
      updatedDoc = await documentService.getDocumentById(documentId);
    } catch {
      updatedDoc = { id: documentId, ...ocrResult };
    }

    return {
      document: updatedDoc,
      ocrResult,
    };
  },

  /**
   * Retrieve cached OCR result for document from backend API
   */
  async getOCRResult(documentId) {
    let numericId = documentId;
    if (!/^\d+$/.test(String(documentId))) {
      try {
        const doc = await documentService.getDocumentById(documentId);
        numericId = doc.id;
      } catch {
        return null;
      }
    }

    try {
      const response = await apiClient.get(`/ocr/documents/${numericId}`);
      const rawResult = response?.ocr_result || response;

      const rawText =
        rawResult.extracted_text || rawResult.raw_text || '';
      const structuredData = adaptOcrEntities(
        rawResult.entities || rawResult.entities_json || {}
      );

      let status = rawResult.status || 'COMPLETED';
      if (status === 'COMPLETED') status = 'Completed';
      else if (status === 'FAILED') status = 'Failed';
      else if (status === 'PROCESSING') status = 'Processing';
      else status = 'Pending';

      return {
        id: rawResult.id,
        documentId: numericId,
        status,
        ocrStatus: status,
        processedAt: rawResult.processed_at,
        ocrProcessedAt: rawResult.processed_at,
        rawText,
        ocrExtractedText: rawText,
        structuredData,
        ocrStructuredData: structuredData,
        confidence: 0.96,
        error_message: rawResult.error_message || null,
      };
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  },

  /**
   * Update OCR result notes or metadata
   */
  async updateOCRResult(documentId, updates) {
    let numericId = documentId;
    if (!/^\d+$/.test(String(documentId))) {
      const doc = await documentService.getDocumentById(documentId);
      numericId = doc.id;
    }

    if (updates.description || updates.notes) {
      await documentService.updateDocument(numericId, {
        description: updates.description || updates.notes,
      });
    }

    return this.getOCRResult(numericId);
  },
};

export default ocrService;
