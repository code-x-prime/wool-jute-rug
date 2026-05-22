import React, { useState, useEffect } from 'react';
import { AuthContext } from './AuthContextInstance';

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [partner, setPartner] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('partnerToken');
        const partnerData = localStorage.getItem('partnerData');

        if (token && partnerData) {
            try {
                setPartner(JSON.parse(partnerData));
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Error parsing partner data:', error);
                logout();
            }
        }
        setLoading(false);
    }, []);

    const login = (token, partnerData) => {
        localStorage.setItem('partnerToken', token);
        localStorage.setItem('partnerData', JSON.stringify(partnerData));
        setPartner(partnerData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem('partnerToken');
        localStorage.removeItem('partnerData');
        setPartner(null);
        setIsAuthenticated(false);
    };

    const value = {
        isAuthenticated,
        partner,
        login,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
