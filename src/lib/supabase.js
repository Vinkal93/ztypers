import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = 
    !!supabaseUrl && 
    !!supabaseAnonKey && 
    !supabaseUrl.includes('placeholder') && 
    !supabaseUrl.includes('localhost') && 
    !supabaseUrl.includes('127.0.0.1') && 
    !supabaseUrl.includes('zumzsgphnikimvemhikd') && // Exclude dead/unresolved project ID
    !supabaseAnonKey.includes('placeholder');

let supabase = null;

if (isSupabaseConfigured) {
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
        console.error('[Z Typers] Failed to create Supabase client:', err);
    }
}

// Fallback to a safe dummy client if not configured to prevent WebSocket/fetch errors in the browser console
if (!supabase) {
    supabase = {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signInWithPassword: async () => { throw new Error('Supabase Auth is not configured.'); },
            signUp: async () => { throw new Error('Supabase Auth is not configured.'); },
            signOut: async () => ({ error: null }),
        },
        channel: () => ({
            on: function() { return this; },
            subscribe: () => ({ unsubscribe: () => {} }),
        }),
        from: () => ({
            select: async () => ({ data: null, error: { message: 'Supabase is not configured' } }),
            upsert: async () => ({ error: { message: 'Supabase is not configured' } }),
        }),
        removeChannel: () => {},
    };
}

export { supabase };
export default supabase;
