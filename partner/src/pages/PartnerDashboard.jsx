import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { IndianRupee, Ticket, TrendingUp, Users, BarChart3, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import apiService from '@/services/apiService';
import { toast } from 'sonner';

const PartnerDashboard = () => {
    const { partner } = useAuth();
    const { siteName } = useSiteSettings();
    const [stats, setStats] = useState({
        totalCoupons: 0,
        totalEarnings: 0,
        estimatedCommission: 0,
        commissionRate: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const formatCurrency = (amount) => {
        return `₹${parseFloat(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            const data = await apiService.getDashboardStats();

            if (data.success) {
                setStats(data.data.stats);
                setRecentOrders(data.data.recentOrders);

            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Commission Earned',
            value: formatCurrency(stats.estimatedCommission || 0),
            icon: IndianRupee,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
        },
        {
            title: 'Total Coupons',
            value: stats.totalCoupons || 0,
            icon: Ticket,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            title: 'Total Order Value',
            value: formatCurrency(stats.totalEarnings || 0),
            icon: TrendingUp,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            title: 'Commission Rate',
            value: `${stats.commissionRate || 0}%`,
            icon: Users,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
        }
    ];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                    <div className="h-64 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-lg p-6 text-white shadow-lg">
                <h1 className="text-3xl font-bold mb-2">
                    Welcome back{partner ? `, ${partner.name}` : ''}! 🎉
                </h1>
                <p className="text-white/90 text-lg">
                    {siteName ? `Here's an overview of your partnership performance with ${siteName}.` : "Here's an overview of your partnership performance."}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index} className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 mb-1">
                                            {stat.title}
                                        </p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {stat.value}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-full ${stat.bgColor} shadow-sm`}>
                                        <Icon className={`h-6 w-6 ${stat.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Recent Orders */}
            <Card className="shadow-lg border-0">
                <CardHeader className="bg-gray-50 rounded-t-lg">
                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2 text-orange-600" />
                        Recent Orders
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {recentOrders.length > 0 ? (
                        <div className="space-y-4">
                            {recentOrders.slice(0, 3).map((order) => (
                                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                                        <p className="text-sm text-gray-600 mb-1">
                                            Coupon: <span className="font-mono bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg text-xs">{order.couponCode}</span>
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(order.createdAt).toLocaleDateString('en-IN')} •
                                            <span className={`ml-1 px-2 py-1 rounded-full text-xs ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg">{formatCurrency(order.total)}</p>
                                        <p className="text-sm text-green-600 font-medium">
                                            Commission: {formatCurrency((() => {
                                                const commissionBase = parseFloat(order.subTotal || 0) - parseFloat(order.discount || 0);
                                                const rate = order.coupon?.couponPartners[0]?.commission || stats.commissionRate;
                                                return Math.round((commissionBase * rate / 100) * 100) / 100;
                                            })())}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Discount: {formatCurrency(order.discount || 0)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg mb-2">No recent orders found</p>
                            <p className="text-gray-400 text-sm">Orders will appear here once customers use your coupons</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Partner Info */}
            {partner && (
                <Card className="shadow-lg border-0 rounded-lg overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-lg">
                        <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                            <User className="h-5 w-5 mr-2 text-emerald-600" />
                            Partner Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                                    <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center mr-2">
                                        <User className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    Contact Details
                                </h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Email:</span>
                                        <span className="font-medium">{partner.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Name:</span>
                                        <span className="font-medium">{partner.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Partner ID:</span>
                                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{partner.id}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                    </div>
                                    Account Status
                                </h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Status:</span>
                                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                            Active Partner
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Member since:</span>
                                        <span className="font-medium">{new Date(partner.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Commission Rate:</span>
                                        <span className="font-bold text-emerald-600">{stats.commissionRate}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default PartnerDashboard;
