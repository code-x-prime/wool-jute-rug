import { useEffect } from 'react';
import { useSiteSettings } from '@/context/SiteSettingsContext';

export default function DocumentTitle({ suffix = 'Partner Portal' }) {
    const { siteName } = useSiteSettings();

    useEffect(() => {
        const title = siteName ? `${siteName} - ${suffix}` : suffix;
        document.title = title;
    }, [siteName, suffix]);

    return null;
}
