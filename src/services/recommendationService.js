/**
 * Recommendation Service
 * Decision-support advice engine for preventive care, cost optimization, and warranty renewals.
 * Future Flask swap target: /api/recommendations
 */

import { INITIAL_RECOMMENDATIONS } from '../data/recommendations.js';
import { storage } from '../utils/storage.js';

const RECOMMENDATIONS_STORAGE_KEY = 'smartcare_recommendations';
const delay = (ms = 140) => new Promise((resolve) => setTimeout(resolve, ms));

function getStoredRecommendations() {
  const data = storage.get(RECOMMENDATIONS_STORAGE_KEY);
  if (!data || !Array.isArray(data) || data.length === 0) {
    storage.set(RECOMMENDATIONS_STORAGE_KEY, INITIAL_RECOMMENDATIONS);
    return INITIAL_RECOMMENDATIONS;
  }
  return data;
}

export const recommendationService = {
  /**
   * Retrieve all active recommendations.
   */
  async getRecommendations() {
    await delay();
    const recs = getStoredRecommendations();
    // Sort high severity first, then medium, then low
    const severityOrder = { high: 1, medium: 2, low: 3 };
    return [...recs].sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4));
  },

  /**
   * Retrieve recommendations applicable to a specific product.
   */
  async getRecommendationsByProduct(productId) {
    await delay(100);
    const recs = getStoredRecommendations();
    return recs.filter((r) => r.productId === productId);
  },

  /**
   * Retrieve recommendations filtered by severity ('high' | 'medium' | 'low').
   */
  async getRecommendationsBySeverity(severity) {
    await delay(100);
    const recs = getStoredRecommendations();
    return recs.filter((r) => r.severity.toLowerCase() === severity.toLowerCase());
  },

  /**
   * Dismiss a recommendation.
   */
  async dismissRecommendation(id) {
    await delay(150);
    const recs = getStoredRecommendations();
    const filtered = recs.filter((r) => r.id !== id);

    if (filtered.length === recs.length) {
      throw new Error(`Recommendation ${id} not found.`);
    }

    storage.set(RECOMMENDATIONS_STORAGE_KEY, filtered);
    return { success: true, dismissedId: id };
  },
};
