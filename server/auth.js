import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function readServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

let firebaseAuth = null;

export function getFirebaseAuth() {
  if (firebaseAuth !== null) {
    return firebaseAuth;
  }

  const serviceAccount = readServiceAccount();
  if (!serviceAccount) {
    firebaseAuth = null;
    return firebaseAuth;
  }

  const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount) });
  firebaseAuth = getAuth(app);
  return firebaseAuth;
}

export async function verifyFirebaseToken(idToken) {
  const auth = getFirebaseAuth();
  if (!auth || !idToken) {
    return null;
  }

  try {
    return await auth.verifyIdToken(idToken);
  } catch (error) {
    console.error("Firebase token verification failed:", error.message);
    return null;
  }
}
