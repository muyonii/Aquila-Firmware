import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://aquila-system-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Prevent duplicate initialization during Vite hot reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Realtime Database instance
export const rtdb = getDatabase(app);