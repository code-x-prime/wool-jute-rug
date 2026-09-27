"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Clock, Loader2, XCircle, PartyPopper } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { fetchApi } from "@/lib/utils";
import { playSuccessSound, fireConfetti } from "@/lib/sound-utils";
import { Button } from "@/components/ui/button";

/**
 * Finishes an international payment after the provider redirects back.
 * `endpoint` + `body` confirm the payment server-side; the server creates the order.
 */
export default function IntlPaymentResult({ providerName, endpoint, body, missingMessage }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { fetchCart, removeCoupon } = useCart();
  const router = useRouter();
  const [state, setState] = useState("verifying"); // verifying | success | pending | error
  const [message, setMessage] = useState("");
  const [order, setOrder] = useState(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/auth?redirect=checkout");
      return;
    }
    if (!body) {
      setState("error");
      setMessage(missingMessage || "Missing payment reference.");
      return;
    }
    if (attempted.current) return;
    attempted.current = true;

    (async () => {
      try {
        const res = await fetchApi(endpoint, { method: "POST", credentials: "include", body: JSON.stringify(body) });
        if (!res?.success) throw new Error(res?.message || "Payment could not be confirmed");
        setOrder(res.data);
        const pending = res.data?.state === "PENDING";
        setState(pending ? "pending" : "success");
        removeCoupon?.();
        fetchCart?.().catch(() => { });
        if (!pending) {
          playSuccessSound();
          fireConfetti.celebration();
        }
      } catch (err) {
        setState("error");
        setMessage(err?.message || "Payment could not be confirmed.");
      }
    })();
    // body is derived from the URL once; re-running would double-submit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  if (authLoading || state === "verifying") {
    return (
      <div className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center px-4 py-20">
        <Loader2 className="mb-6 h-12 w-12 animate-spin text-brand-brown" />
        <h2 className="mb-2 text-2xl font-bold text-gray-800">Confirming your {providerName} payment</h2>
        <p className="max-w-md text-center text-gray-600">Please don&apos;t close or refresh this page.</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center px-4 py-20">
        <XCircle className="mb-6 h-14 w-14 text-red-600" />
        <h2 className="mb-2 text-2xl font-bold text-red-700">Payment not completed</h2>
        <p className="mb-8 max-w-md text-center text-gray-600">{message}</p>
        <div className="flex gap-4">
          <Link href="/checkout"><Button className="bg-brand-brown text-white hover:bg-brand-dark">Back to checkout</Button></Link>
          <Link href="/contact"><Button variant="outline">Contact support</Button></Link>
        </div>
      </div>
    );
  }

  const pending = state === "pending";
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-lg rounded-lg border bg-white p-8 text-center shadow-lg">
        {pending ? (
          <Clock className="mx-auto mb-4 h-16 w-16 text-amber-500" />
        ) : (
          <PartyPopper className="mx-auto mb-4 h-16 w-16 text-brand-brown" />
        )}
        <h1 className="mb-2 text-2xl font-bold text-gray-800">{pending ? "Order received — payment pending" : "Order confirmed!"}</h1>
        {order?.orderNumber && (
          <p className="mb-4 inline-block rounded-full bg-brand-brown/10 px-4 py-1.5 font-semibold text-brand-brown">Order #{order.orderNumber}</p>
        )}
        <div className={`my-4 flex items-center justify-center gap-2 rounded-lg p-3 ${pending ? "bg-amber-50 text-amber-800" : "bg-brand-cream text-brand-brown"}`}>
          {pending ? <Clock className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <span className="font-medium">
            {pending
              ? `${providerName} is still processing your payment. We'll email you as soon as it's confirmed.`
              : `Paid with ${providerName}${order?.amountUsd ? ` · USD ${Number(order.amountUsd).toFixed(2)}` : ""}`}
          </span>
        </div>
        <p className="mb-6 text-gray-600">A confirmation email is on its way.</p>
        <div className="flex justify-center gap-4">
          <Link href={order?.orderId ? `/account/orders/${order.orderId}` : "/account/orders"}>
            <Button className="bg-brand-brown text-white hover:bg-brand-dark">View order</Button>
          </Link>
          <Link href="/products"><Button variant="outline">Continue shopping</Button></Link>
        </div>
      </div>
    </div>
  );
}
