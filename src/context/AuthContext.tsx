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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initFirebase, saveStoredFirebaseConfig, FirebaseClientConfig } from '@/lib/firebase';
import { UserProfile, ReceiptOptions } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile;
  isAuthenticated: boolean;
  isFirebaseConfigured: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, initialStoreName?: string) => Promise<void>;
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

export const getDefaultStoreNameForUser = (email?: string | null): string => {
  if (email && email.toLowerCase().trim() === 'ryan.rafael2004@gmail.com') {
    return 'Pondok Bakso 168 by DOI';
  }
  if (email) {
    const prefix = email.split('@')[0];
    const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    return `Toko ${capitalized}`;
  }
  return 'Pondok Bakso 168 by DOI';
};

const DEFAULT_PROFILE: UserProfile = {
  uid: 'owner-local',
  email: 'ryan.rafael2004@gmail.com',
  displayName: 'Pemilik Toko',
  storeName: 'Pondok Bakso 168 by DOI',
  ownerPin: '123456',
  receiptHeader: 'Pondok Bakso 168 by DOI - Spesial Bakso Sapi',
  receiptFooter: 'Terima Kasih Atas Kunjungan Anda',
  receiptOptions: DEFAULT_RECEIPT_OPTIONS,
  language: 'id',
};

const STORAGE_KEY_LOCAL_PROFILE = 'kasire_user_profile_v4';
const STORAGE_KEY_LOCAL_AUTH = 'kasire_user_session_v4';

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
            // Personalized store configuration per registered user
            const userDocRef = doc(db, 'users', fbUser.uid);
            const snap = await getDoc(userDocRef);
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              const merged = {
                ...profile,
                ...data,
                uid: fbUser.uid,
                email: fbUser.email,
                receiptOptions: {
                  ...DEFAULT_RECEIPT_OPTIONS,
                  ...(data.receiptOptions || {}),
                },
              };
              setProfile(merged);
              localStorage.setItem(STORAGE_KEY_LOCAL_PROFILE, JSON.stringify(merged));
            } else {
              // Initialize personalized store profile for this user
              const defaultStoreName = getDefaultStoreNameForUser(fbUser.email);
              const newConfig: UserProfile = {
                uid: fbUser.uid,
                email: fbUser.email,
                displayName: fbUser.displayName || 'Pemilik Toko',
                storeName: defaultStoreName,
                ownerPin: '123456',
                receiptHeader: `${defaultStoreName} - Struk Resmi Pembelian`,
                receiptFooter: 'Terima Kasih Atas Kunjungan Anda',
                receiptOptions: DEFAULT_RECEIPT_OPTIONS,
                language: 'id',
              };
              await setDoc(userDocRef, newConfig);
              setProfile(newConfig);
              localStorage.setItem(STORAGE_KEY_LOCAL_PROFILE, JSON.stringify(newConfig));
            }
          } catch (err) {
            console.warn('Error fetching personalized store config from Firestore:', err);
          }
        }
      } else {
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

  const registerWithEmail = async (email: string, pass: string, customStoreName?: string) => {
    const { auth, db } = initFirebase();
    if (!auth) throw new Error('Firebase Auth belum dikonfigurasi.');
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY_LOCAL_AUTH, 'true');

    if (cred.user && db) {
      const storeName = customStoreName?.trim() || getDefaultStoreNameForUser(email);
      const newConfig: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: 'Pemilik Toko',
        storeName,
        ownerPin: '123456',
        receiptHeader: `${storeName} - Struk Resmi Pembelian`,
        receiptFooter: 'Terima Kasih Atas Kunjungan Anda',
        receiptOptions: DEFAULT_RECEIPT_OPTIONS,
        language: 'id',
      };
      await setDoc(doc(db, 'users', cred.user.uid), newConfig);
      setProfile(newConfig);
      localStorage.setItem(STORAGE_KEY_LOCAL_PROFILE, JSON.stringify(newConfig));
    }
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
    localStorage.removeItem(STORAGE_KEY_LOCAL_PROFILE);
    setProfile(DEFAULT_PROFILE);
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

    if (isFirebaseConfigured && user) {
      const { db } = initFirebase();
      if (db) {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, updated, { merge: true });
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
