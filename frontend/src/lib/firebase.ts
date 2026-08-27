import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'zentribe-e8ba2.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'zentribe-e8ba2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'zentribe-e8ba2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const firebaseAuth = getAuth(app)
