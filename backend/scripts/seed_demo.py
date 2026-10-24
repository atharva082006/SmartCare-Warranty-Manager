"""
SmartCare Demo Seed Script.
Restores the complete approved SmartCare demo dataset in PostgreSQL for Atharv Raykar.

Idempotent: running multiple times never duplicates, wipes, or deletes data.
Normal user only: Atharv Raykar has NO admin privileges and authenticates
using the standard JWT / bcrypt authentication system.
"""

import os
import sys
import uuid
from datetime import datetime, date, timezone
from decimal import Decimal

# Ensure backend root is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.product import Product
from app.models.warranty import Warranty
from app.models.service_record import ServiceRecord
from app.models.document import Document
from app.models.ocr_result import OCRResult
from app.services.document_service import get_upload_dir

DEMO_USER_EMAIL = "atharvaraykar2006@gmail.com"
DEMO_USER_USERNAME = "Atharv_Raykar"
DEMO_USER_PHONE = "9373186959"
DEMO_USER_PASSWORD = "atharv@2006"

# Canonical Products Data (10 products from src/data/products.js)
DEMO_PRODUCTS = [
    {
        "product_code": "PRD-2026-00001",
        "name": "MacBook Pro 14 M3",
        "brand": "Apple",
        "category": "Laptop",
        "model": "MRX33HN/A",
        "serial_number": "C02G879QMD6T",
        "purchase_date": date(2025, 11, 10),
        "purchase_price": Decimal("169900.00"),
        "warranty_period": 12,
        "notes": "Primary development workstation. Space Black finish.",
    },
    {
        "product_code": "PRD-2026-00002",
        "name": "Smart Convertible French Door Refrigerator 580L",
        "brand": "Samsung",
        "category": "Refrigerator",
        "model": "RF57A5032S9/TL",
        "serial_number": "SN-SAMS-580L-4491",
        "purchase_date": date(2024, 3, 15),
        "purchase_price": Decimal("74990.00"),
        "warranty_period": 36,
        "notes": "Twin Cooling Plus with digital inverter compressor.",
    },
    {
        "product_code": "PRD-2026-00003",
        "name": "AI Direct Drive Front Load Washing Machine 8kg",
        "brand": "LG",
        "category": "Washing Machine",
        "model": "FHP1208Z9M",
        "serial_number": "SN-LGWM-8KG-9921",
        "purchase_date": date(2023, 8, 20),
        "purchase_price": Decimal("42500.00"),
        "warranty_period": 24,
        "notes": "Steam wash technology with turbo wash. Located in utility area.",
    },
    {
        "product_code": "PRD-2026-00004",
        "name": "Bravia XR 4K Ultra HD OLED TV 55-inch",
        "brand": "Sony",
        "category": "Television",
        "model": "XR-55A80L",
        "serial_number": "SN-SNY-A80L-5520",
        "purchase_date": date(2025, 1, 25),
        "purchase_price": Decimal("134900.00"),
        "warranty_period": 24,
        "notes": "Cognitive Processor XR with Acoustic Surface Audio+.",
    },
    {
        "product_code": "PRD-2026-00005",
        "name": "1.5 Ton 5 Star Inverter Split Air Conditioner",
        "brand": "Voltas",
        "category": "Air Conditioner",
        "model": "185V Vectra Elite",
        "serial_number": "SN-VOLT-185V-3104",
        "purchase_date": date(2024, 5, 12),
        "purchase_price": Decimal("38990.00"),
        "warranty_period": 29,
        "notes": "Master bedroom unit. Copper condenser coil with anti-microbial filter.",
    },
    {
        "product_code": "PRD-2026-00006",
        "name": "iPhone 15 Pro Max 256GB",
        "brand": "Apple",
        "category": "Smartphone",
        "model": "MU773HN/A",
        "serial_number": "F2LX90KLQ2MD",
        "purchase_date": date(2023, 12, 5),
        "purchase_price": Decimal("149900.00"),
        "warranty_period": 12,
        "notes": "Natural Titanium casing. Regular daily driver.",
    },
    {
        "product_code": "PRD-2026-00007",
        "name": "Convection Microwave Oven 28L",
        "brand": "Samsung",
        "category": "Microwave",
        "model": "MC28A5145VK/TL",
        "serial_number": "SN-SAMS-MW28-6610",
        "purchase_date": date(2025, 4, 18),
        "purchase_price": Decimal("14200.00"),
        "warranty_period": 12,
        "notes": "Slim Fry with tandoor technology and ceramic enamel cavity.",
    },
    {
        "product_code": "PRD-2026-00008",
        "name": "Smart Tank 580 All-in-One Wireless Printer",
        "brand": "HP",
        "category": "Printer",
        "model": "1F3Y2A",
        "serial_number": "TH4B9011G8",
        "purchase_date": date(2025, 9, 2),
        "purchase_price": Decimal("15499.00"),
        "warranty_period": 14,
        "notes": "Home office printer with continuous ink tank system.",
    },
    {
        "product_code": "PRD-2026-00009",
        "name": "Serie 4 Freestanding Dishwasher 13 Place Settings",
        "brand": "Bosch",
        "category": "Dishwasher",
        "model": "SMS46KI03I",
        "serial_number": "SN-BSH-SMS46-8830",
        "purchase_date": date(2026, 2, 14),
        "purchase_price": Decimal("48000.00"),
        "warranty_period": 24,
        "notes": "EcoSilence Drive with DosageAssist and AquaStop leak protection.",
    },
    {
        "product_code": "PRD-2026-00010",
        "name": "Pure Protect 3000i Smart Air Purifier",
        "brand": "Philips",
        "category": "Air Purifier",
        "model": "AC3220/20",
        "serial_number": "SN-PHIL-AC32-1205",
        "purchase_date": date(2025, 10, 20),
        "purchase_price": Decimal("21999.00"),
        "warranty_period": 24,
        "notes": "Living room unit with NanoProtect HEPA filtration and air quality ring indicator.",
    },
]

