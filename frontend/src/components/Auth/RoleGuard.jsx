import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Guard routes that require a specific role
export default function RoleGuard({ requiredRole, children }) {
  const { userData, loading } = useAuth();

  if (loading) return null;

  if (requiredRole === 'admin' && userData?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
