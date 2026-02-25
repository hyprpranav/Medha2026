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

    let q;
    if (searchTerm.trim()) {
      // Debounced search by teamName (lowercased)
      const term = searchTerm.trim().toLowerCase();
      q = query(
        collection(db, 'teams'),
        where('teamNameLower', '>=', term),
        where('teamNameLower', '<=', term + '\uf8ff'),
        orderBy('teamNameLower'),
        limit(PAGE_SIZE)
      );
    } else {
      q = query(
        collection(db, 'teams'),
        orderBy('teamName'),
        limit(PAGE_SIZE)
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
      setHasMore(snapshot.docs.length === PAGE_SIZE);
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
  };
}
