/**
 * Auth context: user, role, loading, disabled, signIn, signOut.
 * Subscribes to Firebase auth state and users/{uid} for role/active.
 * Types declared in AuthContext.d.ts.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../firebase';
import { getUserRole, listenUser } from '../services/firebaseService';
import { DEFAULT_ADMIN_EMAIL } from '../config/constants';

const AuthContext = createContext(null);

function applyUserData(data, setRole, setDisabled, setLoading) {
  if (!data) {
    setRole(null);
    setDisabled(false);
  } else if (data.active === false) {
    setDisabled(true);
    setRole(data.role || null);
  } else {
    setDisabled(false);
    setRole(data.role || null);
  }
  setLoading(false);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    let unsubUser = () => {};
    let timeoutId = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        unsubUser();
        setRole(null);
        setDisabled(false);
        setLoading(false);
        return;
      }
      setLoading(true);

      // Initial fetch with get() - more reliable than onValue for first load
      getUserRole(firebaseUser.uid)
        .then(async (data) => {
          if (timeoutId) clearTimeout(timeoutId);
          // If default admin has no DB record, bootstrap it (user can write own users/{uid})
          if (!data && firebaseUser.email === DEFAULT_ADMIN_EMAIL) {
            try {
              await set(ref(db, `users/${firebaseUser.uid}`), { role: 'admin', active: true });
              data = { role: 'admin', active: true };
            } catch (_) {}
          }
          applyUserData(data, setRole, setDisabled, setLoading);
          // Subscribe for real-time updates (e.g. admin disables user)
          unsubUser = listenUser(firebaseUser.uid, (updated) => {
            applyUserData(updated, setRole, setDisabled, setLoading);
          }, () => applyUserData(null, setRole, setDisabled, setLoading));
        })
        .catch(() => {
          if (timeoutId) clearTimeout(timeoutId);
          applyUserData(null, setRole, setDisabled, setLoading);
        });

      // Fallback: if still loading after 8s, force-unblock (e.g. network/rules issue)
      timeoutId = setTimeout(() => {
        setLoading((prev) => {
          if (prev) {
            setRole(null);
            setDisabled(false);
            return false;
          }
          return prev;
        });
      }, 8000);
    });

    return () => {
      unsubAuth();
      unsubUser();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const signIn = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = () => fbSignOut(auth);

  const value = {
    user,
    role,
    loading,
    disabled,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
