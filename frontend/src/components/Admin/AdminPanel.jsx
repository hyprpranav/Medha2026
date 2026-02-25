import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useSettings } from '../../hooks/useSettings';
import { Shield, UserCheck, UserX, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const { isAdmin } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [coordinators, setCoordinators] = useState([]);
  const [loadingCoords, setLoadingCoords] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchCoordinators();
  }, []);

  const fetchCoordinators = async () => {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'coordinator'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setCoordinators(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCoords(false);
    }
  };

  const approveCoordinator = async (uid) => {
    try {
      await updateDoc(doc(db, 'users', uid), { approved: true });
      toast.success('Coordinator approved!');
      fetchCoordinators();
    } catch (err) {
      toast.error('Failed to approve');
    }
  };

  const removeCoordinator = async (uid) => {
    if (!confirm('Remove this coordinator?')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      toast.success('Coordinator removed');
      fetchCoordinators();
    } catch (err) {
      toast.error('Failed to remove');
    }
  };

  const toggleAttendance = async () => {
    await updateSettings({ attendanceEnabled: !settings?.attendanceEnabled });
    toast.success(settings?.attendanceEnabled ? 'Attendance window CLOSED' : 'Attendance window OPENED');
  };

  const changeSession = async (session) => {
    await updateSettings({ currentSession: session });
    toast.success(`Session changed to ${session}`);
  };

  const resetAllAttendance = async () => {
    if (!confirm('⚠️ Are you sure? This will erase ALL attendance data from every team. This cannot be undone.')) return;
    setResetting(true);
    try {
      const snap = await getDocs(collection(db, 'teams'));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.update(doc(db, 'teams', d.id), {
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
        });
      });
      await batch.commit();
      toast.success(`✅ Attendance reset for ${snap.docs.length} teams`);
    } catch (err) {
      console.error(err);
      toast.error('Reset failed');
    } finally {
      setResetting(false);
    }
  };

  if (!isAdmin) return <div className="text-center py-12 text-gray-500">Admin access required</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>

      {/* Attendance Control */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Shield size={18} /> Attendance Control
        </h3>

        <div className="space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-800">Attendance Window</p>
              <p className="text-sm text-gray-500">
                {settings?.attendanceEnabled
                  ? 'Coordinators can mark attendance'
                  : 'Attendance marking is disabled'}
              </p>
            </div>
            <button
              onClick={toggleAttendance}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                settings?.attendanceEnabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={settings?.attendanceEnabled}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
                  settings?.attendanceEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Session Selector */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="font-medium text-gray-800 mb-2">Current Session</p>
            <div className="flex gap-2 flex-wrap">
              {(settings?.sessions || ['Morning', 'Afternoon', 'Final']).map((s) => (
                <button
                  key={s}
                  onClick={() => changeSession(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    settings?.currentSession === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Coordinator Management */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <UserCheck size={18} /> Coordinator Management
        </h3>

        {loadingCoords ? (
          <div className="flex justify-center p-6">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : coordinators.length === 0 ? (
          <p className="text-gray-500 text-sm">No coordinators registered yet.</p>
        ) : (
          <div className="space-y-3">
            {coordinators.map((coord) => (
              <div
                key={coord.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-800">{coord.name}</p>
                  <p className="text-sm text-gray-500">{coord.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {coord.approved ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      ✅ Approved
                    </span>
                  ) : (
                    <>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                        ⏳ Pending
                      </span>
                      <button
                        onClick={() => approveCoordinator(coord.id)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition"
                      >
                        Approve
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => removeCoordinator(coord.id)}
                    className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset All Attendance */}
      <div className="bg-white rounded-xl border border-red-100 p-6">
        <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
          <RotateCcw size={18} /> Reset Attendance Data
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          This will clear <strong>all</strong> attendance markings from every team — present counts, member toggles, lock status, and history records. This cannot be undone.
        </p>
        <button
          onClick={resetAllAttendance}
          disabled={resetting}
          className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50"
        >
          {resetting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Resetting...
            </span>
          ) : (
            '🗑 Reset All Attendance Data'
          )}
        </button>
      </div>
    </div>
  );
}
