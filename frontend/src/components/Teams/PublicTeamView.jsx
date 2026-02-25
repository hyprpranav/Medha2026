import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { getStatusColor, getStatusIcon } from '../../utils/helpers';

// Public team view — accessible via QR scan
export default function PublicTeamView() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isCoordinator } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeam();
  }, [teamId]);

  const loadTeam = async () => {
    try {
      const snap = await getDoc(doc(db, 'teams', teamId));
      if (snap.exists()) {
        setTeam({ id: snap.id, ...snap.data() });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Team Not Found</h2>
          <p className="text-gray-500">This QR code may be invalid or the team was removed.</p>
        </div>
      </div>
    );
  }

  // Logged-in users see full details, public sees limited
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="font-bold text-sm">M</span>
            </div>
            <span className="text-sm text-blue-200">MEDHA 2026</span>
          </div>
          <h1 className="text-2xl font-bold">{team.teamName}</h1>
          <p className="text-blue-200 mt-1">{team.collegeName}</p>
        </div>

        {/* Status Badge */}
        <div className={`rounded-xl p-4 mb-4 border ${getStatusColor(team.attendanceStatus)}`}>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">
              {getStatusIcon(team.attendanceStatus)} {team.attendanceStatus || 'NOT MARKED'}
            </span>
            <span className="text-sm">
              {team.presentCount ?? 0} / {team.totalMembers || 0} present
            </span>
          </div>
        </div>

        {/* Team Info */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Team Details</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Leader:</span> {team.leaderName}</p>
            <p><span className="text-gray-500">Members:</span> {team.totalMembers}</p>
            <p><span className="text-gray-500">Track:</span> {team.track}</p>
            {team.projectTitle && (
              <p><span className="text-gray-500">Project:</span> {team.projectTitle}</p>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Members</h3>
          <div className="space-y-2">
            {(team.members || []).map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">{i + 1}</span>
                <span className="font-medium">{m.name}</span>
                <span className="text-gray-400 text-xs">{m.dept}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Logged-in Actions */}
        {isLoggedIn && (isAdmin || isCoordinator) && (
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/attendance?team=${team.id}`)}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition text-center"
            >
              Mark Attendance
            </button>
            <button
              onClick={() => navigate(`/teams`)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition text-center"
            >
              View All Teams
            </button>
          </div>
        )}

        {/* Not logged in */}
        {!isLoggedIn && (
          <div className="text-center mt-4">
            <p className="text-sm text-gray-500 mb-3">Login to mark attendance or edit team details</p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
            >
              Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
