import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    Home,
    Ticket,
    IndianRupee,
    LogOut,
    Menu,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSiteSettings } from '@/context/SiteSettingsContext';

const PartnerLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const { logout } = useAuth();
    const { siteName } = useSiteSettings();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'My Coupons', href: '/coupons', icon: Ticket },
        { name: 'Earnings', href: '/earnings', icon: IndianRupee },
    ];

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="h-screen flex bg-slate-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-emerald-600 to-green-700 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-6 border-b border-emerald-500/40">
                        <div className="flex items-center space-x-3">
                            <div className="hidden sm:block">
                                <h1 className="text-lg font-bold text-white">{siteName || 'Partner Portal'}</h1>
                                <p className="text-xs text-white/80">Partner Portal</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden text-white hover:bg-emerald-500/30"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                    ${isActive
                                            ? 'bg-white text-emerald-700 shadow-lg'
                                            : 'text-white/90 hover:bg-emerald-500/30 hover:text-white'
                                        }
                  `}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon className="h-5 w-5 mr-3" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="px-4 py-6 border-t border-emerald-500/40">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-white/90 hover:text-white hover:bg-red-500/30"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-5 w-5 mr-3" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                {/* Top bar */}
                <header className="bg-white shadow-sm border-b h-16 flex items-center justify-between px-6 lg:px-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden text-gray-600 hover:text-gray-900"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-6 w-6" />
                    </Button>

                    <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-600">
                            <span className="font-medium">Welcome back!</span> Let's grow your business together.
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default PartnerLayout;
