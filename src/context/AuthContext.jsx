import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [institute, setInstitute] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch or create institute for admin
    const fetchInstitute = async (instituteId) => {
        if (!instituteId) return null;
        try {
            const instDoc = await getDoc(doc(db, 'institutes', instituteId));
            if (instDoc.exists()) {
                const data = { id: instDoc.id, ...instDoc.data() };
                setInstitute(data);
                // Apply branding CSS variables
                if (data.accentColor) {
                    document.documentElement.style.setProperty('--accent-brand', data.accentColor);
                }
                return data;
            }
        } catch (err) {
            console.error('Error fetching institute:', err);
        }
        return null;
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserData(data);
                        if (data.instituteId) await fetchInstitute(data.instituteId);
                    } else {
                        // Auto-create user doc + institute if missing (first admin)
                        const instituteId = firebaseUser.uid; // use uid as default instituteId
                        const instData = {
                            name: 'My Institute',
                            ownerUid: firebaseUser.uid,
                            ownerEmail: firebaseUser.email,
                            accentColor: '',
                            logoUrl: '',
                            createdAt: new Date().toISOString(),
                        };
                        await setDoc(doc(db, 'institutes', instituteId), instData);
                        setInstitute({ id: instituteId, ...instData });

                        const newData = {
                            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Admin',
                            email: firebaseUser.email,
                            role: 'admin',
                            instituteId,
                            bestWPM: 0,
                            totalCompetitions: 0,
                            createdAt: new Date().toISOString(),
                        };
                        await setDoc(doc(db, 'users', firebaseUser.uid), newData);
                        setUserData(newData);
                    }
                } catch (err) {
                    console.error('Error fetching user data:', err);
                    setUserData({
                        name: firebaseUser.displayName || 'Admin',
                        email: firebaseUser.email,
                        role: 'admin',
                    });
                }
            } else {
                setUser(null);
                setUserData(null);
                setInstitute(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        try {
            const userDoc = await getDoc(doc(db, 'users', result.user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setUserData(data);
                if (data.instituteId) await fetchInstitute(data.instituteId);
            } else {
                const instituteId = result.user.uid;
                const instData = {
                    name: 'My Institute',
                    ownerUid: result.user.uid,
                    ownerEmail: email,
                    accentColor: '',
                    logoUrl: '',
                    createdAt: new Date().toISOString(),
                };
                await setDoc(doc(db, 'institutes', instituteId), instData);
                setInstitute({ id: instituteId, ...instData });

                const newData = {
                    name: result.user.displayName || email.split('@')[0],
                    email,
                    role: 'admin',
                    instituteId,
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

        const instituteId = result.user.uid;
        const instData = {
            name: `${name}'s Institute`,
            ownerUid: result.user.uid,
            ownerEmail: email,
            accentColor: '',
            logoUrl: '',
            createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'institutes', instituteId), instData);
        setInstitute({ id: instituteId, ...instData });

        const uData = {
            name,
            email,
            role: 'admin',
            instituteId,
            bestWPM: 0,
            totalCompetitions: 0,
            createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', result.user.uid), uData);
        setUserData(uData);
        return result.user;
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setUserData(null);
        setInstitute(null);
        document.documentElement.style.removeProperty('--accent-brand');
    };

    const changePassword = async (currentPw, newPw) => {
        if (!user) throw new Error('Not logged in');
        const credential = EmailAuthProvider.credential(user.email, currentPw);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPw);
    };

    const updateInstitute = async (updates) => {
        if (!userData?.instituteId) return;
        await setDoc(doc(db, 'institutes', userData.instituteId), updates, { merge: true });
        setInstitute(prev => ({ ...prev, ...updates }));
        if (updates.accentColor) {
            document.documentElement.style.setProperty('--accent-brand', updates.accentColor);
        }
    };

    const isAdmin = () => userData?.role === 'admin' || userData?.role === 'superadmin';

    const isSuperAdmin = async () => {
        if (!user) return false;
        try {
            const token = await user.getIdTokenResult();
            return token.claims.role === 'superadmin';
        } catch { return false; }
    };

    const value = {
        user,
        userData,
        institute,
        loading,
        login,
        register,
        logout,
        isAdmin,
        isSuperAdmin,
        changePassword,
        updateInstitute,
        fetchInstitute,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
