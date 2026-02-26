import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { calculateStatus, formatTimestamp } from '../../utils/helpers';
import { AlertTriangle, Unlock, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MemberAttendanceForm({ team, onSuccess, onUnlock }) {
  const { user, userData, isAdmin } = useAuth();
  const { settings } = useSettings();
  const [memberStatus, setMemberStatus] = useState({});
  const [confirming, setConfirming] = useState(false);

  // Build list: leader + members
  const allPeople = [];
  if (team.leaderName) {
    allPeople.push({ key: 'leader', name: team.leaderName, role: 'Leader' });
  }
  (team.members || []).forEach((m, i) => {
    allPeople.push({ key: `m${i}`, name: m.name, role: m.dept || `Member ${i + 1}` });
  });

  useEffect(() => {
    const existing = team.memberAttendance || {};
    const initial = {};
    allPeople.forEach((p) => {
      initial[p.key] = existing[p.key] ?? false;
    });
    setMemberStatus(initial);
  }, [team.id, team.attendanceLocked]);

  const toggleMember = (key) => {
    if (team.attendanceLocked && !isAdmin) return;
    setMemberStatus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = (value) => {
    if (team.attendanceLocked && !isAdmin) return;
    const updated = {};
    allPeople.forEach((p) => { updated[p.key] = value; });
    setMemberStatus(updated);
  };

  const presentCount = Object.values(memberStatus).filter(Boolean).length;
  const totalMembers = allPeople.length;
  const status = calculateStatus(presentCount, totalMembers);

  // One-click: mark every member absent and save immediately
  const handleMarkAllAbsent = async () => {
    if (!settings?.attendanceEnabled && !isAdmin) {
      toast.error('Attendance window is closed. Contact admin.');
      return;
    }
    if (team.attendanceLocked && !isAdmin) {
      toast.error(`Already marked by ${team.checkedInByName}`);
      return;
    }
    if (!confirm(`Mark ALL ${totalMembers} members of "${team.teamName}" as ABSENT?`)) return;

    const absentStatus = {};
    allPeople.forEach((p) => { absentStatus[p.key] = false; });

    setConfirming(true);
    try {
      const isOverride = team.attendanceLocked && isAdmin;
      const attendanceRecord = {
        presentCount: 0,
        absentCount: totalMembers,
        attendanceStatus: 'ABSENT',
        memberAttendance: { ...absentStatus },
        checkedInBy: user.uid,
        checkedInByName: isOverride ? `${userData.name} (Override)` : userData.name,
        checkedInAt: new Date(),
        attendanceRound: settings?.currentSession || 'Default',
      };

      await updateDoc(doc(db, 'teams', team.id), {
        presentCount: 0,
        absentCount: totalMembers,
        attendanceStatus: 'ABSENT',
        memberAttendance: { ...absentStatus },
        checkedIn: true,
        checkedInBy: user.uid,
        checkedInByName: isOverride ? `${userData.name} (Override)` : userData.name,
        checkedInAt: serverTimestamp(),
        attendanceRound: settings?.currentSession || 'Default',
        attendanceLocked: true,
        attendanceRecords: arrayUnion(attendanceRecord),
        lastModified: serverTimestamp(),
      });

      setMemberStatus(absentStatus);
      toast.success(`❌ Team marked ABSENT (0/${totalMembers})`);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark absent');
    } finally {
      setConfirming(false);
    }
  };

  const handleConfirm = async () => {
    if (!settings?.attendanceEnabled && !isAdmin) {
      toast.error('Attendance window is closed. Contact admin.');
      return;
    }
    if (team.attendanceLocked && !isAdmin) {
      toast.error(`Already marked by ${team.checkedInByName}`);
      return;
    }

    setConfirming(true);
    try {
      const absentCount = totalMembers - presentCount;
      const isOverride = team.attendanceLocked && isAdmin;

      const attendanceRecord = {
        presentCount,
        absentCount,
        attendanceStatus: status,
        memberAttendance: { ...memberStatus },
        checkedInBy: user.uid,
        checkedInByName: isOverride ? `${userData.name} (Override)` : userData.name,
        checkedInAt: new Date(),
        attendanceRound: settings?.currentSession || 'Default',
      };

      await updateDoc(doc(db, 'teams', team.id), {
        presentCount,
        absentCount,
        attendanceStatus: status,
        memberAttendance: { ...memberStatus },
        checkedIn: true,
        checkedInBy: user.uid,
        checkedInByName: isOverride ? `${userData.name} (Override)` : userData.name,
        checkedInAt: serverTimestamp(),
        attendanceRound: settings?.currentSession || 'Default',
        attendanceLocked: true,
        attendanceRecords: arrayUnion(attendanceRecord),
        lastModified: serverTimestamp(),
      });

      toast.success(`✅ Attendance: ${status} (${presentCount}/${totalMembers})`);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark attendance');
    } finally {
      setConfirming(false);
    }
  };

  const handleUnlock = async () => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'teams', team.id), {
        attendanceLocked: false,
        lastModified: serverTimestamp(),
      });
      toast.success('Attendance unlocked');
      onUnlock?.();
    } catch (err) {
      toast.error('Failed to unlock');
    }
  };

  const isDisabled = team.attendanceLocked && !isAdmin;

  return (
    <div className="space-y-4">
      {/* Lock Warning */}
      {team.attendanceLocked && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-yellow-600 mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1">
              <p className="font-semibold text-yellow-800 text-sm">
                Already marked by {team.checkedInByName}
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                {formatTimestamp(team.checkedInAt)} — {team.attendanceRound}
              </p>
              {isAdmin && (
                <button
                  onClick={handleUnlock}
                  className="mt-2 flex items-center gap-1 px-3 py-1 bg-yellow-200 text-yellow-800 rounded-lg text-xs font-medium hover:bg-yellow-300 transition"
                >
                  <Unlock size={12} /> Unlock
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-600 font-medium">
          {presentCount}/{totalMembers} present —{' '}
          <span
            className={`font-bold ${
              status === 'PRESENT' ? 'text-green-600' : status === 'PARTIAL' ? 'text-yellow-600' : 'text-red-600'
            }`}
          >
            {status}
          </span>
        </p>
        {!isDisabled && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toggleAll(true)}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-medium"
            >
              All Present
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              All Absent
            </button>
            <button
              onClick={handleMarkAllAbsent}
              disabled={confirming}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
            >
              <UserX size={12} /> Mark Team Absent
            </button>
          </div>
        )}
      </div>

      {/* Member Toggle List */}
      <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
        {allPeople.map((person) => {
          const isPresent = memberStatus[person.key];
          return (
            <div
              key={person.key}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition select-none ${
                isPresent
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {/* Avatar + Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    person.key === 'leader'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {person.key === 'leader' ? 'L' : Number(person.key.replace('m', '')) + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{person.name}</p>
                  <p className="text-xs text-gray-500">{person.role}</p>
                </div>
              </div>

              {/* Status badge + action button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Explicit status label */}
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isPresent
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {isPresent ? 'PRESENT' : 'ABSENT'}
                </span>

                {/* Toggle button */}
                {!isDisabled && (
                  <button
                    onClick={() => toggleMember(person.key)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                      isPresent
                        ? 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                        : 'bg-white border-green-200 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {isPresent ? 'Mark Absent' : 'Mark Present'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Button */}
      {(!team.attendanceLocked || isAdmin) && (
        <button
          onClick={handleConfirm}
          disabled={confirming || (!settings?.attendanceEnabled && !isAdmin)}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {confirming ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              Confirming...
            </span>
          ) : team.attendanceLocked && isAdmin ? (
            '🔓 Override Attendance'
          ) : (
            `✅ Confirm (${presentCount}/${totalMembers} Present)`
          )}
        </button>
      )}
    </div>
  );
}
