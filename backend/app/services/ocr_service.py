"""
OCR Service Module.
Provides document text extraction (PDF & image), deterministic entity parsing,
Tesseract engine detection/configuration, and OCRResult database management.
"""

import os
import re
import logging
from datetime import datetime, timezone
import pytesseract
from PIL import Image
import pymupdf as fitz
from flask import current_app
from app.extensions import db
from app.config import Config
from app.models.document import Document
from app.models.product import Product
from app.models.ocr_result import OCRResult
from app.services.document_service import get_document_file_path

logger = logging.getLogger(__name__)

# Processing bounds and constants
MAX_PDF_PAGES = 20
PDF_RENDER_DPI = 150
MAX_TEXT_LENGTH = 1_000_000
MAX_ENTITY_LENGTH = 255


class OCRError(Exception):
    """Base exception for OCR errors."""
    pass


class OCREngineUnavailableError(OCRError):
    """Raised when Tesseract OCR binary is missing or not configured."""
    pass


class OCRProcessingError(OCRError):
    """Raised when document parsing, page limits, or file reading fails."""
    pass


def configure_tesseract_cmd():
    """
    Configure pytesseract executable path from Flask config or environment variables.
    """
    tess_cmd = None
    if current_app:
        tess_cmd = current_app.config.get('TESSERACT_CMD')
    if not tess_cmd:
        tess_cmd = os.getenv('TESSERACT_CMD')

    if tess_cmd:
        pytesseract.pytesseract.tesseract_cmd = tess_cmd


def is_tesseract_available():
    """
    Check if Tesseract OCR executable is available and functioning.
    
    Returns:
        tuple: (bool, str) - (available, version or error reason)
    """
    configure_tesseract_cmd()
    try:
        version = pytesseract.get_tesseract_version()
        return True, str(version)
    except Exception as e:
        logger.warning(f"Tesseract OCR unavailable: {e}")
        return False, "Tesseract OCR binary is not installed or not found on PATH"


def sanitize_error_message(error_str):
    """
    Sanitize error strings to ensure internal machine filesystem paths
    and sensitive details are not leaked to API clients.
    """
    if not error_str:
        return "OCR processing failed"
    # Remove file paths like C:\... or D:\... or /path/...
    cleaned = re.sub(r'[A-Za-z]:\\[\w\s.\\-]+', '<internal_path>', str(error_str))
    cleaned = re.sub(r'/[a-zA-Z0-9_\-./]+', '<internal_path>', cleaned)
    return cleaned.strip()[:500]


def extract_text_from_image(image_path):
    """
    Extract text from an image file using Pillow and pytesseract.
    
    Args:
        image_path (str): Verified path to image file.
        
    Returns:
        str: Extracted text.
    """
    if not os.path.exists(image_path) or not os.path.isfile(image_path):
        raise OCRProcessingError("Image file does not exist")

    try:
        with Image.open(image_path) as img:
            img.verify()
    except Exception as e:
        raise OCRProcessingError(f"Corrupt or unreadable image file: {e}")

    available, reason = is_tesseract_available()
    if not available:
        raise OCREngineUnavailableError(reason)

    try:
        with Image.open(image_path) as img:
            text = pytesseract.image_to_string(img)
            return text or ""
    except Exception as e:
        raise OCRProcessingError(f"Image OCR extraction failed: {sanitize_error_message(str(e))}")


