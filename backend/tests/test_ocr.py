"""
OCR API and Service Unit & Integration Tests.
Verifies text extraction from PDFs and images, deterministic entity parsing,
processing bounds, error handling, cascade deletions, and IDOR protection.
"""

import os
import io
import shutil
import tempfile
import unittest
from datetime import date
from unittest.mock import patch
import pymupdf as fitz
from PIL import Image
from flask_jwt_extended import create_access_token
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.product import Product
from app.models.document import Document
from app.models.ocr_result import OCRResult
from app.services.ocr_service import (
    parse_ocr_entities,
    extract_text_from_pdf,
    extract_text_from_image,
    sanitize_error_message,
    MAX_PDF_PAGES,
    MAX_TEXT_LENGTH
)


class OCRTestCase(unittest.TestCase):
    """Test suite for OCR endpoints, text extraction, entity parsing, and security."""

    def setUp(self):
        """Configure test application, isolated temporary storage, users and documents."""
        self.temp_upload_dir = tempfile.mkdtemp()
        self.app = create_app('testing')
        self.app.config['UPLOAD_FOLDER'] = self.temp_upload_dir
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        # Seed User A
        self.user_a = User(username="usera", email="usera@example.com")
        self.user_a.set_password("password123")
        db.session.add(self.user_a)

        # Seed User B
        self.user_b = User(username="userb", email="userb@example.com")
        self.user_b.set_password("password123")
        db.session.add(self.user_b)
        db.session.commit()

        self.token_a = create_access_token(identity=str(self.user_a.id))
        self.token_b = create_access_token(identity=str(self.user_b.id))
        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

        # Seed Product owned by User A
        self.product_a = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-00001",
            name="User A Television",
            brand="Sony",
            category="Television",
            purchase_date=date(2025, 8, 20)
        )
        db.session.add(self.product_a)

        # Seed Product owned by User B
        self.product_b = Product(
            user_id=self.user_b.id,
            product_code="PRD-2026-00002",
            name="User B Laptop",
            brand="Apple",
            category="Laptop",
            purchase_date=date(2025, 11, 10)
        )
        db.session.add(self.product_b)
        db.session.commit()

        # Create sample PDF file on storage for User A's document
        self.sample_text = (
            "Product Name: Sony Bravia 55 OLED\n"
            "Brand: Sony\n"
            "Model: XR-55A80K\n"
            "Serial No: SN-987654321\n"
            "Invoice No: INV-2026-0042\n"
            "Purchase Date: 2026-01-15\n"
            "Warranty Start Date: 2026-01-15\n"
            "Warranty End Date: 2028-01-15\n"
            "Total Amount: $1499.99\n"
            "Vendor: Best Buy Electronics\n"
            "Phone: +1-800-555-0199\n"
            "Email: support@bestbuy.com\n"
        )
        self.doc_a = self._create_pdf_document(self.product_a.id, "sample_invoice.pdf", self.sample_text)

    def tearDown(self):
        """Clean up database and delete temporary storage directory."""
        db.session.remove()
        db.drop_all()
        self.ctx.pop()
        shutil.rmtree(self.temp_upload_dir, ignore_errors=True)

    def _create_pdf_document(self, product_id, filename, text_content):
        """Helper to create a valid PDF file in test storage and insert Document record."""
        docs_dir = os.path.join(self.temp_upload_dir, 'documents')
        os.makedirs(docs_dir, exist_ok=True)
        stored_name = f"test_{filename}"
        abs_path = os.path.join(docs_dir, stored_name)

        # Generate real PDF with PyMuPDF
        pdf_doc = fitz.open()
        page = pdf_doc.new_page()
        page.insert_text((50, 72), text_content)
        pdf_doc.save(abs_path)
        pdf_doc.close()

        doc = Document(
            product_id=product_id,
            name="Test Document",
            document_type="Invoice",
            file_name=filename,
            stored_file_name=stored_name,
            file_path=f"documents/{stored_name}",
            mime_type="application/pdf",
            file_size=os.path.getsize(abs_path)
        )
        db.session.add(doc)
        db.session.commit()
        return doc

    def _create_image_document(self, product_id, filename):
        """Helper to create a valid small PNG image in test storage and insert Document record."""
        docs_dir = os.path.join(self.temp_upload_dir, 'documents')
        os.makedirs(docs_dir, exist_ok=True)
        stored_name = f"test_{filename}"
        abs_path = os.path.join(docs_dir, stored_name)

        # Generate valid 100x100 RGB image
        img = Image.new('RGB', (100, 100), color='white')
        img.save(abs_path, format='PNG')

        doc = Document(
            product_id=product_id,
            name="Test Image",
            document_type="Receipt",
            file_name=filename,
            stored_file_name=stored_name,
            file_path=f"documents/{stored_name}",
            mime_type="image/png",
            file_size=os.path.getsize(abs_path)
        )
        db.session.add(doc)
        db.session.commit()
        return doc

    # 1. Authentication required
    def test_authentication_required(self):
        res1 = self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process')
        self.assertEqual(res1.status_code, 401)
        res2 = self.client.get(f'/api/v1/ocr/documents/{self.doc_a.id}')
        self.assertEqual(res2.status_code, 401)
        res3 = self.client.delete(f'/api/v1/ocr/documents/{self.doc_a.id}')
        self.assertEqual(res3.status_code, 401)
        res4 = self.client.get(f'/api/v1/ocr/documents/{self.doc_a.id}/status')
        self.assertEqual(res4.status_code, 401)

    # 2. Unauthorized document access (User B attempting User A's document)
    def test_unauthorized_document_access_returns_404(self):
        res = self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_b)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.get_json()["error"], "Document not found")

    # 3. User A can process own document (PDF)
    def test_user_can_process_own_pdf_document(self):
        res = self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("ocr_result", data)
        ocr = data["ocr_result"]
        self.assertEqual(ocr["status"], "COMPLETED")
        self.assertIn("Sony Bravia", ocr["extracted_text"])
        self.assertIsNotNone(ocr["processed_at"])

    # 4. User B cannot process User A's document (IDOR protection)
    def test_idor_process_another_user_document_rejected(self):
        res = self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_b)
        self.assertEqual(res.status_code, 404)
        # Verify no OCRResult created
        self.assertIsNone(OCRResult.query.filter_by(document_id=self.doc_a.id).first())

    # 5. Image OCR success (mocked Tesseract)
    def test_image_ocr_success(self):
        img_doc = self._create_image_document(self.product_a.id, "receipt.png")
        mocked_text = "Product: Apple iPad Pro\nSerial No: D12345678\nTotal: $899.00\nDate: 2026-03-01"

        with patch('app.services.ocr_service.is_tesseract_available', return_value=(True, "5.3.0")):
            with patch('pytesseract.image_to_string', return_value=mocked_text):
                res = self.client.post(f'/api/v1/ocr/documents/{img_doc.id}/process', headers=self.headers_a)
                self.assertEqual(res.status_code, 200)
                data = res.get_json()
                ocr = data["ocr_result"]
                self.assertEqual(ocr["status"], "COMPLETED")
                self.assertIn("iPad Pro", ocr["extracted_text"])
                self.assertEqual(ocr["entities"]["brand"], "Apple")

    # 6. PDF OCR success
    def test_pdf_ocr_success(self):
        res = self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        ocr = res.get_json()["ocr_result"]
        self.assertEqual(ocr["status"], "COMPLETED")
        self.assertEqual(ocr["entities"]["brand"], "Sony")
        self.assertEqual(ocr["entities"]["model"], "XR-55A80K")

    # 7. OCR result persistence in database
    def test_ocr_result_persistence(self):
        self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
        record = OCRResult.query.filter_by(document_id=self.doc_a.id).first()
        self.assertIsNotNone(record)
        self.assertEqual(record.status, "COMPLETED")
        self.assertIn("Sony Bravia", record.extracted_text)
        self.assertIn("entities", record.to_dict())

    # 8. Get OCR result
    def test_get_ocr_result_success(self):
        self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
        res = self.client.get(f'/api/v1/ocr/documents/{self.doc_a.id}', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        ocr = res.get_json()["ocr_result"]
        self.assertEqual(ocr["document_id"], self.doc_a.id)
        self.assertEqual(ocr["status"], "COMPLETED")

    # 9. Missing OCR result returns 404
    def test_missing_ocr_result_returns_404(self):
        res = self.client.get(f'/api/v1/ocr/documents/{self.doc_a.id}', headers=self.headers_a)
        self.assertEqual(res.status_code, 404)
        self.assertIn("No OCR result found", res.get_json()["error"])

    # 10. Delete OCR result
    def test_delete_ocr_result_success(self):
        self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
        # Verify OCRResult exists
        self.assertIsNotNone(OCRResult.query.filter_by(document_id=self.doc_a.id).first())

        # Delete OCR result
        res = self.client.delete(f'/api/v1/ocr/documents/{self.doc_a.id}', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        self.assertIn("OCR result deleted successfully", res.get_json()["message"])

        # Document must remain intact
        doc = db.session.get(Document, self.doc_a.id)
        self.assertIsNotNone(doc)
        # OCRResult is deleted
        self.assertIsNone(OCRResult.query.filter_by(document_id=self.doc_a.id).first())

    # 11. OCR status check
    def test_ocr_status_endpoint(self):
        # 1. Before processing: defaults to PENDING
        res_initial = self.client.get(f'/api/v1/ocr/documents/{self.doc_a.id}/status', headers=self.headers_a)
        self.assertEqual(res_initial.status_code, 200)
        self.assertEqual(res_initial.get_json()["status"], "PENDING")

        # 2. After processing: status is COMPLETED
        self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
        res_after = self.client.get(f'/api/v1/ocr/documents/{self.doc_a.id}/status', headers=self.headers_a)
        self.assertEqual(res_after.status_code, 200)
        self.assertEqual(res_after.get_json()["status"], "COMPLETED")

    # 12. Reprocessing existing OCR
    def test_reprocessing_existing_ocr_updates_record(self):
        # Initial process
        res1 = self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
        ocr1_id = res1.get_json()["ocr_result"]["id"]

        # Reprocess
        res2 = self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
        self.assertEqual(res2.status_code, 200)
        ocr2 = res2.get_json()["ocr_result"]
        # Same ID (updated in place, not duplicate row)
        self.assertEqual(ocr2["id"], ocr1_id)
        self.assertEqual(ocr2["status"], "COMPLETED")
        self.assertEqual(OCRResult.query.filter_by(document_id=self.doc_a.id).count(), 1)

    # 13. FAILED state when processing encounters error
    def test_failed_state_on_processing_error(self):
        img_doc = self._create_image_document(self.product_a.id, "corrupt.png")
        with patch('app.services.ocr_service.extract_text_from_image', side_effect=Exception("Processing failed")):
            res = self.client.post(f'/api/v1/ocr/documents/{img_doc.id}/process', headers=self.headers_a)
            self.assertEqual(res.status_code, 500)
            ocr = OCRResult.query.filter_by(document_id=img_doc.id).first()
            self.assertIsNotNone(ocr)
            self.assertEqual(ocr.status, "FAILED")
            self.assertIsNotNone(ocr.error_message)

    # 14. Missing physical file returns 404
    def test_missing_physical_file_returns_404(self):
        # Delete file out-of-band
        full_path = os.path.join(self.temp_upload_dir, self.doc_a.file_path)
        if os.path.exists(full_path):
            os.remove(full_path)

        res = self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
        self.assertEqual(res.status_code, 404)
        self.assertIn("Document file not found on storage", res.get_json()["error"])

    # 15. Unsupported document type returns 400
    def test_unsupported_document_type_returns_400(self):
        self.doc_a.file_name = "test.txt"
        db.session.commit()
        res = self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Unsupported document format", res.get_json()["error"])

    # 16. Invalid image handled gracefully
    def test_invalid_image_handled_gracefully(self):
        docs_dir = os.path.join(self.temp_upload_dir, 'documents')
        bad_img_path = os.path.join(docs_dir, 'bad.png')
        with open(bad_img_path, 'wb') as f:
            f.write(b'not an actual image header')

        doc = Document(
            product_id=self.product_a.id,
            name="Bad Image",
            file_name="bad.png",
            stored_file_name="bad.png",
            file_path="documents/bad.png",
            mime_type="image/png"
        )
        db.session.add(doc)
        db.session.commit()

        res = self.client.post(f'/api/v1/ocr/documents/{doc.id}/process', headers=self.headers_a)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Corrupt or unreadable image", res.get_json()["error"])

    # 17. PDF page limit enforced
    def test_pdf_page_limit_enforced(self):
        docs_dir = os.path.join(self.temp_upload_dir, 'documents')
        large_pdf_path = os.path.join(docs_dir, 'large.pdf')

        # Create PDF with 25 pages
        pdf = fitz.open()
        for i in range(25):
            p = pdf.new_page()
            p.insert_text((50, 50), f"Page {i+1}")
        pdf.save(large_pdf_path)
        pdf.close()

        doc = Document(
            product_id=self.product_a.id,
            name="Large PDF",
            file_name="large.pdf",
            stored_file_name="large.pdf",
            file_path="documents/large.pdf",
            mime_type="application/pdf"
        )
        db.session.add(doc)
        db.session.commit()

        res = self.client.post(f'/api/v1/ocr/documents/{doc.id}/process', headers=self.headers_a)
        self.assertEqual(res.status_code, 400)
        self.assertIn("exceeds the maximum limit of 20 pages", res.get_json()["error"])

    # 18. OCR text size limit
    def test_ocr_text_size_limit_truncation(self):
        huge_text = "A" * (MAX_TEXT_LENGTH + 500)
        with patch('app.services.ocr_service.extract_text_from_pdf', return_value=huge_text):
            res = self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
            self.assertEqual(res.status_code, 200)
            ocr = res.get_json()["ocr_result"]
            self.assertEqual(len(ocr["extracted_text"]), MAX_TEXT_LENGTH)

    # 19. Entity extraction — product name
    def test_entity_extraction_product_name(self):
        text = "Product Name: Whirlpool Front Load Washing Machine\nSerial: W12345"
        entities = parse_ocr_entities(text)
        self.assertEqual(entities.get("product_name"), "Whirlpool Front Load Washing Machine")

    # 20. Entity extraction — serial number
    def test_entity_extraction_serial_number(self):
        text = "Item: Air Conditioner\nS/N: VOL-AC-2026-X99"
        entities = parse_ocr_entities(text)
        self.assertEqual(entities.get("serial_number"), "VOL-AC-2026-X99")

    # 21. Entity extraction — dates
    def test_entity_extraction_dates(self):
        text = (
            "Purchase Date: 2026-02-18\n"
            "Warranty Start Date: 2026-02-18\n"
            "Warranty End Date: 2028-02-18\n"
        )
        entities = parse_ocr_entities(text)
        self.assertEqual(entities.get("purchase_date"), "2026-02-18")
        self.assertEqual(entities.get("warranty_start_date"), "2026-02-18")
        self.assertEqual(entities.get("warranty_end_date"), "2028-02-18")

    # 22. Entity extraction — invoice number
    def test_entity_extraction_invoice_number(self):
        text = "Tax Invoice\nInvoice No: RET-2026/8941\nAmount: 550.00"
        entities = parse_ocr_entities(text)
        self.assertEqual(entities.get("invoice_number"), "RET-2026/8941")

    # 23. Entity extraction — price
    def test_entity_extraction_price(self):
        text = "Store Receipt\nGrand Total: $1,299.50"
        entities = parse_ocr_entities(text)
        self.assertEqual(entities.get("purchase_price"), "1299.50")

    # 24. Entity extraction — vendor
    def test_entity_extraction_vendor(self):
        text = "Sold by: Reliance Digital Retail Ltd\nInvoice: 442"
        entities = parse_ocr_entities(text)
        self.assertEqual(entities.get("vendor"), "Reliance Digital Retail Ltd")

    # 25. Entity extraction — email and phone
    def test_entity_extraction_email_and_phone(self):
        text = "Contact Phone: +1-555-867-5309\nSupport Email: support@smartcare.org"
        entities = parse_ocr_entities(text)
        self.assertEqual(entities.get("phone"), "+1-555-867-5309")
        self.assertEqual(entities.get("email"), "support@smartcare.org")

    # 26. Document deletion cascades OCR result
    def test_document_deletion_cascades_ocr_result(self):
        self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
        ocr_id = OCRResult.query.filter_by(document_id=self.doc_a.id).first().id

        # Delete document
        del_res = self.client.delete(f'/api/v1/documents/{self.doc_a.id}', headers=self.headers_a)
        self.assertEqual(del_res.status_code, 200)

        # Confirm OCR result is cascade-deleted
        self.assertIsNone(db.session.get(OCRResult, ocr_id))

    # 27. Product deletion cascades OCR result
    def test_product_deletion_cascades_ocr_result(self):
        self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
        ocr_id = OCRResult.query.filter_by(document_id=self.doc_a.id).first().id

        # Delete parent product
        prod_del = self.client.delete(f'/api/v1/products/{self.product_a.id}', headers=self.headers_a)
        self.assertEqual(prod_del.status_code, 200)

        # Confirm OCR result is cascade-deleted
        self.assertIsNone(db.session.get(OCRResult, ocr_id))

    # 28. IDOR protection for GET
    def test_idor_get_another_user_ocr_result_rejected(self):
        self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)

        # User B attempts to access User A's OCR result
        res = self.client.get(f'/api/v1/ocr/documents/{self.doc_a.id}', headers=self.headers_b)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.get_json()["error"], "Document not found")

    # 29. IDOR protection for DELETE
    def test_idor_delete_another_user_ocr_result_rejected(self):
        self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)

        # User B attempts to delete User A's OCR result
        res = self.client.delete(f'/api/v1/ocr/documents/{self.doc_a.id}', headers=self.headers_b)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.get_json()["error"], "Document not found")

        # Verify OCR result still intact
        self.assertIsNotNone(OCRResult.query.filter_by(document_id=self.doc_a.id).first())

    # 30. Safe error responses (no internal machine paths)
    def test_safe_error_responses_no_path_leakage(self):
        leaked_path_err = "Error reading D:\\SmartCare\\backend\\uploads\\internal\\secret.pdf: invalid file"
        sanitized = sanitize_error_message(leaked_path_err)
        self.assertNotIn("D:\\SmartCare", sanitized)
        self.assertNotIn("backend\\uploads", sanitized)
        self.assertIn("<internal_path>", sanitized)

    # 31. Tesseract unavailable handling
    def test_tesseract_unavailable_handling(self):
        img_doc = self._create_image_document(self.product_a.id, "scan.png")
        with patch('app.services.ocr_service.is_tesseract_available', return_value=(False, "Tesseract not installed")):
            res = self.client.post(f'/api/v1/ocr/documents/{img_doc.id}/process', headers=self.headers_a)
            self.assertEqual(res.status_code, 503)
            self.assertIn("Tesseract not installed", res.get_json()["error"])
            ocr = OCRResult.query.filter_by(document_id=img_doc.id).first()
            self.assertIsNotNone(ocr)
            self.assertEqual(ocr.status, "FAILED")

    # 32. No path leakage in returned OCR payload
    def test_no_filesystem_paths_in_ocr_result_payload(self):
        res = self.client.post(f'/api/v1/ocr/documents/{self.doc_a.id}/process', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        body_str = str(res.get_json())
        self.assertNotIn(self.temp_upload_dir, body_str)
        self.assertNotIn("documents/test_", body_str)
