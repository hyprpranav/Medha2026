import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

// Public team view — accessible via QR scan (Google Lens, phone camera, or in-app scanner)
export default function PublicTeamView() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isCoordinator } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTeam(); }, [teamId]);

  const loadTeam = async () => {
    try {
      const snap = await getDoc(doc(db, 'teams', teamId));
      if (snap.exists()) setTeam({ id: snap.id, ...snap.data() });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  );

  if (!team) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center text-white">
        <p className="text-5xl mb-4">🔍</p>
        <h2 className="text-2xl font-bold mb-2">Team Not Found</h2>
        <p className="text-slate-400">This QR code is invalid or the team was removed.</p>
      </div>
    </div>
  );

  const isLoggedIn = !!user;
  const isStaff = isAdmin || isCoordinator;

  // Attendance status display
  const statusInfo = {
    PRESENT:  { bg: 'bg-green-500/20',  border: 'border-green-500', text: 'text-green-400',  label: '✅ PRESENT',  },
    PARTIAL:  { bg: 'bg-yellow-500/20', border: 'border-yellow-500',text: 'text-yellow-400', label: '⚠️ PARTIAL',  },
    ABSENT:   { bg: 'bg-red-500/20',    border: 'border-red-500',   text: 'text-red-400',    label: '❌ ABSENT',   },
  }[team.attendanceStatus] || { bg: 'bg-slate-700', border: 'border-slate-600', text: 'text-slate-300', label: '⏳ NOT MARKED' };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-lg mx-auto p-4 pb-10">

        {/* MEDHA Banner */}
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 bg-blue-600 rounded-full px-4 py-1.5 text-sm font-medium mb-3">
            <span className="w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">M</span>
            MEDHA 2026
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{team.teamName}</h1>
          <p className="text-slate-400 mt-1 text-sm">{team.collegeName}</p>
        </div>

        {/* Attendance Status */}
        <div className={`rounded-2xl p-4 border mb-4 ${statusInfo.bg} ${statusInfo.border}`}>
          <div className="flex items-center justify-between">
            <span className={`text-lg font-bold ${statusInfo.text}`}>{statusInfo.label}</span>
            <span className="text-slate-300 text-sm">
              {team.presentCount ?? 0} / {team.totalMembers || 0} present
            </span>
          </div>
        </div>

        {/* Project Info */}
        <div className="bg-slate-800 rounded-2xl p-5 mb-4 border border-slate-700">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Project</h2>
          <p className="text-lg font-bold text-white">{team.projectTitle || '—'}</p>
          <p className="text-sm text-blue-400 mt-1">{team.track || '—'}</p>
        </div>

        {/* Team Members */}
        <div className="bg-slate-800 rounded-2xl p-5 mb-4 border border-slate-700">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Team Members ({team.totalMembers || (team.members || []).length})
          </h2>
          <div className="space-y-3">
            {(team.members || []).length > 0 ? (
              (team.members || []).map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-white">{m.name}</p>
                    {m.dept && <p className="text-xs text-slate-400">{m.dept}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm">Member details not available</p>
            )}
          </div>
        </div>

        {/* Leader Info */}
        <div className="bg-slate-800 rounded-2xl p-5 mb-6 border border-slate-700">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Team Leader</h2>
          <p className="font-semibold">{team.leaderName}</p>
          {isStaff && (
            <>
              <p className="text-sm text-slate-400 mt-1">{team.leaderEmail}</p>
              <p className="text-sm text-slate-400">{team.leaderPhone}</p>
            </>
          )}
        </div>

        {/* STAFF ACTIONS — only shown when logged in as admin/coordinator */}
        {isLoggedIn && isStaff && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 uppercase tracking-widest text-center mb-2">Staff Actions</p>
            <button
              onClick={() => navigate(`/attendance?team=${team.id}`)}
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition"
            >
              ✅ Mark Attendance
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate(`/teams`)}
                className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition text-sm"
              >
                📋 All Teams
              </button>
              <button
                onClick={() => navigate(`/qr?team=${team.id}`)}
                className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition text-sm"
              >
                🔲 QR Code
              </button>
            </div>
            {isAdmin && (
              <button
                onClick={() => navigate(`/teams?edit=${team.id}`)}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition text-sm"
              >
                ✏️ Edit Team Details
              </button>
            )}
          </div>
        )}

        {/* PUBLIC — not logged in */}
        {!isLoggedIn && (
          <div className="text-center mt-2">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <p className="text-slate-400 text-sm mb-4">Staff? Login to mark attendance or edit team details.</p>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              >
                Staff Login
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-slate-600 text-xs mt-8">MEDHA 2026 — Kongunadu College of Engineering & Technology</p>
      </div>
    </div>
  );
}
