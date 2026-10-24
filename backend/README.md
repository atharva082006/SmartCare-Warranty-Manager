# SmartCare Backend API (Milestones 10, 11, 12, 13, 14, 15 & 16)

Welcome to the **SmartCare Backend API**. This backend is built using **Python 3**, **Flask**, **Flask-SQLAlchemy**, **Flask-Migrate**, **PostgreSQL**, **bcrypt**, **Flask-JWT-Extended**, **PyMuPDF**, and **pytesseract**, providing a clean, modular foundation for Authentication, Products, Warranties, Service Records, Documents & File Storage, OCR Text & Entity Extraction, and Analytics + Product Health management.

---

## 1. Prerequisites

- **Python 3.10+** (Python 3.12 recommended)
- **PostgreSQL 14+** installed and running on `localhost:5432`
- **pip** package installer
- **Tesseract OCR engine** (Optional/Recommended for image-based OCR; digital PDFs are extracted natively via PyMuPDF without Tesseract)

---

## 2. Setup Instructions

### Step 1: Navigate to the Backend Directory
```bash
cd D:\SmartCare\backend
```

### Step 2: Create a Python Virtual Environment
```powershell
python -m venv .venv
```

### Step 3: Activate the Virtual Environment
**Windows PowerShell:**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Windows Command Prompt:**
```cmd
.venv\Scripts\activate.bat
```

### Step 4: Install Dependencies
```bash
pip install -r requirements.txt
```

---

## 3. Database & Environment Configuration

### Step 1: Create PostgreSQL Database
In `psql` or pgAdmin:
```sql
CREATE DATABASE smartcare;
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
copy .env.example .env
```

Edit `.env` with your configuration:
```ini
FLASK_ENV=development
SECRET_KEY=your-secure-random-flask-secret-key
JWT_SECRET_KEY=your-secure-random-jwt-secret-key
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/smartcare
TEST_DATABASE_URL=sqlite:///:memory:
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=10485760
FRONTEND_URL=http://localhost:5173
PORT=5000
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

> **Note:** Never commit the `.env` file containing personal credentials or secret keys to version control.

---

## 4. Database Migrations

Database schema versions are managed via **Flask-Migrate** (Alembic).

### Apply Migrations (Upgrade Database)
To create or update tables in your PostgreSQL database:
```bash
flask --app run.py db upgrade
```

### Create a New Migration
When models are updated:
```bash
flask --app run.py db migrate -m "Description of changes"
flask --app run.py db upgrade
```

---

## 5. Running the Flask Backend

Run the development server:
```bash
python run.py
```

Expected startup output:
```text
 * Starting SmartCare API on http://127.0.0.1:5000
 * Environment: development
 * Frontend origin allowed: http://localhost:5173
 * Running on http://127.0.0.1:5000
```

---

## 6. Authentication API Endpoints

### 1. User Registration
Creates a new user account with bcrypt password hashing.

- **URL**: `POST /api/v1/auth/register`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "username": "student",
  "email": "student@example.com",
  "password": "password123",
  "phone": "9876543210"
}
```

- **Success Response (HTTP 201 Created)**:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "student",
    "email": "student@example.com",
    "phone": "9876543210"
  }
}
```

---

### 2. User Login
Authenticates credentials and issues a JWT access token.

- **URL**: `POST /api/v1/auth/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

- **Success Response (HTTP 200 OK)**:
```json
{
  "message": "Login successful",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "student",
    "email": "student@example.com",
    "phone": "9876543210"
  }
}
```

---

### 3. Current User Profile
Retrieves the profile of the currently authenticated user.

- **URL**: `GET /api/v1/auth/me`
- **Headers**: `Authorization: Bearer <access_token>`

- **Success Response (HTTP 200 OK)**:
```json
{
  "user": {
    "id": 1,
    "username": "student",
    "email": "student@example.com",
    "phone": "9876543210"
  }
}
```

---

## 7. Products API Endpoints

All product routes require `Authorization: Bearer <access_token>`. Products are strictly scoped to the authenticated user.

