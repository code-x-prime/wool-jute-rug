"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import IntlPaymentResult from "@/components/IntlPaymentResult";

function PayoneerReturn() {
  const params = useSearchParams();
  const longId = params.get("longId");
  const transactionId = params.get("transactionId");
  return (
    <IntlPaymentResult
      providerName="Payoneer"
      endpoint="/payment/payoneer/verify"
      body={longId || transactionId ? { longId, transactionId } : null}
      missingMessage="Payoneer did not return a payment reference. If you were charged, please contact support."
    />
  );
}

export default function PayoneerSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PayoneerReturn />
    </Suspense>
  );
}