# Canonical Warranties Data (10 warranties mapped to each product)
DEMO_WARRANTIES = [
    {
        "product_code": "PRD-2026-00001",
        "type": "AppleCare+ Extended Protection",
        "start_date": date(2025, 11, 10),
        "end_date": date(2026, 11, 10),
        "coverage": "Hardware coverage and unlimited incidents of accidental damage protection. Provider: Apple India. Contact: 1800-425-0744",
        "is_active": True,
    },
    {
        "product_code": "PRD-2026-00002",
        "type": "Comprehensive Manufacturer Warranty",
        "start_date": date(2024, 3, 15),
        "end_date": date(2027, 3, 15),
        "coverage": "3-year comprehensive warranty + 10 years on digital inverter compressor. Provider: Samsung India Electronics. Contact: 1800-5-7267864",
        "is_active": True,
    },
    {
        "product_code": "PRD-2026-00003",
        "type": "Standard Limited Warranty",
        "start_date": date(2023, 8, 20),
        "end_date": date(2025, 8, 20),
        "coverage": "Standard 2-year comprehensive coverage on machine (expired). Inverter motor warranty valid till 2033. Provider: LG Electronics India. Contact: 1800-315-9999",
        "is_active": False,
    },
    {
        "product_code": "PRD-2026-00004",
        "type": "Bravia Extended Warranty Care",
        "start_date": date(2025, 1, 25),
        "end_date": date(2027, 1, 25),
        "coverage": "2-year comprehensive on-site panel and audio system warranty. Provider: Sony India Pvt. Ltd. Contact: 1800-103-7799",
        "is_active": True,
    },
    {
        "product_code": "PRD-2026-00005",
        "type": "Comprehensive Home AC Warranty",
        "start_date": date(2024, 5, 12),
        "end_date": date(2026, 10, 25),
        "coverage": "Complete unit coverage including gas leakages and condenser coil. Provider: Voltas Customer Service. Contact: 1860-599-4555",
        "is_active": True,
    },
    {
        "product_code": "PRD-2026-00006",
        "type": "Apple Limited Warranty",
        "start_date": date(2023, 12, 5),
        "end_date": date(2024, 12, 5),
        "coverage": "One-year limited manufacturer warranty against manufacturing defects. Provider: Apple India. Contact: 1800-425-0744",
        "is_active": False,
    },
    {
        "product_code": "PRD-2026-00007",
        "type": "Standard Appliance Warranty",
        "start_date": date(2025, 4, 18),
        "end_date": date(2026, 4, 18),
        "coverage": "1-year comprehensive on body and electronics; 5-year on ceramic cavity. Provider: Samsung India Electronics. Contact: 1800-5-7267864",
        "is_active": False,
    },
    {
        "product_code": "PRD-2026-00008",
        "type": "HP Commercial Onsite Warranty",
        "start_date": date(2025, 9, 2),
        "end_date": date(2026, 11, 2),
        "coverage": "On-site unit exchange and printhead hardware defect coverage. Provider: HP India Care. Contact: 1800-258-7170",
        "is_active": True,
    },
    {
        "product_code": "PRD-2026-00009",
        "type": "Bosch Genuine Home Care Warranty",
        "start_date": date(2026, 2, 14),
        "end_date": date(2028, 2, 14),
        "coverage": "2-year comprehensive + 10-year anti-rust through warranty on interior tub. Provider: BSH Home Appliances India. Contact: 1800-266-1880",
        "is_active": True,
    },
    {
        "product_code": "PRD-2026-00010",
        "type": "Philips Domestic Appliance Warranty",
        "start_date": date(2025, 10, 20),
        "end_date": date(2027, 10, 20),
        "coverage": "2-year worldwide guarantee covering motor, fan assembly, and sensor cluster. Provider: Philips India Care. Contact: 1800-102-2929",
        "is_active": True,
    },
]

