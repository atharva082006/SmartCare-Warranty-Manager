# SmartCare Warranty & Service Record Manager

A modern, full-stack web application designed for managing household appliances, electronics, warranty policies, maintenance histories, and receipt documents with optical character recognition (OCR) and deterministic health scoring.

---

## Project Structure

```
SmartCare/
├── backend/                       # Flask REST API Backend (Python 3.12)
│   ├── app/                       # Application Factory, Routes, Models, Services
│   │   ├── models/                # SQLAlchemy Models (User, Product, Warranty, Service, Document, OCR)
│   │   ├── routes/                # REST API Endpoints (/api/v1/...)
│   │   └── services/              # Domain Services (Auth, Product, Health, OCR, Analytics)
│   ├── migrations/                # Alembic Database Migrations
│   ├── tests/                     # Unit, Integration, Resilience, & Smoke Test Suites
│   ├── uploads/                   # Uploaded Document Binaries (documents/)
│   ├── .env.example               # Backend Environment Template
│   ├── requirements.txt           # Python Production Dependencies
│   └── run.py                     # WSGI Entry Point
│
├── src/                           # React SPA Frontend (React 19 + Vite + React Router 7)
│   ├── components/                # Reusable UI Primitives, Domain Cards, Form Modals
│   ├── contexts/                  # AuthContext, ToastContext
│   ├── pages/                     # 16 Domain Pages (Dashboard, Products, Warranties, OCR, Analytics...)
│   ├── services/                  # Native Fetch API Client, Service Layer
│   └── utils/                     # Formatters, Validators, Health Score Algorithm
│
├── dist/                          # Production Static Build Directory (npm run build)
├── .env.example                   # Frontend Environment Template
├── DEPLOYMENT.md                  # Comprehensive Production Deployment Guide
└── package.json                   # Node.js Dependencies & Build Scripts
```

---

## Quick Start (Development)

### 1. Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.10+ (Python 3.12 recommended)
- **PostgreSQL** 14+ running locally on port `5432`

---

### 2. Backend Setup
1. Navigate to the backend directory:
   ```powershell
   cd D:\SmartCare\backend
   ```
2. Activate the virtual environment:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
3. Copy environment configuration and configure your PostgreSQL password:
   ```powershell
   copy .env.example .env
   ```
4. Apply database migrations:
   ```powershell
   python -m flask --app run:app db upgrade
   ```
5. Start the backend development server:
   ```powershell
   python run.py
   ```
   API runs at `http://127.0.0.1:5000/api/v1`.

---

### 3. Frontend Setup
1. In the project root (`D:\SmartCare`):
   ```bash
   npm install
   ```
2. Copy frontend environment template:
   ```powershell
   copy .env.example .env
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Web interface opens at `http://localhost:5173`.

---

## Production Deployment & Release

For full production deployment instructions, WSGI server configurations (Waitress for Windows, Gunicorn for Linux), Nginx reverse proxy configs, database backup procedures, and security guidelines, see:

📖 **[Full Production Deployment Guide (DEPLOYMENT.md)](./DEPLOYMENT.md)**

---

## Key Features

- **JWT Authentication & Multi-Tenancy**: Secure password hashing with bcrypt; isolated user data.
- **Product & Warranty Lifecycle Management**: Automatic product codes, expiration countdowns, status calculation.
- **Maintenance Records & Cost Tracking**: Service history tracking, total repair expense analytics.
- **Secure Document Vault**: Authenticated binary streaming via Bearer token headers (zero tokens in URLs).
- **OCR Text & Entity Extraction**: Automated parsing of invoices, receipts, and warranty cards via PyMuPDF and Tesseract.
- **Deterministic Product Health Scoring**: 0–100 reliability index evaluating appliance age, repair frequency, and warranty coverage.
- **Resilient UI Architecture**: Global React `<ErrorBoundary>`, normalized `<ErrorState>` cards with in-memory retry, and double-click submission guards.

---

## Running Verification Tests

SmartCare includes four automated test suites ensuring zero regressions:

| Suite | Command | Coverage |
| :--- | :--- | :--- |
| **Backend Unit & Integration** | `pytest -v` (in `backend/`) | 206 tests passing |
| **M17 Live Integration** | `python tests/integration_e2e_m17.py` | 17 live test flows |
| **M18 Resilience & Hardening** | `python tests/integration_e2e_m18.py` | 12 error & resilience tests |
| **M19 Production Smoke Test** | `python tests/smoke_test_m19.py` | 18 production checkpoints |
| **Frontend Production Build** | `npm run build` (in root) | 0 compilation errors |
