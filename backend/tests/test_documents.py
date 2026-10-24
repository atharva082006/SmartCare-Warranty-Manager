"""
Documents API Unit and Integration Tests.
Verifies file uploads, download/viewing, metadata management, IDOR protection,
storage isolation, file-system consistency, and product deletion cascades.
"""

import os
import io
import shutil
import tempfile
import unittest
from datetime import date
from unittest.mock import patch
from flask_jwt_extended import create_access_token
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.product import Product
from app.models.document import Document
from app.services.document_service import (
    get_document_stats,
    resolve_storage_path,
    delete_document_file
)


class DocumentTestCase(unittest.TestCase):
    """Test suite for document upload, retrieval, download, security and storage."""

    def setUp(self):
        """Configure test application, temporary upload storage, users and products."""
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
            name="User A Laptop",
            brand="Apple",
            category="Laptop",
            purchase_date=date(2025, 8, 20)
        )
        db.session.add(self.product_a)

        # Seed Product owned by User B
        self.product_b = Product(
            user_id=self.user_b.id,
            product_code="PRD-2026-00002",
            name="User B Television",
            brand="Sony",
            category="Television",
            purchase_date=date(2025, 11, 10)
        )
        db.session.add(self.product_b)
        db.session.commit()

    def tearDown(self):
        """Clean up in-memory database and remove isolated test upload directory."""
        db.session.remove()
        db.drop_all()
        self.ctx.pop()
        shutil.rmtree(self.temp_upload_dir, ignore_errors=True)

    # 1. Authentication required
    def test_unauthenticated_access_rejected(self):
        res = self.client.get('/api/v1/documents')
        self.assertEqual(res.status_code, 401)
        res_post = self.client.post('/api/v1/documents')
        self.assertEqual(res_post.status_code, 401)

    # 2. Empty document list
    def test_authenticated_empty_document_list(self):
        res = self.client.get('/api/v1/documents', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("documents", data)
        self.assertEqual(data["documents"], [])

    # 3. List documents
    def test_list_user_documents(self):
        # Upload doc for user A
        upload_data = {
            'product_id': str(self.product_a.id),
            'name': 'MacBook Invoice',
            'document_type': 'Invoice',
            'file': (io.BytesIO(b'%PDF-1.4 dummy invoice'), 'invoice.pdf', 'application/pdf')
        }
        res_up = self.client.post('/api/v1/documents', headers=self.headers_a, data=upload_data, content_type='multipart/form-data')
        self.assertEqual(res_up.status_code, 201)

        res = self.client.get('/api/v1/documents', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(len(data["documents"]), 1)
        self.assertEqual(data["documents"][0]["name"], "MacBook Invoice")
        self.assertEqual(data["documents"][0]["document_type"], "Invoice")

    # 4. Product filtering
    def test_product_filter_returns_only_product_documents(self):
        # Create second product for user A
        product_a2 = Product(
            user_id=self.user_a.id,
            product_code="PRD-2026-00003",
            name="User A Phone",
            brand="Google",
            category="Phone",
            purchase_date=date(2025, 12, 1)
        )
        db.session.add(product_a2)
        db.session.commit()

        # Upload doc for product A
        self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'name': 'Doc 1',
            'file': (io.BytesIO(b'%PDF-1.4 doc 1'), 'doc1.pdf', 'application/pdf')
        }, content_type='multipart/form-data')

        # Upload doc for product A2
        self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(product_a2.id),
            'name': 'Doc 2',
            'file': (io.BytesIO(b'%PDF-1.4 doc 2'), 'doc2.pdf', 'application/pdf')
        }, content_type='multipart/form-data')

        # Filter by product_a
        res1 = self.client.get(f'/api/v1/documents?product_id={self.product_a.id}', headers=self.headers_a)
        self.assertEqual(res1.status_code, 200)
        docs1 = res1.get_json()["documents"]
        self.assertEqual(len(docs1), 1)
        self.assertEqual(docs1[0]["name"], "Doc 1")

        # Filter by product_a2
        res2 = self.client.get(f'/api/v1/documents?product_id={product_a2.id}', headers=self.headers_a)
        self.assertEqual(res2.status_code, 200)
        docs2 = res2.get_json()["documents"]
        self.assertEqual(len(docs2), 1)
        self.assertEqual(docs2[0]["name"], "Doc 2")

    # 5. Product ownership filtering (cannot filter by another user's product)
    def test_product_filter_another_user_product_returns_404(self):
        res = self.client.get(f'/api/v1/documents?product_id={self.product_b.id}', headers=self.headers_a)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.get_json()["error"], "Product not found")

    # 6. Upload PDF
    def test_upload_pdf_success(self):
        data = {
            'product_id': str(self.product_a.id),
            'name': 'Official Warranty Certificate',
            'document_type': 'Warranty',
            'description': 'Manufacturer coverage cert',
            'file': (io.BytesIO(b'%PDF-1.5 test pdf content'), 'certificate.pdf', 'application/pdf')
        }
        res = self.client.post('/api/v1/documents', headers=self.headers_a, data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 201)
        body = res.get_json()
        self.assertEqual(body["name"], "Official Warranty Certificate")
        self.assertEqual(body["mime_type"], "application/pdf")
        self.assertEqual(body["file_name"], "certificate.pdf")
        self.assertEqual(body["file_size"], len(b'%PDF-1.5 test pdf content'))

    # 7. Upload JPG
    def test_upload_jpg_success(self):
        data = {
            'product_id': str(self.product_a.id),
            'name': 'Receipt Photo',
            'document_type': 'Receipt',
            'file': (io.BytesIO(b'\xff\xd8\xff\xe0\x00\x10JFIF receipt data'), 'receipt.jpg', 'image/jpeg')
        }
        res = self.client.post('/api/v1/documents', headers=self.headers_a, data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 201)
        body = res.get_json()
        self.assertEqual(body["mime_type"], "image/jpeg")
        self.assertEqual(body["file_name"], "receipt.jpg")

    # 8. Upload PNG
    def test_upload_png_success(self):
        data = {
            'product_id': str(self.product_a.id),
            'name': 'Invoice Screenshot',
            'document_type': 'Invoice',
            'file': (io.BytesIO(b'\x89PNG\r\n\x1a\n png dummy data'), 'screenshot.png', 'image/png')
        }
        res = self.client.post('/api/v1/documents', headers=self.headers_a, data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 201)
        body = res.get_json()
        self.assertEqual(body["mime_type"], "image/png")

    # 9. Upload WEBP
    def test_upload_webp_success(self):
        data = {
            'product_id': str(self.product_a.id),
            'name': 'Webp Document',
            'document_type': 'Manual',
            'file': (io.BytesIO(b'RIFF....WEBP dummy data'), 'manual.webp', 'image/webp')
        }
        res = self.client.post('/api/v1/documents', headers=self.headers_a, data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 201)
        body = res.get_json()
        self.assertEqual(body["mime_type"], "image/webp")

    # 10. Reject unsupported extension
    def test_reject_unsupported_extension(self):
        data = {
            'product_id': str(self.product_a.id),
            'file': (io.BytesIO(b'malicious script'), 'payload.exe', 'application/octet-stream')
        }
        res = self.client.post('/api/v1/documents', headers=self.headers_a, data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 400)
        self.assertIn("Unsupported file extension", res.get_json()["error"])

    # 11. Reject unsupported MIME type
    def test_reject_unsupported_mime_type(self):
        data = {
            'product_id': str(self.product_a.id),
            'file': (io.BytesIO(b'some plain text'), 'document.pdf', 'text/plain')
        }
        res = self.client.post('/api/v1/documents', headers=self.headers_a, data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 400)
        self.assertIn("Unsupported file MIME type", res.get_json()["error"])

    # 12. Reject file larger than 10 MB
    def test_reject_oversized_file(self):
        with patch('app.services.document_service.MAX_FILE_SIZE', 30):
            data = {
                'product_id': str(self.product_a.id),
                'file': (io.BytesIO(b'%PDF-1.4 file content that is definitely longer than thirty bytes'), 'large_doc.pdf', 'application/pdf')
            }
            res = self.client.post('/api/v1/documents', headers=self.headers_a, data=data, content_type='multipart/form-data')
            self.assertEqual(res.status_code, 400)
            self.assertIn("10 MB limit", res.get_json()["error"])

    # 13. Reject missing file
    def test_reject_missing_file(self):
        data = {
            'product_id': str(self.product_a.id),
            'name': 'No file document'
        }
        res = self.client.post('/api/v1/documents', headers=self.headers_a, data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 400)
        self.assertIn("File is required", res.get_json()["error"])

    # 14. Reject missing product_id
    def test_reject_missing_product_id(self):
        data = {
            'name': 'Invoice without product',
            'file': (io.BytesIO(b'%PDF-1.4 dummy'), 'invoice.pdf', 'application/pdf')
        }
        res = self.client.post('/api/v1/documents', headers=self.headers_a, data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 400)
        self.assertIn("product_id is required", res.get_json()["error"])

    # 15. Reject nonexistent product
    def test_reject_nonexistent_product(self):
        data = {
            'product_id': '99999',
            'file': (io.BytesIO(b'%PDF-1.4 dummy'), 'invoice.pdf', 'application/pdf')
        }
        res = self.client.post('/api/v1/documents', headers=self.headers_a, data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.get_json()["error"], "Product not found")

    # 16. Reject another user's product
    def test_reject_another_users_product(self):
        data = {
            'product_id': str(self.product_b.id),  # Belongs to User B
            'file': (io.BytesIO(b'%PDF-1.4 dummy'), 'invoice.pdf', 'application/pdf')
        }
        res = self.client.post('/api/v1/documents', headers=self.headers_a, data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.get_json()["error"], "Product not found")

    # 17. Get document metadata
    def test_get_document_metadata_success(self):
        up_res = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'name': 'User A Manual',
            'document_type': 'Manual',
            'file': (io.BytesIO(b'%PDF-1.4 manual content'), 'manual.pdf', 'application/pdf')
        }, content_type='multipart/form-data')
        doc_id = up_res.get_json()["id"]

        res = self.client.get(f'/api/v1/documents/{doc_id}', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(body["id"], doc_id)
        self.assertEqual(body["name"], "User A Manual")
        self.assertEqual(body["document_type"], "Manual")

    # 18. Get another user's document metadata (IDOR protection)
    def test_idor_get_another_user_document_returns_404(self):
        up_res = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'name': 'Secret Document',
            'file': (io.BytesIO(b'%PDF-1.4 secret'), 'secret.pdf', 'application/pdf')
        }, content_type='multipart/form-data')
        doc_id = up_res.get_json()["id"]

        # User B attempts to get User A's document
        res_b = self.client.get(f'/api/v1/documents/{doc_id}', headers=self.headers_b)
        self.assertEqual(res_b.status_code, 404)
        self.assertEqual(res_b.get_json()["error"], "Document not found")

    # 19. Download file
    def test_download_file_success(self):
        file_bytes = b'%PDF-1.4 sample file for download test'
        up_res = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'name': 'Downloadable Doc',
            'file': (io.BytesIO(file_bytes), 'sample.pdf', 'application/pdf')
        }, content_type='multipart/form-data')
        doc_id = up_res.get_json()["id"]

        # Download file
        res = self.client.get(f'/api/v1/documents/{doc_id}/file', headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, file_bytes)
        self.assertIn("application/pdf", res.headers.get("Content-Type", ""))

    # 20. Download another user's file (IDOR protection)
    def test_idor_download_another_user_file_returns_404(self):
        up_res = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'file': (io.BytesIO(b'%PDF-1.4 private'), 'private.pdf', 'application/pdf')
        }, content_type='multipart/form-data')
        doc_id = up_res.get_json()["id"]

        # User B attempts to download
        res_b = self.client.get(f'/api/v1/documents/{doc_id}/file', headers=self.headers_b)
        self.assertEqual(res_b.status_code, 404)
        self.assertEqual(res_b.get_json()["error"], "Document not found")

    # 21. Update document metadata
    def test_update_document_metadata_success(self):
        up_res = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'name': 'Initial Name',
            'document_type': 'Invoice',
            'description': 'Initial description',
            'file': (io.BytesIO(b'%PDF-1.4 invoice'), 'invoice.pdf', 'application/pdf')
        }, content_type='multipart/form-data')
        doc_id = up_res.get_json()["id"]

        # Update metadata via JSON
        update_data = {
            'name': 'Updated Invoice Name',
            'document_type': 'Receipt',
            'description': 'Updated description notes'
        }
        res = self.client.put(f'/api/v1/documents/{doc_id}', headers=self.headers_a, json=update_data)
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(body["name"], "Updated Invoice Name")
        self.assertEqual(body["document_type"], "Receipt")
        self.assertEqual(body["description"], "Updated description notes")

    # 22. Protected fields cannot be modified
    def test_protected_fields_cannot_be_modified(self):
        up_res = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'name': 'Original Doc',
            'file': (io.BytesIO(b'%PDF-1.4 test'), 'test.pdf', 'application/pdf')
        }, content_type='multipart/form-data')
        original = up_res.get_json()
        doc_id = original["id"]

        # Attempt to change product_id, id, file_size, upload_date
        tamper_data = {
            'id': 9999,
            'product_id': self.product_b.id,
            'file_size': 999999,
            'upload_date': '2020-01-01T00:00:00',
            'stored_file_name': 'tampered.pdf',
            'file_path': 'documents/tampered.pdf',
            'name': 'Legitimate Name Change'
        }
        res = self.client.put(f'/api/v1/documents/{doc_id}', headers=self.headers_a, json=tamper_data)
        self.assertEqual(res.status_code, 200)

        # Verify DB state
        doc = db.session.get(Document, doc_id)
        self.assertEqual(doc.id, doc_id)
        self.assertEqual(doc.product_id, self.product_a.id)
        self.assertEqual(doc.file_size, original["file_size"])
        self.assertEqual(doc.name, 'Legitimate Name Change')

    # 23. Delete document
    def test_delete_document_success(self):
        up_res = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'name': 'Doc to Delete',
            'file': (io.BytesIO(b'%PDF-1.4 to delete'), 'delete_me.pdf', 'application/pdf')
        }, content_type='multipart/form-data')
        doc_id = up_res.get_json()["id"]

        del_res = self.client.delete(f'/api/v1/documents/{doc_id}', headers=self.headers_a)
        self.assertEqual(del_res.status_code, 200)
        self.assertEqual(del_res.get_json()["message"], "Document deleted successfully")

        # Verify document is gone
        get_res = self.client.get(f'/api/v1/documents/{doc_id}', headers=self.headers_a)
        self.assertEqual(get_res.status_code, 404)

    # 24. Delete another user's document (IDOR protection)
    def test_idor_delete_another_user_document_returns_404(self):
        up_res = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'file': (io.BytesIO(b'%PDF-1.4 doc a'), 'doc_a.pdf', 'application/pdf')
        }, content_type='multipart/form-data')
        doc_id = up_res.get_json()["id"]

        # User B attempts to delete
        del_res = self.client.delete(f'/api/v1/documents/{doc_id}', headers=self.headers_b)
        self.assertEqual(del_res.status_code, 404)
        self.assertEqual(del_res.get_json()["error"], "Document not found")

        # Verify document is still intact
        doc = db.session.get(Document, doc_id)
        self.assertIsNotNone(doc)

    # 25. Physical file deletion on document delete
    def test_physical_file_deleted_when_document_deleted(self):
        up_res = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'file': (io.BytesIO(b'%PDF-1.4 file check'), 'check.pdf', 'application/pdf')
        }, content_type='multipart/form-data')
        doc_id = up_res.get_json()["id"]

        doc = db.session.get(Document, doc_id)
        full_path = resolve_storage_path(doc.file_path, self.temp_upload_dir)
        self.assertTrue(os.path.exists(full_path))

        # Delete document
        self.client.delete(f'/api/v1/documents/{doc_id}', headers=self.headers_a)

        # Verify physical file is removed from disk
        self.assertFalse(os.path.exists(full_path))

    # 26. Missing physical file during delete handled gracefully
    def test_missing_physical_file_during_delete_does_not_fail(self):
        up_res = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'file': (io.BytesIO(b'%PDF-1.4 file missing test'), 'missing.pdf', 'application/pdf')
        }, content_type='multipart/form-data')
        doc_id = up_res.get_json()["id"]

        doc = db.session.get(Document, doc_id)
        full_path = resolve_storage_path(doc.file_path, self.temp_upload_dir)
        if os.path.exists(full_path):
            os.remove(full_path)  # Intentionally delete file out of band

        # Call delete endpoint
        del_res = self.client.delete(f'/api/v1/documents/{doc_id}', headers=self.headers_a)
        self.assertEqual(del_res.status_code, 200)
        self.assertEqual(del_res.get_json()["message"], "Document deleted successfully")
        self.assertIsNone(db.session.get(Document, doc_id))

    # 27. Product deletion cascade (deletes DB record AND physical files)
    def test_product_deletion_cascade_cleans_up_document_and_file(self):
        up_res = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'file': (io.BytesIO(b'%PDF-1.4 cascade test file'), 'cascade.pdf', 'application/pdf')
        }, content_type='multipart/form-data')
        doc_id = up_res.get_json()["id"]

        doc = db.session.get(Document, doc_id)
        full_path = resolve_storage_path(doc.file_path, self.temp_upload_dir)
        self.assertTrue(os.path.exists(full_path))

        # Delete parent product
        prod_del_res = self.client.delete(f'/api/v1/products/{self.product_a.id}', headers=self.headers_a)
        self.assertEqual(prod_del_res.status_code, 200)

        # Confirm Document DB record is deleted
        self.assertIsNone(db.session.get(Document, doc_id))

        # Confirm physical file is deleted
        self.assertFalse(os.path.exists(full_path))

    # 28. Document statistics calculation
    def test_document_statistics_calculation(self):
        # User A uploads 2 invoices and 1 manual
        self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'document_type': 'Invoice',
            'file': (io.BytesIO(b'12345'), 'inv1.pdf', 'application/pdf')
        }, content_type='multipart/form-data')

        self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'document_type': 'Invoice',
            'file': (io.BytesIO(b'1234567'), 'inv2.pdf', 'application/pdf')
        }, content_type='multipart/form-data')

        self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'document_type': 'Manual',
            'file': (io.BytesIO(b'123'), 'man.pdf', 'application/pdf')
        }, content_type='multipart/form-data')

        stats = get_document_stats(self.user_a.id)
        self.assertEqual(stats["total_documents"], 3)
        self.assertEqual(stats["total_file_size"], 5 + 7 + 3)
        self.assertEqual(stats["document_type_counts"]["Invoice"], 2)
        self.assertEqual(stats["document_type_counts"]["Manual"], 1)

        # User B stats should be empty
        stats_b = get_document_stats(self.user_b.id)
        self.assertEqual(stats_b["total_documents"], 0)
        self.assertEqual(stats_b["total_file_size"], 0)
        self.assertEqual(stats_b["document_type_counts"], {})

    # 29. Unique generated storage filenames
    def test_duplicate_original_filenames_receive_unique_storage_names(self):
        # Upload two files with identical user filename 'receipt.pdf'
        res1 = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'file': (io.BytesIO(b'%PDF-1.4 file 1'), 'receipt.pdf', 'application/pdf')
        }, content_type='multipart/form-data')

        res2 = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'file': (io.BytesIO(b'%PDF-1.4 file 2'), 'receipt.pdf', 'application/pdf')
        }, content_type='multipart/form-data')

        doc1 = db.session.get(Document, res1.get_json()["id"])
        doc2 = db.session.get(Document, res2.get_json()["id"])

        self.assertEqual(doc1.file_name, 'receipt.pdf')
        self.assertEqual(doc2.file_name, 'receipt.pdf')
        self.assertNotEqual(doc1.stored_file_name, doc2.stored_file_name)
        self.assertNotEqual(doc1.file_path, doc2.file_path)

    # 30. No path traversal attacks
    def test_path_traversal_filename_prevented(self):
        data = {
            'product_id': str(self.product_a.id),
            'file': (io.BytesIO(b'%PDF-1.4 safe content'), '../../../../etc/passwd.pdf', 'application/pdf')
        }
        res = self.client.post('/api/v1/documents', headers=self.headers_a, data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 201)
        doc = db.session.get(Document, res.get_json()["id"])
        # Original filename sanitized, stored filename is a UUID
        self.assertNotIn('..', doc.file_name)
        self.assertNotIn('/', doc.file_name)
        self.assertNotIn('\\', doc.file_name)

        # resolve_storage_path directly prevents traversal
        self.assertIsNone(resolve_storage_path('../../../secrets.txt', self.temp_upload_dir))

    # 31. Database rollback and orphan cleanup on DB failure
    def test_no_orphan_file_after_failed_db_commit(self):
        # Simulate db.session.commit failure
        with patch.object(db.session, 'commit', side_effect=Exception("Simulated DB Crash")):
            data = {
                'product_id': str(self.product_a.id),
                'file': (io.BytesIO(b'%PDF-1.4 crash test'), 'crash.pdf', 'application/pdf')
            }
            res = self.client.post('/api/v1/documents', headers=self.headers_a, data=data, content_type='multipart/form-data')
            self.assertEqual(res.status_code, 500)

        # Check storage folder: no files should remain
        docs_folder = os.path.join(self.temp_upload_dir, 'documents')
        if os.path.exists(docs_folder):
            files = os.listdir(docs_folder)
            self.assertEqual(len(files), 0)

    # 32. Safe metadata serialization (does not expose server paths)
    def test_serialization_safe(self):
        up_res = self.client.post('/api/v1/documents', headers=self.headers_a, data={
            'product_id': str(self.product_a.id),
            'name': 'Serialized Doc',
            'file': (io.BytesIO(b'%PDF-1.4 serialized'), 'doc.pdf', 'application/pdf')
        }, content_type='multipart/form-data')
        body = up_res.get_json()
        self.assertNotIn('stored_file_name', body)
        self.assertNotIn('file_path', body)
        self.assertNotIn(self.temp_upload_dir, str(body))