### 1. List Products
- **URL**: `GET /api/v1/products`
- **Response (HTTP 200 OK)**:
```json
{
  "products": [
    {
      "id": 1,
      "product_code": "PRD-2026-00001",
      "name": "MacBook Air",
      "brand": "Apple",
      "category": "Laptop",
      "model": "M4",
      "serial_number": "ABC12345",
      "purchase_date": "2026-01-15",
      "purchase_price": 99999.00,
      "warranty_period": 12,
      "notes": "Personal laptop",
      "created_at": "2026-02-01T10:00:00",
      "updated_at": "2026-02-01T10:00:00"
    }
  ]
}
```

### 2. Get Product by ID
- **URL**: `GET /api/v1/products/<id>`
- **Response**: `HTTP 200 OK` with product object, or `HTTP 404 Not Found` if nonexistent or owned by another user.

### 3. Create Product
- **URL**: `POST /api/v1/products`
- **Request Body**:
```json
{
  "name": "MacBook Air",
  "brand": "Apple",
  "category": "Laptop",
  "model": "M4",
  "serial_number": "ABC12345",
  "purchase_date": "2026-01-15",
  "purchase_price": 99999.00,
  "warranty_period": 12,
  "notes": "Personal laptop"
}
```
- **Response (HTTP 201 Created)**: Returns created product with auto-generated `product_code` (e.g. `PRD-2026-00001`).

### 4. Update Product
- **URL**: `PUT /api/v1/products/<id>`
- **Response (HTTP 200 OK)**: Returns updated product. `id`, `user_id`, and `product_code` cannot be altered.

### 5. Delete Product
- **URL**: `DELETE /api/v1/products/<id>`
- **Response (HTTP 200 OK)**: `{"message": "Product deleted successfully"}`. Automatically cascades deletion to associated warranties, service records, and documents (including physical storage files).

---

## 8. Warranties API Endpoints

All warranty routes require `Authorization: Bearer <access_token>`. Warranty ownership is inherited through the associated product.

### 1. List Warranties
- **URL**: `GET /api/v1/warranties`
- **Optional Query**: `GET /api/v1/warranties?product_id=<id>`
- **Response (HTTP 200 OK)**:
```json
{
  "warranties": [
    {
      "id": 1,
      "product_id": 1,
      "start_date": "2026-01-15",
      "end_date": "2027-01-15",
      "type": "Manufacturer",
      "coverage": "Parts and labor",
      "is_active": true,
      "status": "ACTIVE",
      "days_remaining": 99,
      "created_at": "2026-02-01T10:00:00",
      "updated_at": "2026-02-01T10:00:00"
    }
  ]
}
```

### 2. Get Warranty by ID
- **URL**: `GET /api/v1/warranties/<id>`
- **Response**: `HTTP 200 OK` with warranty object, or `HTTP 404 Not Found` if nonexistent or owned by another user.

### 3. Create Warranty
- **URL**: `POST /api/v1/warranties`
- **Request Body**:
```json
{
  "product_id": 1,
  "start_date": "2026-01-15",
  "end_date": "2027-01-15",
  "type": "Manufacturer",
  "coverage": "Parts and labor"
}
```
- **Response (HTTP 201 Created)**: Returns created warranty with calculated `status` and `days_remaining`.

### 4. Update Warranty
- **URL**: `PUT /api/v1/warranties/<id>`
- **Response (HTTP 200 OK)**: Returns updated warranty.

### 5. Delete Warranty
- **URL**: `DELETE /api/v1/warranties/<id>`
- **Response (HTTP 200 OK)**: `{"message": "Warranty deleted successfully"}`.

---

## 9. Service Records API Endpoints

All service record routes require `Authorization: Bearer <access_token>`. Service record ownership is inherited through the associated product (`service_record.product.user_id == current_user_id`).

