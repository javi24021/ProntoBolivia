"use client";

import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseApp,
} from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

/**
 * Firebase Web SDK (cliente, navegador).
 *
 * SOLO se usa para lecturas en tiempo real desde el dashboard.
 * Las escrituras pasan por las API routes con Admin SDK.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

function getApp_(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return _app;
}

export function getClientDb(): Firestore {
  if (_db) return _db;
  const app = getApp_();
  try {
    _db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    _db = getFirestore(app);
  }
  return _db;
}