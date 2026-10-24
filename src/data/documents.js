/**
 * Mock Document Metadata Records
 * Realistic document records covering Invoices, Warranty Cards, Purchase Receipts,
 * Service Invoices, Service Reports, User Manuals, and Product Images.
 * All records reference valid product IDs and include Demo OCR data.
 */

export const INITIAL_DOCUMENTS = [
  {
    id: 'DOC-2026-00001',
    productId: 'PRD-2026-00001', // MacBook Pro
    fileName: 'Apple_Store_Indiranagar_Invoice_INV9812.pdf',
    documentType: 'Invoice',
    fileSize: 1845200, // ~1.8 MB
    mimeType: 'application/pdf',
    fileType: 'PDF',
    uploadedAt: '2025-11-10T11:00:00Z',
    description: 'Official GST retail tax invoice from Apple Authorized Reseller with serial number.',
    fileUrl: '/mock-files/apple_invoice.pdf',
    ocrStatus: 'Completed',
    ocrProcessedAt: '2025-11-10T11:05:00Z',
    ocrExtractedText: `TAX INVOICE / CASH MEMO
Seller: Apple Retail Partner (Imagine Stores - Indiranagar, Bangalore)
GSTIN: 29AABCI1234F1Z8 | State Code: 29
Invoice No: INV-2025-9812 | Date: 10 Nov 2025
Customer: Vinay Raykar

Item Description: MacBook Pro 14 M3 Space Black
Model No: MRX33HN/A | Serial: C02G879QMD6T
HSN Code: 84713010 | Qty: 1
Base Price: ₹1,43,983.05
CGST @ 9%: ₹12,958.48
SGST @ 9%: ₹12,958.48
Total Amount Paid: ₹1,69,900.00
Payment Mode: UPI / HDFC Credit Card`,
    ocrStructuredData: {
      invoiceNumber: 'INV-2025-9812',
      purchaseDate: '2025-11-10',
      seller: 'Apple Retail Partner (Imagine Stores)',
      product: 'MacBook Pro 14 M3 Space Black',
      amount: 169900,
    },
  },
  {
    id: 'DOC-2026-00002',
    productId: 'PRD-2026-00001', // MacBook Pro
    fileName: 'AppleCare_Plus_Proof_Of_Coverage.pdf',
    documentType: 'Warranty Card',
    fileSize: 824000, // ~824 KB
    mimeType: 'application/pdf',
    fileType: 'PDF',
    uploadedAt: '2025-11-10T11:15:00Z',
    description: 'AppleCare+ agreement number and coverage verification letter.',
    fileUrl: '/mock-files/applecare_warranty.pdf',
    ocrStatus: 'Completed',
    ocrProcessedAt: '2025-11-10T11:20:00Z',
    ocrExtractedText: `PROOF OF COVERAGE — APPLECARE+
Agreement Number: AC-98124401-IND
Product: MacBook Pro 14-inch (M3, Nov 2025)
Serial Number: C02G879QMD6T
Coverage Start Date: 10 November 2025
Coverage End Date: 09 November 2028
Plan: AppleCare+ for Mac (3-Year Extended)
Coverage Scope: Comprehensive hardware defect repair, battery replacement if capacity <80%, and unlimited accidental damage protection with low service fee.
Helpline: 000800 1009009`,
    ocrStructuredData: {
      manufacturer: 'Apple',
      model: 'MacBook Pro 14 M3 (MRX33HN/A)',
      serialNumber: 'C02G879QMD6T',
      purchaseDate: '2025-11-10',
      warrantyStart: '2025-11-10',
      warrantyEnd: '2028-11-09',
      provider: 'AppleCare+ Official',
      coverageScope: 'Comprehensive hardware protection and accidental damage protection',
    },
  },
  {
    id: 'DOC-2026-00003',
    productId: 'PRD-2026-00002', // Samsung Refrigerator
    fileName: 'Croma_Electronics_Samsung_580L_Bill.pdf',
    documentType: 'Invoice',
    fileSize: 2150000, // ~2.1 MB
    mimeType: 'application/pdf',
    fileType: 'PDF',
    uploadedAt: '2024-03-15T15:00:00Z',
    description: 'Tax invoice stamped by Croma Bangalore with 3-year warranty seal.',
    fileUrl: '/mock-files/croma_samsung.pdf',
    ocrStatus: 'Completed',
    ocrProcessedAt: '2024-03-15T15:08:00Z',
    ocrExtractedText: `CROMA MEGACENTER — INVOICE & CASH MEMO
Infiniti Retail Ltd — Koramangala, Bangalore
Invoice ID: CR-BLR-84192 | Date: 15-Mar-2024
Customer: Vinay Raykar
Product: Samsung French Door Refrigerator 580L (RF57A5032S9/TL)
Serial No: SN-SAMS-580L-4491
Unit Price: ₹74,990.00 | Discount: ₹0.00
Grand Total: ₹74,990.00 (Inclusive of 18% GST)`,
    ocrStructuredData: {
      invoiceNumber: 'CR-BLR-84192',
      purchaseDate: '2024-03-15',
      seller: 'Croma (Infiniti Retail Ltd)',
      product: 'Samsung French Door Refrigerator 580L',
      amount: 74990,
    },
  },
  {
    id: 'DOC-2026-00004',
    productId: 'PRD-2026-00002', // Samsung Refrigerator
    fileName: 'Samsung_Digital_Inverter_Compressor_Warranty.jpg',
    documentType: 'Warranty Card',
    fileSize: 3420000, // ~3.4 MB
    mimeType: 'image/jpeg',
    fileType: 'JPG',
    uploadedAt: '2024-03-15T15:05:00Z',
    description: 'Photo of the physical warranty certificate card and compressor serial badge.',
    fileUrl: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&auto=format&fit=crop&q=80',
    ocrStatus: 'Not Processed',
    ocrProcessedAt: null,
    ocrExtractedText: '',
    ocrStructuredData: null,
  },
  {
    id: 'DOC-2026-00005',
    productId: 'PRD-2026-00003', // LG Washing Machine
    fileName: 'LG_Direct_Drive_Purchase_Invoice.pdf',
    documentType: 'Invoice',
    fileSize: 1420000, // ~1.4 MB
    mimeType: 'application/pdf',
    fileType: 'PDF',
    uploadedAt: '2023-08-20T12:00:00Z',
    description: 'Original dealer bill from Reliance Digital Koramangala.',
    fileUrl: '/mock-files/reliance_lg_invoice.pdf',
    ocrStatus: 'Completed',
    ocrProcessedAt: '2023-08-20T12:04:00Z',
    ocrExtractedText: `RELIANCE DIGITAL RETAIL TAX INVOICE
Store: Koramangala 80ft Road, Bengaluru
Invoice: RD-2023-41289 | Date: 20 Aug 2023
Item: LG AI Direct Drive Front Load 8kg (FHM1408BDW)
Serial: SN-LGWM-2023-9912
Price: ₹38,490.00
Warranty: 2 Years Comprehensive + 10 Years Motor`,
    ocrStructuredData: {
      invoiceNumber: 'RD-2023-41289',
      purchaseDate: '2023-08-20',
      seller: 'Reliance Digital Koramangala',
      product: 'LG AI Direct Drive Front Load 8kg',
      amount: 38490,
    },
  },
  {
    id: 'DOC-2026-00006',
    productId: 'PRD-2026-00003', // LG Washing Machine
    fileName: 'LG_Authorized_Suspension_Repair_Receipt.pdf',
    documentType: 'Service Invoice',
    fileSize: 678000, // ~678 KB
    mimeType: 'application/pdf',
    fileType: 'PDF',
    uploadedAt: '2025-09-12T17:30:00Z',
    description: 'Official service work order and parts replacement invoice (Damper & Springs).',
    fileUrl: '/mock-files/lg_service_receipt.pdf',
    ocrStatus: 'Completed',
    ocrProcessedAt: '2025-09-12T17:35:00Z',
    ocrExtractedText: `LG AUTHORIZED SERVICE JOB SHEET & TAX INVOICE
Service Center: LG Electronics Care Hub, Indiranagar
Job Card No: LG-JOB-2025-8812
Service Date: 12-Sep-2025
Product: LG Washing Machine 8kg | Serial: SN-LGWM-2023-9912
Issue Reported: Excessive spin vibration and drum knocking
Work Performed: Replaced dual hydraulic suspension dampers and calibrated tub balance.
Parts Replaced: Front Shock Absorber Pair (Part #AGF7812)
Labor Charges: ₹550.00 | Parts Cost: ₹1,250.00
Total Amount Paid: ₹1,800.00
Technician: Rajesh Kumar (Badge #LG-994)`,
    ocrStructuredData: {
      serviceProvider: 'LG Brand Authorized Service (Electronics Care Hub)',
      serviceDate: '2025-09-12',
      serviceCost: 1800,
      issue: 'Excessive spin vibration and drum knocking during high-speed cycle',
      workPerformed: 'Replaced dual hydraulic suspension dampers and leveled appliance drum balance',
    },
  },
  {
    id: 'DOC-2026-00007',
    productId: 'PRD-2026-00004', // Sony OLED TV
    fileName: 'Sony_Center_Bravia_XR55_Tax_Invoice.pdf',
    documentType: 'Invoice',
    fileSize: 2450000, // ~2.4 MB
    mimeType: 'application/pdf',
    fileType: 'PDF',
    uploadedAt: '2025-01-25T17:00:00Z',
    description: 'Official Sony Center India invoice with extended panel warranty enrollment.',
    fileUrl: '/mock-files/sony_bravia_invoice.pdf',
    ocrStatus: 'Not Processed',
    ocrProcessedAt: null,
    ocrExtractedText: '',
    ocrStructuredData: null,
  },
  {
    id: 'DOC-2026-00008',
    productId: 'PRD-2026-00005', // Voltas AC
    fileName: 'Voltas_Split_AC_Invoice_Amazon_Retail.pdf',
    documentType: 'Purchase Receipt',
    fileSize: 940000, // ~940 KB
    mimeType: 'application/pdf',
    fileType: 'PDF',
    uploadedAt: '2024-05-12T10:00:00Z',
    description: 'E-commerce tax invoice from Amazon Retail India Pvt. Ltd.',
    fileUrl: '/mock-files/voltas_amazon_bill.pdf',
    ocrStatus: 'Completed',
    ocrProcessedAt: '2024-05-12T10:06:00Z',
    ocrExtractedText: `AMAZON.IN TAX INVOICE
Seller: Appario Retail Private Ltd
Order ID: 402-9912048-1129381
Invoice Date: 12 May 2024
Item: Voltas 1.5 Ton 5 Star Inverter Split AC (185V Vectra Elite)
Serial No: SN-VOLT-15T-7721
Item Total: ₹36,990.00
Delivery & Installation voucher included.`,
    ocrStructuredData: {
      invoiceNumber: 'INV-AMZ-2024-4029',
      purchaseDate: '2024-05-12',
      seller: 'Appario Retail (Amazon India)',
      product: 'Voltas 1.5 Ton 5 Star Inverter Split AC',
      amount: 36990,
    },
  },
  {
    id: 'DOC-2026-00009',
    productId: 'PRD-2026-00005', // Voltas AC
    fileName: 'Voltas_Preventive_Maintenance_Job_Card.pdf',
    documentType: 'Service Report',
    fileSize: 1120000, // ~1.1 MB
    mimeType: 'application/pdf',
    fileType: 'PDF',
    uploadedAt: '2025-05-15T09:30:00Z',
    description: 'Technician service report covering deep chemical foam wash and pressure checks.',
    fileUrl: '/mock-files/voltas_amc.pdf',
    ocrStatus: 'Not Processed',
    ocrProcessedAt: null,
    ocrExtractedText: '',
    ocrStructuredData: null,
  },
  {
    id: 'DOC-2026-00010',
    productId: 'PRD-2026-00006', // iPhone 15 Pro Max
    fileName: 'Apple_Battery_Replacement_Service_Tax_Receipt.pdf',
    documentType: 'Service Invoice',
    fileSize: 560000, // ~560 KB
    mimeType: 'application/pdf',
    fileType: 'PDF',
    uploadedAt: '2026-03-08T16:00:00Z',
    description: 'Authorized service receipt and calibration diagnostic log for OEM battery replacement.',
    fileUrl: '/mock-files/apple_service_battery.pdf',
    ocrStatus: 'Completed',
    ocrProcessedAt: '2026-03-08T16:04:00Z',
    ocrExtractedText: `APPLE AUTHORIZED SERVICE PROVIDER — AVENIO CARE
Repair ID: R-994102-IND | Date: 08-Mar-2026
Device: iPhone 15 Pro Max 256GB Natural Titanium
Serial: F2LMQ99190KD
Work Conducted: Genuine Apple OEM Battery Pack replacement. Diagnostic test passed. Battery Health reset to 100%. Water resistance acoustic gasket renewed.
Cost: ₹4,500.00
Technician: Sanjay V (Apple Certified Mac & iOS Technician)`,
    ocrStructuredData: {
      serviceProvider: 'Apple Authorized Service Provider (Avenio)',
      serviceDate: '2026-03-08',
      serviceCost: 4500,
      issue: 'Battery health degraded below 80% maximum capacity',
      workPerformed: 'Genuine OEM Apple battery replacement and IP68 pressure recalibration',
    },
  },
  {
    id: 'DOC-2026-00011',
    productId: 'PRD-2026-00008', // HP Printer
    fileName: 'HP_Smart_Tank_580_Dealer_Bill.pdf',
    documentType: 'Invoice',
    fileSize: 1280000, // ~1.2 MB
    mimeType: 'application/pdf',
    fileType: 'PDF',
    uploadedAt: '2025-09-02T12:00:00Z',
    description: 'Retail invoice from CompuWorld with 1+1 year warranty promotion tag.',
    fileUrl: '/mock-files/hp_dealer_bill.pdf',
    ocrStatus: 'Not Processed',
    ocrProcessedAt: null,
    ocrExtractedText: '',
    ocrStructuredData: null,
  },
  {
    id: 'DOC-2026-00012',
    productId: 'PRD-2026-00009', // Bosch Dishwasher
    fileName: 'Bosch_Home_Serie4_Dishwasher_Invoice_VijaySales.pdf',
    documentType: 'Invoice',
    fileSize: 1750000, // ~1.7 MB
    mimeType: 'application/pdf',
    fileType: 'PDF',
    uploadedAt: '2026-02-14T16:00:00Z',
    description: 'Vijay Sales official invoice with Bosch complimentary installation stamp.',
    fileUrl: '/mock-files/bosch_invoice.pdf',
    ocrStatus: 'Completed',
    ocrProcessedAt: '2026-02-14T16:05:00Z',
    ocrExtractedText: `VIJAY SALES RETAIL INVOICE
Store: Whitefield Main Road, Bengaluru
Invoice No: VS-BLR-2026-11849 | Date: 14 Feb 2026
Product: Bosch Serie 4 Free-standing Dishwasher (SMS46KI03I)
Serial: SN-BOSCH-DW-2026-09
Gross Amount: ₹44,990.00
Warranty: 2 Years Comprehensive Warranty Card Attached`,
    ocrStructuredData: {
      invoiceNumber: 'VS-BLR-2026-11849',
      purchaseDate: '2026-02-14',
      seller: 'Vijay Sales (Whitefield Bangalore)',
      product: 'Bosch Serie 4 Free-standing Dishwasher',
      amount: 44990,
    },
  },
  {
    id: 'DOC-2026-00013',
    productId: 'PRD-2026-00007', // Dyson Vacuum
    fileName: 'Dyson_V12_Detect_Slim_User_Manual.pdf',
    documentType: 'User Manual',
    fileSize: 4210000, // ~4.2 MB
    mimeType: 'application/pdf',
    fileType: 'PDF',
    uploadedAt: '2025-10-18T14:30:00Z',
    description: 'Official digital user operation guide, HEPA filter wash cycle, and brushbar maintenance.',
    fileUrl: '/mock-files/dyson_manual.pdf',
    ocrStatus: 'Completed',
    ocrProcessedAt: '2025-10-18T14:32:00Z',
    ocrExtractedText: `DYSON V12 DETECT SLIM — OPERATING MANUAL & SPECS
Model: SV26 | Serial: SN-DYSN-V12-9901
Filter Maintenance: Wash filter at least once a month with cold tap water. Allow 24 hours to air dry completely.
Battery Life: 60 minutes in Eco mode, 5 minutes in Boost mode.
Customer Care India: 1800-258-6688 | help@dyson.in`,
    ocrStructuredData: {
      manufacturer: 'Dyson Technologies India',
      model: 'Dyson V12 Detect Slim (SV26)',
      serialNumber: 'SN-DYSN-V12-9901',
      purchaseDate: '2025-10-18',
      warrantyStart: '2025-10-18',
      warrantyEnd: '2027-10-17',
      provider: 'Dyson Official Warranty Service',
      coverageScope: '2 Years Manufacturer defect and motorized cleaner head warranty',
    },
  },
  {
    id: 'DOC-2026-00014',
    productId: 'PRD-2026-00010', // Philips Airfryer
    fileName: 'Philips_Airfryer_XXL_Front_View.png',
    documentType: 'Product Image',
    fileSize: 1940000, // ~1.9 MB
    mimeType: 'image/png',
    fileType: 'PNG',
    uploadedAt: '2025-12-05T18:00:00Z',
    description: 'Front unboxing photo showing model badge, basket handle, and digital control knob.',
    fileUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80',
    ocrStatus: 'Not Processed',
    ocrProcessedAt: null,
    ocrExtractedText: '',
    ocrStructuredData: null,
  },
];
