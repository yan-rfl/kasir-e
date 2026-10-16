import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const STORAGE_KEY_FIREBASE_CONFIG = 'kasire_custom_firebase_config';

export function getStoredFirebaseConfig(): FirebaseClientConfig | null {
  if (typeof window === 'undefined') return null;

  // 1. Check local storage for user-customized config
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading saved firebase config', err);
  }

  // 2. Check process.env
  if (
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ) {
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    };
  }

  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseClientConfig | null) {
  if (typeof window === 'undefined') return;
  if (!config) {
    localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
  } else {
    localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
  }
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

export function initFirebase(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  isConfigured: boolean;
} {
  const config = getStoredFirebaseConfig();

  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, auth: null, db: null, isConfigured: false };
  }

  try {
    if (!getApps().length) {
      appInstance = initializeApp(config);
      authInstance = getAuth(appInstance);

      // Initialize Firestore with IndexedDB multi-tab offline cache
      try {
        firestoreInstance = initializeFirestore(appInstance, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch {
        firestoreInstance = getFirestore(appInstance);
      }
    } else {
      appInstance = getApp();
      authInstance = getAuth(appInstance);
      firestoreInstance = getFirestore(appInstance);
    }

    return {
      app: appInstance,
      auth: authInstance,
      db: firestoreInstance,
      isConfigured: true,
    };
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
    return {
      app: appInstance,
      auth: authInstance,
      db: firestoreInstance,
      isConfigured: false,
    };
  }
}
