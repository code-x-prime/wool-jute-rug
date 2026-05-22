"use client";

import type React from "react";
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import Silk from "@/components/Silk";
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4001";

export default function ResetPasswordAdminPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("Both fields are required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsSubmitting(true);
      await axios.post(`${baseURL}/api/admin/reset-password/${token}`, { password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Invalid or expired link. Please request a new one.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-[var(--destructive)]">Invalid reset link.</p>
            <Link to="/forgot-password" className="text-[var(--accent)] hover:underline mt-2 inline-block">
              Request new link
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-primary)]">
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden min-h-screen">
        <div className="absolute inset-0 w-full h-full">
          <Silk speed={5} scale={1} color="#7B7481" noiseIntensity={1.5} rotation={0} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/40" />
        <div className="relative z-10 flex flex-col justify-center p-12 text-white w-full">
          <h2 className="text-2xl font-bold tracking-tight">Set New Password</h2>
          <p className="text-white/90 text-sm mt-2">
            Choose a strong password for your admin account.
          </p>
        </div>
      </div>

      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 lg:p-12 bg-[var(--bg-primary)]">
        <Card className="w-full max-w-md border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl">
          <CardHeader className="space-y-1 pb-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                <Lock className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <CardTitle className="text-2xl font-semibold text-[var(--text-primary)]">
                New Password
              </CardTitle>
            </div>
            <CardDescription className="text-[var(--text-secondary)]">
              Enter your new password (min 8 characters)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4 text-center py-4">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                <p className="text-green-600 font-medium">Password reset successfully!</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Redirecting to login...
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 p-4 mb-6">
                    <p className="text-sm text-[var(--destructive)] font-medium text-center">{error}</p>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[var(--text-primary)]">
                      New password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                        required
                        minLength={8}
                        className="h-11 pr-10 bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm" className="text-[var(--text-primary)]">
                      Confirm password
                    </Label>
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                      className="h-11 bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-primary)]"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Resetting...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </form>
                <p className="text-center mt-6">
                  <Link to="/login" className="text-sm text-[var(--accent)] hover:underline">
                    Back to Login
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
