import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FiHome, FiBox, FiShield, FiTool, FiFolder, 
  FiCamera, FiSmartphone, FiBarChart2, FiActivity, 
  FiZap, FiBell, FiFileText, FiSettings, 
  FiChevronLeft, FiChevronRight, FiX
} from 'react-icons/fi';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: FiHome },
  { path: '/products', label: 'Products', icon: FiBox },
  { path: '/warranties', label: 'Warranties', icon: FiShield },
  { path: '/service-records', label: 'Service Records', icon: FiTool },
  { path: '/documents', label: 'Documents', icon: FiFolder },
  { path: '/ocr', label: 'OCR Scanner', icon: FiCamera },
  { path: '/qr', label: 'QR Passport', icon: FiSmartphone },
  { path: '/analytics', label: 'Analytics', icon: FiBarChart2 },
  { path: '/health', label: 'Health Score', icon: FiActivity },
  { path: '/recommendations', label: 'Recommendations', icon: FiZap },
  { path: '/notifications', label: 'Notifications', icon: FiBell },
  { path: '/reports', label: 'Reports', icon: FiFileText },
  { path: '/settings', label: 'Settings', icon: FiSettings },
];

export default function Sidebar({ 
  isCollapsed, 
  onToggleCollapse, 
  isMobileOpen, 
  onCloseMobile 
}) {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${isMobileOpen ? 'open' : ''}`}
        onClick={onCloseMobile}
        role="presentation"
        aria-hidden="true"
      />

      {/* Sidebar Content */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-logo">SC</div>
            <span className="brand-text">SmartCare</span>
          </div>
          <button 
            className="mobile-close-btn"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
          >
            <FiX />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main Navigation">
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.path} className="nav-item">
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onCloseMobile}
                  title={item.label}
                >
                  <item.icon className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button 
            className="collapse-toggle-btn desktop-only"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>
      </aside>
    </>
  );
}
