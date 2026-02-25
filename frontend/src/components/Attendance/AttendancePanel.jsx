import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { useTeams } from '../../hooks/useTeams';
import { doc, updateDoc, arrayUnion, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { calculateStatus, getStatusColor, getStatusIcon, formatTimestamp } from '../../utils/helpers';
import { Search, AlertTriangle, Lock, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AttendancePanel() {
  const { user, userData, isAdmin } = useAuth();
  const { settings } = useSettings();
  const { teams, searchTerm, setSearchTerm, filter, setFilter } = useTeams();
  const [searchParams] = useSearchParams();
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [presentCount, setPresentCount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [teamData, setTeamData] = useState(null);

  // If teamId is in URL, auto-select that team
  useEffect(() => {
    const teamId = searchParams.get('team');
    if (teamId) {
      loadTeam(teamId);
    }
  }, [searchParams]);

  const loadTeam = async (teamId) => {
    const snap = await getDoc(doc(db, 'teams', teamId));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() };
      setSelectedTeam(data);
      setTeamData(data);
      setPresentCount(data.presentCount || 0);
    }
  };

  const selectTeam = (team) => {
    setSelectedTeam(team);
    setTeamData(team);
    setPresentCount(team.presentCount || 0);
  };

  const handleConfirmAttendance = async () => {
    if (!selectedTeam) return;

    // Check if attendance window is enabled
    if (!settings?.attendanceEnabled && !isAdmin) {
      toast.error('Attendance window is closed. Contact admin.');
      return;
    }

    // Check for duplicate marking
    if (selectedTeam.attendanceLocked && !isAdmin) {
      toast.error(`⚠ Already marked by ${selectedTeam.checkedInByName} at ${formatTimestamp(selectedTeam.checkedInAt)}`);
      return;
    }

    setConfirming(true);
    try {
      const totalMembers = selectedTeam.totalMembers || 0;
      const absentCount = totalMembers - presentCount;
      const status = calculateStatus(presentCount, totalMembers);

      const attendanceRecord = {
        presentCount,
        absentCount,
        attendanceStatus: status,
        checkedInBy: user.uid,
        checkedInByName: userData.name,
        checkedInAt: new Date(),
        attendanceRound: settings?.currentSession || 'Default',
      };

      await updateDoc(doc(db, 'teams', selectedTeam.id), {
        presentCount,
        absentCount,
        attendanceStatus: status,
        checkedIn: true,
        checkedInBy: user.uid,
        checkedInByName: userData.name,
        checkedInAt: serverTimestamp(),
        attendanceRound: settings?.currentSession || 'Default',
        attendanceLocked: true,
        attendanceRecords: arrayUnion(attendanceRecord),
        lastModified: serverTimestamp(),
      });

      toast.success(`✅ Attendance marked: ${status} (${presentCount}/${totalMembers})`);
      // Reload team data
      await loadTeam(selectedTeam.id);
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark attendance');
    } finally {
      setConfirming(false);
    }
  };

  const handleUnlock = async (teamId) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        attendanceLocked: false,
        lastModified: serverTimestamp(),
      });
      toast.success('Attendance unlocked for re-marking');
      await loadTeam(teamId);
    } catch (err) {
      toast.error('Failed to unlock');
    }
  };

  const handleOverride = async () => {
    if (!isAdmin) return;
    // Admin can override — doesn't check lock
    await handleConfirmAttendanceForce();
  };

  const handleConfirmAttendanceForce = async () => {
    if (!selectedTeam) return;
    setConfirming(true);
    try {
      const totalMembers = selectedTeam.totalMembers || 0;
      const absentCount = totalMembers - presentCount;
      const status = calculateStatus(presentCount, totalMembers);

      const attendanceRecord = {
        presentCount,
        absentCount,
        attendanceStatus: status,
        checkedInBy: user.uid,
        checkedInByName: `${userData.name} (Override)`,
        checkedInAt: new Date(),
        attendanceRound: settings?.currentSession || 'Default',
      };

      await updateDoc(doc(db, 'teams', selectedTeam.id), {
        presentCount,
        absentCount,
        attendanceStatus: status,
        checkedIn: true,
        checkedInBy: user.uid,
        checkedInByName: `${userData.name} (Override)`,
        checkedInAt: serverTimestamp(),
        attendanceRound: settings?.currentSession || 'Default',
        attendanceLocked: true,
        attendanceRecords: arrayUnion(attendanceRecord),
        lastModified: serverTimestamp(),
      });

      toast.success(`✅ Attendance overridden: ${status}`);
      await loadTeam(selectedTeam.id);
    } catch (err) {
      toast.error('Override failed');
    } finally {
      setConfirming(false);
    }
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
            <div className="space-y-6">
              {/* Team Info */}
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selectedTeam.teamName}</h3>
                <p className="text-sm text-gray-500">{selectedTeam.collegeName}</p>
                <p className="text-sm text-gray-500">Leader: {selectedTeam.leaderName}</p>
              </div>

              {/* Duplicate Warning */}
              {selectedTeam.attendanceLocked && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
                    <div>
                      <p className="font-semibold text-yellow-800">
                        ⚠ Already marked by {selectedTeam.checkedInByName}
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        at {formatTimestamp(selectedTeam.checkedInAt)} — {selectedTeam.attendanceRound}
                      </p>
                      {isAdmin && (
                        <button
                          onClick={() => handleUnlock(selectedTeam.id)}
                          className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-yellow-200 text-yellow-800 rounded-lg text-xs font-medium hover:bg-yellow-300 transition"
                        >
                          <Unlock size={14} /> Unlock for Re-marking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">
                  Members ({selectedTeam.totalMembers || 0})
                </h4>
                <div className="space-y-1">
                  {(selectedTeam.members || []).map((m, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                      <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">{i + 1}</span>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-gray-400 text-xs">{m.dept}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Present Count */}
              <div>
                <label className="block font-semibold text-gray-700 mb-2">
                  Present Count
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setPresentCount(Math.max(0, presentCount - 1))}
                    disabled={selectedTeam.attendanceLocked && !isAdmin}
                    className="w-10 h-10 rounded-full bg-red-100 text-red-600 font-bold text-lg hover:bg-red-200 transition disabled:opacity-50"
                  >
                    −
                  </button>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-gray-800">{presentCount}</span>
                    <span className="text-gray-400 text-lg"> / {selectedTeam.totalMembers || 0}</span>
                  </div>
                  <button
                    onClick={() => setPresentCount(Math.min(selectedTeam.totalMembers || 0, presentCount + 1))}
                    disabled={selectedTeam.attendanceLocked && !isAdmin}
                    className="w-10 h-10 rounded-full bg-green-100 text-green-600 font-bold text-lg hover:bg-green-200 transition disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Status: <strong>{calculateStatus(presentCount, selectedTeam.totalMembers || 0)}</strong>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                {(!selectedTeam.attendanceLocked || isAdmin) && (
                  <button
                    onClick={selectedTeam.attendanceLocked && isAdmin ? handleOverride : handleConfirmAttendance}
                    disabled={confirming || (!settings?.attendanceEnabled && !isAdmin)}
                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {confirming ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        Confirming...
                      </span>
                    ) : selectedTeam.attendanceLocked && isAdmin ? (
                      '🔓 Override Attendance'
                    ) : (
                      '✅ Confirm Attendance'
                    )}
                  </button>
                )}
              </div>
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