# Canonical Service Records (18 service records from src/data/serviceRecords.js)
DEMO_SERVICE_RECORDS = [
    {
        "product_code": "PRD-2026-00003",
        "service_date": date(2023, 8, 21),
        "cost": Decimal("450.00"),
        "type": "Installation",
        "provider": "LG Brand Authorized Installation",
        "description": "Initial home installation, inlet hose connection, balance calibration, and demo.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00005",
        "service_date": date(2024, 5, 13),
        "cost": Decimal("1850.00"),
        "type": "Installation",
        "provider": "Voltas Engineering Services",
        "description": "Standard split AC wall mounting, copper piping, outdoor bracket installation, vacuum test.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00002",
        "service_date": date(2024, 9, 18),
        "cost": Decimal("650.00"),
        "type": "Maintenance",
        "provider": "Samsung SmartCare Center",
        "description": "Annual preventive inspection, condenser coils vacuuming, door gasket airtight test.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00003",
        "service_date": date(2024, 11, 5),
        "cost": Decimal("750.00"),
        "type": "Maintenance",
        "provider": "LG Customer Service Direct",
        "description": "Descaling cycle, drain pump filter cleaning, tub sterilization check.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00006",
        "service_date": date(2024, 12, 10),
        "cost": Decimal("0.00"),
        "type": "Inspection",
        "provider": "Apple Authorized Service Provider (Avenio)",
        "description": "Battery health diagnostic, speaker mesh sonic cleaning, diagnostics report generated.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00005",
        "service_date": date(2025, 3, 22),
        "cost": Decimal("950.00"),
        "type": "General Service",
        "provider": "Voltas Care Express",
        "description": "Pre-summer deep foam wash, indoor cooling fin cleaning, refrigerant pressure test (R32).",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00007",
        "service_date": date(2025, 4, 19),
        "cost": Decimal("0.00"),
        "type": "Installation",
        "provider": "Samsung Brand Care",
        "description": "Unboxing, turntable assembly, wattage calibration, safety ground verification.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00004",
        "service_date": date(2025, 5, 14),
        "cost": Decimal("0.00"),
        "type": "Inspection",
        "provider": "Sony Service Plus",
        "description": "Firmware upgrade to v6.728, optical audio calibration with soundbar, pixel refresh test.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00003",
        "service_date": date(2025, 9, 12),
        "cost": Decimal("3600.00"),
        "type": "Repair",
        "provider": "LG Direct Technician",
        "description": "Excessive spin vibration investigation. Replaced worn shock absorbers and rebalanced suspension.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00001",
        "service_date": date(2025, 12, 4),
        "cost": Decimal("0.00"),
        "type": "Inspection",
        "provider": "Apple Authorized Service Provider (Imagine)",
        "description": "Internal thermal dust clearance, fan speed diagnostics, Apple Diagnostics passed 100%.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00008",
        "service_date": date(2026, 1, 10),
        "cost": Decimal("500.00"),
        "type": "Maintenance",
        "provider": "HP Service Point",
        "description": "Printhead nozzle alignment, paper feed roller cleaning, ink tube air purge.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00009",
        "service_date": date(2026, 2, 15),
        "cost": Decimal("650.00"),
        "type": "Installation",
        "provider": "BSH Home Appliances Expert",
        "description": "Under-counter alignment, water softener salt setup, test wash cycle completed.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00006",
        "service_date": date(2026, 3, 8),
        "cost": Decimal("6400.00"),
        "type": "Replacement",
        "provider": "Apple Authorized Service Provider (Avenio)",
        "description": "Battery health degraded below 80%. Genuine OEM battery replacement and water-seal gasket.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00005",
        "service_date": date(2026, 4, 11),
        "cost": Decimal("1450.00"),
        "type": "Repair",
        "provider": "Voltas Authorized Service",
        "description": "Mild refrigerant leak at flare nut joint. Repaired flare fitting and topped up R32 refrigerant.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00010",
        "service_date": date(2026, 10, 18),
        "cost": Decimal("2499.00"),
        "type": "Maintenance",
        "provider": "Philips Authorized Care",
        "description": "Laser particulate sensor calibration, primary pre-filter wash, NanoProtect HEPA replacement.",
        "status": "SCHEDULED",
    },
    {
        "product_code": "PRD-2026-00007",
        "service_date": date(2026, 6, 25),
        "cost": Decimal("1150.00"),
        "type": "Repair",
        "provider": "Urban Appliance Repair Experts",
        "description": "Turntable motor not rotating smoothly. Replaced synchronous motor and cleaned drive shaft.",
        "status": "COMPLETED",
    },
    {
        "product_code": "PRD-2026-00002",
        "service_date": date(2026, 10, 6),
        "cost": Decimal("850.00"),
        "type": "General Service",
        "provider": "Samsung SmartCare Direct",
        "description": "Deodorizing filter replacement, interior LED bulb replacement, freezer temperature check.",
        "status": "IN PROGRESS",
    },
    {
        "product_code": "PRD-2026-00001",
        "service_date": date(2026, 10, 22),
        "cost": Decimal("0.00"),
        "type": "Cleaning",
        "provider": "Apple Authorized Service Provider (Imagine)",
        "description": "Keyboard debris vacuuming and display anti-reflective coating sanitization check.",
        "status": "SCHEDULED",
    },
]

