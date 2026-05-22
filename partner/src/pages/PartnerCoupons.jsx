import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Ticket,
    Copy,
    Calendar,
    IndianRupee,
    TrendingUp,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import apiService from '@/services/apiService';

const PartnerCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPartnerCoupons();
    }, []);

    const fetchPartnerCoupons = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('partnerToken');

            if (!token) {
                toast.error('Please login first');
                return;
            }

            const response = await apiService.getCoupons();

            if (response.success) {
                // Transform the data to match the expected format
                const transformedCoupons = response.data.coupons.map(item => {
                    const coupon = item.coupon;
                    const orderCount = coupon._count?.orders || 0;
                    const commissionRate = item.commission || 0;
                    const actualEarnings = item.actualEarnings || 0; // Get from server

                    return {
                        id: coupon.id,
                        code: coupon.code,
                        description: coupon.description || 'No description available',
                        discountType: coupon.discountType,
                        discountValue: parseFloat(coupon.discountValue),
                        commission: commissionRate,
                        isActive: coupon.isActive,
                        startDate: coupon.startDate,
                        endDate: coupon.endDate,
                        usedCount: orderCount,
                        maxUses: coupon.maxUses,
                        actualEarnings: actualEarnings, // Use actual earnings from server
                        totalEarnings: actualEarnings // Backward compatibility
                    };
                });

                setCoupons(transformedCoupons);
            } else {
                toast.error(response.message || 'Failed to fetch coupons');
            }
        } catch (error) {
            console.error('Error fetching coupons:', error);
            toast.error(error.message || 'Failed to fetch coupons');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Coupon code copied to clipboard!');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No expiry';
        return new Date(dateString).toLocaleDateString();
    };

    const formatCurrency = (amount) => {
        return `₹${parseFloat(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading your coupons...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-lg p-6 text-white shadow-lg">
                <h1 className="text-3xl font-bold mb-2">My Coupons 🎫</h1>
                <p className="text-white/90 text-lg">
                    {siteName ? `Manage and track your assigned coupon codes for ${siteName}.` : 'Manage and track your assigned coupon codes.'}
                </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Coupons</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{coupons.length}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Ticket className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Coupons</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {coupons.filter(c => c.isActive).length}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Commission Earned</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {formatCurrency(coupons.reduce((sum, c) => sum + (c.actualEarnings || 0), 0))}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <IndianRupee className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Coupons List */}
            <div className="space-y-6">
                {coupons.length === 0 ? (
                    <Card className="shadow-lg border-0">
                        <CardContent className="p-12 text-center">
                            <Ticket className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Coupons Assigned</h3>
                            <p className="text-gray-600 max-w-md mx-auto">
                                You don't have any coupons assigned yet. Contact your administrator to get started.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    coupons.map((coupon) => (
                        <Card key={coupon.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
                            <CardContent className="p-6">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                    {/* Coupon Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-2xl font-bold text-gray-900">{coupon.code}</h3>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(coupon.code)}
                                                    className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-lg"
                                                    title="Copy coupon code"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            {coupon.isActive ? (
                                                <Badge className="bg-green-100 text-green-800 px-3 py-1">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-gray-100 text-gray-600 px-3 py-1">Inactive</Badge>
                                            )}
                                        </div>

                                        <p className="text-gray-600 mb-4 text-base">{coupon.description}</p>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-gray-500 text-sm font-medium mb-1">Discount</p>
                                                <p className="font-bold text-lg text-gray-900">
                                                    {coupon.discountType === 'PERCENTAGE'
                                                        ? `${coupon.discountValue}%`
                                                        : `₹${coupon.discountValue}`
                                                    }
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-gray-500 text-sm font-medium mb-1">Commission</p>
                                                <p className="font-bold text-lg text-emerald-600">{coupon.commission}%</p>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-gray-500 text-sm font-medium mb-1">Uses</p>
                                                <p className="font-bold text-lg text-gray-900">
                                                    {coupon.usedCount}{coupon.maxUses ? `/${coupon.maxUses}` : ''}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-gray-500 text-sm font-medium mb-1">Commission Earned</p>
                                                <p className="font-bold text-lg text-green-600">
                                                    {formatCurrency(Math.round((coupon.actualEarnings || 0) * 100) / 100)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Date Range */}
                                    <div className="lg:text-right">
                                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                                <Calendar className="h-4 w-4 text-blue-600" />
                                                <span className="font-medium">Valid Period</span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-800">
                                                {formatDate(coupon.startDate)} - {formatDate(coupon.endDate)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default PartnerCoupons;
