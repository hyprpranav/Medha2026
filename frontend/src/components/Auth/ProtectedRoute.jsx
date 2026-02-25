import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Protect routes that require authentication
export default function ProtectedRoute({ children }) {
  const { user, loading, isApproved, userData, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading MEDHA Command Center...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If coordinator is not approved yet
  if (userData?.role === 'coordinator' && !isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Awaiting Approval</h2>
          <p className="text-gray-600 mb-4">
            Your coordinator account is pending admin approval.
            Please contact the Master Admin to get approved.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Logged in as: <strong>{user.email}</strong>
          </p>
          <button
            onClick={() => logout()}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return children;
}
