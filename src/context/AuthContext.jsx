import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        setUserData(userDoc.data());
                    } else {
                        // Auto-create user doc if missing (for first admin)
                        const newData = {
                            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Admin',
                            email: firebaseUser.email,
                            role: 'admin',
                            bestWPM: 0,
                            totalCompetitions: 0,
                            createdAt: new Date().toISOString(),
                        };
                        await setDoc(doc(db, 'users', firebaseUser.uid), newData);
                        setUserData(newData);
                    }
                } catch (err) {
                    console.error('Error fetching user data:', err);
                    // Still set basic user data from auth
                    setUserData({
                        name: firebaseUser.displayName || 'Admin',
                        email: firebaseUser.email,
                        role: 'admin',
                    });
                }
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        // Fetch user data immediately after login
        try {
            const userDoc = await getDoc(doc(db, 'users', result.user.uid));
            if (userDoc.exists()) {
                setUserData(userDoc.data());
            } else {
                const newData = {
                    name: result.user.displayName || email.split('@')[0],
                    email,
                    role: 'admin',
                    bestWPM: 0,
                    totalCompetitions: 0,
                    createdAt: new Date().toISOString(),
                };
                await setDoc(doc(db, 'users', result.user.uid), newData);
                setUserData(newData);
            }
        } catch (e) {
            console.error('Error setting user data:', e);
            setUserData({ name: result.user.displayName || 'Admin', email, role: 'admin' });
        }
        return result.user;
    };

    const register = async (email, password, name) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        const userData = {
            name,
            email,
            role: 'admin',
            bestWPM: 0,
            totalCompetitions: 0,
            createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', result.user.uid), userData);
        setUserData(userData);
        return result.user;
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setUserData(null);
    };

    const isAdmin = () => userData?.role === 'admin';

    const value = {
        user,
        userData,
        loading,
        login,
        register,
        logout,
        isAdmin,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
