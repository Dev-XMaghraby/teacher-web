
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean | null;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAdmin: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';
        setAuthState({ user, loading: false, isAdmin });
      } else {
        setAuthState({ user: null, loading: false, isAdmin: false });
      }
    });

    return () => unsubscribe();
  }, []);

  return authState;
}
