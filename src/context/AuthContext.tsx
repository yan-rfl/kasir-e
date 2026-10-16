'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { initFirebase, saveStoredFirebaseConfig, FirebaseClientConfig } from '@/lib/firebase';
import { UserProfile, ReceiptOptions } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile;
  isAuthenticated: boolean;
  isFirebaseConfigured: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  loginDemo: () => void;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  updateOwnerPin: (newPin: string) => Promise<void>;
  verifyOwnerPin: (pin: string) => boolean;
  reloadFirebase: (config?: FirebaseClientConfig | null) => void;
}

const DEFAULT_RECEIPT_OPTIONS: ReceiptOptions = {
  printStoreName: true,
  printStoreAddress: true,
  printDateTime: true,
  printNotes: true,
  printFooter: true,
};

const DEFAULT_PROFILE: UserProfile = {
  uid: 'owner-local',
  email: 'ryan.rafael2004@gmail.com',
  displayName: 'Pemilik Toko',
  storeName: 'Pondok Bakso 168 DOI',
  ownerPin: '123456',
  receiptHeader: 'Pondok Bakso 168 DOI - Spesial Bakso Sapi',
  receiptFooter: 'Terima Kasih - Selamat Menikmati',
  receiptOptions: DEFAULT_RECEIPT_OPTIONS,
  language: 'id',
};

const STORAGE_KEY_LOCAL_PROFILE = 'kasire_local_user_profile_v3';
const STORAGE_KEY_LOCAL_AUTH = 'kasire_offline_auth_session_v3';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load saved profile & local auth session on mount
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEY_LOCAL_PROFILE);
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setProfile((prev) => ({
          ...prev,
          ...parsed,
          storeName: parsed.storeName || 'Pondok Bakso 168 DOI',
          receiptOptions: {
            ...DEFAULT_RECEIPT_OPTIONS,
            ...(parsed.receiptOptions || {}),
          },
        }));
      }

      const savedAuth = localStorage.getItem(STORAGE_KEY_LOCAL_AUTH);
      if (savedAuth === 'true') {
        setIsAuthenticated(true);
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

    try {
      setPersistence(auth, indexedDBLocalPersistence).catch(() => {
        setPersistence(auth, browserLocalPersistence).catch(console.warn);
      });
    } catch {
      // ignore
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        setIsAuthenticated(true);
        localStorage.setItem(STORAGE_KEY_LOCAL_AUTH, 'true');

        if (db) {
          try {
            // Single project config: settings/store_config
            const settingsDocRef = doc(db, 'settings', 'store_config');
            const snap = await getDoc(settingsDocRef);
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              const merged = {
                ...profile,
                ...data,
                receiptOptions: {
                  ...DEFAULT_RECEIPT_OPTIONS,
                  ...(data.receiptOptions || {}),
                },
              };
              setProfile(merged);
              localStorage.setItem(STORAGE_KEY_LOCAL_PROFILE, JSON.stringify(merged));
            } else {
              // Initialize single project store config
              const newConfig: UserProfile = {
                uid: fbUser.uid,
                email: fbUser.email || 'ryan.rafael2004@gmail.com',
                displayName: fbUser.displayName || 'Pemilik Toko',
                storeName: 'Pondok Bakso 168 DOI',
                ownerPin: '123456',
                receiptHeader: 'Pondok Bakso 168 DOI - Spesial Bakso Sapi',
                receiptFooter: 'Terima Kasih - Selamat Menikmati',
                receiptOptions: DEFAULT_RECEIPT_OPTIONS,
                language: 'id',
              };
              await setDoc(settingsDocRef, newConfig);
              setProfile(newConfig);
              localStorage.setItem(STORAGE_KEY_LOCAL_PROFILE, JSON.stringify(newConfig));
            }
          } catch (err) {
            console.warn('Error fetching store config from Firestore:', err);
          }
        }
      } else {
        // If logged out from Firebase
        const savedAuth = localStorage.getItem(STORAGE_KEY_LOCAL_AUTH);
        if (savedAuth !== 'true') {
          setIsAuthenticated(false);
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
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY_LOCAL_AUTH, 'true');
  };

  const registerWithEmail = async (email: string, pass: string) => {
    const { auth } = initFirebase();
    if (!auth) throw new Error('Firebase Auth belum dikonfigurasi.');
    await createUserWithEmailAndPassword(auth, email, pass);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY_LOCAL_AUTH, 'true');
  };

  const loginDemo = () => {
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY_LOCAL_AUTH, 'true');
  };

  const logout = async () => {
    const { auth } = initFirebase();
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY_LOCAL_AUTH);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    const updated = {
      ...profile,
      ...data,
      receiptOptions: {
        ...DEFAULT_RECEIPT_OPTIONS,
        ...(profile.receiptOptions || {}),
        ...(data.receiptOptions || {}),
      },
    };
    setProfile(updated);
    try {
      localStorage.setItem(STORAGE_KEY_LOCAL_PROFILE, JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (isFirebaseConfigured) {
      const { db } = initFirebase();
      if (db) {
        const settingsDocRef = doc(db, 'settings', 'store_config');
        await setDoc(settingsDocRef, updated, { merge: true });
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
        isAuthenticated,
        isFirebaseConfigured,
        isLoading,
        loginWithEmail,
        registerWithEmail,
        loginDemo,
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
