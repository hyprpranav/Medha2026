import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext(null);

const MASTER_ADMIN_EMAIL = import.meta.env.VITE_MASTER_ADMIN_EMAIL || 'harishpranavs259@gmail.com';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          // Fetch user role from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            // First-time login: auto-assign role based on email
            const isMasterAdmin = firebaseUser.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
            const newUserData = {
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              role: isMasterAdmin ? 'admin' : 'coordinator',
              approved: isMasterAdmin ? true : false, // Coordinators need admin approval
              createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUserData);
            setUserData(newUserData);
          }
        } else {
          setUser(null);
          setUserData(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Sign up
  const signup = async (email, password, name) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    const isMasterAdmin = email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
    const newUserData = {
      name,
      email,
      role: isMasterAdmin ? 'admin' : 'coordinator',
      approved: isMasterAdmin ? true : false,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', result.user.uid), newUserData);
    setUserData(newUserData);
    return result;
  };

  // Login
  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Logout
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
  };

  const isAdmin = userData?.role === 'admin';
  const isCoordinator = userData?.role === 'coordinator';
  const isApproved = userData?.approved === true;

  const value = {
    user,
    userData,
    loading,
    login,
    signup,
    logout,
    isAdmin,
    isCoordinator,
    isApproved,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