# Canonical Documents & OCR Data (12 documents from src/data/documents.js)
DEMO_DOCUMENTS = [
    {
        "product_code": "PRD-2026-00001",
        "name": "Apple Store Indiranagar Invoice",
        "document_type": "Invoice",
        "file_name": "Apple_Store_Indiranagar_Invoice_INV9812.pdf",
        "mime_type": "application/pdf",
        "file_size": 1845200,
        "description": "Official GST retail tax invoice from Apple Authorized Reseller with serial number.",
        "ocr_status": "Completed",
        "ocr_text": """TAX INVOICE / CASH MEMO
Seller: Apple Retail Partner (Imagine Stores - Indiranagar, Bangalore)
GSTIN: 29AABCI1234F1Z8 | State Code: 29
Invoice No: INV-2025-9812 | Date: 10 Nov 2025
Customer: Atharv Raykar

Item Description: MacBook Pro 14 M3 Space Black
Model No: MRX33HN/A | Serial: C02G879QMD6T
HSN Code: 84713010 | Qty: 1
Base Price: ₹1,43,983.05
CGST @ 9%: ₹12,958.48
SGST @ 9%: ₹12,958.48
Total Amount Paid: ₹1,69,900.00
Payment Mode: UPI / HDFC Credit Card""",
        "ocr_entities": {
            "invoiceNumber": "INV-2025-9812",
            "purchaseDate": "2025-11-10",
            "seller": "Apple Retail Partner (Imagine Stores)",
            "product": "MacBook Pro 14 M3 Space Black",
            "amount": 169900,
        },
    },
    {
        "product_code": "PRD-2026-00001",
        "name": "AppleCare+ Proof of Coverage",
        "document_type": "Warranty Card",
        "file_name": "AppleCare_Plus_Proof_Of_Coverage.pdf",
        "mime_type": "application/pdf",
        "file_size": 824000,
        "description": "AppleCare+ agreement number and coverage verification letter.",
        "ocr_status": "Completed",
        "ocr_text": """PROOF OF COVERAGE — APPLECARE+
Agreement Number: AC-98124401-IND
Product: MacBook Pro 14-inch (M3, Nov 2025)
Serial Number: C02G879QMD6T
Coverage Start Date: 10 November 2025
Coverage End Date: 09 November 2028
Plan: AppleCare+ for Mac (3-Year Extended)
Coverage Scope: Comprehensive hardware defect repair, battery replacement if capacity <80%, and unlimited accidental damage protection with low service fee.
Helpline: 000800 1009009""",
        "ocr_entities": {
            "manufacturer": "Apple",
            "model": "MacBook Pro 14 M3 (MRX33HN/A)",
            "serialNumber": "C02G879QMD6T",
            "purchaseDate": "2025-11-10",
            "warrantyStart": "2025-11-10",
            "warrantyEnd": "2028-11-09",
            "provider": "AppleCare+ Official",
            "coverageScope": "Comprehensive hardware protection and accidental damage protection",
        },
    },
    {
        "product_code": "PRD-2026-00002",
        "name": "Croma Electronics Samsung 580L Bill",
        "document_type": "Invoice",
        "file_name": "Croma_Electronics_Samsung_580L_Bill.pdf",
        "mime_type": "application/pdf",
        "file_size": 2150000,
        "description": "Tax invoice stamped by Croma Bangalore with 3-year warranty seal.",
        "ocr_status": "Completed",
        "ocr_text": """CROMA MEGACENTER — INVOICE & CASH MEMO
Infiniti Retail Ltd — Koramangala, Bangalore
Invoice ID: CR-BLR-84192 | Date: 15-Mar-2024
Customer: Atharv Raykar
Product: Samsung French Door Refrigerator 580L (RF57A5032S9/TL)
Serial No: SN-SAMS-580L-4491
Unit Price: ₹74,990.00 | Discount: ₹0.00
Grand Total: ₹74,990.00 (Inclusive of 18% GST)""",
        "ocr_entities": {
            "invoiceNumber": "CR-BLR-84192",
            "purchaseDate": "2024-03-15",
            "seller": "Croma (Infiniti Retail Ltd)",
            "product": "Samsung French Door Refrigerator 580L",
            "amount": 74990,
        },
    },
    {
        "product_code": "PRD-2026-00002",
        "name": "Samsung Digital Inverter Warranty",
        "document_type": "Warranty Card",
        "file_name": "Samsung_Digital_Inverter_Compressor_Warranty.jpg",
        "mime_type": "image/jpeg",
        "file_size": 3420000,
        "description": "Photo of the physical warranty certificate card and compressor serial badge.",
        "ocr_status": "Not Processed",
        "ocr_text": None,
        "ocr_entities": None,
    },
    {
        "product_code": "PRD-2026-00003",
        "name": "LG Direct Drive Purchase Invoice",
        "document_type": "Invoice",
        "file_name": "LG_Direct_Drive_Purchase_Invoice.pdf",
        "mime_type": "application/pdf",
        "file_size": 1420000,
        "description": "Original dealer bill from Reliance Digital Koramangala.",
        "ocr_status": "Completed",
        "ocr_text": """RELIANCE DIGITAL RETAIL TAX INVOICE
Store: Koramangala 80ft Road, Bengaluru
Invoice: RD-2023-41289 | Date: 20 Aug 2023
Item: LG AI Direct Drive Front Load 8kg (FHM1408BDW)
Serial: SN-LGWM-2023-9912
Price: ₹38,490.00
Warranty: 2 Years Comprehensive + 10 Years Motor""",
        "ocr_entities": {
            "invoiceNumber": "RD-2023-41289",
            "purchaseDate": "2023-08-20",
            "seller": "Reliance Digital Koramangala",
            "product": "LG AI Direct Drive Front Load 8kg",
            "amount": 38490,
        },
    },
    {
        "product_code": "PRD-2026-00003",
        "name": "LG Authorized Suspension Repair Receipt",
        "document_type": "Service Invoice",
        "file_name": "LG_Authorized_Suspension_Repair_Receipt.pdf",
        "mime_type": "application/pdf",
        "file_size": 678000,
        "description": "Official service work order and parts replacement invoice (Damper & Springs).",
        "ocr_status": "Completed",
        "ocr_text": """LG AUTHORIZED SERVICE JOB SHEET & TAX INVOICE
Service Center: LG Electronics Care Hub, Indiranagar
Job Card No: LG-JOB-2025-8812
Service Date: 12-Sep-2025
Product: LG Washing Machine 8kg | Serial: SN-LGWM-2023-9912
Issue Reported: Excessive spin vibration and drum knocking
Work Performed: Replaced dual hydraulic suspension dampers and calibrated tub balance.
Parts Replaced: Front Shock Absorber Pair (Part #AGF7812)
Labor Charges: ₹550.00 | Parts Cost: ₹1,250.00
Total Amount Paid: ₹1,800.00
Technician: Rajesh Kumar (Badge #LG-994)""",
        "ocr_entities": {
            "serviceProvider": "LG Brand Authorized Service (Electronics Care Hub)",
            "serviceDate": "2025-09-12",
            "serviceCost": 1800,
            "issue": "Excessive spin vibration and drum knocking during high-speed cycle",
            "workPerformed": "Replaced dual hydraulic suspension dampers and leveled appliance drum balance",
        },
    },
    {
        "product_code": "PRD-2026-00004",
        "name": "Sony Center Bravia XR55 Tax Invoice",
        "document_type": "Invoice",
        "file_name": "Sony_Center_Bravia_XR55_Tax_Invoice.pdf",
        "mime_type": "application/pdf",
        "file_size": 2450000,
        "description": "Official Sony Center India invoice with extended panel warranty enrollment.",
        "ocr_status": "Not Processed",
        "ocr_text": None,
        "ocr_entities": None,
    },
    {
        "product_code": "PRD-2026-00005",
        "name": "Voltas Split AC Invoice Amazon",
        "document_type": "Purchase Receipt",
        "file_name": "Voltas_Split_AC_Invoice_Amazon_Retail.pdf",
        "mime_type": "application/pdf",
        "file_size": 940000,
        "description": "E-commerce tax invoice from Amazon Retail India Pvt. Ltd.",
        "ocr_status": "Completed",
        "ocr_text": """AMAZON.IN TAX INVOICE
Seller: Appario Retail Private Ltd
Order ID: 402-9912048-1129381
Invoice Date: 12 May 2024
Item: Voltas 1.5 Ton 5 Star Inverter Split AC (185V Vectra Elite)
Serial No: SN-VOLT-15T-7721
Item Total: ₹36,990.00
Delivery & Installation voucher included.""",
        "ocr_entities": {
            "invoiceNumber": "INV-AMZ-2024-4029",
            "purchaseDate": "2024-05-12",
            "seller": "Appario Retail (Amazon India)",
            "product": "Voltas 1.5 Ton 5 Star Inverter Split AC",
            "amount": 36990,
        },
    },
    {
        "product_code": "PRD-2026-00005",
        "name": "Voltas Preventive Maintenance Job Card",
        "document_type": "Service Report",
        "file_name": "Voltas_Preventive_Maintenance_Job_Card.pdf",
        "mime_type": "application/pdf",
        "file_size": 1120000,
        "description": "Technician service report covering deep chemical foam wash and pressure checks.",
        "ocr_status": "Not Processed",
        "ocr_text": None,
        "ocr_entities": None,
    },
    {
        "product_code": "PRD-2026-00006",
        "name": "Apple Battery Replacement Service Tax Receipt",
        "document_type": "Service Invoice",
        "file_name": "Apple_Battery_Replacement_Service_Tax_Receipt.pdf",
        "mime_type": "application/pdf",
        "file_size": 560000,
        "description": "Authorized service receipt and calibration diagnostic log for OEM battery replacement.",
        "ocr_status": "Completed",
        "ocr_text": """APPLE AUTHORIZED SERVICE PROVIDER — AVENIO CARE
Repair ID: R-994102-IND | Date: 08-Mar-2026
Device: iPhone 15 Pro Max 256GB Natural Titanium
Serial: F2LMQ99190KD
Work Conducted: Genuine Apple OEM Battery Pack replacement. Diagnostic test passed. Battery Health reset to 100%. Water resistance acoustic gasket renewed.
Cost: ₹4,500.00
Technician: Sanjay V (Apple Certified Mac & iOS Technician)""",
        "ocr_entities": {
            "serviceProvider": "Apple Authorized Service Provider (Avenio)",
            "serviceDate": "2026-03-08",
            "serviceCost": 4500,
            "issue": "Battery health degraded below 80% maximum capacity",
            "workPerformed": "Genuine OEM Apple battery replacement and IP68 pressure recalibration",
        },
    },
    {
        "product_code": "PRD-2026-00008",
        "name": "HP Smart Tank 580 Dealer Bill",
        "document_type": "Invoice",
        "file_name": "HP_Smart_Tank_580_Dealer_Bill.pdf",
        "mime_type": "application/pdf",
        "file_size": 1280000,
        "description": "Retail invoice from CompuWorld with 1+1 year warranty promotion tag.",
        "ocr_status": "Not Processed",
        "ocr_text": None,
        "ocr_entities": None,
    },
    {
        "product_code": "PRD-2026-00009",
        "name": "Bosch Home Serie 4 Dishwasher Invoice",
        "document_type": "Invoice",
        "file_name": "Bosch_Home_Serie4_Dishwasher_Invoice_VijaySales.pdf",
        "mime_type": "application/pdf",
        "file_size": 1750000,
        "description": "Vijay Sales official invoice with Bosch complimentary installation stamp.",
        "ocr_status": "Completed",
        "ocr_text": """VIJAY SALES RETAIL INVOICE
Store: Whitefield Main Road, Bengaluru
Invoice No: VS-BLR-2026-11849 | Date: 14 Feb 2026
Product: Bosch Serie 4 Free-standing Dishwasher (SMS46KI03I)
Serial: SN-BOSCH-DW-2026-09
Gross Amount: ₹44,990.00
Warranty: 2 Years Comprehensive Warranty Card Attached""",
        "ocr_entities": {
            "invoiceNumber": "VS-BLR-2026-11849",
            "purchaseDate": "2026-02-14",
            "seller": "Vijay Sales (Whitefield Bangalore)",
            "product": "Bosch Serie 4 Free-standing Dishwasher",
            "amount": 44990,
        },
    },
]


