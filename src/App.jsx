import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicRoute from './components/common/PublicRoute';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';
import MainLayout from './components/layout/MainLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Protected App Pages
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ProductNewPage from './pages/ProductNewPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProductEditPage from './pages/ProductEditPage';
import WarrantiesPage from './pages/WarrantiesPage';
import WarrantyDetailPage from './pages/WarrantyDetailPage';
import ServiceRecordsPage from './pages/ServiceRecordsPage';
import ServiceRecordDetailPage from './pages/ServiceRecordDetailPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import OcrScannerPage from './pages/OcrScannerPage';
import QrPassportPage from './pages/QrPassportPage';
import AnalyticsPage from './pages/AnalyticsPage';
import HealthScorePage from './pages/HealthScorePage';
import RecommendationsPage from './pages/RecommendationsPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ErrorBoundary>
            <Routes>
              {/* Root redirect: ProtectedRoute will send unauthenticated to /login, else /dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Public Auth Routes */}
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* Protected Routes inside Main Application Shell */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/products/new" element={<ProductNewPage />} />
                  <Route path="/products/:id" element={<ProductDetailPage />} />
                  <Route path="/products/:id/edit" element={<ProductEditPage />} />
                  <Route path="/warranties" element={<WarrantiesPage />} />
                  <Route path="/warranties/:id" element={<WarrantyDetailPage />} />
                  <Route path="/service-records" element={<ServiceRecordsPage />} />
                  <Route path="/service-records/:id" element={<ServiceRecordDetailPage />} />
                  <Route path="/services" element={<Navigate to="/service-records" replace />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/documents/:id" element={<DocumentDetailPage />} />
                  <Route path="/ocr" element={<OcrScannerPage />} />
                  <Route path="/qr" element={<QrPassportPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/health" element={<HealthScorePage />} />
                  <Route path="/recommendations" element={<RecommendationsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>

              {/* Fallback 404 redirect */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
