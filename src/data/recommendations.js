/**
 * Mock Smart Recommendations Data
 * 7 smart recommendations using decision-support language based on costs, age, and warranty states.
 * All records reference valid product IDs.
 */

export const INITIAL_RECOMMENDATIONS = [
  {
    id: 'REC-2026-00001',
    productId: 'PRD-2026-00005', // Voltas AC
    type: 'warranty',
    title: 'Warranty Expiring in 18 Days',
    description: 'Manufacturer warranty expires on 25 Oct 2026. Subscribing to an Extended AMC now avoids out-of-pocket compressor or gas refill charges.',
    severity: 'high',
    actionLabel: 'Explore Extended Warranty',
    createdAt: '2026-10-06T09:00:00Z',
    dismissible: true,
  },
  {
    id: 'REC-2026-00003',
    productId: 'PRD-2026-00003', // LG Washing Machine
    type: 'cost',
    title: 'Increasing Maintenance Cost Trend',
    description: 'Total service costs have reached ₹4,800 across 3 visits (11.3% of purchase price). Consider evaluating replacement if further major motor repairs occur.',
    severity: 'high',
    actionLabel: 'Review Service History',
    createdAt: '2026-10-04T11:00:00Z',
    dismissible: true,
  },
  {
    id: 'REC-2026-00002',
    productId: 'PRD-2026-00001', // MacBook Pro
    type: 'warranty',
    title: 'AppleCare+ Annual Expiry Window',
    description: 'Your coverage expires on 10 Nov 2026. Apple allows extending coverage on an annual basis within 30 days of initial expiration.',
    severity: 'medium',
    actionLabel: 'Renew AppleCare+',
    createdAt: '2026-10-05T10:00:00Z',
    dismissible: true,
  },
  {
    id: 'REC-2026-00004',
    productId: 'PRD-2026-00008', // HP Printer
    type: 'maintenance',
    title: 'Preventive Printhead Cleaning Cycle',
    description: 'Printhead warranty ends soon. Performing an automated cleaning and alignment report ensures printhead reliability.',
    severity: 'medium',
    actionLabel: 'Run Printhead Diagnostic',
    createdAt: '2026-09-30T14:30:00Z',
    dismissible: true,
  },
  {
    id: 'REC-2026-00005',
    productId: 'PRD-2026-00002', // Samsung Refrigerator
    type: 'maintenance',
    title: 'Appliance Over 2.5 Years Old: Coil Inspection',
    description: 'Refrigerators over 2 years old benefit from semi-annual condenser coil vacuuming to maintain peak energy efficiency and compressor lifespan.',
    severity: 'low',
    actionLabel: 'Schedule Preventive Visit',
    createdAt: '2026-09-18T16:00:00Z',
    dismissible: true,
  },
  {
    id: 'REC-2026-00006',
    productId: 'PRD-2026-00006', // iPhone 15 Pro Max
    type: 'health',
    title: 'Post-Battery Replacement Health Check',
    description: 'New battery was installed in March 2026. Maintain charging between 20%–80% to maximize lithium-ion cycle retention.',
    severity: 'low',
    actionLabel: 'View Health Score',
    createdAt: '2026-09-10T12:00:00Z',
    dismissible: true,
  },
  {
    id: 'REC-2026-00007',
    productId: 'PRD-2026-00007', // Samsung Microwave
    type: 'replacement',
    title: 'Expired Warranty Coverage',
    description: 'Warranty expired 6 months ago. For convection units, preventive cavity sealant inspections prevent RF leakage.',
    severity: 'low',
    actionLabel: 'Check AMC Options',
    createdAt: '2026-08-15T15:20:00Z',
    dismissible: true,
  },
];
