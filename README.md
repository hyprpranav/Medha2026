# MEDHA Command Center (MCC)

Real-time event management system for **MEDHA 2026** — the flagship inter-college project expo.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5, Tailwind CSS 3.4 |
| Database | Firebase Firestore (free tier) |
| Auth | Firebase Authentication (Email/Password) |
| QR | html5-qrcode (scanner) + qrcode.react (generator) |
| Export | xlsx, CSV, XML |
| Email Backend | Python FastAPI on Google Cloud Run |
| Hosting | Vercel (frontend) + Cloud Run (backend) |

## Roles

- **Master Admin** (`harishpranavs259@gmail.com`) — Full access: toggle attendance, manage sessions, approve coordinators, CRUD teams, export all data
- **Coordinators** — Mark attendance (when window is open), view teams, export limited data. Must be approved by admin.

---

## Setup Guide

### 1. Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Create Project** (e.g., `medha-2026`)
2. Enable **Authentication** → Sign-in method → **Email/Password** → Enable
3. Enable **Cloud Firestore** → Create database → Start in **test mode** (we have rules in `firestore.rules`)
4. Go to **Project Settings** → General → scroll to **Your apps** → click **Web** icon (`</>`)
5. Register app name (e.g., `medha-mcc`) → Copy the `firebaseConfig` values

### 2. Configure Environment

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env` with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=medha-2026.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=medha-2026
VITE_FIREBASE_STORAGE_BUCKET=medha-2026.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_MASTER_ADMIN_EMAIL=harishpranavs259@gmail.com
VITE_EMAIL_API_URL=https://your-cloud-run-url.run.app
```

### 3. Deploy Firestore Rules & Indexes

```bash
# Install Firebase CLI if not already
npm install -g firebase-tools
firebase login
firebase init firestore  # select your project, skip overwrite prompts
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — log in with `harishpranavs259@gmail.com` to auto-assign admin role.

### 5. Upload Team Data to Firestore

```bash
cd scripts

# Install Python dependencies
pip install firebase-admin openpyxl

# Download your Firebase service account key:
# Firebase Console → Project Settings → Service Accounts → Generate New Private Key
# Save as serviceAccountKey.json in the scripts/ folder

# Dry run first (prints data, doesn't upload)
python upload_teams.py

# Actually upload to Firestore
python upload_teams.py --upload
```

### 6. Email Backend (Optional — Cloud Run)

```bash
cd backend

# Create Gmail App Password:
# Google Account → Security → 2-Step Verification → App Passwords → Create one

cp .env.example .env
# Edit .env with your Gmail credentials

# Local testing
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Deploy to Cloud Run
gcloud run deploy medha-email-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars EMAIL_USER=your@gmail.com,EMAIL_PASS=xxxx-xxxx-xxxx-xxxx,FIREBASE_PROJECT_ID=medha-2026
```

After deploying, update `VITE_EMAIL_API_URL` in `frontend/.env` with the Cloud Run URL.

### 7. Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

cd frontend
vercel

# Set environment variables in Vercel dashboard:
# Settings → Environment Variables → add all VITE_* variables from .env
```

Or connect the GitHub repo to Vercel for automatic deployments.

---

## Project Structure

```
MedhaCore/
├── frontend/
│   ├── src/
│   │   ├── firebase/config.js        # Firebase initialization
│   │   ├── contexts/AuthContext.jsx   # Auth state & role management
│   │   ├── hooks/
│   │   │   ├── useTeams.js           # Teams CRUD & real-time listener
│   │   │   └── useSettings.js        # Settings & session management
│   │   ├── utils/
│   │   │   ├── helpers.js            # Utility functions
│   │   │   ├── exportCSV.js          # CSV export
│   │   │   ├── exportXML.js          # XML export
│   │   │   └── exportExcel.js        # Excel export (xlsx)
│   │   ├── components/
│   │   │   ├── Auth/                 # Login, ProtectedRoute, RoleGuard
│   │   │   ├── Layout/               # Sidebar, Header, Layout
│   │   │   ├── Dashboard/            # Admin dashboard
│   │   │   ├── Teams/                # TeamList, TeamDetails, PublicTeamView
│   │   │   ├── Attendance/           # Attendance marking panel
│   │   │   ├── QR/                   # QR generate & scan
│   │   │   ├── Export/               # Export panel (CSV/XML/Excel)
│   │   │   ├── Email/                # Email panel
│   │   │   ├── Admin/                # Admin panel, Settings
│   │   │   └── Notifications/        # Notification feed
│   │   ├── App.jsx                   # Router config
│   │   ├── main.jsx                  # Entry point
│   │   └── index.css                 # Tailwind + custom styles
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── backend/
│   ├── main.py                       # FastAPI email service
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── scripts/
│   └── upload_teams.py               # Excel → Firestore uploader
├── firestore.rules
├── firestore.indexes.json
└── details_for_ai/                   # Source Excel registration data
```

---

## Firestore Collections

| Collection | Purpose |
|-----------|---------|
| `teams` | Team data, members, attendance records |
| `users` | Admin & coordinator accounts, roles, approval status |
| `settings/main` | Attendance window toggle, current session, session list |
| `notifications` | System-wide notification feed |

---

## Key Features

- **Attendance System** — Admin-controlled window, duplicate prevention per session, member present count tracking, admin override capability
- **QR Codes** — Generate unique QR per team, scan to auto-navigate to attendance marking
- **Multi-Session** — Day 1 / Day 2 / Custom sessions with per-session attendance records
- **Export** — CSV, XML, and multi-sheet Excel exports with role-based content
- **Email** — Manual single-team emails + broadcast to all teams via Gmail SMTP
- **Role-Based Access** — Master Admin sees everything; coordinators see what they need
- **Real-Time** — Firestore `onSnapshot` listeners for live data updates across all clients

---

## Quick Reference

| Action | How |
|--------|-----|
| First login | Sign up with `harishpranavs259@gmail.com` → auto-admin |
| Add coordinator | They sign up → you approve in Admin Panel |
| Open attendance | Admin Panel → Toggle "Attendance Window" |
| Mark attendance | Teams tab or Attendance tab → select team → set present count |
| Generate QR | QR tab → Generate mode → select team |
| Scan QR | QR tab → Scan mode → point camera at QR code |
| Export data | Export tab → select session → choose format |
| Send emails | Email tab → compose or broadcast |
