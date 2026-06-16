"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { fetchApi } from "@/lib/utils";
import { playSuccessSound, fireConfetti } from "@/lib/sound-utils";
import { CheckCircle, Loader2, XCircle, PartyPopper } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PayoneerSuccessPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { clearCart } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [errorMessage, setErrorMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [confettiCannon, setConfettiCannon] = useState(false);

  const verificationAttempted = useRef(false);

  // Extract query params
  const paymentRef = searchParams.get("ref");
  const shippingAddressId = searchParams.get("addr");
  const payoneerPaymentId = searchParams.get("paymentId") || searchParams.get("payment_id") || searchParams.get("transactionId");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/auth?redirect=checkout");
      return;
    }

    if (!paymentRef || !shippingAddressId) {
      setStatus("error");
      setErrorMessage("Missing payment reference or shipping details.");
      return;
    }

    if (verificationAttempted.current) return;
    verificationAttempted.current = true;

    const verifyPayment = async () => {
      try {
        const res = await fetchApi("/payment/payoneer/verify", {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({
            paymentRef,
            payoneerPaymentId: payoneerPaymentId || null,
            shippingAddressId,
          }),
        });

        if (res.success) {
          setOrderNumber(res.data.orderNumber);
          setStatus("success");
          clearCart();
          playSuccessSound();
          fireConfetti.celebration();

          // Trigger side confetti shortly after
          setTimeout(() => {
            setConfettiCannon(true);
            fireConfetti.sides();
          }, 1500);
        } else {
          setStatus("error");
          setErrorMessage(res.message || "Payment verification failed.");
        }
      } catch (err) {
        console.error("Payoneer verification error:", err);
        setStatus("error");
        setErrorMessage(err.message || "Failed to verify Payoneer payment.");
      }
    };

    verifyPayment();
  }, [isAuthenticated, authLoading, paymentRef, shippingAddressId, payoneerPaymentId, router, clearCart]);

  // Countdown timer for redirection on success
  useEffect(() => {
    if (status === "success" && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === "success" && redirectCountdown === 0) {
      router.push("/account/orders");
    }
  }, [status, redirectCountdown, router]);

  if (authLoading || status === "verifying") {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="h-20 w-20 bg-brand-brown/10 rounded-full flex items-center justify-center mb-6">
          <Loader2 className="h-10 w-10 text-brand-brown animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying Payment</h2>
        <p className="text-gray-600 text-center max-w-md">
          Please wait while we confirm your Payoneer payment and secure your order.
          Do not refresh or close this page.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <XCircle className="h-12 w-12 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-red-700 mb-2">Payment Verification Failed</h2>
        <p className="text-gray-600 text-center max-w-md mb-8">{errorMessage}</p>
        <div className="flex gap-4">
          <Link href="/checkout">
            <Button className="bg-brand-brown hover:bg-brand-dark text-white">
              Try Again
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline">Contact Support</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-lg mx-auto bg-white p-8 rounded-lg border shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-brown/5 to-transparent z-0"></div>

        <div className="relative z-10">
          <div className="relative flex justify-center">
            <div className="h-36 w-36 bg-brand-brown/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <PartyPopper className={`h-20 w-20 text-brand-brown ${confettiCannon ? "animate-pulse" : ""}`} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-ping absolute h-40 w-40 rounded-full bg-brand-brown opacity-20"></div>
              <div className="animate-ping absolute h-32 w-32 rounded-full bg-yellow-500 opacity-10 delay-150"></div>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2 text-gray-800 animate-pulse">Woohoo!</h1>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Order Confirmed!</h2>

            {orderNumber && (
              <div className="bg-brand-brown/10 py-2 px-4 rounded-full inline-block mb-3">
                <p className="text-lg font-semibold text-brand-brown">Order #{orderNumber}</p>
              </div>
            )}

            <div className="my-6 flex items-center justify-center bg-brand-cream p-4 rounded-lg">
              <CheckCircle className="h-8 w-8 text-brand-brown mr-2" />
              <p className="text-xl text-brand-brown font-medium">Payment Successful</p>
            </div>

            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Thank you for your purchase! Your order has been successfully placed via Payoneer and you will receive an email confirmation shortly.
            </p>

            <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                <p className="text-blue-700 font-medium">
                  Redirecting to orders page in {redirectCountdown} seconds...
                </p>
              </div>
              <Link href="/account/orders">
                <button className="text-blue-600 hover:text-blue-800 text-sm underline font-medium">
                  Go to orders now →
                </button>
              </Link>
            </div>

            <div className="flex justify-center gap-4">
              <Link href="/account/orders">
                <Button className="bg-brand-brown hover:bg-brand-dark text-white">My Orders</Button>
              </Link>
              <Link href="/products">
                <Button variant="outline">Continue Shopping</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
