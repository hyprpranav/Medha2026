import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import toast from 'react-hot-toast';

export default function SettingsPanel() {
  const { isAdmin } = useAuth();
  const { settings, updateSettings } = useSettings();

  if (!isAdmin) return <div className="text-center py-12 text-gray-500">Admin access required</div>;

  const handleAddSession = () => {
    const name = prompt('Enter session name:');
    if (name && name.trim()) {
      const sessions = [...(settings?.sessions || []), name.trim()];
      updateSettings({ sessions });
      toast.success(`Session "${name.trim()}" added`);
    }
  };

  const handleRemoveSession = (session) => {
    if (!confirm(`Remove session "${session}"?`)) return;
    const sessions = (settings?.sessions || []).filter((s) => s !== session);
    updateSettings({ sessions });
    toast.success(`Session "${session}" removed`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Settings</h2>

      {/* Session Management */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Attendance Sessions</h3>
        <div className="space-y-2 mb-4">
          {(settings?.sessions || ['Morning', 'Afternoon', 'Final']).map((s) => (
            <div key={s} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-800">{s}</span>
              <div className="flex items-center gap-2">
                {settings?.currentSession === s && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Active</span>
                )}
                <button
                  onClick={() => handleRemoveSession(s)}
                  className="text-xs text-red-500 hover:text-red-700 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddSession}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
        >
          + Add Session
        </button>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4">System Info</h3>
        <div className="space-y-2 text-sm">
          <p><span className="text-gray-500">System:</span> MEDHA Command Center v1.0</p>
          <p><span className="text-gray-500">Event:</span> MEDHA 2026</p>
          <p><span className="text-gray-500">Attendance:</span> {settings?.attendanceEnabled ? '🟢 Open' : '🔴 Closed'}</p>
          <p><span className="text-gray-500">Current Session:</span> {settings?.currentSession || 'Not set'}</p>
        </div>
      </div>
    </div>
  );
}
