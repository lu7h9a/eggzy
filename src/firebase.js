import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

export const firebaseApp = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
const googleProvider = firebaseAuth ? new GoogleAuthProvider() : null;

export async function initializeFirebaseAnalytics() {
  if (!firebaseApp || typeof window === "undefined") {
    return null;
  }

  if (!(await isSupported())) {
    return null;
  }

  return getAnalytics(firebaseApp);
}

export function watchAuthState(callback) {
  if (!firebaseAuth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(firebaseAuth, callback);
}

export async function signInWithGoogle() {
  if (!firebaseAuth || !googleProvider) {
    return null;
  }

  return signInWithPopup(firebaseAuth, googleProvider);
}

export async function signInWithEmail(email, password) {
  if (!firebaseAuth) {
    return null;
  }

  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function registerWithEmail(email, password, displayName) {
  if (!firebaseAuth) {
    return null;
  }

  const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  if (displayName) {
    await updateProfile(result.user, { displayName });
  }
  return result;
}

export async function signOutUser() {
  if (!firebaseAuth) {
    return;
  }

  await signOut(firebaseAuth);
}
