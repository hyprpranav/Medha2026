import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Users, ClipboardCheck, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const { userData } = useAuth();
  const { settings } = useSettings();
  const [stats, setStats] = useState({
    totalTeams: 0,
    present: 0,
    partial: 0,
    absent: 0,
    notMarked: 0,
    totalMembers: 0,
    totalPresent: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchStats();
  }, [settings?.currentSession]);

  const fetchStats = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'teams'));
      const teams = snapshot.docs.map((d) => d.data());

      const totalTeams = teams.length;
      const present = teams.filter((t) => t.attendanceStatus === 'PRESENT').length;
      const partial = teams.filter((t) => t.attendanceStatus === 'PARTIAL').length;
      const absent = teams.filter((t) => t.attendanceStatus === 'ABSENT').length;
      const notMarked = teams.filter((t) => !t.checkedIn).length;
      // boysCount + girlsCount includes the leader — totalMembers only counts the members array
      const totalMembers = teams.reduce((sum, t) => sum + (t.boysCount || 0) + (t.girlsCount || 0), 0);
      const totalPresent = teams.reduce((sum, t) => sum + (t.presentCount || 0), 0);

      setStats({ totalTeams, present, partial, absent, notMarked, totalMembers, totalPresent });

      // Recent attendance activity
      const recent = teams
        .filter((t) => t.checkedInAt)
        .sort((a, b) => {
          const aTime = a.checkedInAt?.seconds || 0;
          const bTime = b.checkedInAt?.seconds || 0;
          return bTime - aTime;
        })
        .slice(0, 5);
      setRecentActivity(recent);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const statCards = [
    { label: 'Total Teams', value: stats.totalTeams, icon: Users, color: 'bg-blue-500', lightColor: 'bg-blue-50 text-blue-700' },
    { label: 'Present', value: stats.present, icon: CheckCircle, color: 'bg-green-500', lightColor: 'bg-green-50 text-green-700' },
    { label: 'Partial', value: stats.partial, icon: AlertTriangle, color: 'bg-yellow-500', lightColor: 'bg-yellow-50 text-yellow-700' },
    { label: 'Absent', value: stats.absent, icon: XCircle, color: 'bg-red-500', lightColor: 'bg-red-50 text-red-700' },
    { label: 'Not Marked', value: stats.notMarked, icon: Clock, color: 'bg-gray-500', lightColor: 'bg-gray-50 text-gray-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">Welcome, {userData?.name}!</h2>
        <p className="text-blue-200 mt-1">
          {userData?.role === 'admin' ? 'Master Admin Dashboard' : 'Coordinator Dashboard'} — MEDHA 2026
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="bg-white/10 rounded-lg px-4 py-2">
            <span className="text-sm text-blue-200">Session</span>
            <p className="font-semibold">{settings?.currentSession || 'Not Set'}</p>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-2">
            <span className="text-sm text-blue-200">Attendance</span>
            <p className="font-semibold">{settings?.attendanceEnabled ? '🟢 Open' : '🔴 Closed'}</p>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-2">
            <span className="text-sm text-blue-200">Total Participants</span>
            <p className="font-semibold">{stats.totalPresent} / {stats.totalMembers} present</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-lg ${card.lightColor} flex items-center justify-center mb-3`}>
              <card.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">Attendance Progress</h3>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${stats.totalTeams ? (stats.present / stats.totalTeams) * 100 : 0}%` }}
            />
            <div
              className="bg-yellow-500 transition-all"
              style={{ width: `${stats.totalTeams ? (stats.partial / stats.totalTeams) * 100 : 0}%` }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${stats.totalTeams ? (stats.absent / stats.totalTeams) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="flex gap-6 mt-3 text-sm text-gray-600">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Present</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded-full"></span> Partial</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Absent</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-300 rounded-full"></span> Not Marked</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">Recent Attendance Activity</h3>
        {recentActivity.length === 0 ? (
          <p className="text-gray-500 text-sm">No attendance records yet.</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((team, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{team.teamName}</p>
                  <p className="text-xs text-gray-500">By {team.checkedInByName}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                    team.attendanceStatus === 'PRESENT' ? 'bg-green-100 text-green-700' :
                    team.attendanceStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {team.attendanceStatus}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {team.checkedInAt?.seconds
                      ? new Date(team.checkedInAt.seconds * 1000).toLocaleTimeString('en-IN')
                      : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