def extract_text_from_pdf(pdf_path, max_pages=MAX_PDF_PAGES):
    """
    Extract text from a PDF file.
    Attempts digital text extraction first; renders pages for OCR if scanned.
    
    Args:
        pdf_path (str): Verified path to PDF file.
        max_pages (int): Maximum allowed pages.
        
    Returns:
        str: Extracted text combined across pages.
    """
    if not os.path.exists(pdf_path) or not os.path.isfile(pdf_path):
        raise OCRProcessingError("PDF file does not exist")

    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        raise OCRProcessingError(f"Failed to open PDF document: {e}")

    try:
        total_pages = len(doc)
        if total_pages == 0:
            raise OCRProcessingError("PDF document has 0 pages")
        if total_pages > max_pages:
            raise OCRProcessingError(
                f"PDF exceeds the maximum limit of {max_pages} pages (contains {total_pages} pages)"
            )

        extracted_pages = []
        tess_available, _ = is_tesseract_available()

        for page_num in range(total_pages):
            page = doc[page_num]
            # Try embedded digital text first
            page_text = page.get_text() or ""
            
            # If digital text is substantial, use it
            if len(page_text.strip()) > 30:
                extracted_pages.append(page_text.strip())
            else:
                # Scanned or image-based PDF page: render to image
                if not tess_available:
                    # If digital text exists even if short, retain it
                    if page_text.strip():
                        extracted_pages.append(page_text.strip())
                    else:
                        raise OCREngineUnavailableError(
                            "Scanned PDF requires Tesseract OCR engine, which is not available"
                        )
                else:
                    pix = page.get_pixmap(dpi=PDF_RENDER_DPI)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    ocr_text = pytesseract.image_to_string(img)
                    if ocr_text:
                        extracted_pages.append(ocr_text.strip())

        return "\n\n".join(extracted_pages)
    finally:
        doc.close()


def parse_ocr_entities(text):
    """
    Extract structured warranty and invoice metadata from OCR text using
    deterministic pattern matching and regular expressions.
    
    Returns:
        dict: Parsed entity dictionary with bounded string values.
    """
    if not text or not isinstance(text, str):
        return {}

    entities = {}

    def clean_val(val, max_len=MAX_ENTITY_LENGTH):
        if val is None:
            return None
        cleaned = re.sub(r'[\r\n]+', ' ', str(val)).strip(' :,-')
        return cleaned[:max_len] if cleaned else None

    # 1. Product Name
    prod_match = re.search(
        r'(?:Product(?:\s*Name)?|Item(?:\s*Description|\s*Name)?|Appliance|Device)\s*[:=\-]\s*([A-Za-z0-9 \t\-&+/]{2,60})',
        text,
        re.IGNORECASE
    )
    if prod_match:
        entities['product_name'] = clean_val(prod_match.group(1))

    # 2. Brand
    # First check explicit Brand label
    brand_match = re.search(r'\bBrand\s*[:=\-]\s*([A-Za-z0-9\-]+)', text, re.IGNORECASE)
    if brand_match:
        entities['brand'] = clean_val(brand_match.group(1))
    else:
        # Check known common appliance/electronics brands
        known_brands = [
            'Apple', 'Samsung', 'Sony', 'LG', 'Dell', 'HP', 'Lenovo', 'Whirlpool',
            'Bosch', 'Asus', 'Acer', 'Panasonic', 'Philips', 'OnePlus', 'Xiaomi',
            'Haier', 'Godrej', 'Voltas', 'Daikin', 'Carrier', 'Toshiba', 'Hitachi',
            'Google', 'Microsoft', 'Bose', 'Logitech', 'Canon', 'Nikon'
        ]
        for brand in known_brands:
            if re.search(rf'\b{brand}\b', text, re.IGNORECASE):
                entities['brand'] = brand
                break

    # 3. Model
    model_match = re.search(
        r'(?:Model(?:\s*No\.?|\s*Number)?|Item\s*No\.?)\s*[:=\-]\s*([A-Za-z0-9\-_./]+)',
        text,
        re.IGNORECASE
    )
    if model_match:
        entities['model'] = clean_val(model_match.group(1))

    # 4. Serial Number
    serial_match = re.search(
        r'(?:Serial(?:\s*No\.?|\s*Number)?|S/N|SN)\s*[:=\-]\s*([A-Za-z0-9\-]{4,40})',
        text,
        re.IGNORECASE
    )
    if serial_match:
        entities['serial_number'] = clean_val(serial_match.group(1))

    # 5. Invoice Number
    invoice_match = re.search(
        r'(?:Invoice(?:\s*No\.?|\s*Number)?|Bill\s*No\.?|Receipt\s*No\.?|Order\s*ID)\s*[:=\-]\s*([A-Za-z0-9\-_/]{3,40})',
        text,
        re.IGNORECASE
    )
    if invoice_match:
        entities['invoice_number'] = clean_val(invoice_match.group(1))

    # 6. Purchase Date
    date_patterns = [
        r'(?:Purchase\s*Date|Invoice\s*Date|Date\s*of\s*Purchase|Date)\s*[:=\-]\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})',
        r'(?:Purchase\s*Date|Invoice\s*Date|Date\s*of\s*Purchase|Date)\s*[:=\-]\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})',
        r'\b(\d{4}-\d{2}-\d{2})\b'
    ]
    for pattern in date_patterns:
        dt_match = re.search(pattern, text, re.IGNORECASE)
        if dt_match:
            entities['purchase_date'] = clean_val(dt_match.group(1))
            break

    # 7. Warranty Start Date
    w_start_match = re.search(
        r'(?:Warranty\s*Start(?:\s*Date)?|Coverage\s*Start(?:\s*Date)?)\s*[:=\-]\s*(\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4})',
        text,
        re.IGNORECASE
    )
    if w_start_match:
        entities['warranty_start_date'] = clean_val(w_start_match.group(1))

    # 8. Warranty End Date / Expiry
    w_end_match = re.search(
        r'(?:Warranty\s*(?:End|Expiry)(?:\s*Date)?|Expires?\s*(?:On|Date)?|Valid\s*(?:Till|Until))\s*[:=\-]\s*(\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4})',
        text,
        re.IGNORECASE
    )
    if w_end_match:
        entities['warranty_end_date'] = clean_val(w_end_match.group(1))

    # 9. Purchase Price / Amount
    price_match = re.search(
        r'(?:Total(?:\s*Amount)?|Grand\s*Total|Purchase\s*Price|Amount|Net\s*Amount)\s*[:=\-]?\s*[$₹€£]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2})?)',
        text,
        re.IGNORECASE
    )
    if price_match:
        # Normalize commas
        raw_price = price_match.group(1).replace(',', '')
        try:
            float(raw_price)
            entities['purchase_price'] = raw_price
        except ValueError:
            pass

    # 10. Vendor / Store
    vendor_match = re.search(
        r'(?:Vendor|Seller|Store|Merchant|Sold\s*by|Dealer)\s*[:=\-]\s*([A-Za-z0-9 \t&,.\-]{2,60})',
        text,
        re.IGNORECASE
    )
    if vendor_match:
        entities['vendor'] = clean_val(vendor_match.group(1))

    # 11. Phone
    phone_match = re.search(
        r'(?:Phone|Mobile|Tel|Contact)\s*[:=\-]?\s*(\+?[0-9 \t\-()]{7,20})',
        text,
        re.IGNORECASE
    )
    if phone_match:
        entities['phone'] = clean_val(phone_match.group(1))

    # 12. Email
    email_match = re.search(r'\b([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b', text)
    if email_match:
        entities['email'] = clean_val(email_match.group(1))

    return entities


