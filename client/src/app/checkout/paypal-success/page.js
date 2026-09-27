"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import IntlPaymentResult from "@/components/IntlPaymentResult";

function PayPalReturn() {
  const params = useSearchParams();
  const paypalOrderId = params.get("token");
  return (
    <IntlPaymentResult
      providerName="PayPal"
      endpoint="/payment/paypal/capture"
      body={paypalOrderId ? { paypalOrderId } : null}
      missingMessage="PayPal did not return a payment reference. If you were charged, please contact support."
    />
  );
}

export default function PayPalSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PayPalReturn />
    </Suspense>
  );
}
