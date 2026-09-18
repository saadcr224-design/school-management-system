// Firebase Service & Synchronization Layer
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';

const FIREBASE_CONFIG_KEY = 'peace_group_firebase_config';

export function getSavedFirebaseConfig() {
  try {
    const saved = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Error reading saved Firebase config", e);
  }
  return null;
}

export function saveFirebaseConfig(config) {
  try {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error("Error saving Firebase config", e);
    return false;
  }
}

export function clearFirebaseConfig() {
  try {
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

let app = null;
let db = null;
let auth = null;

export function initFirebase(customConfig = null) {
  const config = customConfig || getSavedFirebaseConfig();
  
  if (!config || !config.apiKey || !config.projectId) {
    return { isConnected: false, error: "No Firebase configuration provided. Running in high-performance local demo mode." };
  }

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    auth = getAuth(app);

    return { isConnected: true, app, db, auth };
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return { isConnected: false, error: error.message };
  }
}

// Check initial connection
export const firebaseStatus = initFirebase();

export { db, auth };
