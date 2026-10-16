'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { initFirebase, saveStoredFirebaseConfig, FirebaseClientConfig } from '@/lib/firebase';
import { UserProfile, ReceiptOptions, PrintPreset } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile;
  isAuthenticated: boolean;
  isFirebaseConfigured: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, initialStoreName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginDemo: () => void;
  logout: () => Promise<void>;
  deleteCurrentStoreAndAccount: () => Promise<void>;
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

export const DEFAULT_PRINT_PRESETS: PrintPreset[] = [
  {
    id: 'preset-kawul',
    name: 'Rekap Kawul (Bakso)',
    filterKeywords: ['bakso'],
    category: 'all',
    showItemQty: true,
    showItemPrice: true,
    showTotalPrice: true,
  },
  {
    id: 'preset-mamah',
    name: 'Rekap Total (Semua Menu)',
    filterKeywords: [],
    category: 'all',
    showItemQty: true,
    showItemPrice: true,
    showTotalPrice: true,
  },
];

export const getDefaultStoreNameForUser = (email?: string | null): string => {
  if (email && email.includes('@')) {
    const prefix = email.split('@')[0];
    const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    return `Toko ${capitalized}`;
  }
  return 'Toko Saya';
};

const DEFAULT_PROFILE: UserProfile = {
  uid: 'owner-local',
  email: null,
  displayName: 'Pemilik Toko',
  storeName: 'Toko Saya',
  ownerPin: '123456',
  receiptHeader: 'Kasir-E POS - Struk Penjualan',
  receiptFooter: 'Terima Kasih Atas Kunjungan Anda',
  receiptOptions: DEFAULT_RECEIPT_OPTIONS,
  printPresets: DEFAULT_PRINT_PRESETS,
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
                printPresets: data.printPresets || DEFAULT_PRINT_PRESETS,
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
                printPresets: DEFAULT_PRINT_PRESETS,
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
        printPresets: DEFAULT_PRINT_PRESETS,
        language: 'id',
      };
      await setDoc(doc(db, 'users', cred.user.uid), newConfig);
      setProfile(newConfig);
      localStorage.setItem(STORAGE_KEY_LOCAL_PROFILE, JSON.stringify(newConfig));
    }
  };

  const loginWithGoogle = async () => {
    const { auth, db } = initFirebase();
    if (!auth) throw new Error('Firebase Auth belum dikonfigurasi.');
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY_LOCAL_AUTH, 'true');

    if (cred.user && db) {
      const userDocRef = doc(db, 'users', cred.user.uid);
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        const storeName = getDefaultStoreNameForUser(cred.user.email);
        const newConfig: UserProfile = {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName || 'Pemilik Toko',
          storeName,
          ownerPin: '123456',
          receiptHeader: `${storeName} - Struk Resmi Pembelian`,
          receiptFooter: 'Terima Kasih Atas Kunjungan Anda',
          receiptOptions: DEFAULT_RECEIPT_OPTIONS,
          printPresets: DEFAULT_PRINT_PRESETS,
          language: 'id',
        };
        await setDoc(userDocRef, newConfig);
        setProfile(newConfig);
        localStorage.setItem(STORAGE_KEY_LOCAL_PROFILE, JSON.stringify(newConfig));
      }
    }
  };

  const deleteCurrentStoreAndAccount = async () => {
    const { auth, db } = initFirebase();
    if (user && db) {
      try {
        await deleteDoc(doc(db, 'users', user.uid));
      } catch (err) {
        console.warn('Error deleting user Firestore doc:', err);
      }
    }
    if (auth && auth.currentUser) {
      try {
        await auth.currentUser.delete();
      } catch {
        await signOut(auth);
      }
    }
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY_LOCAL_AUTH);
    localStorage.removeItem(STORAGE_KEY_LOCAL_PROFILE);
    localStorage.removeItem('kasire_menu_catalog_v2');
    localStorage.removeItem('kasire_transactions_v2');
    localStorage.removeItem('kasire_tx_counter_v2');
    setProfile(DEFAULT_PROFILE);
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
        loginWithGoogle,
        loginDemo,
        logout,
        deleteCurrentStoreAndAccount,
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
