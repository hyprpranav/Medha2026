import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const PAGE_SIZE = 20;

export function useTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, present, partial, absent, not-marked

  // Real-time listener for teams
  useEffect(() => {
    setLoading(true);

    // When a status filter is active we need ALL teams so client-side
    // filtering doesn't miss any. With ≤100 teams this is cheap.
    const isFiltered = filter !== 'all';

    let q;
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      q = query(
        collection(db, 'teams'),
        where('teamNameLower', '>=', term),
        where('teamNameLower', '<=', term + '\uf8ff'),
        orderBy('teamNameLower'),
        ...(isFiltered ? [] : [limit(PAGE_SIZE)])
      );
    } else {
      q = query(
        collection(db, 'teams'),
        orderBy('teamName'),
        ...(isFiltered ? [] : [limit(PAGE_SIZE)])
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teamData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Apply client-side filter for attendance status
      let filtered = teamData;
      if (filter === 'present') {
        filtered = teamData.filter((t) => t.attendanceStatus === 'PRESENT');
      } else if (filter === 'partial') {
        filtered = teamData.filter((t) => t.attendanceStatus === 'PARTIAL');
      } else if (filter === 'absent') {
        filtered = teamData.filter((t) => t.attendanceStatus === 'ABSENT');
      } else if (filter === 'not-marked') {
        filtered = teamData.filter((t) => !t.checkedIn);
      }

      setTeams(filtered);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(!isFiltered && snapshot.docs.length === PAGE_SIZE);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching teams:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [searchTerm, filter]);

  // Load more (pagination)
  const loadMore = async () => {
    if (!lastDoc || !hasMore) return;

    let q;
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      q = query(
        collection(db, 'teams'),
        where('teamNameLower', '>=', term),
        where('teamNameLower', '<=', term + '\uf8ff'),
        orderBy('teamNameLower'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
    } else {
      q = query(
        collection(db, 'teams'),
        orderBy('teamName'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
    }

    const snapshot = await getDocs(q);
    let newTeams = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Apply same client-side filter as the main listener
    if (filter === 'present') {
      newTeams = newTeams.filter((t) => t.attendanceStatus === 'PRESENT');
    } else if (filter === 'partial') {
      newTeams = newTeams.filter((t) => t.attendanceStatus === 'PARTIAL');
    } else if (filter === 'absent') {
      newTeams = newTeams.filter((t) => t.attendanceStatus === 'ABSENT');
    } else if (filter === 'not-marked') {
      newTeams = newTeams.filter((t) => !t.checkedIn);
    }

    setTeams((prev) => [...prev, ...newTeams]);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
    setHasMore(snapshot.docs.length === PAGE_SIZE);
  };

  // Update team
  const updateTeam = async (teamId, data) => {
    await updateDoc(doc(db, 'teams', teamId), {
      ...data,
      lastModified: serverTimestamp(),
    });
  };

  // Delete team (admin only)
  const deleteTeam = async (teamId) => {
    await deleteDoc(doc(db, 'teams', teamId));
  };

  // Get single team
  const getTeam = async (teamId) => {
    const snap = await getDoc(doc(db, 'teams', teamId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  };

  // Get all teams (for export)
  const getAllTeams = async () => {
    const q = query(collection(db, 'teams'), orderBy('teamName'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  };

  // Add new team
  const addTeam = async (teamData) => {
    const members = teamData.members || [];
    const boysCount = members.filter(m => m.gender === 'Male').length +
      (teamData.leaderGender === 'Male' ? 1 : 0);
    const girlsCount = members.filter(m => m.gender === 'Female').length +
      (teamData.leaderGender === 'Female' ? 1 : 0);

    const doc_data = {
      teamId: teamData.teamId || '',
      teamName: teamData.teamName.trim(),
      teamNameLower: teamData.teamName.trim().toLowerCase(),
      collegeName: teamData.collegeName || '',
      leaderName: teamData.leaderName || '',
      leaderEmail: teamData.leaderEmail || '',
      leaderPhone: teamData.leaderPhone || '',
      leaderGender: teamData.leaderGender || '',
      members,
      totalMembers: members.length,
      boysCount,
      girlsCount,
      track: teamData.track || '',
      projectTitle: teamData.projectTitle || '',
      // Clean attendance fields
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
      createdAt: serverTimestamp(),
      lastModified: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, 'teams'), doc_data);
    return ref.id;
  };

  return {
    teams,
    loading,
    hasMore,
    loadMore,
    searchTerm,
    setSearchTerm,
    filter,
    setFilter,
    updateTeam,
    deleteTeam,
    getTeam,
    getAllTeams,
    addTeam,
  };
}
