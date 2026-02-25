import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTeams } from '../../hooks/useTeams';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { X, Save, Trash2, UserPlus, ArrowRightLeft, ClipboardList } from 'lucide-react';
import { formatTimestamp, getStatusColor, getStatusIcon } from '../../utils/helpers';
import MemberAttendanceForm from '../Attendance/MemberAttendanceForm';
import toast from 'react-hot-toast';

export default function TeamDetails({ team: initialTeam, onClose }) {
  const { isAdmin, isCoordinator } = useAuth();
  const { updateTeam, deleteTeam } = useTeams();

  const [team, setTeam] = useState(initialTeam);
  const [editing, setEditing] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [formData, setFormData] = useState({
    teamName: team.teamName || '',
    leaderName: team.leaderName || '',
    leaderEmail: team.leaderEmail || '',
    leaderPhone: team.leaderPhone || '',
    members: [...(team.members || [])],
  });
  const [swapMode, setSwapMode] = useState(false);
  const [swapIndices, setSwapIndices] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTeam(team.id, {
        teamName: formData.teamName,
        teamNameLower: formData.teamName.toLowerCase(),
        leaderName: formData.leaderName,
        leaderEmail: formData.leaderEmail,
        leaderPhone: formData.leaderPhone,
        members: formData.members,
        totalMembers: formData.members.length,
      });
      toast.success('Team updated successfully!');
      setEditing(false);
    } catch (err) {
      toast.error('Failed to update team');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this team? This cannot be undone.')) return;
    try {
      await deleteTeam(team.id);
      toast.success('Team deleted');
      onClose();
    } catch (err) {
      toast.error('Failed to delete team');
    }
  };

  const handleMemberChange = (index, field, value) => {
    const newMembers = [...formData.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setFormData({ ...formData, members: newMembers });
  };

  const handleSwap = () => {
    if (swapIndices.length === 2) {
      const newMembers = [...formData.members];
      [newMembers[swapIndices[0]], newMembers[swapIndices[1]]] = [newMembers[swapIndices[1]], newMembers[swapIndices[0]]];
      setFormData({ ...formData, members: newMembers });
      setSwapIndices([]);
      setSwapMode(false);
      toast.success('Members swapped!');
    }
  };

  const toggleSwapSelect = (idx) => {
    if (swapIndices.includes(idx)) {
      setSwapIndices(swapIndices.filter((i) => i !== idx));
    } else if (swapIndices.length < 2) {
      const newIndices = [...swapIndices, idx];
      setSwapIndices(newIndices);
      if (newIndices.length === 2) {
        // Auto-swap when 2 selected
        setTimeout(() => {
          const m = [...formData.members];
          [m[newIndices[0]], m[newIndices[1]]] = [m[newIndices[1]], m[newIndices[0]]];
          setFormData({ ...formData, members: m });
          setSwapIndices([]);
          setSwapMode(false);
          toast.success('Members swapped!');
        }, 300);
      }
    }
  };

  const refreshTeam = async () => {
    try {
      const snap = await getDoc(doc(db, 'teams', team.id));
      if (snap.exists()) {
        setTeam({ id: snap.id, ...snap.data() });
      }
    } catch (err) {
      console.error('Failed to refresh team:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{team.teamName}</h3>
            <p className="text-sm text-gray-500">{team.collegeName}</p>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (isAdmin || isCoordinator) && (
              <button
                onClick={() => setShowAttendance(true)}
                className="px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition flex items-center gap-1"
              >
                <ClipboardList size={14} /> Attendance
              </button>
            )}
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
              >
                Edit
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleDelete}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                title="Delete Team"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 transition">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Attendance Status */}
          <div className={`p-4 rounded-xl border ${getStatusColor(team.attendanceStatus)}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg">{getStatusIcon(team.attendanceStatus)}</span>
                <span className="font-semibold ml-2">{team.attendanceStatus || 'NOT MARKED'}</span>
              </div>
              <div className="text-right text-sm">
                <p>Present: <strong>{team.presentCount ?? '—'}</strong> / {team.totalMembers || 0}</p>
              </div>
            </div>
            {team.checkedInByName && (
              <p className="text-xs mt-2 opacity-75">
                Marked by {team.checkedInByName} • {formatTimestamp(team.checkedInAt)}
                {team.attendanceRound && ` • ${team.attendanceRound}`}
              </p>
            )}
            {team.attendanceLocked && (
              <p className="text-xs mt-1 font-medium">🔒 Attendance Locked</p>
            )}
          </div>

          {/* Team Leader Info */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">Team Leader</h4>
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={formData.leaderName}
                  onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Leader Name"
                />
                <input
                  value={formData.leaderEmail}
                  onChange={(e) => setFormData({ ...formData, leaderEmail: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Email"
                />
                <input
                  value={formData.leaderPhone}
                  onChange={(e) => setFormData({ ...formData, leaderPhone: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Phone"
                />
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                <p><span className="text-gray-500">Name:</span> {team.leaderName}</p>
                {isAdmin && <p><span className="text-gray-500">Email:</span> {team.leaderEmail}</p>}
                {isAdmin && <p><span className="text-gray-500">Phone:</span> {team.leaderPhone}</p>}
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-700">
                Members ({formData.members.length})
              </h4>
              {editing && (
                <button
                  onClick={() => setSwapMode(!swapMode)}
                  className={`flex items-center gap-1 px-3 py-1 text-xs rounded-lg transition ${
                    swapMode ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ArrowRightLeft size={14} />
                  {swapMode ? 'Select 2 members to swap' : 'Swap Members'}
                </button>
              )}
            </div>

            <div className="space-y-2">
              {formData.members.map((member, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                    swapMode && swapIndices.includes(idx)
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-gray-100 bg-gray-50'
                  } ${swapMode ? 'cursor-pointer' : ''}`}
                  onClick={() => swapMode && toggleSwapSelect(idx)}
                >
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                    {idx + 1}
                  </span>
                  {editing && !swapMode ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        value={member.name || ''}
                        onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                        className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Member Name"
                      />
                      <input
                        value={member.dept || ''}
                        onChange={(e) => handleMemberChange(idx, 'dept', e.target.value)}
                        className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Year & Dept"
                      />
                    </div>
                  ) : (
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.dept}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Project Info */}
          {team.projectTitle && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Project</h4>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium">{team.projectTitle}</p>
                <p className="text-gray-500 mt-1">Track: {team.track}</p>
              </div>
            </div>
          )}

          {/* Attendance Records */}
          {(team.attendanceRecords || []).length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Attendance History</h4>
              <div className="space-y-2">
                {team.attendanceRecords.map((rec, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <span className="font-medium">{rec.attendanceRound}</span>
                      <p className="text-xs text-gray-500">By {rec.checkedInByName}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rec.attendanceStatus)}`}>
                        {rec.attendanceStatus}
                      </span>
                      <p className="text-xs text-gray-400">{rec.presentCount}/{team.totalMembers}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save / Cancel buttons */}
          {editing && (
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => { setEditing(false); setSwapMode(false); setSwapIndices([]); }}
                className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Attendance Overlay Modal */}
        {showAttendance && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between rounded-t-2xl z-10">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Mark Attendance</h3>
                  <p className="text-sm text-gray-500">{team.teamName}</p>
                </div>
                <button
                  onClick={() => setShowAttendance(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                <MemberAttendanceForm
                  team={team}
                  onSuccess={() => { refreshTeam(); setShowAttendance(false); }}
                  onUnlock={refreshTeam}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
