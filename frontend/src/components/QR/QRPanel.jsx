import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { QrCode, Camera, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// Use current domain so QR works on both localhost and Vercel
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://medha2026.vercel.app';

export default function QRPanel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [mode, setMode] = useState('generate'); // 'generate' | 'scan'
  const [teamId, setTeamId] = useState(searchParams.get('team') || '');
  const [teamData, setTeamData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState('unknown'); // 'unknown' | 'granted' | 'denied'
  const scannerRef = useRef(null);

  // Load team for QR generation
  useEffect(() => {
    if (teamId) {
      loadTeam(teamId);
    }
  }, [teamId]);

  const loadTeam = async (id) => {
    try {
      const snap = await getDoc(doc(db, 'teams', id));
      if (snap.exists()) {
        setTeamData({ id: snap.id, ...snap.data() });
      } else {
        toast.error('Team not found');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate/Regenerate QR token
  const generateQR = async () => {
    if (!teamData) return;
    try {
      const newToken = `${teamData.id}_${Date.now()}`;
      await updateDoc(doc(db, 'teams', teamData.id), {
        qrToken: newToken,
        qrGeneratedAt: serverTimestamp(),
        lastModified: serverTimestamp(),
      });
      setTeamData((prev) => ({ ...prev, qrToken: newToken }));
      toast.success('QR code generated!');
    } catch (err) {
      toast.error('Failed to generate QR');
    }
  };

  // QR URL
  const qrUrl = teamData ? `${BASE_URL}/team/${teamData.id}` : '';

  // Download QR as image
  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const link = document.createElement('a');
      link.download = `QR_${teamData?.teamName || 'team'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.clear(); } catch (e) { /* ignore */ }
      }
    };
  }, []);

  // Request camera permission explicitly first, then start scanner
  const startScanner = async () => {
    // Explicitly request camera permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      // Permission granted — stop the stream immediately, html5-qrcode will open its own
      stream.getTracks().forEach(t => t.stop());
      setCameraPermission('granted');
    } catch (err) {
      setCameraPermission('denied');
      toast.error('Camera access denied. Please allow camera in browser settings and try again.');
      return;
    }

    setScanning(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner('qr-reader', {
        qrbox: { width: 250, height: 250 },
        fps: 10,
        rememberLastUsedCamera: true,
        supportedScanTypes: [0], // 0 = SCAN_TYPE_CAMERA
      });

      scanner.render(
        (decodedText) => {
          const match = decodedText.match(/\/team\/([a-zA-Z0-9_-]+)/);
          if (match) {
            scanner.clear();
            setScanning(false);
            toast.success('QR scanned! Loading team...');
            navigate(`/attendance?team=${match[1]}`);
          } else {
            toast.error('Invalid QR code — not a MEDHA team QR');
          }
        },
        () => { /* scan errors are normal, ignore */ }
      );

      scannerRef.current = scanner;
    }, 200);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try { scannerRef.current.clear(); } catch (e) {}
    }
    setScanning(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">QR System</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('generate')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === 'generate' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            <QrCode size={16} className="inline mr-1" /> Generate
          </button>
          <button
            onClick={() => setMode('scan')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === 'scan' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            <Camera size={16} className="inline mr-1" /> Scan
          </button>
        </div>
      </div>

      {mode === 'generate' ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          {/* Team ID input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Team ID</label>
            <input
              type="text"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="Enter Team ID or select from Teams page"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={() => loadTeam(teamId)}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
            >
              Load Team
            </button>
          </div>

          {teamData && (
            <div className="text-center space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 inline-block">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={qrUrl}
                  size={256}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#1e293b"
                />
              </div>

              <div>
                <h3 className="font-bold text-gray-800 text-lg">{teamData.teamName}</h3>
                <p className="text-sm text-gray-500">{teamData.collegeName}</p>
                <p className="text-xs text-gray-400 mt-1 break-all">{qrUrl}</p>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
                >
                  <Download size={16} /> Download QR
                </button>
                {isAdmin && (
                  <button
                    onClick={generateQR}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition"
                  >
                    <RefreshCw size={16} /> Regenerate
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="text-center">
            {!scanning ? (
              <div className="space-y-4">
                <Camera size={64} className="mx-auto text-gray-300" />
                <p className="text-gray-600 font-medium">Scan a team's QR code</p>
                <p className="text-xs text-gray-400">Camera permission will be requested when you click Start</p>
                {cameraPermission === 'denied' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    ⚠ Camera blocked. Go to browser settings → Site permissions → Camera → Allow for this site.
                  </div>
                )}
                <button
                  onClick={startScanner}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
                >
                  <Camera size={18} /> Start Scanner
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div id="qr-reader" className="mx-auto max-w-md"></div>
                <button
                  onClick={stopScanner}
                  className="px-6 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 transition"
                >
                  Stop Scanner
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
