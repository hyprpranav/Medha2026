import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettings } from '../../hooks/useSettings';
import { useTeams } from '../../hooks/useTeams';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getStatusColor, getStatusIcon } from '../../utils/helpers';
import { Search, Lock } from 'lucide-react';
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Team Selection */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Select Team</h3>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search team..."
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto space-y-1">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => selectTeam(team)}
                className={`w-full text-left p-3 rounded-lg text-sm transition ${
                  selectedTeam?.id === team.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <p className="font-medium text-gray-800">{team.teamName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(team.attendanceStatus)}`}>
                    {getStatusIcon(team.attendanceStatus)} {team.attendanceStatus || 'N/A'}
                  </span>
                  {team.attendanceLocked && <Lock size={12} className="text-gray-400" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Attendance Form */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
          {!selectedTeam ? (
            <div className="text-center py-12">
              <ClipboardCheck size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Select a team to mark attendance</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selectedTeam.teamName}</h3>
                <p className="text-sm text-gray-500">{selectedTeam.collegeName}</p>
              </div>
              <MemberAttendanceForm
                team={selectedTeam}
                onSuccess={handleRefresh}
                onUnlock={handleRefresh}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClipboardCheck(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>
    </svg>
  );
}
