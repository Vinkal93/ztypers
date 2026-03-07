import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SuperAdminContext = createContext(null);

export function SuperAdminProvider({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const loginSuperAdmin = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const logoutSuperAdmin = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setSession(null);
    };

    const isSuperAdmin = !!session?.user;

    const value = {
        session,
        superAdminUser: session?.user || null,
        isSuperAdmin,
        loading,
        loginSuperAdmin,
        logoutSuperAdmin,
    };

    return <SuperAdminContext.Provider value={value}>{children}</SuperAdminContext.Provider>;
}

export function useSuperAdmin() {
    const context = useContext(SuperAdminContext);
    if (!context) throw new Error('useSuperAdmin must be used within SuperAdminProvider');
    return context;
}
