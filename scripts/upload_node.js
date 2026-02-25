/**
 * MEDHA Command Center — Node.js Team Upload Script
 * Signs in as admin and uploads parsed team data to Firestore.
 * No service account key needed — uses the same Firebase client config.
 *
 * Usage:
 *   cd scripts
 *   node upload_node.js          # dry run
 *   node upload_node.js --upload # actually upload
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, doc, setDoc, getDocs, deleteDoc, serverTimestamp } = require('firebase/firestore');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ── Firebase Config (same as frontend .env) ──
const firebaseConfig = {
  apiKey: "AIzaSyAVKNpJ44EUU0dgJXfqRHRXUimw0xFy47o",
  authDomain: "medha-core.firebaseapp.com",
  projectId: "medha-core",
  storageBucket: "medha-core.firebasestorage.app",
  messagingSenderId: "560380645906",
  appId: "1:560380645906:web:31427e0fc11a512bb4fecb"
};

// Admin credentials
const ADMIN_EMAIL = "harishpranavs259@gmail.com";
const ADMIN_PASSWORD = "927624BEC066";

// Excel directory
const EXCEL_DIR = path.join(__dirname, '..', 'details_for_ai');

// ── Parse helpers ──
function parsePhone(val) {
  if (!val) return "";
  let s = String(val).trim().replace(/\s/g, '').replace('+91', '');
  if (s.endsWith('.0')) s = s.slice(0, -2);
  return s;
}

function parseMembers(row, headers) {
  const members = [];
  const memberPatterns = [
    { nameKey: 'Name of the Member 1', deptSuffix: null },
    { nameKey: 'Name of the Member 2', deptSuffix: '2' },
    { nameKey: 'Name of the Member 3', deptSuffix: '3' },
    { nameKey: 'Name of the Member 4', deptSuffix: '4' },
  ];

  for (const mp of memberPatterns) {
    const nameIdx = headers.findIndex(h => h && String(h).includes(mp.nameKey));
    let deptIdx = -1;

    if (mp.deptSuffix === null) {
      // Member 1 dept: "Year & Dept" but NOT "2", "3", "4" suffix
      deptIdx = headers.findIndex(h => h && String(h).includes('Year & Dept') && !String(h).includes('2') && !String(h).includes('3') && !String(h).includes('4'));
    } else {
      deptIdx = headers.findIndex(h => h && String(h).includes(`Eg: IV - ECE ${mp.deptSuffix}`));
    }

    if (nameIdx >= 0 && row[nameIdx]) {
      const name = String(row[nameIdx]).trim();
      if (name && !['', '-', 'No', 'None', 'Nil'].includes(name)) {
        let dept = '';
        if (deptIdx >= 0 && row[deptIdx]) {
          dept = String(row[deptIdx]).trim();
          if (['-', 'No', 'None', 'Nil'].includes(dept)) dept = '';
        }
        members.push({ name, dept });
      }
    }
  }
  return members;
}

function findCol(headers, keyword) {
  return headers.findIndex(h => h && String(h).toLowerCase().includes(keyword.toLowerCase()));
}

// ── Read Excel Files ──
function readExcelFiles() {
  const teams = new Map(); // Map<lowerName, teamObj>
  const files = fs.readdirSync(EXCEL_DIR).filter(f => f.endsWith('.xlsx'));

  for (const fname of files) {
    const fpath = path.join(EXCEL_DIR, fname);
    console.log(`\n📁 Reading: ${fname}`);

    const wb = XLSX.readFile(fpath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    if (data.length < 2) continue;
    const headers = data[0];

    const colTeam = findCol(headers, 'Team Name');
    const colLeader = findCol(headers, 'Team Leader Name');
    const colPhone = findCol(headers, 'Phone Number');
    const colEmail = findCol(headers, 'Email id');
    const colCollege = findCol(headers, 'College Name');
    const colDistrict = findCol(headers, 'District');
    const colState = findCol(headers, 'State');
    const colBoys = findCol(headers, 'Team Boys Count');
    const colGirls = findCol(headers, 'Team Girls Count');
    const colTrack = findCol(headers, 'Problem Statement Track');
    const colTrack1 = findCol(headers, 'Track 1');
    const colTrack2 = findCol(headers, 'Track 2');
    const colProject = findCol(headers, 'Title of the project');
    const colAccommodation = findCol(headers, 'Accommodation');
    const colTransaction = findCol(headers, 'Transaction id');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[colTeam]) continue;

      const teamName = String(row[colTeam]).trim();
      if (!teamName) continue;

      const teamKey = teamName.toLowerCase().trim();

      if (teams.has(teamKey)) {
        console.log(`  ⚠ Duplicate skipped: ${teamName}`);
        continue;
      }

      const leaderName = colLeader >= 0 ? String(row[colLeader] || '').trim() : '';
      const leaderPhone = colPhone >= 0 ? parsePhone(row[colPhone]) : '';
      let leaderEmail = colEmail >= 0 ? String(row[colEmail] || '').trim() : '';
      if (leaderEmail.endsWith('@')) leaderEmail = leaderEmail.slice(0, -1);
      const college = colCollege >= 0 ? String(row[colCollege] || '').trim() : '';
      const district = colDistrict >= 0 ? String(row[colDistrict] || '').trim() : '';
      const state = colState >= 0 ? String(row[colState] || '').trim() : '';
      const boys = colBoys >= 0 ? parseInt(row[colBoys]) || 0 : 0;
      const girls = colGirls >= 0 ? parseInt(row[colGirls]) || 0 : 0;

      let track = colTrack >= 0 ? String(row[colTrack] || '').trim() : '';
      let subTrack = '';
      if (colTrack1 >= 0 && row[colTrack1]) subTrack = String(row[colTrack1]).trim();
      else if (colTrack2 >= 0 && row[colTrack2]) subTrack = String(row[colTrack2]).trim();

      const project = colProject >= 0 ? String(row[colProject] || '').trim() : '';
      const accommodation = colAccommodation >= 0 ? String(row[colAccommodation] || '').trim() : '';
      const transaction = colTransaction >= 0 ? String(row[colTransaction] || '').trim() : '';

      const members = parseMembers(row, headers);
      let totalMembers = members.length;
      if (totalMembers === 0) totalMembers = boys + girls;

      teams.set(teamKey, {
        teamName,
        teamNameLower: teamKey,
        leaderName,
        leaderEmail,
        leaderPhone,
        collegeName: college,
        district,
        state,
        members,
        totalMembers,
        boysCount: boys,
        girlsCount: girls,
        track: subTrack ? `${track} — ${subTrack}` : track,
        projectTitle: project,
        accommodation: accommodation.toLowerCase() === 'yes',
        transactionId: transaction,
        // Attendance fields
        attendanceStatus: null,
        presentCount: null,
        absentCount: null,
        checkedIn: false,
        checkedInBy: null,
        checkedInByName: null,
        checkedInAt: null,
        attendanceRound: null,
        attendanceLocked: false,
        attendanceRecords: [],
        // QR fields
        qrToken: null,
        qrGeneratedAt: null,
        // Timestamps
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        source: fname,
      });
    }
  }

  return teams;
}

// ── Upload ──
async function uploadToFirestore(teams) {
  const app = initializeApp(firebaseConfig);
  const authInstance = getAuth(app);
  const db = getFirestore(app);

  // Sign in as admin
  console.log('\n🔐 Signing in as admin...');
  try {
    await signInWithEmailAndPassword(authInstance, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Signed in successfully');
  } catch (err) {
    console.error(`❌ Sign-in failed: ${err.code} — ${err.message}`);
    process.exit(1);
  }

  // First, delete ALL existing teams to avoid duplicates on re-run
  console.log('\n🗑️  Clearing existing teams...');
  const existingSnap = await getDocs(collection(db, 'teams'));
  let deleteCount = 0;
  for (const docSnap of existingSnap.docs) {
    await deleteDoc(doc(db, 'teams', docSnap.id));
    deleteCount++;
  }
  console.log(`   Deleted ${deleteCount} existing teams`);

  // Upload all teams
  console.log(`\n🔥 Uploading ${teams.size} teams...\n`);
  let count = 0;
  for (const [key, teamData] of teams) {
    count++;
    const docRef = await addDoc(collection(db, 'teams'), teamData);
    console.log(`  ✅ ${String(count).padStart(2)}. ${teamData.teamName.padEnd(30)} | ${teamData.collegeName.substring(0, 35)} | ID: ${docRef.id}`);
  }
  console.log(`\n✅ Successfully uploaded ${count} teams!`);

  // Create/update settings document
  await setDoc(doc(db, 'settings', 'main'), {
    attendanceEnabled: false,
    currentSession: 'Morning',
    sessions: ['Morning', 'Afternoon', 'Final'],
    createdAt: serverTimestamp(),
  }, { merge: true });
  console.log('✅ Settings document created/updated');
  console.log('\n🎉 Done! Refresh the browser to see all teams.');

  process.exit(0);
}

// ── Main ──
const teams = readExcelFiles();

console.log(`\n📊 Parsed ${teams.size} unique teams:\n`);
let idx = 0;
for (const [key, t] of teams) {
  idx++;
  console.log(`  ${String(idx).padStart(2)}. ${t.teamName.padEnd(30)} | ${t.collegeName.substring(0, 35).padEnd(35)} | Members: ${t.totalMembers} | ${t.track.substring(0, 25)}`);
}

if (process.argv.includes('--upload')) {
  uploadToFirestore(teams);
} else {
  console.log('\n' + '='.repeat(60));
  console.log('DRY RUN — No data was uploaded.');
  console.log('To upload to Firestore, run:');
  console.log('  node upload_node.js --upload');
  console.log('='.repeat(60));
}
