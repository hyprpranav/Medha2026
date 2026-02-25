import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';

// Auth
import Login from './components/Auth/Login';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import RoleGuard from './components/Auth/RoleGuard';

// Layout
import Layout from './components/Layout/Layout';

// Pages
import AdminDashboard from './components/Dashboard/AdminDashboard';
import TeamList from './components/Teams/TeamList';
import PublicTeamView from './components/Teams/PublicTeamView';
import AttendancePanel from './components/Attendance/AttendancePanel';
import QRPanel from './components/QR/QRPanel';
import ExportPanel from './components/Export/ExportPanel';
import EmailPanel from './components/Email/EmailPanel';
import NotificationPanel from './components/Notifications/NotificationPanel';
import AdminPanel from './components/Admin/AdminPanel';
import SettingsPanel from './components/Admin/SettingsPanel';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              background: '#1e293b',
              color: '#fff',
              fontSize: '0.875rem',
            },
          }}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/team/:teamId" element={<PublicTeamView />} />

          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/teams" element={<TeamList />} />
            <Route path="/attendance" element={<AttendancePanel />} />
            <Route path="/qr" element={<QRPanel />} />
            <Route path="/export" element={<ExportPanel />} />
            <Route path="/notifications" element={<NotificationPanel />} />

            {/* Admin-only Routes */}
            <Route
              path="/email"
              element={
                <RoleGuard requiredRole="admin">
                  <EmailPanel />
                </RoleGuard>
              }
            />
            <Route
              path="/admin"
              element={
                <RoleGuard requiredRole="admin">
                  <AdminPanel />
                </RoleGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <RoleGuard requiredRole="admin">
                  <SettingsPanel />
                </RoleGuard>
              }
            />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