### 1. List Service Records
- **URL**: `GET /api/v1/service-records`
- **Optional Query**: `GET /api/v1/service-records?product_id=<id>` (filters records for a specific user-owned product)
- **Response (HTTP 200 OK)**:
```json
{
  "service_records": [
    {
      "id": 1,
      "product_id": 1,
      "service_date": "2026-03-10",
      "cost": 1500.0,
      "type": "Screen Replacement",
      "provider": "Apple Authorized Service Center",
      "description": "Replaced cracked display assembly under care plan",
      "status": "COMPLETED",
      "created_at": "2026-03-10T14:30:00",
      "updated_at": "2026-03-10T14:30:00"
    }
  ]
}
```

### 2. Get Service Record by ID
- **URL**: `GET /api/v1/service-records/<id>`
- **Response**: `HTTP 200 OK` with service record object, or `HTTP 404 Not Found` if nonexistent or belonging to another user's product.

### 3. Create Service Record
- **URL**: `POST /api/v1/service-records`
- **Request Body**:
```json
{
  "product_id": 1,
  "service_date": "2026-03-10",
  "cost": 1500.00,
  "type": "Screen Replacement",
  "provider": "Apple Authorized Service Center",
  "description": "Replaced cracked display assembly under care plan",
  "status": "COMPLETED"
}
```
- **Supported Status Values**: `COMPLETED` (default), `PENDING`, `CANCELLED` (case-insensitive in input, stored uppercase).
- **Response (HTTP 201 Created)**: Returns created service record.

### 4. Update Service Record
- **URL**: `PUT /api/v1/service-records/<id>`
- **Request Body**: Any editable field (`service_date`, `cost`, `type`, `provider`, `description`, `status`). `id` and `product_id` cannot be altered.
- **Response (HTTP 200 OK)**: Returns updated service record.

### 5. Delete Service Record
- **URL**: `DELETE /api/v1/service-records/<id>`
- **Response (HTTP 200 OK)**: `{"message": "Service record deleted successfully"}`.

---

## 10. Documents & File Storage API Endpoints

All document routes require `Authorization: Bearer <access_token>`. Document ownership is inherited through the parent product (`document.product.user_id == current_user_id`).

### 1. List Documents
- **URL**: `GET /api/v1/documents`
- **Optional Query**: `GET /api/v1/documents?product_id=<id>` (filters documents for a specific user-owned product)
- **Response (HTTP 200 OK)**:
```json
{
  "documents": [
    {
      "id": 1,
      "product_id": 1,
      "name": "Purchase Invoice",
      "document_type": "Invoice",
      "file_name": "receipt.pdf",
      "mime_type": "application/pdf",
      "file_size": 245100,
      "description": "Official retail tax receipt",
      "upload_date": "2026-03-15T10:00:00",
      "created_at": "2026-03-15T10:00:00",
      "updated_at": "2026-03-15T10:00:00"
    }
  ]
}
```

### 2. Get Document Metadata by ID
- **URL**: `GET /api/v1/documents/<id>`
- **Response (HTTP 200 OK)**: Returns safe document metadata. Returns `404 Not Found` if nonexistent or owned by another user. Internal absolute filesystem paths are strictly withheld.

### 3. Upload Document
- **URL**: `POST /api/v1/documents`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: (Required) File upload binary stream.
  - `product_id`: (Required) Integer ID of user-owned product.
  - `name`: (Optional) User-friendly document title (defaults to original filename).
  - `document_type`: (Optional) Type string (e.g. `Warranty`, `Invoice`, `Receipt`, `Manual`, `Other`).
  - `description`: (Optional) Text notes.
