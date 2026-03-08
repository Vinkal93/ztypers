import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zumzsgphnikimvemhikd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Warn if Supabase credentials are missing (e.g. Vercel without env vars)
if (!supabaseAnonKey) {
    console.warn('[Z Typers] VITE_SUPABASE_ANON_KEY is not set. Super Admin and Global Settings features will not work.');
}

let supabase;
try {
    supabase = createClient(supabaseUrl, supabaseAnonKey || 'placeholder');
} catch (err) {
    console.error('[Z Typers] Failed to create Supabase client:', err);
    // Create a minimal fallback so the app doesn't crash
    supabase = createClient(supabaseUrl, 'placeholder');
}

export { supabase };
export default supabase;
