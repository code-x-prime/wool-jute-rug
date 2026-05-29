"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { AuthRedirect } from "@/components/auth-redirect";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2, ArrowRight } from "lucide-react";
import Image from "next/image";

const TABS = ["login", "register", "verify-otp"];
const NAV_TABS = ["login", "register"];

export default function AuthPage() {
  const searchParams = useSearchParams();
  const { login, register, verifyOtp, resendVerification } = useAuth();

  const queryTab = (searchParams.get("tab") || "login").toLowerCase();
  const initialTab = TABS.includes(queryTab) ? queryTab : "login";
  const [activeTab, setActiveTab] = useState(initialTab);

  // OAuth: enabled providers from admin (Google, Facebook, etc.)
  const [enabledOAuthProviders, setEnabledOAuthProviders] = useState([]);

  useEffect(() => {
    const fetchOAuthProviders = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api";
        const res = await fetch(`${base}/public/oauth-providers`, { credentials: "include" });
        const data = await res.json();
        if (data?.success && Array.isArray(data?.data?.providers)) {
          setEnabledOAuthProviders(data.data.providers);
        }
      } catch (_) {
        setEnabledOAuthProviders([]);
      }
    };
    fetchOAuthProviders();
  }, []);

  // Persist selected tab in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", activeTab);
    const email = searchParams.get("email");
    if (email) params.set("email", email);
    const href = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", href);
  }, [activeTab, searchParams]);

  const emailFromQuery = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const [pendingEmail, setPendingEmail] = useState("");
  useEffect(() => {
    const stored = localStorage.getItem("pendingEmail") || localStorage.getItem("registeredEmail") || "";
    const chosen = emailFromQuery || stored;
    if (chosen) setPendingEmail(chosen);
  }, [emailFromQuery]);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpInputRefs = useRef([]);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((x) => x - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Email and password are required");
      return;
    }
    setLoginSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      sessionStorage.setItem("justLoggedIn", "true");
      const returnUrl = searchParams.get("returnUrl") || searchParams.get("redirect");
      setTimeout(() => {
        window.location.href = returnUrl ? decodeURIComponent(returnUrl) : "/";
      }, 300);
    } catch (err) {
      const msg = err.message || "Login failed";
      if (msg.toLowerCase().includes("verify")) {
        toast.error("Please verify with OTP first");
        setActiveTab("verify-otp");
        if (loginEmail) {
          localStorage.setItem("pendingEmail", loginEmail);
          setPendingEmail(loginEmail);
        }
      } else {
        toast.error(msg);
      }
    } finally {
      setLoginSubmitting(false);
    }
  };

  const isPasswordValid = () =>
    form.password.length >= 8 &&
    /[A-Z]/.test(form.password) &&
    /[a-z]/.test(form.password) &&
    /\d/.test(form.password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(form.password) &&
    form.password === form.confirmPassword &&
    form.name.trim().length >= 3 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);

  const validateRegister = () => {
    if (form.name.trim().length < 3) return toast.error("Name should be at least 3 characters"), false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error("Enter a valid email"), false;
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters long"), false;
    if (!/[A-Z]/.test(form.password)) return toast.error("Password must contain at least one uppercase letter"), false;
    if (!/[a-z]/.test(form.password)) return toast.error("Password must contain at least one lowercase letter"), false;
    if (!/\d/.test(form.password)) return toast.error("Password must contain at least one number"), false;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) return toast.error("Password must contain at least one special character"), false;
    if (form.password !== form.confirmPassword) return toast.error("Passwords do not match"), false;
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateRegister()) return;
    setRegisterSubmitting(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        referralCode: form.referralCode?.trim() || undefined,
      });
      localStorage.setItem("pendingEmail", form.email);
      toast.success("Account created. Enter the OTP sent to your email.");
      setActiveTab("verify-otp");
      setPendingEmail(form.email);
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      toast.error(err.message || "Registration failed");
    } finally {
      setRegisterSubmitting(false);
    }
  };

  const otpString = otp.join("");
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!pendingEmail) return toast.error("Email required");
    if (!/^\d{6}$/.test(otpString)) return toast.error("Enter 6-digit OTP");
    setVerifySubmitting(true);
    try {
      await verifyOtp(pendingEmail, otpString);
      toast.success("Email verified and logged in successfully!");
      
      // Auto-redirect to checkout or target destination
      const returnUrl = searchParams.get("returnUrl") || searchParams.get("redirect");
      setTimeout(() => {
        window.location.href = returnUrl ? decodeURIComponent(returnUrl) : "/";
      }, 500);
    } catch (err) {
      toast.error(err.message || "Failed to verify OTP");
    } finally {
      setVerifySubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return toast.error("Enter your email to resend OTP");
    try {
      await resendVerification(pendingEmail);
      toast.success("OTP sent to your email");
      setResendCooldown(30);
    } catch (err) {
      toast.error(err.message || "Failed to resend OTP");
    }
  };

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

  const handleOAuthLogin = (provider) => {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api";
    const returnUrl = searchParams.get("returnUrl") || searchParams.get("redirect") || "/";
    window.location.href = `${base}/auth/${provider}?redirect=${encodeURIComponent(returnUrl)}`;
  };

  return (
    <AuthRedirect>
      <div className="min-h-screen flex font-jost bg-[#FDF8F0]">
        <Toaster position="top-center" richColors />

        {/* Left Side: Image / Branding */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#2B1E16]">

          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src="/auth.jpg"
              alt="Premium Rugs"
              fill
              className="object-cover opacity-35"
              priority
            />

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/30"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between w-full h-full p-14 text-white">

            {/* Logo */}
            <div>
              <Link href="/" className="inline-block">
                <span className="text-3xl xl:text-4xl font-bold tracking-[0.25em] text-[#D4AF37]">
                  THE WOOL JUTE RUG CO.
                </span>
              </Link>
            </div>

            {/* Main Text */}
            <div className="max-w-xl space-y-6">
              <h2 className="text-5xl xl:text-6xl font-semibold leading-tight text-white drop-shadow-lg">
                Crafting <span className="text-[#D4AF37]">Timeless</span> Foundations
              </h2>

              <p className="text-lg xl:text-xl text-gray-200 leading-relaxed font-light">
                Experience unparalleled craftsmanship and heritage woven into every fiber.
                Elevate your interiors with luxurious handmade rugs designed for modern living.
              </p>

            </div>

            {/* Bottom Small Text */}
            <div className="text-sm tracking-widest text-gray-300 uppercase">
              Premium Handmade Rugs • Timeless Design • Luxury Living
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">

            {/* Header section for form */}
            <div className="mb-10 text-center lg:text-left">
              <Link href="/" className="inline-block lg:hidden mb-8">
                <span className="text-2xl font-bold tracking-widest text-brand-brown">THE WOOL JUTE RUG CO.</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {activeTab === "login" && "Welcome Back"}
                {activeTab === "register" && "Create an Account"}
                {activeTab === "verify-otp" && "Verify Your Email"}
              </h1>
              <p className="text-gray-500 text-sm">
                {activeTab === "login" && "Enter your details below to sign in to your account."}
                {activeTab === "register" && "Join us to save your favorite rugs and track your orders."}
                {activeTab === "verify-otp" && "We've sent a 6-digit code to your email."}
              </p>
            </div>

            {/* Tab switcher */}
            {activeTab !== "verify-otp" && (
              <div className="flex border border-gray-200 p-1 rounded-full mb-8 bg-white/50 shadow-sm">
                {NAV_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === tab
                      ? "bg-brand-brown text-white shadow-md"
                      : "text-gray-500 hover:text-brand-brown"
                      }`}
                  >
                    {tab === "login" && "Log In"}
                    {tab === "register" && "Sign Up"}
                  </button>
                ))}
              </div>
            )}

            {/* OAuth buttons */}
            {enabledOAuthProviders.length > 0 && activeTab !== "verify-otp" && (
              <div className="mb-8">
                {enabledOAuthProviders.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant="outline"
                    className="w-full h-12 mb-3 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl shadow-sm transition-all flex items-center justify-center"
                    onClick={() => handleOAuthLogin(p)}
                  >
                    {p === "google" && (
                      <>
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                      </>
                    )}
                    {p === "facebook" && "Continue with Facebook"}
                    {p === "twitter" && "Continue with Twitter"}
                  </Button>
                ))}

                <div className="relative mt-8 mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-widest">
                    <span className="bg-[#FDF8F0] px-4 text-gray-400">Or continue with email</span>
                  </div>
                </div>
              </div>
            )}

            {/* LOGIN FORM */}
            {activeTab === "login" && (
              <form className="space-y-5" onSubmit={handleLogin}>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-12 h-12 bg-white border-gray-200 focus:border-brand-brown focus:ring-brand-brown rounded-xl transition-all shadow-sm"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <Link href="/forgot-password" className="text-xs font-semibold text-brand-brown hover:text-brand-dark transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-12 pr-12 h-12 bg-white border-gray-200 focus:border-brand-brown focus:ring-brand-brown rounded-xl transition-all shadow-sm"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-brown transition-colors"
                      onClick={() => setShowLoginPassword((s) => !s)}
                    >
                      {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 mt-4 bg-brand-brown hover:bg-brand-dark text-white rounded-xl shadow-lg shadow-brand-brown/20 font-semibold text-base flex items-center justify-center transition-all duration-300"
                  disabled={loginSubmitting}
                >
                  {loginSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Sign In <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* REGISTER FORM */}
            {activeTab === "register" && (
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className="pl-12 h-12 bg-white border-gray-200 focus:border-brand-brown focus:ring-brand-brown rounded-xl shadow-sm"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      className="pl-12 h-12 bg-white border-gray-200 focus:border-brand-brown focus:ring-brand-brown rounded-xl shadow-sm"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Phone <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      className="pl-12 h-12 bg-white border-gray-200 focus:border-brand-brown focus:ring-brand-brown rounded-xl shadow-sm"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showRegisterPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      className="pl-12 pr-12 h-12 bg-white border-gray-200 focus:border-brand-brown focus:ring-brand-brown rounded-xl shadow-sm"
                      placeholder="Create a password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-brown transition-colors"
                      onClick={() => setShowRegisterPassword((s) => !s)}
                    >
                      {showRegisterPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {form.password.length > 0 && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Password must contain:</p>
                      <ul className="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                        {[
                          [form.password.length >= 8, "8+ characters"],
                          [/[A-Z]/.test(form.password), "One uppercase"],
                          [/[a-z]/.test(form.password), "One lowercase"],
                          [/\d/.test(form.password), "One number"],
                          [/[!@#$%^&*(),.?":{}|<>]/.test(form.password), "One special char"],
                        ].map(([ok, label], i) => (
                          <li key={i} className={`flex items-center gap-1.5 ${ok ? "text-brand-brown font-medium" : ""}`}>
                            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${ok ? 'bg-brand-brown/20' : 'bg-gray-100'}`}>
                              <span className="text-[8px]">{ok ? "✓" : ""}</span>
                            </div>
                            {label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showRegisterPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      className="pl-12 h-12 bg-white border-gray-200 focus:border-brand-brown focus:ring-brand-brown rounded-xl shadow-sm"
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                  {form.confirmPassword && (
                    <p className={`mt-2 text-xs font-medium flex items-center ${form.password === form.confirmPassword ? "text-brand-brown" : "text-red-500"}`}>
                      {form.password === form.confirmPassword ? (
                        <><span className="mr-1">✓</span> Passwords match</>
                      ) : (
                        <><span className="mr-1">✕</span> Passwords do not match</>
                      )}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 mt-6 bg-brand-brown hover:bg-brand-dark text-white rounded-xl shadow-lg shadow-brand-brown/20 font-semibold text-base transition-all duration-300"
                  disabled={registerSubmitting || !isPasswordValid()}
                >
                  {registerSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}
                </Button>
              </form>
            )}

            {/* VERIFY OTP FORM */}
            {activeTab === "verify-otp" && (
              <form className="space-y-6" onSubmit={handleVerify}>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="space-y-1.5 mb-6">
                    <label className="text-sm font-medium text-gray-700">Verify Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="email"
                        value={pendingEmail}
                        onChange={(e) => setPendingEmail(e.target.value)}
                        className="pl-12 h-12 bg-gray-50 border-gray-200 text-gray-600 rounded-xl cursor-not-allowed"
                        placeholder="you@example.com"
                        readOnly
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-4 text-center">Enter 6-digit OTP code</label>
                    <div className="flex gap-2 sm:gap-3 justify-center">
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
                          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-brand-brown focus:ring-2 focus:ring-brand-brown/20 outline-none transition-all shadow-inner"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      type="submit"
                      className="w-full h-12 bg-brand-brown hover:bg-brand-dark text-white rounded-xl shadow-lg shadow-brand-brown/20 font-semibold text-base transition-all duration-300"
                      disabled={verifySubmitting}
                    >
                      {verifySubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Continue"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all"
                      onClick={handleResend}
                      disabled={resendCooldown > 0}
                    >
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend OTP Code"}
                    </Button>
                  </div>
                </div>

                <p className="text-center text-sm text-gray-500">
                  Entered wrong email?{" "}
                  <button type="button" className="text-brand-brown font-semibold hover:underline" onClick={() => setActiveTab("register")}>
                    Go back to sign up
                  </button>
                </p>
              </form>
            )}

            <div className="mt-10 pt-6 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500 leading-relaxed">
                By continuing, you agree to The Wool Jute Rug Co.&apos;s <br />
                <Link href="/terms-conditions" className="text-brand-brown font-semibold hover:underline">Terms of Service</Link> and <Link href="/privacy-policy" className="text-brand-brown font-semibold hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthRedirect>
  );
}
