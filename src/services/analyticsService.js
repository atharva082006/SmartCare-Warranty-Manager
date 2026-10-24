/**
 * Analytics Service
 * Dynamically derives dashboard KPIs, warranty metrics, service trends,
 * document/OCR statistics, product health scores, and attention insights
 * directly from underlying SmartCare services.
 * Future Flask swap target: /api/analytics/*
 */

import { productService } from './productService.js';
import { warrantyService } from './warrantyService.js';
import { serviceRecordService } from './serviceRecordService.js';
import { documentService } from './documentService.js';
import { calculateHealthScore } from '../utils/healthScoreUtils.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { apiClient } from './apiClient.js';

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export const analyticsService = {
  /**
   * Top-level overview stats across all core modules.
   */
  async getOverviewStats(filters = {}) {
    await delay();

    const [products, warranties, services, docs] = await Promise.all([
      productService.getProducts(),
      warrantyService.getWarranties(),
      serviceRecordService.getServiceRecords(),
      documentService.getDocuments(),
    ]);

    // Apply category filter if provided
    let filteredProducts = products;
    if (filters.category && filters.category !== 'all') {
      filteredProducts = products.filter(
        (p) => p.category && p.category.toLowerCase() === filters.category.toLowerCase()
      );
    }

    const filteredProductIds = new Set(filteredProducts.map((p) => p.id));

    const activeWarranties = warranties.filter(
      (w) =>
        w.status === 'active' &&
        (!filters.category || filters.category === 'all' || filteredProductIds.has(w.productId))
    ).length;

    const expiringSoon = warranties.filter(
      (w) =>
        w.status === 'expiringSoon' &&
        (!filters.category || filters.category === 'all' || filteredProductIds.has(w.productId))
    ).length;

    const expiredWarranties = warranties.filter(
      (w) =>
        w.status === 'expired' &&
        (!filters.category || filters.category === 'all' || filteredProductIds.has(w.productId))
    ).length;

    const totalServiceSpend = services
      .filter((s) => !filters.category || filters.category === 'all' || filteredProductIds.has(s.productId))
      .reduce((sum, s) => sum + (Number(s.cost) || 0), 0);

    const filteredDocs = docs.filter(
      (d) => !filters.category || filters.category === 'all' || filteredProductIds.has(d.productId)
    );

    // Compute average health score deterministically
    const warrantyMap = new Map();
    warranties.forEach((w) => {
      if (!warrantyMap.has(w.productId)) {
        warrantyMap.set(w.productId, w);
      }
    });

    const servicesByProductMap = new Map();
    services.forEach((s) => {
      if (!servicesByProductMap.has(s.productId)) {
        servicesByProductMap.set(s.productId, []);
      }
      servicesByProductMap.get(s.productId).push(s);
    });

    let healthSum = 0;
    filteredProducts.forEach((p) => {
      const w = warrantyMap.get(p.id) || null;
      const s = servicesByProductMap.get(p.id) || [];
      const { score } = calculateHealthScore(p, w, s);
      healthSum += score;
    });

    const averageHealthScore =
      filteredProducts.length > 0 ? Math.round(healthSum / filteredProducts.length) : 100;

    return {
      totalProducts: filteredProducts.length,
      activeWarranties,
      expiringSoon,
      expiredWarranties,
      totalServiceSpend,
      formattedTotalServiceSpend: formatCurrency(totalServiceSpend),
      totalDocuments: filteredDocs.length,
      averageHealthScore,
    };
  },

  /**
   * Warranty Analytics: Distribution, coverage metrics, and upcoming/expired expirations.
   */
  async getWarrantyAnalytics(filters = {}) {
    await delay();

    const [products, warranties] = await Promise.all([
      productService.getProducts(),
      warrantyService.getWarranties(),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Filter by category if requested
    let targetWarranties = warranties;
    let targetProducts = products;

    if (filters.category && filters.category !== 'all') {
      targetProducts = products.filter(
        (p) => p.category && p.category.toLowerCase() === filters.category.toLowerCase()
      );
      const allowedIds = new Set(targetProducts.map((p) => p.id));
      targetWarranties = warranties.filter((w) => allowedIds.has(w.productId));
    }

    const total = targetWarranties.length || 1;
    const active = targetWarranties.filter((w) => w.status === 'active').length;
    const expiringSoon = targetWarranties.filter((w) => w.status === 'expiringSoon').length;
    const expired = targetWarranties.filter((w) => w.status === 'expired').length;

    // Coverage calculations
    const coveredProductIds = new Set(
      targetWarranties.filter((w) => w.status === 'active' || w.status === 'expiringSoon').map((w) => w.productId)
    );
    const coveredProducts = coveredProductIds.size;
    const totalProds = targetProducts.length || 1;
    const coveragePercentage = Math.round((coveredProducts / totalProds) * 100);
    const activePercentage = Math.round((active / total) * 100);
    const expiredPercentage = Math.round((expired / total) * 100);

    // Upcoming expirations (<= 30 days remaining, not expired)
    const upcomingExpirations = targetWarranties
      .filter((w) => w.status === 'expiringSoon' || (w.daysRemaining !== undefined && w.daysRemaining > 0 && w.daysRemaining <= 30))
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .map((w) => {
        const prod = productMap.get(w.productId);
        return {
          id: w.id,
          warrantyId: w.id,
          productId: w.productId,
          productName: prod ? prod.name : 'Unknown Product',
          brand: prod ? prod.brand : '—',
          modelNumber: prod ? prod.modelNumber : '',
          category: prod ? prod.category : '',
          provider: w.provider,
          type: w.type,
          endDate: w.endDate,
          formattedEndDate: formatDate(w.endDate),
          daysRemaining: w.daysRemaining,
          status: w.status,
        };
      });

    // Expired warranties
    const expiredList = targetWarranties
      .filter((w) => w.status === 'expired' || (w.daysRemaining !== undefined && w.daysRemaining <= 0))
      .sort((a, b) => (b.daysRemaining || 0) - (a.daysRemaining || 0))
      .map((w) => {
        const prod = productMap.get(w.productId);
        return {
          id: w.id,
          warrantyId: w.id,
          productId: w.productId,
          productName: prod ? prod.name : 'Unknown Product',
          brand: prod ? prod.brand : '—',
          modelNumber: prod ? prod.modelNumber : '',
          category: prod ? prod.category : '',
          provider: w.provider,
          type: w.type,
          endDate: w.endDate,
          formattedEndDate: formatDate(w.endDate),
          daysRemaining: w.daysRemaining,
          status: w.status,
        };
      });

    return {
      distribution: {
        labels: ['Active', 'Expiring Soon', 'Expired'],
        counts: [active, expiringSoon, expired],
        percentages: [activePercentage, Math.round((expiringSoon / total) * 100), expiredPercentage],
        total: targetWarranties.length,
      },
      coverage: {
        totalProducts: targetProducts.length,
        coveredProducts,
        coveragePercentage,
        activePercentage,
        expiredPercentage,
      },
      upcomingExpirations,
      expiredWarranties: expiredList,
      totalWarranties: targetWarranties.length,
    };
  },

  /**
   * Service Analytics: Total spend, cost trend, type distribution, status distribution, and most serviced products.
   */
  async getServiceAnalytics(filters = {}) {
    await delay();

    const [products, services] = await Promise.all([
      productService.getProducts(),
      serviceRecordService.getServiceRecords(),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));

    let targetServices = services;
    if (filters.category && filters.category !== 'all') {
      const allowedIds = new Set(
        products
          .filter((p) => p.category && p.category.toLowerCase() === filters.category.toLowerCase())
          .map((p) => p.id)
      );
      targetServices = services.filter((s) => allowedIds.has(s.productId));
    }

    const totalSpend = targetServices.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
    const averageCost = targetServices.length > 0 ? Math.round(totalSpend / targetServices.length) : 0;

    // Monthly Trend: Past 12 calendar months (Nov 2025 – Oct 2026)
    const months = [
      '2025-11', '2025-12', '2026-01', '2026-02',
      '2026-03', '2026-04', '2026-05', '2026-06',
      '2026-07', '2026-08', '2026-09', '2026-10',
    ];
    const monthlyMap = new Map();
    months.forEach((m) => monthlyMap.set(m, 0));

    targetServices.forEach((s) => {
      if (s.serviceDate) {
        const ym = s.serviceDate.substring(0, 7);
        if (monthlyMap.has(ym)) {
          monthlyMap.set(ym, monthlyMap.get(ym) + (Number(s.cost) || 0));
        }
      }
    });

    const monthlyLabels = months.map((m) => {
      const [year, month] = m.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });
    const monthlyValues = months.map((m) => monthlyMap.get(m));
    const hasTrendData = monthlyValues.some((v) => v > 0);

    // Service Type Distribution
    const typeCountMap = new Map();
    const typeCostMap = new Map();
    targetServices.forEach((s) => {
      const type = s.serviceType || 'Maintenance';
      typeCountMap.set(type, (typeCountMap.get(type) || 0) + 1);
      typeCostMap.set(type, (typeCostMap.get(type) || 0) + (Number(s.cost) || 0));
    });

    const sortedTypes = Array.from(typeCountMap.entries()).sort((a, b) => b[1] - a[1]);
    const typeLabels = sortedTypes.map((e) => e[0]);
    const typeCounts = sortedTypes.map((e) => e[1]);
    const typeCosts = sortedTypes.map((e) => typeCostMap.get(e[0]) || 0);

    // Service Status Distribution
    const statusMap = new Map();
    targetServices.forEach((s) => {
      const st = s.status || 'completed';
      const label = st.charAt(0).toUpperCase() + st.slice(1);
      statusMap.set(label, (statusMap.get(label) || 0) + 1);
    });

    // Most Serviced Products
    const productVisitsMap = new Map();
    const productSpendMap = new Map();

    targetServices.forEach((s) => {
      productVisitsMap.set(s.productId, (productVisitsMap.get(s.productId) || 0) + 1);
      productSpendMap.set(s.productId, (productSpendMap.get(s.productId) || 0) + (Number(s.cost) || 0));
    });

    const mostServiced = Array.from(productVisitsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId, visitCount]) => {
        const prod = productMap.get(productId);
        const cost = productSpendMap.get(productId) || 0;
        return {
          id: productId,
          productId,
          productName: prod ? prod.name : 'Unknown Product',
          brand: prod ? prod.brand : '—',
          category: prod ? prod.category : '',
          visitCount,
          totalCost: cost,
          formattedTotalCost: formatCurrency(cost),
        };
      });

    return {
      totalSpend,
      formattedTotalSpend: formatCurrency(totalSpend),
      totalRecords: targetServices.length,
      averageCost,
      formattedAverageCost: formatCurrency(averageCost),
      monthlyTrend: {
        labels: monthlyLabels,
        values: monthlyValues,
        formattedValues: monthlyValues.map((v) => formatCurrency(v)),
        hasData: hasTrendData,
      },
      serviceTypeDistribution: {
        labels: typeLabels,
        counts: typeCounts,
        costs: typeCosts,
        formattedCosts: typeCosts.map((c) => formatCurrency(c)),
      },
      serviceStatusDistribution: {
        labels: Array.from(statusMap.keys()),
        counts: Array.from(statusMap.values()),
      },
      mostServicedProducts: mostServiced,
    };
  },

  /**
   * Product Analytics: Category & brand distribution, warranty ratio, service coverage, and asset valuations.
   */
  async getProductAnalytics(filters = {}) {
    await delay();

    const [products, warranties, services] = await Promise.all([
      productService.getProducts(),
      warrantyService.getWarranties(),
      serviceRecordService.getServiceRecords(),
    ]);

    let targetProducts = products;
    if (filters.category && filters.category !== 'all') {
      targetProducts = products.filter(
        (p) => p.category && p.category.toLowerCase() === filters.category.toLowerCase()
      );
    }

    const totalProducts = targetProducts.length;
    const totalInventoryValue = targetProducts.reduce(
      (sum, p) => sum + (Number(p.purchasePrice) || 0),
      0
    );
    const averageProductValue =
      totalProducts > 0 ? Math.round(totalInventoryValue / totalProducts) : 0;

    // Category distribution
    const categoryCountMap = new Map();
    targetProducts.forEach((p) => {
      const cat = p.category || 'Other';
      categoryCountMap.set(cat, (categoryCountMap.get(cat) || 0) + 1);
    });
    const sortedCategories = Array.from(categoryCountMap.entries()).sort((a, b) => b[1] - a[1]);

    // Brand distribution
    const brandCountMap = new Map();
    targetProducts.forEach((p) => {
      const b = p.brand || 'Other';
      brandCountMap.set(b, (brandCountMap.get(b) || 0) + 1);
    });
    const sortedBrands = Array.from(brandCountMap.entries()).sort((a, b) => b[1] - a[1]);

    // Warranty protection ratio
    const activeWarrantyProdIds = new Set(
      warranties.filter((w) => w.status === 'active' || w.status === 'expiringSoon').map((w) => w.productId)
    );
    const productsWithWarranty = targetProducts.filter((p) => activeWarrantyProdIds.has(p.id)).length;
    const productsWithoutWarranty = totalProducts - productsWithWarranty;

    // Service history ratio
    const servicedProdIds = new Set(services.map((s) => s.productId));
    const productsWithServiceHistory = targetProducts.filter((p) => servicedProdIds.has(p.id)).length;

    return {
      totalProducts,
      totalInventoryValue,
      formattedInventoryValue: formatCurrency(totalInventoryValue),
      averageProductValue,
      formattedAverageProductValue: formatCurrency(averageProductValue),
      productsByCategory: {
        labels: sortedCategories.map((e) => e[0]),
        counts: sortedCategories.map((e) => e[1]),
        percentages: sortedCategories.map((e) => Math.round((e[1] / (totalProducts || 1)) * 100)),
      },
      productsByBrand: {
        labels: sortedBrands.map((e) => e[0]),
        counts: sortedBrands.map((e) => e[1]),
        percentages: sortedBrands.map((e) => Math.round((e[1] / (totalProducts || 1)) * 100)),
      },
      productsWithWarranty,
      warrantyCoveragePercentage: Math.round((productsWithWarranty / (totalProducts || 1)) * 100),
      productsWithoutWarranty,
      productsWithServiceHistory,
      serviceHistoryPercentage: Math.round((productsWithServiceHistory / (totalProducts || 1)) * 100),
    };
  },

  /**
   * Document and OCR Analytics: Counts by category, OCR extraction completion rates, and file types.
   */
  async getDocumentAnalytics() {
    await delay();

    const docs = await documentService.getDocuments();

    const totalDocuments = docs.length;
    const warrantyDocuments = docs.filter((d) => d.documentType === 'Warranty Card').length;
    const serviceDocuments = docs.filter(
      (d) =>
        d.documentType === 'Service Invoice' ||
        d.documentType === 'Service Report' ||
        d.documentType === 'Service Receipt'
    ).length;
    const invoiceDocuments = docs.filter((d) => d.documentType === 'Invoice').length;
    const manualDocuments = docs.filter((d) => d.documentType === 'User Manual').length;

    const ocrCompleted = docs.filter((d) => d.ocrStatus === 'Completed').length;
    const ocrPending = docs.filter(
      (d) => d.ocrStatus === 'Not Processed' || d.ocrStatus === 'Pending'
    ).length;
    const ocrSuccessRate = totalDocuments > 0 ? Math.round((ocrCompleted / totalDocuments) * 100) : 0;

    const typeCountMap = new Map();
    docs.forEach((d) => {
      const type = d.documentType || 'Other';
      typeCountMap.set(type, (typeCountMap.get(type) || 0) + 1);
    });

    const sortedTypes = Array.from(typeCountMap.entries()).sort((a, b) => b[1] - a[1]);

    return {
      totalDocuments,
      warrantyDocuments,
      serviceDocuments,
      invoiceDocuments,
      manualDocuments,
      ocrCompleted,
      ocrPending,
      ocrSuccessRate,
      typeDistribution: {
        labels: sortedTypes.map((e) => e[0]),
        counts: sortedTypes.map((e) => e[1]),
      },
    };
  },

  /**
   * Product Health Analytics: Derived fleet health metrics, score tiers, and attention products.
   */
  async getProductHealthAnalytics(filters = {}) {
    await delay();

    const [products, warranties, services] = await Promise.all([
      productService.getProducts(),
      warrantyService.getWarranties(),
      serviceRecordService.getServiceRecords(),
    ]);

    let targetProducts = products;
    if (filters.category && filters.category !== 'all') {
      targetProducts = products.filter(
        (p) => p.category && p.category.toLowerCase() === filters.category.toLowerCase()
      );
    }

    const warrantyMap = new Map();
    warranties.forEach((w) => {
      if (!warrantyMap.has(w.productId)) {
        warrantyMap.set(w.productId, w);
      }
    });

    const servicesByProductMap = new Map();
    services.forEach((s) => {
      if (!servicesByProductMap.has(s.productId)) {
        servicesByProductMap.set(s.productId, []);
      }
      servicesByProductMap.get(s.productId).push(s);
    });

    // Compute health scores for all products deterministically
    const evaluated = targetProducts.map((p) => {
      const w = warrantyMap.get(p.id) || null;
      const s = servicesByProductMap.get(p.id) || [];
      const analysis = calculateHealthScore(p, w, s);
      return {
        id: p.id,
        productId: p.productId || p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        modelNumber: p.modelNumber,
        purchasePrice: p.purchasePrice,
        score: analysis.score,
        status: analysis.status,
        statusLabel: analysis.statusLabel,
        categoryTier: analysis.category,
        primaryReason: analysis.primaryReason,
        deductions: analysis.deductions,
        positiveFactors: analysis.positiveFactors,
        recommendations: analysis.recommendations,
      };
    });

    // Score Tier Distribution
    const distribution = {
      excellent: 0, // 80-100
      good: 0,      // 60-79
      fair: 0,      // 40-59
      poor: 0,      // 20-39
      critical: 0,  // 0-19
    };

    evaluated.forEach((item) => {
      const s = item.score;
      if (s >= 80) distribution.excellent++;
      else if (s >= 60) distribution.good++;
      else if (s >= 40) distribution.fair++;
      else if (s >= 20) distribution.poor++;
      else distribution.critical++;
    });

    const total = evaluated.length || 1;
    const averageScore =
      evaluated.length > 0
        ? Math.round(evaluated.reduce((sum, item) => sum + item.score, 0) / evaluated.length)
        : 100;

    // Lowest health products (sorted asc by score)
    const lowestHealthProducts = [...evaluated]
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    // Highest health products (sorted desc by score)
    const highestHealthProducts = [...evaluated]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      averageScore,
      distribution: {
        labels: [
          'Excellent (80-100)',
          'Good (60-79)',
          'Fair (40-59)',
          'Poor (20-39)',
          'Critical (0-19)',
        ],
        counts: [
          distribution.excellent,
          distribution.good,
          distribution.fair,
          distribution.poor,
          distribution.critical,
        ],
        percentages: [
          Math.round((distribution.excellent / total) * 100),
          Math.round((distribution.good / total) * 100),
          Math.round((distribution.fair / total) * 100),
          Math.round((distribution.poor / total) * 100),
          Math.round((distribution.critical / total) * 100),
        ],
        total: evaluated.length,
      },
      lowestHealthProducts,
      highestHealthProducts,
      allProductsHealth: evaluated,
    };
  },

  /**
   * Actionable Attention Items derived dynamically from live records.
   */
  async getAttentionItems() {
    try {
      const response = await apiClient.get('/analytics/attention');
      const items = response?.attention_items || [];
      if (Array.isArray(items) && items.length > 0) {
        const severityMap = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'info' };
        const typeMap = {
          CRITICAL_HEALTH: 'cost',
          ATTENTION_HEALTH: 'cost',
          FREQUENT_REPAIRS: 'service',
          HIGH_SERVICE_COST: 'cost',
          WARRANTY_EXPIRED: 'warranty',
          WARRANTY_EXPIRING: 'warranty',
          FAILED_OCR: 'document',
        };
        const titleMap = {
          CRITICAL_HEALTH: 'Critical Product Health',
          ATTENTION_HEALTH: 'Health Needs Attention',
          FREQUENT_REPAIRS: 'Frequent Component Repairs',
          HIGH_SERVICE_COST: 'High Maintenance Spend Ratio',
          WARRANTY_EXPIRED: 'Warranty Expired',
          WARRANTY_EXPIRING: 'Warranty Expiring Soon',
          FAILED_OCR: 'Document OCR Scan Failed',
        };

        return items.map((it, idx) => ({
          id: `att-${it.type}-${it.product_id}-${idx}`,
          type: typeMap[it.type] || 'product',
          severity: severityMap[it.severity] || 'warning',
          title: titleMap[it.type] || it.type.replace(/_/g, ' '),
          message: it.message,
          actionLabel: it.type.includes('WARRANTY') ? 'View Warranty' : 'View Product',
          actionLink: `/products/${it.product_id}`,
          productId: it.product_id,
        }));
      }
    } catch {
      // Fallback to local computation from live records
    }

    const [products, warranties, services, docs] = await Promise.all([
      productService.getProducts(),
      warrantyService.getWarranties(),
      serviceRecordService.getServiceRecords(),
      documentService.getDocuments(),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const attentionItems = [];

    // 1. Expiring Warranties (<= 30 days)
    warranties
      .filter((w) => w.status === 'expiringSoon' || (w.daysRemaining !== undefined && w.daysRemaining > 0 && w.daysRemaining <= 30))
      .forEach((w) => {
        const prod = productMap.get(w.productId);
        attentionItems.push({
          id: `att-warranty-expiring-${w.id}`,
          type: 'warranty',
          severity: 'warning',
          title: 'Warranty Expiring Soon',
          message: `${prod ? prod.name : 'Product'} warranty ends in ${w.daysRemaining} days (${formatDate(w.endDate)}).`,
          actionLabel: 'View Warranty',
          actionLink: `/warranties/${w.id}`,
          productId: w.productId,
        });
      });

    // 2. Expired Warranties
    warranties
      .filter((w) => w.status === 'expired' || (w.daysRemaining !== undefined && w.daysRemaining <= 0))
      .forEach((w) => {
        const prod = productMap.get(w.productId);
        attentionItems.push({
          id: `att-warranty-expired-${w.id}`,
          type: 'warranty',
          severity: 'danger',
          title: 'Warranty Expired',
          message: `${prod ? prod.name : 'Product'} warranty has expired on ${formatDate(w.endDate)}.`,
          actionLabel: 'Renew / View',
          actionLink: `/warranties/${w.id}`,
          productId: w.productId,
        });
      });

    // 3. Repeated Component Repairs (>= 2 repair visits)
    const repairsByProduct = new Map();
    services.forEach((s) => {
      if (s.serviceType === 'Repair' || (s.partsReplaced && s.partsReplaced.length > 0)) {
        repairsByProduct.set(s.productId, (repairsByProduct.get(s.productId) || 0) + 1);
      }
    });

    repairsByProduct.forEach((count, productId) => {
      if (count >= 2) {
        const prod = productMap.get(productId);
        if (prod) {
          attentionItems.push({
            id: `att-repair-${productId}`,
            type: 'service',
            severity: 'warning',
            title: 'Frequent Component Repairs',
            message: `${prod.name} has undergone ${count} corrective repairs. Check history for recurring part defects.`,
            actionLabel: 'View Product',
            actionLink: `/products/${prod.id}`,
            productId: prod.id,
          });
        }
      }
    });

    // 4. High Maintenance Expense (> 25% of product price)
    const spendByProduct = new Map();
    services.forEach((s) => {
      spendByProduct.set(s.productId, (spendByProduct.get(s.productId) || 0) + (Number(s.cost) || 0));
    });

    products.forEach((p) => {
      const spend = spendByProduct.get(p.id) || 0;
      const price = Number(p.purchasePrice) || 1;
      const ratio = spend / price;
      if (ratio > 0.25) {
        attentionItems.push({
          id: `att-cost-${p.id}`,
          type: 'cost',
          severity: 'danger',
          title: 'High Maintenance Spend Ratio',
          message: `${p.name} service costs (${formatCurrency(spend)}) represent ${Math.round(ratio * 100)}% of original purchase price.`,
          actionLabel: 'Inspect Services',
          actionLink: `/products/${p.id}`,
          productId: p.id,
        });
      }
    });

    // 5. Unprotected Products (No warranty catalogued)
    const productWarranties = new Set(warranties.map((w) => w.productId));
    products.forEach((p) => {
      if (!productWarranties.has(p.id)) {
        attentionItems.push({
          id: `att-unprotected-${p.id}`,
          type: 'product',
          severity: 'info',
          title: 'No Warranty Registered',
          message: `${p.name} does not have an active or catalogued warranty entry.`,
          actionLabel: 'Add Warranty',
          actionLink: `/warranties?addProductId=${p.id}`,
          productId: p.id,
        });
      }
    });

    // 6. Documents needing OCR processing
    docs
      .filter((d) => d.ocrStatus === 'Not Processed')
      .slice(0, 3)
      .forEach((d) => {
        const prod = productMap.get(d.productId);
        attentionItems.push({
          id: `att-ocr-${d.id}`,
          type: 'document',
          severity: 'info',
          title: 'Unprocessed Document OCR',
          message: `"${d.fileName}" for ${prod ? prod.name : 'product'} has not been scanned for OCR text.`,
          actionLabel: 'Scan with OCR',
          actionLink: `/ocr?documentId=${d.id}`,
          documentId: d.id,
        });
      });

    // Sort by severity (danger first, then warning, then info)
    const severityOrder = { danger: 1, warning: 2, info: 3 };
    return attentionItems.sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4));
  },

  /**
   * Top-level summary aggregating all core metrics for the main Dashboard view.
   * Backward compatible with existing DashboardPage.jsx.
   */
  async getDashboardSummary() {
    await delay();

    const [products, warranties, services] = await Promise.all([
      productService.getProducts(),
      warrantyService.getWarranties(),
      serviceRecordService.getServiceRecords(),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));

    const activeWarranties = warranties.filter((w) => w.status === 'active').length;
    const expiringSoon = warranties.filter((w) => w.status === 'expiringSoon').length;
    const expired = warranties.filter((w) => w.status === 'expired').length;

    const totalServiceCost = services.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);

    const avgHealthScore =
      products.length > 0
        ? Math.round(products.reduce((sum, p) => sum + (Number(p.healthScore) || 0), 0) / products.length)
        : 100;

    // Recent service activity (top 5 with product metadata joined)
    const recentActivity = services.slice(0, 5).map((s) => {
      const prod = productMap.get(s.productId);
      return {
        id: s.id,
        productId: s.productId,
        productName: prod ? prod.name : 'Unknown Product',
        brand: prod ? prod.brand : '—',
        serviceDate: s.serviceDate,
        formattedDate: formatDate(s.serviceDate),
        serviceType: s.serviceType,
        provider: s.provider,
        cost: s.cost,
        formattedCost: formatCurrency(s.cost),
        partsReplaced: s.partsReplaced,
      };
    });

    // Upcoming warranty expiries
    const upcomingExpiries = warranties
      .filter((w) => w.status === 'expiringSoon' || (w.status === 'active' && w.daysRemaining <= 90))
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5)
      .map((w) => {
        const prod = productMap.get(w.productId);
        return {
          id: w.id,
          productId: w.productId,
          productName: prod ? prod.name : 'Unknown Product',
          brand: prod ? prod.brand : '—',
          provider: w.provider,
          endDate: w.endDate,
          formattedEndDate: formatDate(w.endDate),
          daysRemaining: w.daysRemaining,
          status: w.status,
        };
      });

    return {
      totalProducts: products.length,
      activeWarranties,
      expiringSoon,
      expiredWarranties: expired,
      totalServiceCost,
      formattedTotalServiceCost: formatCurrency(totalServiceCost),
      averageHealthScore: avgHealthScore,
      recentActivity,
      upcomingExpiries,
    };
  },

  /**
   * Warranty status distribution counts & percentages.
   */
  async getWarrantyDistribution() {
    await delay(100);
    const warranties = await warrantyService.getWarranties();
    const total = warranties.length || 1;

    const active = warranties.filter((w) => w.status === 'active').length;
    const expiringSoon = warranties.filter((w) => w.status === 'expiringSoon').length;
    const expired = warranties.filter((w) => w.status === 'expired').length;

    return {
      labels: ['Active', 'Expiring Soon', 'Expired'],
      counts: [active, expiringSoon, expired],
      percentages: [
        Math.round((active / total) * 100),
        Math.round((expiringSoon / total) * 100),
        Math.round((expired / total) * 100),
      ],
      total: warranties.length,
    };
  },

  /**
   * Monthly service spending aggregation over the past 12 calendar periods.
   */
  async getMonthlyServiceCost() {
    await delay(120);
    const services = await serviceRecordService.getServiceRecords();

    const months = [
      '2025-11', '2025-12', '2026-01', '2026-02',
      '2026-03', '2026-04', '2026-05', '2026-06',
      '2026-07', '2026-08', '2026-09', '2026-10',
    ];

    const monthlyMap = new Map();
    months.forEach((m) => monthlyMap.set(m, 0));

    services.forEach((s) => {
      if (s.serviceDate) {
        const ym = s.serviceDate.substring(0, 7);
        if (monthlyMap.has(ym)) {
          monthlyMap.set(ym, monthlyMap.get(ym) + (Number(s.cost) || 0));
        }
      }
    });

    const labels = months.map((m) => {
      const [year, month] = m.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });

    const values = months.map((m) => monthlyMap.get(m));

    return {
      labels,
      values,
      formattedValues: values.map((v) => formatCurrency(v)),
      totalCost: values.reduce((sum, v) => sum + v, 0),
    };
  },

  /**
   * Maintenance costs aggregated by brand.
   */
  async getServiceCostByBrand() {
    await delay(120);
    const [products, services] = await Promise.all([
      productService.getProducts(),
      serviceRecordService.getServiceRecords(),
    ]);

    const productBrandMap = new Map(products.map((p) => [p.id, p.brand]));
    const brandCostMap = new Map();

    products.forEach((p) => {
      if (!brandCostMap.has(p.brand)) {
        brandCostMap.set(p.brand, 0);
      }
    });

    services.forEach((s) => {
      const brand = productBrandMap.get(s.productId) || 'Other';
      brandCostMap.set(brand, (brandCostMap.get(brand) || 0) + (Number(s.cost) || 0));
    });

    const sorted = Array.from(brandCostMap.entries()).sort((a, b) => b[1] - a[1]);

    return {
      labels: sorted.map((entry) => entry[0]),
      costs: sorted.map((entry) => entry[1]),
      formattedCosts: sorted.map((entry) => formatCurrency(entry[1])),
    };
  },

  /**
   * Maintenance costs aggregated by product category.
   */
  async getServiceCostByCategory() {
    await delay(120);
    const [products, services] = await Promise.all([
      productService.getProducts(),
      serviceRecordService.getServiceRecords(),
    ]);

    const productCategoryMap = new Map(products.map((p) => [p.id, p.category]));
    const categoryCostMap = new Map();

    products.forEach((p) => {
      if (!categoryCostMap.has(p.category)) {
        categoryCostMap.set(p.category, 0);
      }
    });

    services.forEach((s) => {
      const cat = productCategoryMap.get(s.productId) || 'Other';
      categoryCostMap.set(cat, (categoryCostMap.get(cat) || 0) + (Number(s.cost) || 0));
    });

    const sorted = Array.from(categoryCostMap.entries()).sort((a, b) => b[1] - a[1]);

    return {
      labels: sorted.map((entry) => entry[0]),
      costs: sorted.map((entry) => entry[1]),
      formattedCosts: sorted.map((entry) => formatCurrency(entry[1])),
    };
  },

  /**
   * Product Health Score distribution across 5 standard tiers.
   */
  async getHealthScoreDistribution() {
    await delay(100);
    const products = await productService.getProducts();

    const distribution = {
      excellent: 0, // 80-100
      good: 0,      // 60-79
      fair: 0,      // 40-59
      poor: 0,      // 20-39
      critical: 0,  // 0-19
    };

    products.forEach((p) => {
      const score = Number(p.healthScore) || 0;
      if (score >= 80) distribution.excellent++;
      else if (score >= 60) distribution.good++;
      else if (score >= 40) distribution.fair++;
      else if (score >= 20) distribution.poor++;
      else distribution.critical++;
    });

    return {
      labels: ['Excellent (80-100)', 'Good (60-79)', 'Fair (40-59)', 'Poor (20-39)', 'Critical (0-19)'],
      counts: [
        distribution.excellent,
        distribution.good,
        distribution.fair,
        distribution.poor,
        distribution.critical,
      ],
      total: products.length,
    };
  },

  /**
   * Service frequency over time (visit counts).
   */
  async getServiceFrequency() {
    await delay(100);
    const services = await serviceRecordService.getServiceRecords();
    const typeCountMap = new Map();

    services.forEach((s) => {
      const type = s.serviceType || 'General Service';
      typeCountMap.set(type, (typeCountMap.get(type) || 0) + 1);
    });

    const sorted = Array.from(typeCountMap.entries()).sort((a, b) => b[1] - a[1]);

    return {
      labels: sorted.map((entry) => entry[0]),
      counts: sorted.map((entry) => entry[1]),
      totalVisits: services.length,
    };
  },

  /**
   * Mean product health score across all registered products.
   */
  async getAverageHealthScore() {
    await delay(80);
    const products = await productService.getProducts();
    if (products.length === 0) return 100;
    const sum = products.reduce((acc, p) => acc + (Number(p.healthScore) || 0), 0);
    return Math.round(sum / products.length);
  },
};
