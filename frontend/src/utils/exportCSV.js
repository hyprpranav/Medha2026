// CSV Export utility for MEDHA Command Center

export function exportCSV(data, filename = 'medha_export.csv') {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          let val = row[h] ?? '';
          // Escape commas and quotes
          val = String(val).replace(/"/g, '""');
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            val = `"${val}"`;
          }
          return val;
        })
        .join(',')
    ),
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
