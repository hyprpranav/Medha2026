import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  QrCode,
  Download,
  Mail,
  Settings,
  Bell,
  LogOut,
  X,
  Shield,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'coordinator'] },
  { to: '/teams', icon: Users, label: 'Teams', roles: ['admin', 'coordinator'] },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance', roles: ['admin', 'coordinator'] },
  { to: '/qr', icon: QrCode, label: 'QR Scanner', roles: ['admin', 'coordinator'] },
  { to: '/export', icon: Download, label: 'Export', roles: ['admin', 'coordinator'] },
  { to: '/email', icon: Mail, label: 'Email', roles: ['admin'] },
  { to: '/notifications', icon: Bell, label: 'Notifications', roles: ['admin', 'coordinator'] },
  { to: '/admin', icon: Shield, label: 'Admin Panel', roles: ['admin'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
];

export default function Sidebar({ open, onClose }) {
  const { userData, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) =>
    item.roles.includes(userData?.role)
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div>
              <h2 className="font-bold text-sm">MEDHA CC</h2>
              <p className="text-xs text-slate-400">Command Center</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-slate-700">
          <p className="text-sm font-medium truncate">{userData?.name || 'User'}</p>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          <span
            className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-medium ${
              userData?.role === 'admin'
                ? 'bg-blue-600/20 text-blue-400'
                : 'bg-green-600/20 text-green-400'
            }`}
          >
            {userData?.role === 'admin' ? '🟢 Master Admin' : '🔵 Coordinator'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="p-2 flex-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition mb-1 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-600/10 transition"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
