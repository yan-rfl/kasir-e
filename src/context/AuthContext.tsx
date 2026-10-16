'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { initFirebase, saveStoredFirebaseConfig, FirebaseClientConfig, getStoredFirebaseConfig } from '@/lib/firebase';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile;
  isFirebaseConfigured: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  updateOwnerPin: (newPin: string) => Promise<void>;
  verifyOwnerPin: (pin: string) => boolean;
  reloadFirebase: (config?: FirebaseClientConfig | null) => void;
}

const DEFAULT_PROFILE: UserProfile = {
  uid: 'local-owner',
  email: 'owner@kasire.local',
  displayName: 'Pemilik Toko',
  storeName: 'Rumah Makan Kasir-E',
  ownerPin: '123456',
  receiptHeader: 'Jl. Merdeka No. 45 - Telp: 08123456789',
  receiptFooter: 'Terima Kasih Atas Kunjungan Anda',
  language: 'id',
};

const STORAGE_KEY_LOCAL_PROFILE = 'kasire_local_user_profile';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load profile from local storage as initial state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOCAL_PROFILE);
      if (saved) {
        setProfile((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {
      // ignore
    }
  }, []);

  const setupAuth = () => {
    const { auth, db, isConfigured } = initFirebase();
    setIsFirebaseConfigured(isConfigured);

    if (!isConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser && db) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setProfile(data);
            localStorage.setItem(STORAGE_KEY_LOCAL_PROFILE, JSON.stringify(data));
          } else {
            // First time user profile initialization
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || 'Pemilik Toko',
              storeName: 'Rumah Makan Kasir-E',
              ownerPin: '123456',
              receiptHeader: 'Struk Resmi Pembelian',
              receiptFooter: 'Terima Kasih - Datang Lagi Ya',
              language: 'id',
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
            localStorage.setItem(STORAGE_KEY_LOCAL_PROFILE, JSON.stringify(newProfile));
          }
        } catch (err) {
          console.warn('Error fetching user profile from Firestore:', err);
        }
      }
      setIsLoading(false);
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsub = setupAuth();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    const { auth } = initFirebase();
    if (!auth) throw new Error('Firebase Auth belum dikonfigurasi.');
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string) => {
    const { auth } = initFirebase();
    if (!auth) throw new Error('Firebase Auth belum dikonfigurasi.');
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    const { auth } = initFirebase();
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    const updated = { ...profile, ...data };
    setProfile(updated);
    try {
      localStorage.setItem(STORAGE_KEY_LOCAL_PROFILE, JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (user && isFirebaseConfigured) {
      const { db } = initFirebase();
      if (db) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, data);
      }
    }
  };

  const updateOwnerPin = async (newPin: string) => {
    await updateProfileData({ ownerPin: newPin });
  };

  const verifyOwnerPin = (pin: string): boolean => {
    return (profile.ownerPin || '123456') === pin.trim();
  };

  const reloadFirebase = (config?: FirebaseClientConfig | null) => {
    if (config !== undefined) {
      saveStoredFirebaseConfig(config);
    }
    window.location.reload();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isFirebaseConfigured,
        isLoading,
        loginWithEmail,
        registerWithEmail,
        logout,
        updateProfileData,
        updateOwnerPin,
        verifyOwnerPin,
        reloadFirebase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
