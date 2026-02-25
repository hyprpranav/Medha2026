// XML Export utility for MEDHA Command Center

export function exportXML(teams, session = 'All', filename = 'medha_export.xml') {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<medhaEvent>\n';

  if (session === 'All') {
    // Group by attendance sessions
    const sessions = {};
    teams.forEach((team) => {
      const records = team.attendanceRecords || [];
      if (records.length === 0) {
        if (!sessions['Unmarked']) sessions['Unmarked'] = [];
        sessions['Unmarked'].push(team);
      } else {
        records.forEach((rec) => {
          const s = rec.attendanceRound || 'Unknown';
          if (!sessions[s]) sessions[s] = [];
          sessions[s].push({ ...team, _record: rec });
        });
      }
    });

    Object.entries(sessions).forEach(([sessionName, sessionTeams]) => {
      xml += `  <session name="${escapeXml(sessionName)}">\n`;
      sessionTeams.forEach((team) => {
        xml += teamToXml(team, team._record);
      });
      xml += '  </session>\n';
    });
  } else {
    xml += `  <session name="${escapeXml(session)}">\n`;
    teams.forEach((team) => {
      const record = (team.attendanceRecords || []).find(
        (r) => r.attendanceRound === session
      );
      xml += teamToXml(team, record);
    });
    xml += '  </session>\n';
  }

  xml += '</medhaEvent>';

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function teamToXml(team, record) {
  const presentCount = record?.presentCount ?? team.presentCount ?? 0;
  const absentCount = record?.absentCount ?? (team.totalMembers || 0) - presentCount;
  const status = record?.attendanceStatus ?? team.attendanceStatus ?? 'NOT MARKED';
  const markedBy = record?.checkedInByName ?? team.checkedInByName ?? '';
  const timestamp = record?.checkedInAt
    ? new Date(record.checkedInAt.seconds ? record.checkedInAt.seconds * 1000 : record.checkedInAt).toISOString()
    : '';

  return `    <team>
      <teamName>${escapeXml(team.teamName || '')}</teamName>
      <collegeName>${escapeXml(team.collegeName || '')}</collegeName>
      <leaderName>${escapeXml(team.leaderName || '')}</leaderName>
      <totalMembers>${team.totalMembers || 0}</totalMembers>
      <presentCount>${presentCount}</presentCount>
      <absentCount>${absentCount}</absentCount>
      <status>${escapeXml(status)}</status>
      <markedBy>${escapeXml(markedBy)}</markedBy>
      <timestamp>${timestamp}</timestamp>
    </team>\n`;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
