import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  FiMenu,
  FiSearch,
  FiBell,
  FiUser,
  FiSettings,
  FiLogOut,
  FiChevronDown,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { notificationService } from '../../services/notificationService';
import ConfirmDialog from '../common/ConfirmDialog/ConfirmDialog';
import './Topbar.css';

/* Map route paths to human-readable page titles */
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/products/new': 'Add New Product',
  '/warranties': 'Warranties',
  '/services': 'Service Records',
  '/documents': 'Documents',
  '/ocr': 'OCR Scanner',
  '/qr': 'QR Product Passport',
  '/analytics': 'Analytics',
  '/health': 'Health Score',
  '/recommendations': 'Recommendations',
  '/notifications': 'Notifications',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.match(/^\/products\/[^/]+\/edit$/)) return 'Edit Product';
  if (pathname.match(/^\/products\/[^/]+$/)) return 'Product Details';
  return 'SmartCare';
}

export default function Topbar({ onMenuClick, isSidebarCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success, info } = useToast();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  const menuRef = useRef(null);
  const pageTitle = getPageTitle(location.pathname);

  // Fetch unread notifications count from service
  useEffect(() => {
    notificationService.getUnreadCount()
      .then((count) => setUnreadCount(count))
      .catch(() => {});
  }, [location.pathname]);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      success('Logged out successfully.');
      setIsLogoutDialogOpen(false);
      navigate('/login');
    } catch {
      info('Session ended.');
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = user?.fullName || 'Vinay Raykar';
  const displayRole = user?.role || 'Admin';
  const initials = user?.avatarInitials || 'VR';

  return (
    <>
      <header className={`topbar ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="topbar-left">
          <button
            className="mobile-menu-btn"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <FiMenu />
          </button>
          <div className="page-title-area">
            <h1 className="page-title">{pageTitle}</h1>
          </div>
        </div>

        <div className="topbar-right">
          {/* Quick Search */}
          <button
            className="topbar-action-btn"
            aria-label="Search products"
            title="Search products"
            onClick={() => navigate('/products')}
          >
            <FiSearch />
          </button>

          {/* Notifications Bell */}
          <button
            className="topbar-action-btn notification-btn"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => navigate('/notifications')}
          >
            <FiBell />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {/* User Profile Menu */}
          <div className="user-profile-wrapper" ref={menuRef}>
            <button
              type="button"
              className="user-profile-trigger"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
              aria-label="User account menu"
            >
              <div className="avatar">{initials}</div>
              <div className="user-profile-info-compact">
                <span className="user-display-name">{displayName}</span>
                <span className="user-role-badge">{displayRole}</span>
              </div>
              <FiChevronDown className={`menu-chevron ${isUserMenuOpen ? 'open' : ''}`} />
            </button>

            {isUserMenuOpen && (
              <div className="user-dropdown-menu" role="menu">
                <div className="user-dropdown-header">
                  <div className="avatar-lg">{initials}</div>
                  <div className="user-dropdown-details">
                    <p className="dropdown-user-name">{displayName}</p>
                    <p className="dropdown-user-email">{user?.email || 'vinay@smartcare.io'}</p>
                  </div>
                </div>

                <div className="user-dropdown-divider" />

                <Link
                  to="/settings"
                  className="user-dropdown-item"
                  role="menuitem"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <FiUser className="dropdown-item-icon" />
                  <span>My Profile</span>
                </Link>

                <Link
                  to="/settings"
                  className="user-dropdown-item"
                  role="menuitem"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <FiSettings className="dropdown-item-icon" />
                  <span>Settings & Preferences</span>
                </Link>

                <div className="user-dropdown-divider" />

                <button
                  type="button"
                  className="user-dropdown-item item-danger"
                  role="menuitem"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsLogoutDialogOpen(true);
                  }}
                >
                  <FiLogOut className="dropdown-item-icon" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleLogoutConfirm}
        title="Sign Out of SmartCare"
        message="Are you sure you want to sign out? Your changes and local data are safely saved."
        confirmText="Sign Out"
        confirmVariant="danger"
        loading={isLoggingOut}
      />
    </>
  );
}
