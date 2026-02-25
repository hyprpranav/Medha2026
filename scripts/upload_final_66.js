/**
 * MEDHA Command Center — Final 66 Teams Upload Script
 * 
 * This script:
 * 1. Reads the FINAL registration Excel (66 teams)
 * 2. Extracts leader email IDs from the old registration response files
 * 3. Deletes ALL existing teams in Firestore
 * 4. Uploads all 66 teams with clean data (no attendance markings)
 *
 * Usage:
 *   cd scripts
 *   node upload_final_66.js          # dry-run (preview only)
 *   node upload_final_66.js --upload # actually upload to Firebase
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const {
  getFirestore, collection, getDocs, deleteDoc, doc, setDoc, serverTimestamp,
} = require('firebase/firestore');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ── Firebase Config ──
const firebaseConfig = {
  apiKey: "AIzaSyAVKNpJ44EUU0dgJXfqRHRXUimw0xFy47o",
  authDomain: "medha-core.firebaseapp.com",
  projectId: "medha-core",
  storageBucket: "medha-core.firebasestorage.app",
  messagingSenderId: "560380645906",
  appId: "1:560380645906:web:31427e0fc11a512bb4fecb",
};

const ADMIN_EMAIL = "harishpranavs259@gmail.com";
const ADMIN_PASSWORD = "927624BEC066";
const EXCEL_DIR = path.join(__dirname, '..', 'details_for_ai');

// ── 1. Collect leader email IDs from old registration response files ──
function collectEmails() {
  const emailMap = new Map(); // key -> email

  function processFile(fname) {
    const fpath = path.join(EXCEL_DIR, fname);
    if (!fs.existsSync(fpath)) return;
    const wb = XLSX.readFile(fpath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const headers = data[0];

    const colTeam = headers.findIndex(h => h && String(h).toLowerCase().includes('team name'));
    const colLeader = headers.findIndex(h => h && String(h).toLowerCase().includes('team leader'));
    const colEmail = headers.findIndex(h => h && String(h).toLowerCase() === 'email id');
    const colEmail2 = headers.findIndex(h => h && String(h).toLowerCase().includes('email address'));
    const colPhone = headers.findIndex(h => h && String(h).toLowerCase().includes('phone number'));

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const teamName = row[colTeam] ? String(row[colTeam]).trim() : '';
      const leaderName = row[colLeader] ? String(row[colLeader]).trim() : '';
      let email = (row[colEmail] || row[colEmail2] || '').toString().trim().toLowerCase();
      // Fix: some emails have trailing @ like "maheshmurugan2303@gmail.com@"
      email = email.replace(/@$/, '');
      const phone = row[colPhone] ? String(row[colPhone]).trim().replace(/\s/g, '').replace('+91', '').replace('.0', '') : '';

      if (teamName && email && email.includes('@')) {
        const key = teamName.toLowerCase().replace(/\s+/g, ' ').trim();
        emailMap.set(key, email);
        if (leaderName) {
          emailMap.set('leader:' + leaderName.toLowerCase().replace(/\s+/g, ' ').trim(), email);
        }
        if (phone) {
          emailMap.set('phone:' + phone, email);
        }
      }
    }
  }

  processFile('MEDHA 2026 Registration  (Responses).xlsx');
  processFile('DAY 2 -MEDHA 2026 Registration  (Responses).xlsx');

  console.log(`📧 Collected ${emailMap.size} email entries from registration files`);
  return emailMap;
}

// ── 2. Parse the final 66 teams ──
function parseFinalTeams(emailMap) {
  const fpath = path.join(EXCEL_DIR, 'MEDHA 2026 FINAL REGISTRATION COUNT.xlsx');
  const wb = XLSX.readFile(fpath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Headers: S.NO, TEAM ID, TEAM NAME, COLEGE NAME, TEAM LEADER, LEADER CONTACT NO,
  //          MEMBER 1, MEMBER 1 DEPT, MEMBER 2, MEMBER 2 DEPT, MEMBER 3, MEMBER 3 DEPT,
  //          MEMBER 4, MEMBER 4 DEPT, BOYS COUNT, GIRLS COUNT, TOTAL, TRACK, TRACK 1, TRACK 2, TITLE

  const teams = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue; // skip empty rows

    const sno = row[0];
    const teamId = row[1] ? String(row[1]).trim() : '';
    const teamName = row[2] ? String(row[2]).trim() : '';
    const collegeName = row[3] ? String(row[3]).trim() : '';
    const leaderName = row[4] ? String(row[4]).trim() : '';
    const leaderPhone = row[5] ? String(row[5]).trim().replace(/\s/g, '').replace('+91', '') : '';

    // Parse members
    const members = [];
    // Member 1: cols 6,7
    if (row[6] && String(row[6]).trim() && !['No', 'None', 'Nil', '-'].includes(String(row[6]).trim())) {
      members.push({
        name: String(row[6]).trim(),
        dept: row[7] ? String(row[7]).trim() : '',
      });
    }
    // Member 2: cols 8,9
    if (row[8] && String(row[8]).trim() && !['No', 'None', 'Nil', '-'].includes(String(row[8]).trim())) {
      members.push({
        name: String(row[8]).trim(),
        dept: row[9] ? String(row[9]).trim() : '',
      });
    }
    // Member 3: cols 10,11
    if (row[10] && String(row[10]).trim() && !['No', 'None', 'Nil', '-'].includes(String(row[10]).trim())) {
      members.push({
        name: String(row[10]).trim(),
        dept: row[11] ? String(row[11]).trim() : '',
      });
    }
    // Member 4: cols 12,13
    if (row[12] && String(row[12]).trim() && !['No', 'None', 'Nil', '-'].includes(String(row[12]).trim())) {
      members.push({
        name: String(row[12]).trim(),
        dept: row[13] ? String(row[13]).trim() : '',
      });
    }

    // Look up email
    const teamKey = teamName.toLowerCase().replace(/\s+/g, ' ').trim();
    const leaderKey = 'leader:' + leaderName.toLowerCase().replace(/\s+/g, ' ').trim();
    const phoneKey = 'phone:' + leaderPhone.replace('.0', '');

    const leaderEmail = emailMap.get(teamKey) ||
                        emailMap.get(leaderKey) ||
                        emailMap.get(phoneKey) ||
                        '';

    const boysCount = row[14] || 0;
    const girlsCount = row[15] || 0;
    const totalCount = row[16] || members.length;
    const track = row[17] ? String(row[17]).trim() : '';
    const track1 = row[18] ? String(row[18]).trim() : '';
    const track2 = row[19] ? String(row[19]).trim() : '';
    const projectTitle = row[20] ? String(row[20]).trim() : '';

    teams.push({
      sno,
      teamId,
      teamName,
      teamNameLower: teamName.toLowerCase(),
      collegeName,
      leaderName,
      leaderEmail,
      leaderPhone,
      members,
      totalMembers: members.length,
      boysCount: Number(boysCount),
      girlsCount: Number(girlsCount),
      track,
      track1,
      track2,
      projectTitle,
      // Clean attendance fields (no markings)
      presentCount: 0,
      absentCount: 0,
      attendanceStatus: null,
      checkedIn: false,
      checkedInBy: null,
      checkedInByName: null,
      checkedInAt: null,
      attendanceRound: null,
      attendanceLocked: false,
      attendanceRecords: [],
      memberAttendance: {},
      qrToken: null,
    });
  }

  return teams;
}

// ── 3. Upload ──
async function main() {
  const dryRun = !process.argv.includes('--upload');

  console.log(dryRun ? '\n🔍 DRY RUN MODE (add --upload to write to Firebase)\n' : '\n🚀 UPLOAD MODE\n');

  // Collect emails
  const emailMap = collectEmails();

  // Parse teams
  const teams = parseFinalTeams(emailMap);
  console.log(`\n📋 Parsed ${teams.length} teams from final Excel\n`);

  // Print summary
  let emailFound = 0;
  let emailMissing = 0;
  for (const t of teams) {
    const emailStatus = t.leaderEmail ? '✅' : '❌';
    if (t.leaderEmail) emailFound++;
    else emailMissing++;
    console.log(`  ${emailStatus} #${t.sno} ${t.teamId} | ${t.teamName} | ${t.leaderName} | ${t.leaderEmail || 'NO EMAIL'} | Members: ${t.totalMembers}`);
  }

  console.log(`\n📧 Emails found: ${emailFound}/${teams.length}`);
  if (emailMissing > 0) {
    console.log(`⚠️  Missing emails for ${emailMissing} teams (not in registration forms)`);
  }

  if (dryRun) {
    console.log('\n✋ Dry run complete. Run with --upload to write to Firebase.');
    return;
  }

  // Firebase init
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Sign in as admin
  console.log('\n🔐 Signing in as admin...');
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅ Authenticated as', ADMIN_EMAIL);

  // Delete ALL existing teams
  console.log('\n🗑️  Deleting all existing teams...');
  const existingSnap = await getDocs(collection(db, 'teams'));
  let deleteCount = 0;
  for (const d of existingSnap.docs) {
    await deleteDoc(doc(db, 'teams', d.id));
    deleteCount++;
  }
  console.log(`   Deleted ${deleteCount} existing teams`);

  // Upload all 66 teams
  console.log('\n📤 Uploading 66 teams...');
  let uploadCount = 0;
  for (const t of teams) {
    // Use teamId as the Firestore document ID for clean lookups
    const docRef = doc(db, 'teams', t.teamId);
    await setDoc(docRef, {
      teamName: t.teamName,
      teamNameLower: t.teamNameLower,
      collegeName: t.collegeName,
      leaderName: t.leaderName,
      leaderEmail: t.leaderEmail,
      leaderPhone: t.leaderPhone,
      members: t.members,
      totalMembers: t.totalMembers,
      boysCount: t.boysCount,
      girlsCount: t.girlsCount,
      track: t.track,
      track1: t.track1,
      track2: t.track2,
      projectTitle: t.projectTitle,
      // Clean attendance
      presentCount: 0,
      absentCount: 0,
      attendanceStatus: null,
      checkedIn: false,
      checkedInBy: null,
      checkedInByName: null,
      checkedInAt: null,
      attendanceRound: null,
      attendanceLocked: false,
      attendanceRecords: [],
      memberAttendance: {},
      qrToken: null,
      // Metadata
      createdAt: serverTimestamp(),
      lastModified: serverTimestamp(),
    });
    uploadCount++;
    if (uploadCount % 10 === 0) {
      console.log(`   Uploaded ${uploadCount}/${teams.length}...`);
    }
  }

  console.log(`\n✅ Successfully uploaded all ${uploadCount} teams!`);
  console.log('   All attendance data is clean (zero markings).');
  console.log('   Emails matched for ' + emailFound + ' teams.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
