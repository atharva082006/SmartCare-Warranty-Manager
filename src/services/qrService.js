/**
 * QR Passport Service
 * Generates structured Digital Product Passport payloads combining
 * Product identity, Warranty status, Health score, and Service history.
 * Ready for future QR rendering libraries and Flask backend endpoints.
 */

import { productService } from './productService.js';
import { warrantyService } from './warrantyService.js';
import { serviceRecordService } from './serviceRecordService.js';
import { getHealthStatus, getHealthStatusLabel } from '../utils/healthScoreUtils.js';

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export const qrService = {
  /**
   * Aggregate complete Digital Product Passport for a product.
   */
  async getProductPassport(productId) {
    await delay();

    const product = await productService.getProductById(productId);
    const warranties = await warrantyService.getWarrantiesByProduct(productId);
    const primaryWarranty = warranties.length > 0 ? warranties[0] : null;

    const services = await serviceRecordService.getServiceRecordsByProduct(productId);
    const totalServiceCost = services.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
    const lastService = services.length > 0 ? services[0] : null;

    const passportData = {
      passportId: `DPP-${product.productId}`,
      version: '1.0',
      generatedAt: new Date().toISOString(),

      // Product Identity
      product: {
        id: product.id,
        productId: product.productId,
        name: product.name,
        brand: product.brand,
        category: product.category,
        modelNumber: product.modelNumber,
        serialNumber: product.serialNumber,
        purchaseDate: product.purchaseDate,
        purchasePrice: product.purchasePrice,
      },

      // Warranty Coverage
      warranty: primaryWarranty
        ? {
            id: primaryWarranty.id,
            type: primaryWarranty.type,
            provider: primaryWarranty.provider,
            startDate: primaryWarranty.startDate,
            endDate: primaryWarranty.endDate,
            status: primaryWarranty.status,
            daysRemaining: primaryWarranty.daysRemaining,
          }
        : null,

      // Health Metrics
      health: {
        score: product.healthScore,
        status: getHealthStatus(product.healthScore),
        statusLabel: getHealthStatusLabel(product.healthScore),
      },

      // Maintenance Summary
      serviceSummary: {
        totalServiceVisits: services.length,
        totalMaintenanceCost: totalServiceCost,
        lastServiceDate: lastService ? lastService.serviceDate : null,
        recentServices: services.slice(0, 3).map((s) => ({
          date: s.serviceDate,
          type: s.serviceType,
          cost: s.cost,
          provider: s.provider,
        })),
      },

      // Verification Payload string for QR encoding
      verificationUrl: `https://smartcare.io/verify/${product.productId}`,
    };

    return passportData;
  },

  /**
   * Produce QR encoded payload string for a product.
   */
  async generateProductPassportData(productId) {
    const passport = await this.getProductPassport(productId);
    return JSON.stringify({
      passportId: passport.passportId,
      productId: passport.product.productId,
      name: passport.product.name,
      serial: passport.product.serialNumber,
      warrantyStatus: passport.warranty?.status || 'none',
      healthScore: passport.health.score,
      verificationUrl: passport.verificationUrl,
    });
  },
};