- **File Restrictions**:
  - **Allowed Extensions**: `pdf`, `jpg`, `jpeg`, `png`, `webp`
  - **Allowed MIME Types**: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`
  - **Maximum Size**: 10 MB (`10485760` bytes)
- **Response (HTTP 201 Created)**: Returns created document metadata.

### 4. Download / View Document File
- **URL**: `GET /api/v1/documents/<id>/file`
- **Optional Query**: `?download=true` (forces `Content-Disposition: attachment` download instead of inline view)
- **Response (HTTP 200 OK)**: Streams the binary document file with correct `Content-Type` header and original filename for saving. Returns `404 Not Found` if unauthorized.

### 5. Update Document Metadata
- **URL**: `PUT /api/v1/documents/<id>`
- **Content-Type**: `application/json` or `multipart/form-data`
- **Editable Fields**: `name`, `document_type`, `description`
- **Protected Fields**: `id`, `product_id`, `stored_file_name`, `file_path`, `file_size`, `upload_date` cannot be modified.
- **Response (HTTP 200 OK)**: Returns updated document metadata.

### 6. Delete Document
- **URL**: `DELETE /api/v1/documents/<id>`
- **Behavior**: Deletes the physical file from server storage and removes the database record. If the file is already missing on disk, the database record is cleanly removed without error.
- **Response (HTTP 200 OK)**: `{"message": "Document deleted successfully"}`.

---

## 11. Storage Architecture & Upload Security

1. **Server Storage Layout**:
   - Configurable directory via `UPLOAD_FOLDER` (defaults to `backend/uploads`).
   - Physical documents stored under: `backend/uploads/documents/`.
   - Ignored from Git via `.gitignore`.
2. **Path Traversal & Overwrite Protection**:
   - User filenames are sanitized for display only.
   - On disk, files are stored using uniquely generated UUID filenames: `<uuid>.<ext>` (e.g., `a1b2c3d4...89.pdf`).
   - Paths are strictly resolved and validated using `os.path.commonpath` to ensure files never escape `UPLOAD_FOLDER`.
3. **Transaction Safety**:
   - Files are saved to disk, then inserted into the database.
   - If the database transaction fails, the physical file is automatically cleaned up and the session is rolled back, preventing orphan files.
4. **Cascade Deletion**:
   - Deleting a `Product` automatically cleans up associated document physical files from storage and deletes metadata records in PostgreSQL.

---

## 12. OCR Backend API Endpoints

All OCR routes require `Authorization: Bearer <access_token>`. Document ownership is strictly enforced via the associated product (`document.product.user_id == current_user_id`).

### 1. Process Document OCR
- **URL**: `POST /api/v1/ocr/documents/<id>/process`
- **Optional Request Body**:
```json
{
  "force": false
}
```
- **Behavior**:
  - Validates document ownership (returns `404 Not Found` if unauthorized or nonexistent).
  - If already completed and `force=false`, returns existing completed OCR result immediately.
  - If `force=true`, clears existing results and reprocesses.
  - Extracts text:
    - **PDF files**: Extracted natively page-by-page using **PyMuPDF** (`fitz`). Maximum 20 pages processed.
    - **Image files** (JPG, PNG, WEBP): Processed using **Pillow** + **Tesseract OCR**. If Tesseract is not installed/configured, returns `503 Service Unavailable` with instructions to install Tesseract.
  - Limits extracted text to a maximum of 1,000,000 characters to safeguard database performance.
  - Deterministically extracts structured entity fields using regular expressions.
  - Updates status from `PROCESSING` to `COMPLETED` (or `FAILED` with sanitized error message).
- **Success Response (HTTP 200 OK)**:
```json
{
  "id": 1,
  "document_id": 1,
  "status": "COMPLETED",
  "extracted_text": "INVOICE #INV-2026-9988\nApple Store...\nTotal: $1,299.00",
  "raw_text": "INVOICE #INV-2026-9988\nApple Store...\nTotal: $1,299.00",
  "entities": {
    "product_name": "MacBook Pro 16",
    "brand": "Apple",
    "model": "A2485",
    "serial_number": "C02G80XYZ99",
    "invoice_number": "INV-2026-9988",
    "purchase_date": "2026-03-15",
    "warranty_start_date": "2026-03-15",
    "warranty_end_date": "2027-03-15",
    "purchase_price": "1299.00",
    "vendor": "Apple Store Fifth Avenue",
    "phone": "+1 800-692-7753",
    "email": "support@apple.com"
  },
  "error_message": null,
  "processed_at": "2026-10-08T11:21:05.123456",
  "created_at": "2026-10-08T11:21:05.100000",
  "updated_at": "2026-10-08T11:21:05.123456"
}
```

### 2. Get OCR Result by Document ID
- **URL**: `GET /api/v1/ocr/documents/<id>`
- **Response (HTTP 200 OK)**: Returns the current OCR result object including `status`, `extracted_text`, `entities`, and timestamps. Returns `404 Not Found` if no OCR result exists or document is not owned by user.

### 3. Get OCR Processing Status
- **URL**: `GET /api/v1/ocr/documents/<id>/status`
- **Response (HTTP 200 OK)**:
```json
{
  "document_id": 1,
  "status": "COMPLETED",
  "has_result": true,
  "error_message": null,
  "processed_at": "2026-10-08T11:21:05.123456"
}
```

### 4. Delete OCR Result
- **URL**: `DELETE /api/v1/ocr/documents/<id>`
- **Response (HTTP 200 OK)**: `{"message": "OCR result deleted successfully"}`. Returns `404 Not Found` if nonexistent or unauthorized.

---

## 13. Deterministic Entity Extraction & OCR Architecture

1. **Extraction Engine Integration**:
   - **PyMuPDF**: High-speed, in-process text extraction for digital PDF files without external system binary requirements.
   - **Tesseract OCR via pytesseract**: Optical Character Recognition for raster images (`.jpg`, `.jpeg`, `.png`, `.webp`). Configurable via `TESSERACT_CMD` environment variable or auto-discovered across common Windows / Unix system directories.
2. **Regex-Based Deterministic Field Parsing**:
   - The service extracts 12 core warranty & invoice fields:
     - `product_name`: Matches keywords `Product:`, `Item:`, `Device:`, `Description:` on a single line.
     - `brand`: Matches known electronics brands or `Brand:` / `Make:` labels.
     - `model`: Matches `Model:` / `Model No:` labels or model code patterns.
     - `serial_number`: Matches `Serial:`, `S/N:`, `Serial No:` patterns.
     - `invoice_number`: Matches `Invoice #`, `Receipt #`, `Bill #` patterns.
     - `purchase_date`: Matches standard date formats (YYYY-MM-DD, DD/MM/YYYY, etc.) following purchase keywords.
     - `warranty_start_date` & `warranty_end_date`: Matches warranty validity intervals.
     - `purchase_price`: Extracts normalized numeric prices following currency symbols ($ / ₹ / € / £ / USD / INR).
     - `vendor`: Matches `Vendor:`, `Store:`, `Seller:`, `Merchant:` on a single line.
     - `phone`: Matches international and local phone number formats.
     - `email`: Matches RFC-compliant email address patterns.
