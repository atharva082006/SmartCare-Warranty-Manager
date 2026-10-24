import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner/LoadingSpinner';

export default function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage text="Loading..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}
