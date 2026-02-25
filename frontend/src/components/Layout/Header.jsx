import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { Menu, Wifi, WifiOff } from 'lucide-react';

export default function Header({ onMenuClick }) {
  const { userData } = useAuth();
  const { settings } = useSettings();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-800">MEDHA Command Center</h1>
          <p className="text-xs text-gray-500">Real-Time Event Control & Verification</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Attendance Window Status */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            settings?.attendanceEnabled
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {settings?.attendanceEnabled ? <Wifi size={14} /> : <WifiOff size={14} />}
          {settings?.attendanceEnabled ? 'Attendance OPEN' : 'Attendance CLOSED'}
        </div>

        {/* Current Session */}
        {settings?.currentSession && (
          <span className="hidden sm:inline-block px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            📋 {settings.currentSession}
          </span>
        )}
      </div>
    </header>
  );
}
