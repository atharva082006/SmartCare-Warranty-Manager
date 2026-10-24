/**
 * Document & OCR Utilities
 * Provides categories, validation, mime-type classification, and badge styles.
 */

import { formatFileSize } from './formatters.js';

export const DOCUMENT_TYPES = [
  'Invoice',
  'Warranty Card',
  'Purchase Receipt',
  'Service Invoice',
  'Service Report',
  'User Manual',
  'Product Image',
  'Other',
];

export const OCR_STATUSES = [
  'Not Processed',
  'Processing',
  'Completed',
  'Failed',
];

export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Returns extension from file name (lowercase without dot).
 */
export function getFileExtension(fileName = '') {
  const parts = fileName.split('.');
  if (parts.length <= 1) return '';
  return parts.pop().toLowerCase().trim();
}

/**
 * Normalizes file type tag (PDF, JPG, PNG, WEBP, or OTHER).
 */
export function getFileTypeFromFileName(fileName = '', mimeType = '') {
  const ext = getFileExtension(fileName);
  if (ext === 'pdf' || mimeType.includes('pdf')) return 'PDF';
  if (ext === 'jpg' || ext === 'jpeg' || mimeType.includes('jpeg')) return 'JPG';
  if (ext === 'png' || mimeType.includes('png')) return 'PNG';
  if (ext === 'webp' || mimeType.includes('webp')) return 'WEBP';
  return ext ? ext.toUpperCase() : 'DOC';
}

/**
 * Check if the document represents a previewable image.
 */
export function isImageFile(fileName = '', mimeType = '') {
  const ext = getFileExtension(fileName);
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return true;
  if (mimeType && mimeType.startsWith('image/')) return true;
  return false;
}

/**
 * Check if the document is a PDF.
 */
export function isPdfFile(fileName = '', mimeType = '') {
  const ext = getFileExtension(fileName);
  if (ext === 'pdf') return true;
  if (mimeType && mimeType.includes('pdf')) return true;
  return false;
}

/**
 * Validates selected file for upload.
 */
export function validateUploadedFile(file) {
  if (!file) {
    return { isValid: false, error: 'Please choose or drag a document file to upload.' };
  }

  // 1. Check size limit
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds 10 MB limit (${formatFileSize(file.size)}). Please choose a smaller file.`,
    };
  }

  // 2. Check extension & MIME type
  const ext = getFileExtension(file.name);
  const isValidExt = ALLOWED_EXTENSIONS.includes(ext);
  const isValidMime = ALLOWED_MIME_TYPES.includes(file.type) || !file.type; // Some OS/browsers may leave type blank

  if (!isValidExt && !isValidMime) {
    return {
      isValid: false,
      error: `File format ".${ext || 'unknown'}" is not supported. Please upload a PDF, JPG, PNG, or WEBP file.`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Get badge color variant for OCR processing status.
 */
export function getOcrStatusBadgeVariant(status) {
  switch (status) {
    case 'Completed':
      return 'success';
    case 'Processing':
      return 'warning';
    case 'Failed':
      return 'danger';
    case 'Not Processed':
    default:
      return 'neutral';
  }
}

/**
 * Get badge color variant for document types.
 */
export function getDocumentTypeBadgeVariant(type) {
  switch (type) {
    case 'Invoice':
      return 'primary';
    case 'Warranty Card':
      return 'success';
    case 'Purchase Receipt':
      return 'info';
    case 'Service Invoice':
    case 'Service Report':
      return 'warning';
    case 'User Manual':
      return 'neutral';
    case 'Product Image':
      return 'primary';
    default:
      return 'neutral';
  }
}

/**
 * Get badge color variant for file extensions.
 */
export function getFileTypeBadgeVariant(fileType) {
  switch (String(fileType).toUpperCase()) {
    case 'PDF':
      return 'danger';
    case 'JPG':
    case 'JPEG':
      return 'primary';
    case 'PNG':
      return 'info';
    case 'WEBP':
      return 'warning';
    default:
      return 'neutral';
  }
}
