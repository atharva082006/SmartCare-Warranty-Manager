# SmartCare Warranty Manager — Production Deployment & Release Guide

This guide provides end-to-end instructions for deploying the **SmartCare Warranty & Service Record Manager** to a production or demonstration environment. It is tailored for both local Windows production-like demonstrations (e.g. college viva / demo) and standard Linux/Docker production servers.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Environment Separation & Variables](#2-environment-separation--variables)
3. [PostgreSQL Database Provisioning](#3-postgresql-database-provisioning)
4. [Database Migrations](#4-database-migrations)
5. [Persistent File Storage Setup](#5-persistent-file-storage-setup)
6. [OCR / Tesseract Dependencies](#6-ocr--tesseract-dependencies)
7. [Production Backend Server (Waitress / Gunicorn)](#7-production-backend-server-waitress--gunicorn)
8. [Production Frontend Build & Hosting](#8-production-frontend-build--hosting)
9. [CORS Configuration](#9-cors-configuration)
10. [Database Backup & Restore Procedure](#10-database-backup--restore-procedure)
11. [Document Binary Storage Backup](#11-document-binary-storage-backup)
12. [Health Checks & Monitoring](#12-health-checks--monitoring)
13. [Security Architecture & Checklist](#13-security-architecture--checklist)
14. [Troubleshooting Common Deployment Issues](#14-troubleshooting-common-deployment-issues)
15. [Production Smoke Testing](#15-production-smoke-testing)

---

## 1. Architecture Overview

SmartCare is structured as a decoupled client-server web application:

```
+-------------------------------------------------------------+
|                      React SPA Client                       |
|         Vite + React 19 + React Router 7 + Custom CSS       |
|               (Production Static Assets / dist)             |
+-------------------------------------------------------------+
                               |
                   HTTP REST APIs + Bearer JWT
                               v
+-------------------------------------------------------------+
|                     Flask Backend API                       |
|         WSGI Server: Waitress (Windows) / Gunicorn (Linux)   |
|         - Flask-JWT-Extended (Stateless Bearer Tokens)      |
|         - Flask-CORS (Restricted Origin Whitelist)          |
|         - PyMuPDF + pytesseract (Text & Entity Extraction)  |
+-------------------------------------------------------------+
                 /                           \
                v                             v
+-----------------------------+   +---------------------------+
|     PostgreSQL Database     |   |  Persistent Storage Vol   |
|   Users, Products, Policies |   |  backend/uploads/documents|
|   Service Records, OCR Data |   |  (Physical PDF/Images)    |
+-----------------------------+   +---------------------------+
```

---

## 2. Environment Separation & Variables

### A. Frontend Environment (`.env`)

In development, the frontend connects to the local development server. In production, set `VITE_API_BASE_URL` to your production API domain.

**Development (`.env`):**
```ini
VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1
```

**Production (`.env`):**
```ini
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
```

> **Security Rule:** Never store secrets, passwords, or private API keys in `VITE_*` environment variables. All `VITE_*` variables are statically embedded into public JavaScript bundles during `npm run build`.

---

### B. Backend Environment (`backend/.env`)

Configure the following variables in `backend/.env`. A clean template is provided in `backend/.env.example`.

```ini
# Server Mode ('production' or 'development')
FLASK_ENV=production

# Cryptographic Application Secret (Generate via: python -c "import secrets; print(secrets.token_hex(32))")
SECRET_KEY=replace-with-a-random-64-character-hex-secret

# JWT Signing Key (Must be distinct and private)
JWT_SECRET_KEY=replace-with-another-random-64-character-hex-secret

# Token Lifespan (Default: 1 day)
JWT_ACCESS_TOKEN_EXPIRES_DAYS=1

# PostgreSQL Connection URI (Format: postgresql+psycopg2://USER:PASSWORD@HOST:PORT/DB_NAME)
DATABASE_URL=postgresql+psycopg2://postgres:your_secure_password@localhost:5432/smartcare

# File Upload Directory (Relative to backend or absolute path)
UPLOAD_FOLDER=uploads

# Allowed Frontend Origins (Comma-separated for multiple domains)
CORS_ORIGINS=https://yourdomain.com,http://localhost:5173
FRONTEND_URL=https://yourdomain.com

# Server Binding
HOST=127.0.0.1
PORT=5000

# Optional: Tesseract OCR Binary Path (Leave empty if on system PATH)
# Windows Example: C:\Program Files\Tesseract-OCR\tesseract.exe
# Linux Example: /usr/bin/tesseract
TESSERACT_CMD=
```

---

## 3. PostgreSQL Database Provisioning

SmartCare requires a running PostgreSQL instance (PostgreSQL 14 or higher).

### Step 1: Create Database
Log into PostgreSQL via `psql`:
```bash
psql -U postgres
```
Execute:
```sql
CREATE DATABASE smartcare;
\q
```

### Step 2: Verify Connection
Test connection with psycopg2:
```bash
python -c "import psycopg2; conn = psycopg2.connect('postgresql://postgres:your_password@localhost:5432/smartcare'); print('Connected:', conn.status)"
```

---

## 4. Database Migrations

SmartCare uses **Flask-Migrate** (Alembic) to manage database schema versions without data loss.

### Apply Migrations to Target Database
From `D:\SmartCare\backend`:
```powershell
# Windows
.\.venv\Scripts\flask --app run:app db upgrade

# Linux / Mac
flask --app run:app db upgrade
```

### Verify Migration Status
Confirm the current database version matches head:
```powershell
.\.venv\Scripts\flask --app run:app db current
.\.venv\Scripts\flask --app run:app db heads
```
Both commands should return the exact same revision identifier (e.g., `2b1114f2cd42 (head)`).

---

## 5. Persistent File Storage Setup

SmartCare stores physical document attachments (PDFs, warranty receipts, invoices) on disk.

1. **Storage Directory Structure:**
   ```
   backend/
     uploads/
       documents/     <-- Physical files stored with UUID filenames
   ```
2. **Persistence Guarantee:**
   - In containerized deployments (Docker/Kubernetes), mount `backend/uploads` as a **persistent volume**.
   - If using cloud instances (AWS EC2, DigitalOcean Droplet), ensure the upload directory is on attached persistent block storage.
   - Files are stored with secure random UUID names (e.g. `899e4b2415134f14bb86c7bc6e702882.pdf`) preventing filename collisions and directory traversal attacks.

---

## 6. OCR / Tesseract Dependencies

SmartCare features an automated OCR extraction pipeline:
- **Digital PDFs**: Extracted natively in-memory using `PyMuPDF (fitz)` without requiring external binaries.
- **Scanned Images & Photos**: Processed through `pytesseract` and Google Tesseract OCR.

### Installing Tesseract OCR (Optional but Recommended)
- **Windows**: Download the official installer from [UB-Mannheim Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki).
  - Install to `C:\Program Files\Tesseract-OCR`.
  - Add to system `PATH` or set `TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe` in `backend/.env`.
- **Ubuntu/Debian Linux**:
  ```bash
  sudo apt-get update && sudo apt-get install -y tesseract-ocr tesseract-ocr-eng
  ```
- **Graceful Fallback**: If Tesseract is not installed on the host, the application remains fully functional. Non-OCR features operate normally, and OCR image endpoints return controlled HTTP 503 responses without application crashes.

---

## 7. Production Backend Server (Waitress / Gunicorn)

**Never use `flask run` or `python run.py` (Flask Development Server) in production.** The development server is single-threaded and not designed for concurrent production traffic.

### Option A: Windows / Local Production Demo (Waitress)

Install Waitress in the virtual environment:
```powershell
.\.venv\Scripts\pip install waitress
```

Launch the production WSGI server:
```powershell
.\.venv\Scripts\waitress-serve --listen=127.0.0.1:5000 run:app
```
Waitress provides a lightweight, multi-threaded production server natively compatible with Windows.

---

### Option B: Linux Production Server (Gunicorn)

Install Gunicorn:
```bash
pip install gunicorn
```

Launch Gunicorn with 4 worker processes:
```bash
gunicorn -w 4 -b 0.0.0.0:5000 run:app
```

Recommended systemd service file (`/etc/systemd/system/smartcare.service`):
```ini
[Unit]
Description=SmartCare Flask WSGI Service
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/smartcare/backend
Environment="PATH=/var/www/smartcare/backend/.venv/bin"
EnvironmentFile=/var/www/smartcare/backend/.env
ExecStart=/var/www/smartcare/backend/.venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 run:app
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 8. Production Frontend Build & Hosting

### Step 1: Compile the Production Bundle
From `D:\SmartCare`:
```bash
npm run build
```
This generates optimized, minified production assets in the `dist/` directory.

### Step 2: Serve the Static Assets

#### Option 1: Local Preview / Testing
```bash
npm run preview
```

#### Option 2: Nginx Web Server (Linux Production)
Example Nginx configuration block (`/etc/nginx/sites-available/smartcare`):
```nginx
server {
    listen 80;
    server_name smartcare.yourdomain.com;

    # Frontend Static SPA
    location / {
        root /var/www/smartcare/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Reverse Proxy to Flask API
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 9. CORS Configuration

In production, CORS is restricted to your authorized frontend domains to prevent unauthorized cross-origin API abuse.

- **Environment Variable**: `CORS_ORIGINS` (in `backend/.env`)
- **Single Domain Example**:
  ```ini
  CORS_ORIGINS=https://smartcare.yourdomain.com
  ```
- **Multiple Domains Example**:
  ```ini
  CORS_ORIGINS=https://smartcare.yourdomain.com,https://admin.yourdomain.com
  ```
- The backend automatically supports preflight `OPTIONS` requests and enforces `credentials: true`.

---

## 10. Database Backup & Restore Procedure

> **Critical Notice:** A database backup **alone** does not contain uploaded document files (PDFs/Images). Both the PostgreSQL database AND the physical upload directory must be backed up together.

### Step 1: Database Backup (pg_dump)
Generate a timestamped custom-format archive:
```bash
# Windows / Linux
pg_dump -U postgres -h localhost -F c -b -v -f "smartcare_backup_%DATE%.dump" smartcare
```

### Step 2: Database Restore (pg_restore)
To restore a backup into a fresh database:
```bash
# 1. Recreate clean database
dropdb -U postgres smartcare
createdb -U postgres smartcare

# 2. Restore schema and data
pg_restore -U postgres -h localhost -d smartcare -v "smartcare_backup_filename.dump"
```

---

## 11. Document Binary Storage Backup

Physical document uploads live in `backend/uploads/documents/`.

### Backup Procedure
Archive the upload directory to a separate storage location:
```powershell
# Windows PowerShell
Compress-Archive -Path D:\SmartCare\backend\uploads\documents -DestinationPath "D:\Backups\smartcare_documents_$(Get-Date -Format 'yyyyMMdd').zip"

# Linux
tar -czvf /backups/smartcare_documents_$(date +%Y%m%d).tar.gz /var/www/smartcare/backend/uploads/documents
```

---

## 12. Health Checks & Monitoring

SmartCare exposes two lightweight, unauthenticated health check endpoints designed for uptime monitoring and load balancers:

| Endpoint | Purpose | Expected Status |
| :--- | :--- | :--- |
| `GET /api/v1/health` | Verifies Flask process is responsive | `200 OK` (`{"status": "ok", "service": "SmartCare API"}`) |
| `GET /api/v1/health/db` | Verifies PostgreSQL connectivity | `200 OK` (`{"status": "ok", "database": "connected"}`) |

Neither endpoint exposes database credentials, usernames, connection strings, or system paths.

---

## 13. Security Architecture & Checklist

### Security Guarantees
1. **Zero-JWT-in-URLs**:
   - Access tokens are transmitted exclusively via `Authorization: Bearer <JWT>` HTTP request headers.
   - Attempting to pass tokens via query parameters (`?token=`, `?jwt=`) is strictly rejected with HTTP 401.
2. **Document Streaming Security**:
   - Document viewing and downloading utilizes authenticated binary blob streams (`responseType: blob`).
   - Temporary in-memory Blob Object URLs (`URL.createObjectURL(blob)`) are created and revoked immediately after use.
3. **IDOR & Multi-Tenant Data Isolation**:
   - Every product, warranty, service record, document, and OCR result is verified against `current_user.id` on every query.
   - Unauthorized access attempts return HTTP 404 Not Found to prevent resource enumeration.
4. **Automated Security Headers**:
   - `X-Content-Type-Options: nosniff` (Mitigates MIME-sniffing exploits on user uploads)
   - `X-Frame-Options: SAMEORIGIN` (Mitigates clickjacking)
   - `Referrer-Policy: strict-origin-when-cross-origin` (Protects sensitive origin references)

---

## 14. Troubleshooting Common Deployment Issues

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `500 Internal Server Error` on startup | Database unreachable or bad connection string | Verify PostgreSQL service is running and credentials in `backend/.env` are correct. Test via `python -c "import psycopg2; psycopg2.connect(...)"`. |
| `CORS Error: Origin not allowed` | Frontend domain missing from `CORS_ORIGINS` | Add the frontend domain to `CORS_ORIGINS` in `backend/.env` and restart the backend. |
| `413 Request Entity Too Large` | Upload file exceeds 10 MB | Client submitted a file > 10 MB. Advise user to compress the PDF or image. |
| `OCR failed: Tesseract not found` | Tesseract binary path not detected | Install Tesseract OCR or set `TESSERACT_CMD` in `backend/.env`. Digital PDFs will still extract text via PyMuPDF. |
| `Blank White Screen on Frontend` | JavaScript runtime error | The global `<ErrorBoundary>` catches React crashes. Open Developer Tools console to view the normalized `ApiError` code. |

---

## 15. Production Smoke Testing

Before declaring deployment complete, run the automated smoke test suite:

```powershell
cd D:\SmartCare\backend
.\.venv\Scripts\python tests\smoke_test_m19.py
```

This automated test validates all 18 production verification points in under 3 seconds:
- Service health & DB connection
- Security response headers
- Frontend production build integrity
- User registration & JWT generation
- Product, warranty, service record creation
- Multipart document upload & Bearer binary streaming
- Zero-JWT query token rejection
- OCR fallback handling
- Product health scoring & analytics aggregations
- Session termination & cascade resource cleanup