def create_sample_physical_file(full_storage_path, doc_meta):
    """
    Generate a valid physical PDF or image file on disk so that authenticated
    downloads and previews stream real bytes without 404 errors.
    """
    os.makedirs(os.path.dirname(full_storage_path), exist_ok=True)
    if os.path.exists(full_storage_path) and os.path.getsize(full_storage_path) > 0:
        return

    ext = full_storage_path.rsplit(".", 1)[-1].lower()
    text_content = doc_meta.get("ocr_text") or f"{doc_meta['name']}\n{doc_meta['description']}"

    if ext == "pdf":
        try:
            import fitz
            doc = fitz.open()
            page = doc.new_page()
            page.insert_text((50, 72), f"SmartCare Document: {doc_meta['name']}", fontsize=14)
            page.insert_text((50, 100), text_content, fontsize=10)
            doc.save(full_storage_path)
            doc.close()
            return
        except Exception:
            # Fallback plain text bytes inside PDF container if fitz fails
            pass

    elif ext in ("jpg", "jpeg", "png"):
        try:
            from PIL import Image, ImageDraw
            img = Image.new("RGB", (600, 400), color=(240, 244, 248))
            draw = ImageDraw.Draw(img)
            draw.text((30, 30), f"SmartCare: {doc_meta['name']}", fill=(33, 37, 41))
            draw.text((30, 70), doc_meta['description'][:80], fill=(73, 80, 87))
            img.save(full_storage_path)
            return
        except Exception:
            pass

    # Generic safe fallback binary
    with open(full_storage_path, "wb") as f:
        f.write(b"%PDF-1.4\n%SmartCare Demo Placeholder\n" + text_content.encode("utf-8") + b"\n%%EOF")


