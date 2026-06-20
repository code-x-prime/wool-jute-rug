"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { ClientOnly } from "@/components/client-only";
import { DynamicIcon } from "@/components/dynamic-icon";

export default function AccountLayout({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D1C02]"></div>
      </div>
    );
  }

  // List of navigation items with their paths and icons
  const navItems = [
    { path: "/account", label: "Profile", icon: "User" },
    { path: "/account/orders", label: "Orders", icon: "Package" },
    { path: "/account/returns", label: "Returns", icon: "RotateCcw" },
    { path: "/account/addresses", label: "Addresses", icon: "MapPin" },
    { path: "/wishlist", label: "Wishlist", icon: "Heart" },
  ];

  // Check if the current path matches a nav item
  const isActive = (path) => pathname === path;

  // Special pages like order details or change password that should not show the sidebar
  const specialPages = ["/account/orders/", "/account/change-password", "/account/returns/"];

  // Check if current path is a special page where we don't show the sidebar
  const isSpecialPage = specialPages.some(
    (path) => pathname.startsWith(path) && pathname !== "/account/orders"
  );

  return (
    <ClientOnly>
      <div className="max-w-6xl mx-auto py-8 px-4">
        {isSpecialPage ? (
          // For pages like order details, just render the children
          children
        ) : (
          // For regular account pages, render with the sidebar
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sticky top-24">
                {/* Avatar + name */}
                <div className="flex flex-col items-center mb-6 pb-6 border-b border-gray-100">
                  <div className="h-14 w-14 rounded-full bg-[#3D1C02] flex items-center justify-center mb-3 shadow-sm">
                    <span className="text-white text-lg font-semibold tracking-wide">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                    </span>
                  </div>
                  {user?.name && (
                    <p className="text-sm font-medium text-gray-900 text-center truncate max-w-full">
                      {user.name}
                    </p>
                  )}
                  <p className="text-xs text-[#C9A84C] uppercase tracking-widest mt-0.5">My Account</p>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center px-3 py-2.5 rounded-full text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? "bg-[#3D1C02] text-white"
                          : "text-gray-600 hover:bg-[#3D1C02]/10 hover:text-[#3D1C02]"
                      }`}
                    >
                      <DynamicIcon
                        name={item.icon}
                        className="mr-2.5 h-4 w-4 flex-shrink-0"
                      />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main content */}
            <div className="md:col-span-3">{children}</div>
          </div>
        )}
      </div>
    </ClientOnly>
  );
}
