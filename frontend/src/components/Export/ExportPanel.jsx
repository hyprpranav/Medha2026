import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { useTeams } from '../../hooks/useTeams';
import { exportCSV } from '../../utils/exportCSV';
import { exportXML } from '../../utils/exportXML';
import { exportExcelAdmin, exportExcelCoordinator, exportCertificateSheet } from '../../utils/exportExcel';
import { Download, FileText, FileSpreadsheet, FileCode, Award } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExportPanel() {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const { getAllTeams } = useTeams();
  const [exporting, setExporting] = useState(false);
  const [selectedSession, setSelectedSession] = useState('All');
  const [exportingCert, setExportingCert] = useState(false);

  const sessions = ['All', ...(settings?.sessions || ['Morning', 'Afternoon', 'Final'])];

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const teams = await getAllTeams();

      if (teams.length === 0) {
        toast.error('No teams to export');
        setExporting(false);
        return;
      }

      const timestamp = new Date().toISOString().slice(0, 10);

      switch (format) {
        case 'csv': {
          const data = teams.map((team) => {
            const base = {
              'Team Name': team.teamName || '',
              'Total Members': team.totalMembers || 0,
              'Present Count': team.presentCount ?? '',
              'Attendance Status': team.attendanceStatus || 'NOT MARKED',
              'Session': team.attendanceRound || '',
              'Marked At': team.checkedInAt?.seconds
                ? new Date(team.checkedInAt.seconds * 1000).toLocaleString('en-IN')
                : '',
            };
            if (isAdmin) {
              return {
                ...base,
                'College': team.collegeName || '',
                'Leader Name': team.leaderName || '',
                'Leader Email': team.leaderEmail || '',
                'Leader Phone': team.leaderPhone || '',
                'Marked By': team.checkedInByName || '',
                'Locked': team.attendanceLocked ? 'Yes' : 'No',
                'Track': team.track || '',
                'Project Title': team.projectTitle || '',
              };
            }
            return base;
          });
          exportCSV(data, `medha_export_${timestamp}.csv`);
          break;
        }
        case 'xml': {
          exportXML(teams, selectedSession, `medha_export_${timestamp}.xml`);
          break;
        }
        case 'excel': {
          if (isAdmin) {
            exportExcelAdmin(teams, `medha_admin_export_${timestamp}.xlsx`);
          } else {
            exportExcelCoordinator(teams, `medha_coordinator_export_${timestamp}.xlsx`);
          }
          break;
        }
      }

      toast.success(`${format.toUpperCase()} exported successfully!`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleCertificateExport = async () => {
    setExportingCert(true);
    try {
      const allTeams = await getAllTeams();
      // Include all teams that were marked present in selected session (or all if 'All')
      const teams = allTeams.filter((t) => {
        if (selectedSession !== 'All' && t.attendanceRound !== selectedSession) return false;
        return true; // include all teams regardless of status
      });
      if (teams.length === 0) {
        toast.error('No teams found for export');
        return;
      }
      const timestamp = new Date().toISOString().slice(0, 10);
      exportCertificateSheet(teams, `medha_certificates_${timestamp}.xlsx`);
      toast.success(`Certificate sheet exported (${teams.length} teams)`);
    } catch (err) {
      console.error(err);
      toast.error('Certificate export failed');
    } finally {
      setExportingCert(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Export Data</h2>

      {/* Session Filter */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-3">Session Filter</h3>
        <div className="flex gap-2 flex-wrap">
          {sessions.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSession(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedSession === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CSV */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">CSV Export</h3>
          <p className="text-sm text-gray-500 mb-4">
            {isAdmin ? 'Full team data with all fields' : 'Limited team summary'}
          </p>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="w-full py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50"
          >
            <Download size={16} className="inline mr-1" /> Download CSV
          </button>
        </div>

        {/* XML */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
          <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileCode size={28} className="text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">XML Export</h3>
          <p className="text-sm text-gray-500 mb-4">
            Session-wise structured XML export
          </p>
          <button
            onClick={() => handleExport('xml')}
            disabled={exporting}
            className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition disabled:opacity-50"
          >
            <Download size={16} className="inline mr-1" /> Download XML
          </button>
        </div>

        {/* Excel */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
          <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet size={28} className="text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Excel Export</h3>
          <p className="text-sm text-gray-500 mb-4">
            {isAdmin ? 'Multi-sheet workbook (Teams + Attendance + Summary)' : 'Single sheet summary'}
          </p>
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Download size={16} className="inline mr-1" /> Download Excel
          </button>
        </div>

        {/* Certificate Sheet */}
        <div className="bg-white rounded-xl border border-amber-100 p-6 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Award size={28} className="text-amber-600" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Certificate Sheet</h3>
          <p className="text-sm text-gray-500 mb-4">
            S.No, Team ID, Team Name, College, Leader &amp; Members
          </p>
          <button
            onClick={handleCertificateExport}
            disabled={exportingCert}
            className="w-full py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition disabled:opacity-50"
          >
            <Download size={16} className="inline mr-1" /> Download Certificates
          </button>
        </div>
      </div>

      {/* Export Info */}
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700 mb-2">Export Details:</p>
        <ul className="list-disc pl-5 space-y-1">
          {isAdmin ? (
            <>
              <li>Full team list with leader contact info</li>
              <li>Complete attendance records with timestamps</li>
              <li>Coordinator who marked each team</li>
              <li>Session-wise breakdown</li>
              <li>QR generation timestamps</li>
            </>
          ) : (
            <>
              <li>Team name and attendance status</li>
              <li>Present count per team</li>
              <li>Session round and timestamp</li>
              <li className="text-red-500">Leader contact info not included</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
