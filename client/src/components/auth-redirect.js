"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function AuthRedirect({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user just logged in
    const justLoggedIn = sessionStorage.getItem("justLoggedIn");

    // If user just logged in, don't redirect. Do NOT remove the flag here;
    // RouteGuard is responsible for clearing it so the suppression works reliably.
    if (justLoggedIn === "true") {
      return;
    }

    // Check if there's a redirect parameter - if so, don't auto-redirect to account
    const hasRedirect =
      searchParams.get("returnUrl") || searchParams.get("redirect");

    // Only redirect if authenticated, not loading, and no redirect parameter
    if (!loading && isAuthenticated && !hasRedirect) {
      router.replace("/account");
    }
  }, [isAuthenticated, loading, router, searchParams]);

  // Always render children - don't show loading or redirecting screens
  return children;
}
