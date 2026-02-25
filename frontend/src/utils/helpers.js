// Helper utilities for MEDHA Command Center

// Debounce function for search
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Format Firestore timestamp to readable string
export function formatTimestamp(ts) {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Get attendance status badge color
export function getStatusColor(status) {
  switch (status) {
    case 'PRESENT':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'PARTIAL':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'ABSENT':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-500 border-gray-200';
  }
}

// Get attendance status icon
export function getStatusIcon(status) {
  switch (status) {
    case 'PRESENT': return '✅';
    case 'PARTIAL': return '⚠️';
    case 'ABSENT': return '❌';
    default: return '⏳';
  }
}

// Calculate attendance status from present count
export function calculateStatus(presentCount, totalMembers) {
  if (presentCount === 0) return 'ABSENT';
  if (presentCount >= totalMembers) return 'PRESENT';
  return 'PARTIAL';
}