3. **Safety Bounds & Resilience**:
   - **Page Limit**: PDFs capped at a maximum of 20 pages per document.
   - **Character Limit**: Extracted text truncated at 1,000,000 characters to prevent database bloat.
   - **Error Sanitization**: Internal filesystem paths or stack traces are never exposed in responses or stored in `error_message`.
   - **Cascade Deletion**: Foreign key `ON DELETE CASCADE` and SQLAlchemy `cascade='all, delete-orphan'` automatically remove `ocr_results` when their parent `Document` (or `Product`) is deleted.

---

## 14. Product Health Score Algorithm & Health API

### Product Health Score Algorithm
The Product Health Score evaluates the operational state, reliability risk, and maintenance health of appliances and gadgets using a deterministic, transparent formula bounded between `0` and `100`.

- **Base Score**: `100`
- **Bounds**: `MAX(0, MIN(100, score))` (strictly clamped between 0 and 100)

#### Deductions:
1. **Product Age**:
   - `-4` points per completed year from purchase date.
   - **Maximum Age Deduction**: `-25` points.
2. **Repairs / Service Records**:
   - `-6` points per completed repair (`status == 'COMPLETED'`).
   - Cancelled and pending service records are excluded from repair counts.
   - **Maximum Repair Deduction**: `-30` points.
