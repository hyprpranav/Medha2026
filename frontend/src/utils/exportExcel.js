// Excel (XLSX) Export utility for MEDHA Command Center
import * as XLSX from 'xlsx';

// Admin full export
export function exportExcelAdmin(teams, filename = 'medha_admin_export.xlsx') {
  const wb = XLSX.utils.book_new();

  // Main sheet - all teams
  const mainData = teams.map((team) => ({
    'Team Name': team.teamName || '',
    'College': team.collegeName || '',
    'Leader Name': team.leaderName || '',
    'Leader Email': team.leaderEmail || '',
    'Leader Phone': team.leaderPhone || '',
    'Total Members': team.totalMembers || 0,
    'Members': (team.members || []).map((m) => m.name).join(', '),
    'Present Count': team.presentCount ?? '',
    'Absent Count': team.absentCount ?? '',
    'Attendance Status': team.attendanceStatus || 'NOT MARKED',
    'Checked In': team.checkedIn ? 'Yes' : 'No',
    'Marked By': team.checkedInByName || '',
    'Marked At': formatTs(team.checkedInAt),
    'Session': team.attendanceRound || '',
    'Locked': team.attendanceLocked ? 'Yes' : 'No',
    'QR Generated': team.qrToken ? 'Yes' : 'No',
    'Track': team.track || '',
    'Project Title': team.projectTitle || '',
    'Last Modified': formatTs(team.lastModified),
  }));

  const ws1 = XLSX.utils.json_to_sheet(mainData);
  XLSX.utils.book_append_sheet(wb, ws1, 'All Teams');

  // Attendance Records sheet
  const attendanceData = [];
  teams.forEach((team) => {
    (team.attendanceRecords || []).forEach((rec) => {
      attendanceData.push({
        'Team Name': team.teamName || '',
        'Session': rec.attendanceRound || '',
        'Present Count': rec.presentCount || 0,
        'Absent Count': rec.absentCount || 0,
        'Status': rec.attendanceStatus || '',
        'Marked By': rec.checkedInByName || '',
        'Marked At': formatTs(rec.checkedInAt),
      });
    });
  });

  if (attendanceData.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(attendanceData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Attendance Records');
  }

  // Summary sheet
  const total = teams.length;
  const present = teams.filter((t) => t.attendanceStatus === 'PRESENT').length;
  const partial = teams.filter((t) => t.attendanceStatus === 'PARTIAL').length;
  const absent = teams.filter((t) => t.attendanceStatus === 'ABSENT').length;
  const notMarked = teams.filter((t) => !t.checkedIn).length;

  const summaryData = [
    { 'Metric': 'Total Teams', 'Count': total },
    { 'Metric': 'Present', 'Count': present },
    { 'Metric': 'Partial', 'Count': partial },
    { 'Metric': 'Absent', 'Count': absent },
    { 'Metric': 'Not Marked', 'Count': notMarked },
    { 'Metric': 'Export Date', 'Count': new Date().toLocaleString('en-IN') },
  ];

  const ws3 = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws3, 'Summary');

  XLSX.writeFile(wb, filename);
}

// Coordinator limited export
export function exportExcelCoordinator(teams, filename = 'medha_coordinator_export.xlsx') {
  const wb = XLSX.utils.book_new();

  const data = teams.map((team) => ({
    'Team Name': team.teamName || '',
    'Total Members': team.totalMembers || 0,
    'Present Count': team.presentCount ?? '',
    'Attendance Status': team.attendanceStatus || 'NOT MARKED',
    'Session': team.attendanceRound || '',
    'Marked At': formatTs(team.checkedInAt),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Teams');

  XLSX.writeFile(wb, filename);
}

function formatTs(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return date.toLocaleString('en-IN');
}

// Certificate download sheet
export function exportCertificateSheet(teams, filename = 'medha_certificates.xlsx') {
  const wb = XLSX.utils.book_new();

  const data = teams.map((team, idx) => {
    const members = team.members || [];
    const row = {
      'S.No': idx + 1,
      'Team ID': team.id || '',
      'Team Name': team.teamName || '',
      'College Name': team.collegeName || '',
      'Leader Name': team.leaderName || '',
    };
    for (let i = 0; i < 4; i++) {
      row[`Member ${i + 1}`] = members[i]?.name || '';
    }
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 6 },   // S.No
    { wch: 22 },  // Team ID
    { wch: 28 },  // Team Name
    { wch: 30 },  // College Name
    { wch: 22 },  // Leader Name
    { wch: 22 },  // Member 1
    { wch: 22 },  // Member 2
    { wch: 22 },  // Member 3
    { wch: 22 },  // Member 4
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Certificates');
  XLSX.writeFile(wb, filename);
}
