import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Building,
    Save,
    Edit,
    Shield
} from 'lucide-react';
import { toast } from 'sonner';


const PartnerProfile = () => {
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        businessName: '',
        businessType: '',
        gstNumber: '',
        bankAccount: '',
        ifscCode: '',
        accountHolder: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setIsLoading(true);

            // Mock data for now - replace with actual API call
            const mockProfile = {
                name: 'John Doe',
                email: 'john.doe@example.com',
                phone: '+91 9876543210',
                address: '123 Business Street',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                businessName: 'Doe Enterprises',
                businessType: 'Retail',
                gstNumber: '27ABCDE1234F1Z5',
                bankAccount: '1234567890',
                ifscCode: 'HDFC0001234',
                accountHolder: 'John Doe'
            };

            setProfile(mockProfile);
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Failed to fetch profile data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setProfile(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            // Mock API call - replace with actual API
            await new Promise(resolve => setTimeout(resolve, 1000));

            toast.success('Profile updated successfully!');
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        fetchProfile(); // Reset to original data
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading profile...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-lg p-6 text-white shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Partner Profile 👤</h1>
                        <p className="text-white/90 text-lg">
                            {siteName ? `Manage your account and business information for ${siteName}.` : 'Manage your account and business information.'}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <Button variant="outline" onClick={handleCancel} className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                                    Cancel
                                </Button>
                                <Button onClick={handleSave} disabled={isSaving} className="bg-white text-emerald-600 hover:bg-gray-100">
                                    {isSaving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600 mr-2"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setIsEditing(true)} className="bg-white/20 hover:bg-white/30 text-white border-white/30" variant="outline">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Profile
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <Card className="shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
                            <div className="p-2 bg-blue-100 rounded-full">
                                <User className="h-5 w-5 text-blue-600" />
                            </div>
                            Personal Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                        <div>
                            <Label htmlFor="name" className="text-gray-700 font-medium">Full Name</Label>
                            <Input
                                id="name"
                                value={profile.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                disabled={!isEditing}
                                className="mt-2 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={profile.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                disabled={!isEditing}
                                className="mt-2 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <Label htmlFor="phone" className="text-gray-700 font-medium">Phone Number</Label>
                            <Input
                                id="phone"
                                value={profile.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                disabled={!isEditing}
                                className="mt-2 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={profile.address}
                                onChange={(e) => handleInputChange('address', e.target.value)}
                                disabled={!isEditing}
                                className="mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    value={profile.city}
                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                    disabled={!isEditing}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="state">State</Label>
                                <Input
                                    id="state"
                                    value={profile.state}
                                    onChange={(e) => handleInputChange('state', e.target.value)}
                                    disabled={!isEditing}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="pincode">Pincode</Label>
                            <Input
                                id="pincode"
                                value={profile.pincode}
                                onChange={(e) => handleInputChange('pincode', e.target.value)}
                                disabled={!isEditing}
                                className="mt-1"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Business Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Business Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="businessName">Business Name</Label>
                            <Input
                                id="businessName"
                                value={profile.businessName}
                                onChange={(e) => handleInputChange('businessName', e.target.value)}
                                disabled={!isEditing}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="businessType">Business Type</Label>
                            <Input
                                id="businessType"
                                value={profile.businessType}
                                onChange={(e) => handleInputChange('businessType', e.target.value)}
                                disabled={!isEditing}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="gstNumber">GST Number</Label>
                            <Input
                                id="gstNumber"
                                value={profile.gstNumber}
                                onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                                disabled={!isEditing}
                                className="mt-1"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Banking Information */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Banking Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="accountHolder">Account Holder Name</Label>
                                <Input
                                    id="accountHolder"
                                    value={profile.accountHolder}
                                    onChange={(e) => handleInputChange('accountHolder', e.target.value)}
                                    disabled={!isEditing}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="bankAccount">Bank Account Number</Label>
                                <Input
                                    id="bankAccount"
                                    value={profile.bankAccount}
                                    onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                                    disabled={!isEditing}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="ifscCode">IFSC Code</Label>
                                <Input
                                    id="ifscCode"
                                    value={profile.ifscCode}
                                    onChange={(e) => handleInputChange('ifscCode', e.target.value)}
                                    disabled={!isEditing}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Security</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button variant="outline">
                            Change Password
                        </Button>
                        <Button variant="outline">
                            Two-Factor Authentication
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PartnerProfile;