3. **Service Cost Ratio**:
   - Total non-cancelled service expenditure compared against original `purchase_price`.
   - If Service Cost > 25% of purchase price: `-25` points.
   - If Service Cost > 10% of purchase price: `-10` points.
4. **Warranty Status**:
   - Expired Warranty: `-15` points.
   - Expiring Soon (coverage ends within 30 days): `-5` points.
   - Active Warranty: `0` deduction (positive factor).

#### Score Categories:
- **`HEALTHY`**: 80–100 (Optimal reliability, minimal maintenance intervention needed)
- **`ATTENTION`**: 50–79 (Moderate wear, expiring warranty, or recurring repairs)
- **`CRITICAL`**: 0–49 (High failure risk, severe age degradation, or excessive repair costs)

### Health API Endpoints

All Health routes require `Authorization: Bearer <access_token>`.

#### 1. List Product Health
- **URL**: `GET /api/v1/health/products`
- **Optional Query**: `?status=HEALTHY` | `?status=ATTENTION` | `?status=CRITICAL`
- **Response (HTTP 200 OK)**:
```json
{
  "products": [
    {
      "product_id": 1,
      "product_code": "PRD-2026-00001",
      "name": "MacBook Pro",
      "brand": "Apple",
      "category": "Laptops",
      "health_score": 90,
      "health_status": "HEALTHY",
      "primary_reason": "Service history"
    }
  ],
  "summary": {
    "average_health_score": 90.0,
    "healthy_products": 1,
    "attention_products": 0,
    "critical_products": 0
  }
}
```

#### 2. Get Product Health Detail
- **URL**: `GET /api/v1/health/products/<product_id>`
- **Response (HTTP 200 OK)**:
```json
{
  "product": {
    "id": 1,
    "name": "MacBook Pro",
    "purchase_price": 2500.0,
    "purchase_date": "2025-06-01"
  },
  "health": {
    "score": 90,
    "status": "HEALTHY",
    "status_label": "Healthy",
    "base_score": 100,
    "positive_factors": [
      "Active warranty",
      "Low service cost"
    ],
    "deductions": [
      {
        "factor": "Age",
        "points": -4,
        "reason": "Product age",
        "description": "Product is 1 completed year(s) old (-4 pts)."
      },
      {
        "factor": "Repairs",
        "points": -6,
        "reason": "Service history",
        "description": "1 completed repair(s) logged (-6 pts)."
      }
    ],
    "recommendations": [
      "Product is in optimal condition. Continue regular maintenance."
    ],
    "primary_reason": "Service history"
  }
}
```

---

## 15. Analytics Architecture & REST API Endpoints

All Analytics routes require `Authorization: Bearer <access_token>`. Calculations are strictly scoped to the authenticated user's records.

### Endpoints Overview

1. **Dashboard Overview**: `GET /api/v1/analytics/overview`
   - Returns counts for products, active/expiring/expired warranties, service records, non-cancelled total service cost, average service cost, and documents.
2. **Warranty Analytics**: `GET /api/v1/analytics/warranties`
   - Returns warranty status breakdown, active/expiring/expired percentages, and type counts.
3. **Service Analytics**: `GET /api/v1/analytics/services`
   - Returns completed/pending/cancelled record counts, non-cancelled total and average costs, cost breakdown by product, cost breakdown by service type, and chronological monthly spending trends (`records_by_month`).
4. **Product Analytics**: `GET /api/v1/analytics/products`
   - Returns category breakdown, brand breakdown, purchase year breakdown, total purchase asset value, average purchase price, and warranty attachment counts.
5. **Document Analytics**: `GET /api/v1/analytics/documents`
   - Returns document counts, total storage bytes, document type breakdown, breakdown by product, and stored OCR result status counts (`completed_ocr_count`, `failed_ocr_count`). Does not trigger OCR execution.
6. **Health Analytics**: `GET /api/v1/analytics/health`
   - Returns average health score, healthy/attention/critical counts, score distribution, and user's product health list.