def process_document(document_id, user_id, upload_dir=None):
    """
    Execute OCR extraction on a user-owned document file.
    
    Workflow:
    1. Verify document ownership.
    2. Check file presence and extension.
    3. Initialize/update OCRResult record to PROCESSING.
    4. Run text extraction and entity parsing.
    5. Update OCRResult to COMPLETED or FAILED.
    
    Returns:
        tuple: (ocr_result, error_message, status_code)
    """
    # 1. Verify ownership
    document = (
        Document.query
        .join(Product, Document.product_id == Product.id)
        .filter(Document.id == document_id, Product.user_id == user_id)
        .first()
    )
    if not document:
        return None, "Document not found", 404

    # 2. Verify file presence
    file_path, path_err = get_document_file_path(document, upload_dir)
    if path_err or not file_path or not os.path.exists(file_path):
        return None, "Document file not found on storage", 404

    # 3. Verify supported format
    ext = document.file_name.rsplit('.', 1)[-1].lower() if '.' in document.file_name else ''
    if ext not in {'pdf', 'jpg', 'jpeg', 'png', 'webp'}:
        return None, f"Unsupported document format '.{ext}' for OCR processing", 400

    # 4. Initialize or update OCRResult record
    ocr_result = OCRResult.query.filter_by(document_id=document.id).first()
    if not ocr_result:
        ocr_result = OCRResult(document_id=document.id, status='PROCESSING')
        db.session.add(ocr_result)
    else:
        ocr_result.status = 'PROCESSING'
        ocr_result.error_message = None

    db.session.commit()

    # 5. Execute extraction
    try:
        if ext == 'pdf':
            raw_text = extract_text_from_pdf(file_path)
        else:
            raw_text = extract_text_from_image(file_path)

        # Enforce text bounds
        extracted_text = raw_text[:MAX_TEXT_LENGTH] if raw_text else ""
        entities = parse_ocr_entities(extracted_text)

        ocr_result.status = 'COMPLETED'
        ocr_result.raw_text = raw_text[:MAX_TEXT_LENGTH] if raw_text else ""
        ocr_result.extracted_text = extracted_text
        ocr_result.entities_json = entities
        ocr_result.error_message = None
        ocr_result.processed_at = datetime.now(timezone.utc)
        db.session.commit()

        return ocr_result, None, 200

    except OCREngineUnavailableError as e:
        db.session.rollback()
        ocr_result = OCRResult.query.filter_by(document_id=document.id).first()
        err_msg = str(e)
        if ocr_result:
            ocr_result.status = 'FAILED'
            ocr_result.error_message = err_msg
            ocr_result.processed_at = datetime.now(timezone.utc)
            db.session.commit()
        return ocr_result, err_msg, 503

    except OCRProcessingError as e:
        db.session.rollback()
        ocr_result = OCRResult.query.filter_by(document_id=document.id).first()
        err_msg = sanitize_error_message(str(e))
        if ocr_result:
            ocr_result.status = 'FAILED'
            ocr_result.error_message = err_msg
            ocr_result.processed_at = datetime.now(timezone.utc)
            db.session.commit()
        return ocr_result, err_msg, 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected OCR processing error: {e}")
        ocr_result = OCRResult.query.filter_by(document_id=document.id).first()
        err_msg = "An unexpected error occurred during OCR text extraction"
        if ocr_result:
            ocr_result.status = 'FAILED'
            ocr_result.error_message = err_msg
            ocr_result.processed_at = datetime.now(timezone.utc)
            db.session.commit()
        return ocr_result, err_msg, 500


