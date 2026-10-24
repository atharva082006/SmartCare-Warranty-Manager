import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './MainLayout.css';

export default function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleOpenMobileMenu = () => {
    setIsMobileMenuOpen(true);
  };

  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="main-layout">
      <Sidebar 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={handleCloseMobileMenu}
      />
      
      <div className={`layout-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Topbar 
          onMenuClick={handleOpenMobileMenu}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