7. **Attention Items**: `GET /api/v1/analytics/attention`
   - Returns prioritized actionable alerts sorted by severity (`HIGH`, `MEDIUM`, `LOW`):
     - `HIGH`: Expired warranties (`WARRANTY_EXPIRED`), Critical health (`CRITICAL_HEALTH`), Service cost > 25% of asset value (`HIGH_SERVICE_COST`).
     - `MEDIUM`: Warranties expiring within 30 days (`WARRANTY_EXPIRING`), Attention health (`ATTENTION_HEALTH`), 2+ completed repairs (`FREQUENT_REPAIRS`).
     - `LOW`: Documents with failed OCR processing (`FAILED_OCR`).

---

## 16. Authorization & Security (IDOR Protection)

1. **Server-Side Ownership Enforcement**:
   - Products are accessed only where `product.user_id == current_user_id`.
   - Warranties are accessed only where `warranty.product.user_id == current_user_id`.
   - Service records are accessed only where `service_record.product.user_id == current_user_id`.
   - Documents are accessed only where `document.product.user_id == current_user_id`.
   - OCR results are accessed only where `document.product.user_id == current_user_id`.
   - Health detail is accessed only where `product.user_id == current_user_id`.
   - Analytics aggregations query solely rows owned by the authenticated `current_user_id`.
2. **Generic 404 Responses**:
   - If User B attempts to access User A's product health, document, or service record, the API returns generic `404 Not Found`.
3. **Monetary Safety**:
   - Currency totals are computed using `Decimal` arithmetic and serialized with exact two-decimal precision strings (e.g., `"120.00"`). Cancelled service records are strictly excluded from financial calculations.

---

## 17. Health Checks

- **Service Health**: `GET /api/v1/health` → `200 OK`
- **Database Health**: `GET /api/v1/health/db` → `200 OK`

---

## 18. Running Automated Tests

Run the complete test suite:
```bash
pytest tests/ -v
```

All 195 tests run with zero warnings/errors against an isolated SQLite in-memory database configuration (`sqlite:///:memory:`):
- **`test_health.py`**: 6 tests (Health checks & DB connectivity)
- **`test_auth.py`**: 19 tests (Registration, login, validation, JWT auth, /me endpoint)
- **`test_products.py`**: 14 tests (Product CRUD, product code auto-generation, IDOR security)
- **`test_warranties.py`**: 18 tests (Warranty CRUD, date validations, status calculation, IDOR security)
- **`test_service_records.py`**: 30 tests (Service record CRUD, validation, product filter, IDOR security, cascade delete, stats)
- **`test_documents.py`**: 32 tests (Uploads, downloads, MIME/extension validation, 10MB limit, IDOR security, cascades, stats)
- **`test_ocr.py`**: 32 tests (Text extraction, image OCR mock, PDF page limits, entity parsing, IDOR security, cascade delete, status)
- **`test_health_api.py`**: 23 tests (Product Health algorithm, deductions, caps, bounds 0-100, recommendations, filters, IDOR)
- **`test_analytics.py`**: 21 tests (Overview, warranties, services, products, documents, attention items, Decimal safety, user isolation)

---

## 19. Backend Project Structure

