const fs = require('fs');
const path = require('path');

const dir = 'd:/SmartCare/src/pages';
const authDir = 'd:/SmartCare/src/pages/auth';

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

const pages = [
  { name: 'DashboardPage', title: 'Dashboard', text: 'Manage your dashboard here.' },
  { name: 'ProductsPage', title: 'Products', text: 'Manage your products here.' },
  { name: 'ProductNewPage', title: 'Add New Product', text: 'Add a new product here.' },
  { name: 'WarrantiesPage', title: 'Warranties', text: 'Manage your warranties here.' },
  { name: 'ServiceRecordsPage', title: 'Service Records', text: 'Manage your service records here.' },
  { name: 'DocumentsPage', title: 'Documents', text: 'Manage your documents here.' },
  { name: 'OcrScannerPage', title: 'OCR Scanner', text: 'Scan your documents here.' },
  { name: 'QrPassportPage', title: 'QR Product Passport', text: 'Manage QR passports here.' },
  { name: 'AnalyticsPage', title: 'Analytics', text: 'View analytics here.' },
  { name: 'HealthScorePage', title: 'Health Score', text: 'View health scores here.' },
  { name: 'RecommendationsPage', title: 'Recommendations', text: 'View recommendations here.' },
  { name: 'NotificationsPage', title: 'Notifications', text: 'View notifications here.' },
  { name: 'ReportsPage', title: 'Reports', text: 'View reports here.' },
  { name: 'SettingsPage', title: 'Settings', text: 'Manage settings here.' },
];

pages.forEach(p => {
  const content = `import React from 'react';
import './pages.css';

const ${p.name} = () => {
  return (
    <div className="page ${p.name}">
      <h1>${p.title}</h1>
      <p>${p.text}</p>
    </div>
  );
};

export default ${p.name};
`;
  fs.writeFileSync(path.join(dir, p.name + '.jsx'), content);
});

const paramPages = [
  { name: 'ProductDetailPage', title: 'Product Details' },
  { name: 'ProductEditPage', title: 'Edit Product' },
];

paramPages.forEach(p => {
  const content = `import React from 'react';
import { useParams } from 'react-router-dom';
import './pages.css';

const ${p.name} = () => {
  const { id } = useParams();
  return (
    <div className="page ${p.name}">
      <h1>${p.title}</h1>
      <p>Viewing details for product ID: {id}</p>
    </div>
  );
};

export default ${p.name};
`;
  fs.writeFileSync(path.join(dir, p.name + '.jsx'), content);
});

const loginContent = `import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../pages.css';

const LoginPage = () => {
  const navigate = useNavigate();
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Sign in to SmartCare</h1>
        <p>This will be built in the next milestone.</p>
        <button className="auth-button" onClick={() => navigate('/dashboard')}>Login (Demo)</button>
        <Link className="auth-link" to="/register">Don't have an account? Register</Link>
      </div>
    </div>
  );
};

export default LoginPage;
`;

fs.writeFileSync(path.join(authDir, 'LoginPage.jsx'), loginContent);

const registerContent = `import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../pages.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p>This will be built in the next milestone.</p>
        <button className="auth-button" onClick={() => navigate('/dashboard')}>Register (Demo)</button>
        <Link className="auth-link" to="/login">Already have an account? Sign in</Link>
      </div>
    </div>
  );
};

export default RegisterPage;
`;

fs.writeFileSync(path.join(authDir, 'RegisterPage.jsx'), registerContent);
