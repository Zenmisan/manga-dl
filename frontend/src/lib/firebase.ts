import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDzw5OFZJ_r4uO_wtGK30c8i92qV_aaXbw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'z-manga-dl.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'z-manga-dl',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'z-manga-dl.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '912012648755',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:912012648755:web:1c2f4197c23e9dd6409e46',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const firebaseAuth = getAuth(app)
