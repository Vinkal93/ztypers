import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAJL_-EmG7DoGrcMHXMAxTTm-EhYTlDILk",
    authDomain: "z-typers.firebaseapp.com",
    projectId: "z-typers",
    storageBucket: "z-typers.firebasestorage.app",
    messagingSenderId: "396185675685",
    appId: "1:396185675685:web:c4d482554df28f1478aa4c",
    measurementId: "G-475SHT0G4W"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
