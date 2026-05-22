"use client";

import type React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import Silk from "@/components/Silk";
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4001";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await axios.post(`${baseURL}/api/admin/forgot-password`, { email });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-primary)]">
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden min-h-screen">
        <div className="absolute inset-0 w-full h-full">
          <Silk speed={5} scale={1} color="#7B7481" noiseIntensity={1.5} rotation={0} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/40" />
        <div className="relative z-10 flex flex-col justify-center p-12 text-white w-full">
          <h2 className="text-2xl font-bold tracking-tight">Reset Admin Password</h2>
          <p className="text-white/90 text-sm mt-2">
            Enter your admin email to receive a password reset link. Check spam if you don&apos;t see it.
          </p>
        </div>
      </div>

      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 lg:p-12 bg-[var(--bg-primary)]">
        <Card className="w-full max-w-md border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl">
          <CardHeader className="space-y-1 pb-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                <Mail className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <CardTitle className="text-2xl font-semibold text-[var(--text-primary)]">
                Forgot Password?
              </CardTitle>
            </div>
            <CardDescription className="text-[var(--text-secondary)]">
              Enter your admin email to get a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    If that email is registered as an admin, you will receive a password reset link shortly.
                    Check your spam folder.
                  </p>
                </div>
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
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
                    <Label htmlFor="email" className="text-[var(--text-primary)]">
                      Admin email
                    </Label>
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
                  <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
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
