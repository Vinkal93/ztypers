import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const GlobalSettingsContext = createContext({});

const DEFAULT_SETTINGS = {
    site_name: 'Z Typers',
    site_tagline: "India's #1 Live Typing Competition Platform",
    primary_color: '#2563eb',
    secondary_color: '#7c3aed',
    default_entry_fee: 0,
    default_prize_pool: 0,
    payment_gateway: 'razorpay',
    razorpay_key: '',
    cashfree_app_id: '',
    payu_merchant_key: '',
    maintenance_mode: false,
    maintenance_message: '',
    footer_text: 'Built by Vinkal Prajapati',
    announcement: '',
};

export function GlobalSettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch initial settings
        fetchSettings();

        // Subscribe to real-time changes
        let channel;
        try {
            channel = supabase
                .channel('global_settings_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'global_settings',
                }, (payload) => {
                    if (payload.new) {
                        setSettings(prev => ({ ...prev, [payload.new.key]: payload.new.value }));
                    }
                })
                .subscribe();
        } catch (err) {
            console.warn('[Z Typers] Supabase realtime subscription failed:', err.message);
        }

        return () => {
            if (channel) {
                try { supabase.removeChannel(channel); } catch (e) { /* ignore */ }
            }
        };
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('global_settings')
                .select('key, value');

            if (!error && data) {
                const parsed = {};
                data.forEach(row => {
                    try {
                        parsed[row.key] = JSON.parse(row.value);
                    } catch {
                        parsed[row.key] = row.value;
                    }
                });
                setSettings(prev => ({ ...prev, ...parsed }));
            }
        } catch (err) {
            console.error('Error fetching global settings:', err);
        }
        setLoading(false);
    };

    const updateSetting = async (key, value) => {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        const { error } = await supabase
            .from('global_settings')
            .upsert({ key, value: stringValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });

        if (error) throw error;
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const updateMultipleSettings = async (updates) => {
        const rows = Object.entries(updates).map(([key, value]) => ({
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
            .from('global_settings')
            .upsert(rows, { onConflict: 'key' });

        if (error) throw error;
        setSettings(prev => ({ ...prev, ...updates }));
    };

    return (
        <GlobalSettingsContext.Provider value={{ settings, loading, updateSetting, updateMultipleSettings, refetch: fetchSettings }}>
            {children}
        </GlobalSettingsContext.Provider>
    );
}

export function useGlobalSettings() {
    return useContext(GlobalSettingsContext);
}
