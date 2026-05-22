import React, { useState, useEffect } from 'react';
import { Calendar, Download, IndianRupee, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import apiService from '../services/apiService';

const PartnerEarnings = () => {
    const [earnings, setEarnings] = useState([]);
    const [monthlyEarnings, setMonthlyEarnings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        year: new Date().getFullYear(),
        month: '',
        startDate: '',
        endDate: ''
    });
    const [stats, setStats] = useState({
        totalEarnings: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
        pendingPayments: 0,
        totalCommissions: 0
    });

    useEffect(() => {
        const fetchEarnings = async () => {
            try {
                setLoading(true);
                setError(null);

                // Build query params
                const queryParams = new URLSearchParams();
                if (filters.year) queryParams.append('year', filters.year);
                if (filters.month) queryParams.append('month', filters.month);
                if (filters.startDate) queryParams.append('startDate', filters.startDate);
                if (filters.endDate) queryParams.append('endDate', filters.endDate);

                const response = await apiService.getEarnings(queryParams.toString());

                if (response.success) {
                    setEarnings(response.data.earnings || []);
                    setMonthlyEarnings(response.data.monthlyEarnings || []);
                    setStats(response.data.stats || {
                        totalEarnings: 0,
                        thisMonthEarnings: 0,
                        lastMonthEarnings: 0,
                        pendingPayments: 0,
                        totalCommissions: 0
                    });
                } else {
                    setError(response.message || 'Failed to fetch earnings');
                }
            } catch (err) {
                console.error('Error fetching earnings:', err);
                setError(err.message || 'Failed to load earnings data');
            } finally {
                setLoading(false);
            }
        };

        fetchEarnings();
    }, [filters]);

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const formatCurrency = (amount) => {
        const val = parseFloat(amount) || 0;
        return `₹${Math.round(val * 100) / 100}`;
    };

    const exportToCSV = () => {
        if (!earnings.length) return;

        const headers = ['Date', 'Order ID', 'Product', 'Commission', 'Status'];
        const csvData = earnings.map(earning => [
            new Date(earning.createdAt).toLocaleDateString(),
            earning.orderId || 'N/A',
            earning.productName || 'N/A',
            `₹${earning.commission?.toFixed(2) || '0.00'}`,
            earning.status || 'Pending'
        ]);

        const csvContent = [headers, ...csvData]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `partner-earnings-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' }
    ];

        if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Earnings Dashboard</h1>
                <p className="text-gray-600">Track your commissions and payment status</p>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalEarnings)}</p>
                        </div>
                        <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <IndianRupee className="h-6 w-6 text-emerald-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">This Month</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.thisMonthEarnings)}</p>
                        </div>
                        <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Last Month</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.lastMonthEarnings ?? 0)}</p>
                        </div>
                        <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Commissions</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalCommissions || 0}</p>
                        </div>
                        <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Filter by:</span>
                    </div>

                    <select
                        value={filters.year}
                        onChange={(e) => handleFilterChange('year', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">All Years</option>
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>

                    <select
                        value={filters.month}
                        onChange={(e) => handleFilterChange('month', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">All Months</option>
                        {months.map(month => (
                            <option key={month.value} value={month.value}>{month.label}</option>
                        ))}
                    </select>

                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Start Date"
                    />

                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="End Date"
                    />

                    <button
                        onClick={exportToCSV}
                        disabled={!earnings.length}
                        className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Monthly Earnings Summary */}
            {monthlyEarnings.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Monthly Payment Status</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Earnings</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission Count</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {monthlyEarnings.map((monthly, index) => {
                                    const monthLabel = (() => {
                                        if (typeof monthly.month === 'string' && monthly.month.includes('-')) {
                                            const [y, m] = monthly.month.split('-');
                                            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                            return `${months[parseInt(m, 10) - 1]} ${y}`;
                                        }
                                        return monthly.month || '—';
                                    })();
                                    return (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {monthLabel}
                                        </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ₹{Math.round((monthly.totalEarnings || 0) * 100) / 100}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {monthly.commissionCount || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${monthly.paymentStatus === 'PAID'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                {monthly.paymentStatus || 'PENDING'}
                                            </span>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detailed Earnings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Detailed Earnings</h2>
                </div>
                <div className="overflow-x-auto">
                    {earnings.length > 0 ? (
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {earnings.map((earning, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(earning.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {earning.orderId || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {earning.productName || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ₹{Math.round((earning.commission || 0) * 100) / 100}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${earning.status === 'PAID'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                {earning.status || 'PENDING'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 text-center">
                            <div className="text-gray-400 mb-4">
                                <IndianRupee className="h-12 w-12 mx-auto" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No earnings found</h3>
                            <p className="text-gray-500">No commission earnings available for the selected period.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PartnerEarnings;