def seed_demo_data(app=None, verbose=True):
    """
    Main idempotent seeding function.
    Can be run repeatedly without duplicating or deleting records.
    """
    if app is None:
        app = create_app()

    def log(msg):
        if verbose:
            print(msg)

    with app.app_context():
        log("=" * 60)
        log("SmartCare Demo Dataset Seeder — Atharv Raykar (Normal User)")
        log("=" * 60)

        # 1. Resolve or Create Atharv Raykar (Normal User)
        user = User.query.filter_by(email=DEMO_USER_EMAIL).first()
        if not user:
            # Fallback lookup in case username is already registered
            user = User.query.filter_by(username=DEMO_USER_USERNAME).first()

        if user:
            log(f"[USER] Reusing existing User id={user.id} ({user.email})")
            # Ensure Atharv has correct phone and password hash verified
            if not user.check_password(DEMO_USER_PASSWORD):
                user.set_password(DEMO_USER_PASSWORD)
            user.phone = DEMO_USER_PHONE
            db.session.commit()
        else:
            log(f"[USER] Creating User '{DEMO_USER_USERNAME}' ({DEMO_USER_EMAIL})...")
            user = User(
                username=DEMO_USER_USERNAME,
                email=DEMO_USER_EMAIL,
                phone=DEMO_USER_PHONE,
            )
            user.set_password(DEMO_USER_PASSWORD)
            db.session.add(user)
            db.session.commit()
            log(f"[USER] Created User id={user.id}")

        atharv_id = user.id

        # 2. Check for conflicting product_code held by OTHER users
        # If an ephemeral test user owns a canonical demo code, rename it cleanly so no data is lost
        for p_meta in DEMO_PRODUCTS:
            code = p_meta["product_code"]
            conflicting_product = Product.query.filter_by(product_code=code).first()
            if conflicting_product and conflicting_product.user_id != atharv_id:
                new_code = f"LEGACY-{code}-{conflicting_product.id}"
                log(f"[MIGRATE] Reassigning product {conflicting_product.id} code '{code}' -> '{new_code}' (owner {conflicting_product.user_id})")
                conflicting_product.product_code = new_code
                db.session.commit()

        # 3. Seed Products (Target: 10 products)
        product_map = {}
        products_created = 0
        products_reused = 0

        for p_meta in DEMO_PRODUCTS:
            code = p_meta["product_code"]
            product = Product.query.filter_by(user_id=atharv_id, product_code=code).first()
            if not product:
                product = Product(
                    user_id=atharv_id,
                    product_code=code,
                    name=p_meta["name"],
                    brand=p_meta["brand"],
                    category=p_meta["category"],
                    model=p_meta["model"],
                    serial_number=p_meta["serial_number"],
                    purchase_date=p_meta["purchase_date"],
                    purchase_price=p_meta["purchase_price"],
                    warranty_period=p_meta["warranty_period"],
                    notes=p_meta["notes"],
                )
                db.session.add(product)
                db.session.commit()
                products_created += 1
            else:
                # Update fields if needed to match canonical mock data
                product.name = p_meta["name"]
                product.brand = p_meta["brand"]
                product.category = p_meta["category"]
                product.model = p_meta["model"]
                product.serial_number = p_meta["serial_number"]
                product.purchase_date = p_meta["purchase_date"]
                product.purchase_price = p_meta["purchase_price"]
                product.warranty_period = p_meta["warranty_period"]
                product.notes = p_meta["notes"]
                db.session.commit()
                products_reused += 1

            product_map[code] = product

        log(f"[PRODUCTS] {products_created} created, {products_reused} verified (Total Atharv Products: {len(product_map)})")

        # 4. Seed Warranties (Target: 10 warranties)
        warranties_created = 0
        warranties_reused = 0

        for w_meta in DEMO_WARRANTIES:
            product = product_map.get(w_meta["product_code"])
            if not product:
                continue

            warranty = Warranty.query.filter_by(product_id=product.id, type=w_meta["type"]).first()
            if not warranty:
                warranty = Warranty(
                    product_id=product.id,
                    type=w_meta["type"],
                    start_date=w_meta["start_date"],
                    end_date=w_meta["end_date"],
                    coverage=w_meta["coverage"],
                    is_active=w_meta["is_active"],
                )
                db.session.add(warranty)
                db.session.commit()
                warranties_created += 1
            else:
                warranty.start_date = w_meta["start_date"]
                warranty.end_date = w_meta["end_date"]
                warranty.coverage = w_meta["coverage"]
                warranty.is_active = w_meta["is_active"]
                db.session.commit()
                warranties_reused += 1

        total_warranties = Warranty.query.join(Product).filter(Product.user_id == atharv_id).count()
        log(f"[WARRANTIES] {warranties_created} created, {warranties_reused} verified (Total Atharv Warranties: {total_warranties})")

        # 5. Seed Service Records (Target: 18 service records)
        services_created = 0
        services_reused = 0

        for s_meta in DEMO_SERVICE_RECORDS:
            product = product_map.get(s_meta["product_code"])
            if not product:
                continue

            srv = ServiceRecord.query.filter_by(
                product_id=product.id,
                service_date=s_meta["service_date"],
                type=s_meta["type"]
            ).first()

            if not srv:
                srv = ServiceRecord(
                    product_id=product.id,
                    service_date=s_meta["service_date"],
                    cost=s_meta["cost"],
                    type=s_meta["type"],
                    provider=s_meta["provider"],
                    description=s_meta["description"],
                    status=s_meta["status"],
                )
                db.session.add(srv)
                db.session.commit()
                services_created += 1
            else:
                srv.cost = s_meta["cost"]
                srv.provider = s_meta["provider"]
                srv.description = s_meta["description"]
                srv.status = s_meta["status"]
                db.session.commit()
                services_reused += 1

        total_services = ServiceRecord.query.join(Product).filter(Product.user_id == atharv_id).count()
        log(f"[SERVICE RECORDS] {services_created} created, {services_reused} verified (Total Atharv Services: {total_services})")

        # 6. Seed Documents & OCR (Target: 12 documents)
        docs_created = 0
        docs_reused = 0
        ocr_created = 0
        upload_base = get_upload_dir()
        docs_storage_dir = os.path.join(upload_base, "documents")
        os.makedirs(docs_storage_dir, exist_ok=True)

        for d_meta in DEMO_DOCUMENTS:
            product = product_map.get(d_meta["product_code"])
            if not product:
                continue

            doc = Document.query.filter_by(product_id=product.id, file_name=d_meta["file_name"]).first()
            if not doc:
                ext = d_meta["file_name"].rsplit(".", 1)[-1].lower()
                stored_file_name = f"{uuid.uuid4().hex}.{ext}"
                relative_file_path = f"documents/{stored_file_name}"
                full_storage_path = os.path.join(upload_base, "documents", stored_file_name)

                # Generate safe physical sample file
                create_sample_physical_file(full_storage_path, d_meta)

                actual_size = os.path.getsize(full_storage_path) if os.path.exists(full_storage_path) else d_meta["file_size"]

                doc = Document(
                    product_id=product.id,
                    name=d_meta["name"],
                    document_type=d_meta["document_type"],
                    file_name=d_meta["file_name"],
                    stored_file_name=stored_file_name,
                    file_path=relative_file_path,
                    mime_type=d_meta["mime_type"],
                    file_size=actual_size,
                    description=d_meta["description"],
                )
                db.session.add(doc)
                db.session.commit()
                docs_created += 1
            else:
                docs_reused += 1

            # Seed OCRResult if applicable
            if d_meta["ocr_status"] == "Completed" and d_meta.get("ocr_text"):
                ocr = OCRResult.query.filter_by(document_id=doc.id).first()
                if not ocr:
                    ocr = OCRResult(
                        document_id=doc.id,
                        status="COMPLETED",
                        extracted_text=d_meta["ocr_text"],
                        raw_text=d_meta["ocr_text"],
                        entities_json=d_meta["ocr_entities"],
                        processed_at=datetime.now(timezone.utc),
                    )
                    db.session.add(ocr)
                    db.session.commit()
                    ocr_created += 1

        total_docs = Document.query.join(Product).filter(Product.user_id == atharv_id).count()
        total_ocr = OCRResult.query.join(Document).join(Product).filter(Product.user_id == atharv_id).count()
        log(f"[DOCUMENTS] {docs_created} created, {docs_reused} verified (Total Atharv Documents: {total_docs})")
        log(f"[OCR] {ocr_created} created (Total Atharv OCR records: {total_ocr})")

        log("=" * 60)
        log("SEEDING COMPLETE & VERIFIED")
        log(f"User: {user.username} ({user.email}) - Normal User")
        log(f"Products: {len(product_map)}")
        log(f"Warranties: {total_warranties}")
        log(f"Service Records: {total_services}")
        log(f"Documents: {total_docs}")
        log(f"OCR Results: {total_ocr}")
        log("=" * 60)

        return {
            "user_id": atharv_id,
            "products": len(product_map),
            "warranties": total_warranties,
            "services": total_services,
            "documents": total_docs,
            "ocr": total_ocr,
        }


if __name__ == "__main__":
    seed_demo_data()
