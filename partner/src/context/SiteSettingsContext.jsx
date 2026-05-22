import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '@/services/apiService';

const SiteSettingsContext = createContext({ siteName: null, loading: true });

export function SiteSettingsProvider({ children }) {
    const [siteName, setSiteName] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const data = await apiService.getSiteSettings();
                setSiteName(data?.siteName || null);
            } catch (err) {
                console.warn('Failed to fetch site settings:', err);
                setSiteName(null);
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    return (
        <SiteSettingsContext.Provider value={{ siteName, loading }}>
            {children}
        </SiteSettingsContext.Provider>
    );
}

export function useSiteSettings() {
    const ctx = useContext(SiteSettingsContext);
    return ctx || { siteName: null, loading: false };
}