def get_ocr_result(document_id, user_id):
    """
    Retrieve existing OCRResult for a user-owned document.
    
    Returns:
        tuple: (ocr_result, error_message, status_code)
    """
    document = (
        Document.query
        .join(Product, Document.product_id == Product.id)
        .filter(Document.id == document_id, Product.user_id == user_id)
        .first()
    )
    if not document:
        return None, "Document not found", 404

    ocr_result = OCRResult.query.filter_by(document_id=document.id).first()
    if not ocr_result:
        return None, "No OCR result found for this document", 404

    return ocr_result, None, 200


def delete_ocr_result(document_id, user_id):
    """
    Delete an existing OCRResult while preserving the Document.
    
    Returns:
        tuple: (success_bool, error_message, status_code)
    """
    document = (
        Document.query
        .join(Product, Document.product_id == Product.id)
        .filter(Document.id == document_id, Product.user_id == user_id)
        .first()
    )
    if not document:
        return False, "Document not found", 404

    ocr_result = OCRResult.query.filter_by(document_id=document.id).first()
    if not ocr_result:
        return False, "No OCR result found for this document", 404

    try:
        db.session.delete(ocr_result)
        db.session.commit()
        return True, None, 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Database error deleting OCR result: {e}")
        return False, "Failed to delete OCR result", 500


def get_ocr_status(document_id, user_id):
    """
    Retrieve current processing status for a user-owned document.
    Defaults to PENDING if no OCR processing has commenced.
    
    Returns:
        tuple: (status_dict, error_message, status_code)
    """
    document = (
        Document.query
        .join(Product, Document.product_id == Product.id)
        .filter(Document.id == document_id, Product.user_id == user_id)
        .first()
    )
    if not document:
        return None, "Document not found", 404

    ocr_result = OCRResult.query.filter_by(document_id=document.id).first()
    current_status = ocr_result.status if ocr_result else 'PENDING'

    return {
        "document_id": document_id,
        "status": current_status
    }, None, 200
