import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAJL_-EmG7DoGrcMHXMAxTTm-EhYTlDILk",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "z-typers.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "z-typers",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "z-typers.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "396185675685",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:396185675685:web:c4d482554df28f1478aa4c",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-475SHT0G4W",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'asia-south1');

if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Initialize Analytics only in browser (not SSR)
export let analytics = null;
isSupported().then(supported => {
    if (supported) analytics = getAnalytics(app);
});

export default app;
