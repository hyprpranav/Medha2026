import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Real-time listener for settings
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'main'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data());
      } else {
        // Initialize default settings if doesn't exist
        const defaults = {
          attendanceEnabled: false,
          currentSession: 'Morning',
          sessions: ['Morning', 'Afternoon', 'Final'],
          createdAt: serverTimestamp(),
        };
        setDoc(doc(db, 'settings', 'main'), defaults);
        // Set local state without the sentinel value; real value arrives via next snapshot
        setSettings({
          attendanceEnabled: false,
          currentSession: 'Morning',
          sessions: ['Morning', 'Afternoon', 'Final'],
        });
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Update settings
  const updateSettings = async (data) => {
    await setDoc(doc(db, 'settings', 'main'), {
      ...settings,
      ...data,
      lastModified: serverTimestamp(),
    }, { merge: true });
  };

  return { settings, loading, updateSettings };
}
