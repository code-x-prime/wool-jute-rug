"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { ClientOnly } from "@/components/client-only";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ResendVerificationPage() {
  const { resendVerification } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");

  // Check for stored email from registration
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedEmail = localStorage.getItem("registeredEmail");
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setStatus("submitting");
    try {
      await resendVerification(email);
      setStatus("success");
      toast.success(
        "Verification email has been sent. Please check your inbox.",
        {
          duration: 5000,
        }
      );

      // Clear stored email
      if (typeof window !== "undefined") {
        localStorage.removeItem("registeredEmail");
      }
    } catch (error) {
      setStatus("error");
      toast.error(error.message || "Failed to send verification email");
      // Reset status after showing error
      setTimeout(() => setStatus("idle"), 500);
    }
  };

  return (
    <div className="container max-w-lg mx-auto p-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Resend OTP</h1>

        <ClientOnly fallback={<div className="py-8">Loading...</div>}>
          {(status === "idle" || status === "error") && (
            <div>
              <p className="mb-4 text-gray-600">
                Enter your email address and we&apos;ll send a new 6-digit OTP.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></div>
                      Sending...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/auth" className="text-primary hover:underline">
                  Back to Login
                </Link>
              </div>
            </div>
          )}

          {status === "submitting" && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600">
                Sending verification email...
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-brand-gold/20 p-3">
                <DynamicIcon name="Mail" className="h-12 w-12 text-brand-brown" />
              </div>
              <p className="mt-4 text-brand-brown font-medium">
                Verification email sent successfully!
              </p>
              <p className="mt-2 text-gray-600">
                Please check your email and click on the verification link.
              </p>
              <Link
                href="/auth"
                className="mt-6 inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                Back to Login{" "}
                <DynamicIcon name="ArrowRight" className="ml-2 h-4 w-4" />
              </Link>
            </div>
          )}
        </ClientOnly>
      </div>
    </div>
  );
}
