/**
 * Analytics Baseline Metadata
 * Provides chart configuration presets and target performance benchmarks.
 * Actual values are dynamically computed from products, warranties, and service records.
 */

export const ANALYTICS_CONFIG = {
  currency: 'INR',
  currencySymbol: '₹',
  fiscalYear: '2026',
  monthlyWindowMonths: 12, // Past 12 months for trends
  healthScoreThresholds: {
    excellent: 80,
    good: 60,
    fair: 40,
    poor: 20,
    critical: 0,
  },
  costBenchmarkPercentage: 15, // Flag products whose maintenance exceeds 15% of purchase price
};
