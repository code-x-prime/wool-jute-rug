"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, ArrowRight, Lock, Shield, ShieldCheck } from "lucide-react";
import Silk from "@/components/Silk";
import api from "@/api/api";

interface PublicSettings {
  siteName?: string;
  siteEmail?: string;
  sitePhone?: string;
  siteAddress?: string;
}

export default function LoginPage() {
  const { login, isAuthenticated, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [storeInfo, setStoreInfo] = useState<PublicSettings>({});

  // Fetch store name and details for login page (public API)
  useEffect(() => {
    api
      .get("/public/settings")
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setStoreInfo({
            siteName: res.data.data.siteName || "Admin",
            siteEmail: res.data.data.siteEmail,
            sitePhone: res.data.data.sitePhone,
            siteAddress: res.data.data.siteAddress,
          });
        }
      })
      .catch(() => {
        setStoreInfo({ siteName: "Admin" });
      });
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim()) {
      setFormError("Email is required");
      return;
    }
    if (!password) {
      setFormError("Password is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
    } catch (err: unknown) {
      console.error("Login error:", err);
      setFormError(err instanceof Error ? err.message : "Failed to login. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const siteName = storeInfo.siteName || "Admin";
  const siteEmail = storeInfo.siteEmail;
  const sitePhone = storeInfo.sitePhone;
  const siteAddress = storeInfo.siteAddress;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-primary)]">
      {/* Left Side - Branding with Silk animated background */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden min-h-screen">
        <div className="absolute inset-0 w-full h-full">
          <Silk
            speed={5}
            scale={1}
            color="#7B7481"
            noiseIntensity={1.5}
            rotation={0}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/40" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{siteName}</h2>
            <p className="text-white/90 text-sm mt-1">Admin Dashboard</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Secure Admin Access</p>
                <p className="text-sm text-white/80">Protected login with encrypted credentials</p>
              </div>
            </div>
            <div className="space-y-1 text-sm text-white/80">
              {siteEmail && <p>Email: {siteEmail}</p>}
              {sitePhone && <p>Phone: {sitePhone}</p>}
              {siteAddress && <p className="text-white/70">{siteAddress}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 lg:p-12 bg-[var(--bg-primary)]">
        <Card className="w-full max-w-md border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl">
          <CardHeader className="space-y-1 pb-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                <Lock className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <CardTitle className="text-2xl font-semibold text-[var(--text-primary)]">
                {siteName} Admin
              </CardTitle>
            </div>
            <CardDescription className="text-[var(--text-secondary)]">
              Enter your credentials to access the admin dashboard
            </CardDescription>
            <div className="flex items-center gap-2 pt-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-xs text-[var(--text-secondary)]">Secured connection</span>
            </div>
          </CardHeader>
          <CardContent>
            {(error || formError) && (
              <div className="rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 p-4 mb-6">
                <p className="text-sm text-[var(--destructive)] font-medium text-center">
                  {formError || error}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[var(--text-primary)]">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="h-11 bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[var(--text-primary)]">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="h-11 pr-10 bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Sign in to Dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-center">
                <Link
                  to="/forgot-password"
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  Forgot password?
                </Link>
              </p>
            </form>

            <p className="text-xs text-[var(--text-secondary)] text-center mt-6">
              Authorized personnel only. All access is logged.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
