import React, { useState, useMemo } from 'react';
import { useTeams } from '../../hooks/useTeams';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import TeamDetails from './TeamDetails';
import { Search, Users, Edit3, QrCode, ClipboardCheck } from 'lucide-react';
import { getStatusColor, getStatusIcon, formatTimestamp, debounce } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';

export default function TeamList() {
  const { teams, loading, hasMore, loadMore, searchTerm, setSearchTerm, filter, setFilter } = useTeams();
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const [selectedTeam, setSelectedTeam] = useState(null);
  const navigate = useNavigate();

  const handleSearch = useMemo(() => debounce((val) => setSearchTerm(val), 300), [setSearchTerm]);

  const filters = [
    { value: 'all', label: 'All Teams' },
    { value: 'present', label: '✅ Present' },
    { value: 'partial', label: '⚠️ Partial' },
    { value: 'absent', label: '❌ Absent' },
    { value: 'not-marked', label: '⏳ Not Marked' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">Teams</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{teams.length} teams shown</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search teams by name..."
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Team Table */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Users size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No teams found</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Team Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">College</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Members</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Marked By</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team, idx) => (
                    <tr
                      key={team.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => setSelectedTeam(team)}
                    >
                      <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{team.teamName}</p>
                        <p className="text-xs text-gray-500">{team.leaderName}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell text-xs">
                        {team.collegeName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {team.presentCount ?? '—'} / {team.totalMembers || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(team.attendanceStatus)}`}>
                          {getStatusIcon(team.attendanceStatus)} {team.attendanceStatus || 'NOT MARKED'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                        {team.checkedInByName || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedTeam(team)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition"
                            title="View/Edit"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => navigate(`/attendance?team=${team.id}`)}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition"
                            title="Mark Attendance"
                          >
                            <ClipboardCheck size={15} />
                          </button>
                          <button
                            onClick={() => navigate(`/qr?team=${team.id}`)}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition"
                            title="QR Code"
                          >
                            <QrCode size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Load More Teams
              </button>
            </div>
          )}
        </>
      )}

      {/* Team Details Modal */}
      {selectedTeam && (
        <TeamDetails
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
}
