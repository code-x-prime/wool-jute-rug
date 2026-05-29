"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Loader2 } from "lucide-react";

const BRAND_BROWN = "#3D1C02";
const BRAND_GOLD = "#C9A84C";

function VerifyOtpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { verifyOtp, resendVerification } = useAuth();

  const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpInputRefs = useRef([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => { setEmail(initialEmail); }, [initialEmail]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const otpString = otp.join("");

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Email is required");
    if (!/^\d{6}$/.test(otpString)) return toast.error("Enter complete 6-digit OTP");
    setIsSubmitting(true);
    try {
      await verifyOtp(email, otpString);
      toast.success("Email verified and logged in successfully!");
      
      // Auto-redirect to checkout or target destination
      const returnUrl = searchParams.get("returnUrl") || searchParams.get("redirect");
      setTimeout(() => {
        window.location.href = returnUrl ? decodeURIComponent(returnUrl) : "/";
      }, 500);
    } catch (err) {
      toast.error(err.message || "Invalid OTP. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return toast.error("Enter your email first");
    try {
      await resendVerification(email);
      toast.success("New OTP sent to your email");
      setResendCooldown(30);
      setOtp(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.message || "Failed to resend OTP");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4"
      style={{ backgroundColor: "#FAF8F5" }}
    >
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/logo.jpeg" alt="Wool Jute Rug Co" className="h-16 mx-auto object-contain" />
          </Link>
        </div>

        <div className="bg-white border rounded-sm shadow-sm overflow-hidden" style={{ borderColor: "#e8e0d5" }}>
          {/* Header */}
          <div className="px-8 py-5 border-b" style={{ backgroundColor: BRAND_BROWN }}>
            <h1 className="text-xl font-jost font-light tracking-widest uppercase text-white">
              Verify Email
            </h1>
            <p className="text-white/70 text-xs font-roboto mt-1 tracking-wide">
              Enter 6-digit OTP sent to your email
            </p>
          </div>

          <div className="p-8">
            <form onSubmit={handleVerify} className="space-y-6">

              {/* Email field */}
              <div>
                <label className="block text-xs font-jost tracking-widest uppercase mb-2" style={{ color: BRAND_BROWN }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 text-sm font-roboto border outline-none transition-all"
                  style={{ borderColor: "#d0c8b8", color: BRAND_BROWN }}
                  onFocus={(e) => (e.target.style.borderColor = BRAND_GOLD)}
                  onBlur={(e) => (e.target.style.borderColor = "#d0c8b8")}
                />
              </div>

              {/* OTP boxes */}
              <div>
                <label className="block text-xs font-jost tracking-widest uppercase mb-4" style={{ color: BRAND_BROWN }}>
                  One-Time Password
                </label>
                <div className="flex gap-3 justify-center">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      ref={(el) => (otpInputRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[i]}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-13 text-center text-xl font-bold border-2 outline-none transition-all font-jost"
                      style={{
                        height: "52px",
                        borderColor: otp[i] ? BRAND_GOLD : "#d0c8b8",
                        color: BRAND_BROWN,
                        backgroundColor: otp[i] ? "#FAF8F5" : "white",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = BRAND_GOLD)}
                      onBlur={(e) => (e.target.style.borderColor = otp[i] ? BRAND_GOLD : "#d0c8b8")}
                    />
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="flex-1 py-3 text-xs font-jost tracking-widest uppercase border transition-all duration-300"
                  style={{
                    borderColor: BRAND_BROWN,
                    color: resendCooldown > 0 ? "#b0a090" : BRAND_BROWN,
                    borderColor: resendCooldown > 0 ? "#d0c8b8" : BRAND_BROWN,
                  }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || otpString.length < 6}
                  className="flex-1 py-3 text-xs font-jost tracking-widest uppercase text-white transition-all duration-300 flex items-center justify-center"
                  style={{
                    backgroundColor: otpString.length === 6 ? BRAND_BROWN : "#b0a090",
                  }}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                </button>
              </div>
            </form>

            <div className="flex items-center gap-2 mt-6">
              <ArrowLeft className="h-3.5 w-3.5" style={{ color: BRAND_GOLD }} />
              <Link
                href="/auth"
                className="text-xs font-jost tracking-widest uppercase hover:underline"
                style={{ color: BRAND_BROWN }}
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpForm />
    </Suspense>
  );
}