```
backend/
├── app/
│   ├── __init__.py              # Flask app factory, error handlers, CORS & blueprints
│   ├── config.py                # Configuration classes (UPLOAD_FOLDER, TESSERACT_CMD, DB normalization)
│   ├── extensions.py            # SQLAlchemy, Migrate, CORS, and JWTManager instances
│   ├── models/                  # Database models
│   │   ├── __init__.py          # Model exports (User, Product, Warranty, ServiceRecord, Document, OCRResult)
│   │   ├── user.py              # User model with bcrypt hashing & product relation
│   │   ├── product.py           # Product model with auto-code, warranty, service & document relations
│   │   ├── warranty.py          # Warranty model with dynamic status calculation
│   │   ├── service_record.py    # ServiceRecord model with controlled statuses
│   │   ├── document.py          # Document model with safe serialization & OCRResult relation
│   │   └── ocr_result.py        # OCRResult model with 1-to-1 cascade relation on Document
│   ├── routes/                  # Route blueprints
│   │   ├── __init__.py          # Route registration
│   │   ├── auth.py              # Register, Login, and /me endpoints
│   │   ├── health.py            # Diagnostic health endpoints (/health, /health/db)
│   │   ├── products.py          # Product CRUD endpoints & cascade file cleanup
│   │   ├── warranties.py        # Warranty CRUD endpoints
│   │   ├── service_records.py   # Service Record CRUD endpoints & product filter
│   │   ├── documents.py         # Document upload, download, metadata CRUD endpoints
│   │   ├── ocr.py               # OCR document processing, result, status & delete endpoints
│   │   ├── product_health.py    # Product Health list, detail & status filter endpoints
│   │   └── analytics.py         # Analytics overview, warranties, services, products, documents, attention
│   └── services/                # Business logic layer
│       ├── __init__.py
│       ├── product_service.py        # Code generation & payload validation
│       ├── warranty_service.py       # Status calculation & payload validation
│       ├── service_record_service.py # Validation, CRUD & statistics service
│       ├── document_service.py       # File validation, UUID storage, cleanup, stats & IDOR checks
│       ├── ocr_service.py            # PDF/image text extraction, regex parsing, status pipeline
│       ├── health_service.py         # Product Health score algorithm (0-100) & factors
│       └── analytics_service.py      # Aggregate analytics, trends, currency formatting & attention alerts
├── migrations/                  # Flask-Migrate / Alembic migration scripts
│   └── versions/
│       ├── fa94464b8d1d_create_users_table.py
│       ├── 76789948af1b_create_products_and_warranties_tables.py
│       ├── fc5070dec5f5_create_service_records_table.py
│       ├── b1c9a0fb55bf_create_documents_table.py
│       └── 2b1114f2cd42_create_ocr_results_table.py
├── tests/
│   ├── __init__.py
│   ├── test_auth.py             # Authentication & security test suite (19 tests)
│   ├── test_health.py           # Diagnostic health tests (6 tests)
│   ├── test_products.py         # Product CRUD & IDOR test suite (14 tests)
│   ├── test_warranties.py       # Warranty CRUD, calculations & IDOR test suite (18 tests)
│   ├── test_service_records.py  # Service Records CRUD, IDOR, cascade & stats test suite (30 tests)
│   ├── test_documents.py        # Documents upload, download, IDOR, cascade & stats test suite (32 tests)
│   ├── test_ocr.py              # OCR text extraction, entity parsing, cascade & IDOR test suite (32 tests)
│   ├── test_health_api.py       # Product Health score, deductions, boundaries & IDOR test suite (23 tests)
│   ├── test_analytics.py        # Analytics overview, trends, monetary safety & user isolation test suite (21 tests)
│   └── integration_e2e_m17.py   # Full stack live integration test suite (16 tests)
├── uploads/                     # Server-side storage directory (git-ignored)
│   └── documents/
├── .env                         # Local environment variables (DO NOT COMMIT)
├── .env.example                 # Environment variables template
├── .gitignore                   # Python, uploads and secret exclusions
├── requirements.txt             # Pinned dependencies
├── README.md                    # Backend documentation
└── run.py                       # Server entry point
```

---

## 13. Milestone 17 — Full Stack Integration

### Running Frontend and Backend Together
1. **Start Backend (Terminal 1):**
   ```powershell
   cd D:\SmartCare\backend
   .\.venv\Scripts\Activate.ps1
   python run.py
   ```
   Backend listens at: `http://127.0.0.1:5000/`

2. **Start Frontend (Terminal 2):**
   ```powershell
   cd D:\SmartCare
   npm run dev
   ```
   Frontend development server listens at: `http://localhost:5173/`

3. **Frontend API Configuration:**
   Configured via `D:\SmartCare\.env`:
   ```ini
   VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1
   ```
   All API calls route through the central `src/services/apiClient.js` client with automatic JWT token management, 401 handling, and dual-case schema adapters.

