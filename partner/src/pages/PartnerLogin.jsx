import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import apiService from '@/services/apiService';

const PartnerLogin = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Password change dialog state
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);

    // Forgot password dialog state
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();
    const { siteName } = useSiteSettings();

    useEffect(() => {
        // Redirect if already logged in
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            toast.error('Please fill in all fields');
            return;
        }

        setIsLoading(true);

        try {
            const data = await apiService.login(formData);

            if (data.success) {
                // Store token and partner data
                localStorage.setItem('partnerToken', data.data.token);
                localStorage.setItem('partnerData', JSON.stringify(data.data.partner));

                if (data.data.requiresPasswordChange) {
                    // Show password change dialog if using demo password
                    setShowPasswordChange(true);
                    toast.warning('Please change your demo password for security');
                } else {
                    login(data.data.token, data.data.partner);
                    toast.success('Login successful!');
                    navigate('/');
                }
            } else {
                toast.error(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error(error.message || 'Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setPasswordChangeLoading(true);

        try {
            await apiService.changePassword({
                currentPassword: formData.password, // Use the demo password
                newPassword: newPassword
            });

            toast.success('Password changed successfully!');
            setShowPasswordChange(false);

            // Now login with new credentials
            login(localStorage.getItem('partnerToken'), JSON.parse(localStorage.getItem('partnerData')));
            navigate('/');
        } catch (error) {
            console.error('Password change error:', error);
            toast.error(error.message || 'Failed to change password');
        } finally {
            setPasswordChangeLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();

        if (!forgotEmail) {
            toast.error('Please enter your email');
            return;
        }

        setForgotLoading(true);

        try {
            await apiService.forgotPassword(forgotEmail);
            toast.success('If your email is registered, you\'ll receive reset instructions');
            setShowForgotPassword(false);
        } catch (error) {
            console.error('Forgot password error:', error);
            toast.error(error.message || 'Failed to send reset email');
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-100 via-green-50 to-emerald-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Logo and Header */}
                <div className="text-center">
                    {siteName && (
                        <div className="inline-block px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 shadow-md">
                            <h2 className="text-xl md:text-2xl font-bold text-white">
                                {siteName}
                            </h2>
                        </div>
                    )}
                    <h3 className="text-xl font-semibold text-gray-800 mt-4 flex items-center justify-center gap-2">
                        Partner <span className="text-red-500 font-bold">Portal</span>
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Sign in to access your partner dashboard
                    </p>
                </div>

                <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm rounded-lg overflow-hidden">
                    <CardHeader className="text-center pb-6 bg-gradient-to-r from-emerald-600 to-green-600 rounded-t-lg">
                        <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
                        <p className="text-white/90">Enter your credentials to continue</p>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="email" className="text-gray-700 font-semibold flex items-center mb-2">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                                        Email Address
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Enter your email"
                                        className="h-12 border-2 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-200 rounded-lg"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="password" className="text-gray-700 font-semibold flex items-center mb-2">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                                        Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Enter your password"
                                            className="h-12 pr-12 border-2 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-200 rounded-xl"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1 h-10 w-10 text-gray-500 hover:text-emerald-600 transition-colors"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold shadow-lg shadow-emerald-200 hover:shadow-xl transition-all duration-300 rounded-xl"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In to Partner Portal'
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="text-sm text-red-500 hover:text-red-600 underline font-medium transition-colors duration-200"
                            >
                                Forgot your password?
                            </button>
                        </div>


                    </CardContent>
                </Card>

                {/* Password Change Dialog */}
                <Dialog open={showPasswordChange} onOpenChange={setShowPasswordChange}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-gray-800 flex items-center">
                                <span className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></span>
                                Change Your Password
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                                You're using the demo password. Please set your own secure password for better security.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <Label htmlFor="newPassword" className="text-gray-700 font-medium">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Minimum 6 characters"
                                    className="mt-1 h-11 border-2 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-lg"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirm New Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter your new password"
                                    className="mt-1 h-11 border-2 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-lg"
                                    required
                                />
                            </div>

                            <DialogFooter className="pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowPasswordChange(false)}
                                    className="mr-2"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={passwordChangeLoading}
                                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                                >
                                    {passwordChangeLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Changing...
                                        </>
                                    ) : (
                                        'Change Password'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Forgot Password Dialog */}
                <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                    <DialogContent className="sm:max-w-[425px] rounded-lg p-0 overflow-hidden [&>button]:text-white [&>button]:hover:text-white [&>button]:right-4 [&>button]:top-4">
                        <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 pt-6 pb-4">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-white flex items-center">
                                    <span className="w-3 h-3 bg-white rounded-full mr-2"></span>
                                    Reset Password
                                </DialogTitle>
                                <DialogDescription className="text-white/90 mt-1">
                                    Enter your email address and we'll send you reset instructions to recover your account.
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <form onSubmit={handleForgotPassword} className="space-y-4 p-6 pt-2">
                            <div>
                                <Label htmlFor="forgotEmail" className="text-gray-700 font-medium">Email Address</Label>
                                <Input
                                    id="forgotEmail"
                                    type="email"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    placeholder="Enter your registered email"
                                    className="mt-1 h-11 border-2 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-lg"
                                    required
                                />
                            </div>

                            <DialogFooter className="pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowForgotPassword(false)}
                                    className="mr-2 rounded-lg"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={forgotLoading}
                                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg"
                                >
                                    {forgotLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default PartnerLogin;
