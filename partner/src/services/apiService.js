const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    getAuthHeaders() {
        const token = localStorage.getItem('partnerToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    async requestPublic(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: { 'Content-Type': 'application/json' },
            ...options
        };
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'API request failed');
            return data;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Auth APIs
    async login(credentials) {
        return this.request('/api/partner/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async changePassword(passwordData) {
        return this.request('/api/partner/auth/change-password', {
            method: 'POST',
            body: JSON.stringify(passwordData)
        });
    }

    async forgotPassword(email) {
        return this.request('/api/partner/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    async resetPassword(resetData) {
        return this.request('/api/partner/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify(resetData)
        });
    }

    async getProfile() {
        return this.request('/api/partner/profile');
    }

    // Coupon APIs
    async getCoupons() {
        return this.request('/api/partner/coupons');
    }

    // Earnings APIs
    async getEarnings(queryParams = '') {
        const url = queryParams ? `/api/partner/earnings?${queryParams}` : '/api/partner/earnings';
        return this.request(url);
    }

    async getEarningsStats(period = 'all') {
        return this.request(`/api/partner/earnings/stats?period=${period}`);
    }

    // Dashboard APIs
    async getDashboardStats() {
        return this.request('/api/partner/dashboard');
    }

    // Public APIs (no auth)
    async getSiteSettings() {
        const res = await this.requestPublic('/api/public/settings');
        return res?.data || {};
    }
}

export default new ApiService();
