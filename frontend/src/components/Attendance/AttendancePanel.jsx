import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettings } from '../../hooks/useSettings';
import { useTeams } from '../../hooks/useTeams';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getStatusColor, getStatusIcon } from '../../utils/helpers';
import { Search, Lock, X } from 'lucide-react';
import MemberAttendanceForm from './MemberAttendanceForm';

export default function AttendancePanel() {
  const { settings } = useSettings();
  const { teams, setSearchTerm } = useTeams();
  const [searchParams] = useSearchParams();
  const [selectedTeam, setSelectedTeam] = useState(null);

  // If teamId is in URL, auto-select that team
  useEffect(() => {
    const teamId = searchParams.get('team');
    if (teamId) loadTeam(teamId);
  }, [searchParams]);

  const loadTeam = async (teamId) => {
    const snap = await getDoc(doc(db, 'teams', teamId));
    if (snap.exists()) {
      setSelectedTeam({ id: snap.id, ...snap.data() });
    }
  };

  const selectTeam = (team) => setSelectedTeam(team);

  const handleRefresh = () => {
    if (selectedTeam) loadTeam(selectedTeam.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Attendance</h2>
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
          settings?.attendanceEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {settings?.attendanceEnabled ? '🟢 Window Open' : '🔴 Window Closed'}
          {settings?.currentSession && ` — ${settings.currentSession}`}
        </div>
      </div>

      {/* Team Selection List */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search team..."
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="max-h-[65vh] overflow-y-auto space-y-1">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => selectTeam(team)}
              className="w-full text-left p-3 rounded-lg text-sm transition hover:bg-gray-50 border border-transparent flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600 font-mono">{team.id}</span>
                  <p className="font-medium text-gray-800">{team.teamName}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{team.collegeName}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(team.attendanceStatus)}`}>
                  {getStatusIcon(team.attendanceStatus)} {team.attendanceStatus || 'N/A'}
                </span>
                {team.attendanceLocked && <Lock size={12} className="text-gray-400" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Attendance Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded">{selectedTeam.id}</span>
                  <h3 className="text-lg font-bold text-gray-800">{selectedTeam.teamName}</h3>
                </div>
                <p className="text-sm text-gray-500">{selectedTeam.collegeName}</p>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <MemberAttendanceForm
                team={selectedTeam}
                onSuccess={() => { handleRefresh(); setSelectedTeam(null); }}
                onUnlock={handleRefresh}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
