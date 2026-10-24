/**
 * Predictable ID generator utilities.
 * Generates structured identifiers conforming to PRD-2026-XXXXX standards.
 */

function extractMaxIndex(items, prefix) {
  if (!Array.isArray(items) || items.length === 0) return 0;

  let maxNum = 0;
  const regex = new RegExp(`^${prefix}-\\d{4}-(\\d+)$`);

  items.forEach((item) => {
    const id = typeof item === 'string' ? item : item?.id || item?.productId || '';
    const match = id.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  return maxNum;
}

export function generateId(prefix, existingItems = [], year = new Date().getFullYear()) {
  const max = extractMaxIndex(existingItems, prefix);
  const nextNum = String(max + 1).padStart(5, '0');
  return `${prefix}-${year}-${nextNum}`;
}

export function generateProductId(existingProducts = []) {
  return generateId('PRD', existingProducts);
}

export function generateServiceId(existingServices = []) {
  return generateId('SRV', existingServices);
}

export function generateDocumentId(existingDocuments = []) {
  return generateId('DOC', existingDocuments);
}

export function generateWarrantyId(existingWarranties = []) {
  return generateId('WAR', existingWarranties);
}

export function generateNotificationId(existingNotifications = []) {
  return generateId('NTF', existingNotifications);
}

export function generateRecommendationId(existingRecommendations = []) {
  return generateId('REC', existingRecommendations);
}
