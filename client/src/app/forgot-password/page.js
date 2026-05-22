"use client";

import { useState } from "react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";

const BRAND_BROWN = "#3D1C02";
const BRAND_GOLD = "#C9A84C";

export default function ForgotPasswordPage() {
  const { forgotPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
      toast.success("Reset link sent! Check your inbox.");
    } catch (err) {
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4"
      style={{ backgroundColor: "#FAF8F5" }}
    >
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/logo.jpeg" alt="Wool Jute Rug Co" className="h-16 mx-auto object-contain" />
          </Link>
        </div>

        <div className="bg-white border rounded-sm shadow-sm overflow-hidden" style={{ borderColor: "#e8e0d5" }}>
          {/* Header strip */}
          <div className="px-8 py-5 border-b" style={{ backgroundColor: BRAND_BROWN, borderColor: BRAND_BROWN }}>
            <h1 className="text-xl font-jost font-light tracking-widest uppercase text-white">
              Forgot Password
            </h1>
            <p className="text-white/70 text-xs font-roboto mt-1 tracking-wide">
              Enter your email — we&apos;ll send a reset link
            </p>
          </div>

          <div className="p-8">
            {sent ? (
              <div className="text-center py-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "#FAF8F5" }}
                >
                  <Mail className="h-7 w-7" style={{ color: BRAND_GOLD }} />
                </div>
                <p className="font-jost text-base tracking-wide mb-1" style={{ color: BRAND_BROWN }}>
                  Check your inbox
                </p>
                <p className="text-sm text-gray-500 font-roboto mb-6">
                  Reset link sent to <strong>{email}</strong>
                </p>
                <Link
                  href="/auth"
                  className="text-sm font-jost tracking-widest uppercase hover:underline"
                  style={{ color: BRAND_BROWN }}
                >
                  Back to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    className="block text-xs font-jost tracking-widest uppercase mb-2"
                    style={{ color: BRAND_BROWN }}
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                      style={{ color: "#b0a090" }}
                    />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 text-sm font-roboto border outline-none transition-all"
                      style={{
                        borderColor: "#d0c8b8",
                        color: BRAND_BROWN,
                      }}
                      onFocus={(e) => (e.target.style.borderColor = BRAND_GOLD)}
                      onBlur={(e) => (e.target.style.borderColor = "#d0c8b8")}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="w-full py-3 text-xs font-jost tracking-widest uppercase text-white transition-all duration-300 flex items-center justify-center"
                  style={{ backgroundColor: BRAND_BROWN }}
                  onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = "#5a2a05")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND_BROWN)}
                >
                  {submitting || loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </button>

                <div className="flex items-center gap-2 pt-1">
                  <ArrowLeft className="h-3.5 w-3.5" style={{ color: BRAND_GOLD }} />
                  <Link
                    href="/auth"
                    className="text-xs font-jost tracking-widest uppercase hover:underline"
                    style={{ color: BRAND_BROWN }}
                  >
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
