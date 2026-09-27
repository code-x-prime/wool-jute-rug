// PayPal Orders v2 — redirect (hosted approval) flow.
// 1. create-order: server prices the cart, stores an IntlPaymentSession, creates a PayPal order for that exact USD amount.
// 2. Buyer approves on PayPal and is sent back to /checkout/paypal-success?token=<paypalOrderId>.
// 3. capture: server re-checks stock, captures, verifies amount/currency/custom_id, then creates the order once.
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { decrypt } from "../utils/encryption.js";
import { buildIntlQuote, assertStock, createOrderFromSession, findDuplicateOrder, DuplicatePaymentError } from "../utils/intlCheckout.js";

export async function getPayPalConfig({ requireEnabled = true } = {}) {
  const settings = await prisma.siteSettings.findFirst();
  if ((requireEnabled && !settings?.paypalEnabled) || !settings?.paypalClientId || !settings?.paypalClientSecret) {
    throw new ApiError(400, "PayPal is not configured or not enabled");
  }
  const clientSecret = settings.paypalClientSecret.startsWith("enc:")
    ? decrypt(settings.paypalClientSecret.slice(4))
    : settings.paypalClientSecret;
  const mode = settings.paypalMode === "live" ? "live" : "sandbox";
  return {
    clientId: settings.paypalClientId.trim(),
    clientSecret,
    mode,
    siteName: settings.siteName || "Store",
    baseUrl: mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
  };
}

export async function getPayPalAccessToken(config) {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const res = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new ApiError(502, `PayPal authentication failed (${config.mode}): ${data.error_description || data.error || res.status}`);
  }
  return data.access_token;
}

async function paypalRequest(config, token, path, { method = "GET", body, requestId } = {}) {
  const res = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(requestId && { "PayPal-Request-Id": requestId }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const frontendUrl = () => (process.env.FRONTEND_URL || "").replace(/\/+$/, "");

// ─── GET /payment/paypal/client-id (public) ───────────────────────────────────
export const getPayPalClientId = asyncHandler(async (req, res) => {
  const settings = await prisma.siteSettings.findFirst({
    select: { paypalClientId: true, paypalEnabled: true, paypalMode: true, paypalClientSecret: true },
  });
  if (!settings?.paypalEnabled || !settings?.paypalClientId || !settings?.paypalClientSecret) {
    return res.status(404).json(new ApiResponsive(404, null, "PayPal not enabled"));
  }
  res.status(200).json(new ApiResponsive(200, { clientId: settings.paypalClientId, mode: settings.paypalMode || "sandbox" }, "OK"));
});

// ─── POST /payment/intl/quote — show the exact USD amount before redirecting ──
export const getIntlQuote = asyncHandler(async (req, res) => {
  const { shippingAddressId, couponCode } = req.body;
  if (!shippingAddressId) throw new ApiError(400, "Shipping address required");
  const { quote } = await buildIntlQuote(req.user.id, shippingAddressId, couponCode);
  res.status(200).json(new ApiResponsive(200, {
    subTotal: quote.subTotal,
    discount: quote.discount,
    shippingCost: quote.shippingCost,
    total: quote.total,
    amountUsd: quote.amountUsd,
    exchangeRate: quote.exchangeRate,
    currency: quote.currency,
  }, "Quote"));
});

// ─── POST /payment/paypal/create-order ────────────────────────────────────────
export const createPayPalOrder = asyncHandler(async (req, res) => {
  const { shippingAddressId, couponCode } = req.body;
  const userId = req.user.id;
  if (!shippingAddressId) throw new ApiError(400, "Shipping address required");

  const config = await getPayPalConfig();
  if (!frontendUrl()) throw new ApiError(500, "FRONTEND_URL is not configured on the server");
  const { quote } = await buildIntlQuote(userId, shippingAddressId, couponCode);

  const session = await prisma.intlPaymentSession.create({
    data: {
      provider: "PAYPAL",
      mode: config.mode,
      userId,
      shippingAddressId,
      quote,
      amountInr: quote.total,
      amountUsd: quote.amountUsd,
      currency: quote.currency,
    },
  });

  const token = await getPayPalAccessToken(config);
  const { ok, data } = await paypalRequest(config, token, "/v2/checkout/orders", {
    method: "POST",
    requestId: `create-${session.id}`,
    body: {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: session.id,
        custom_id: session.id,
        invoice_id: session.id,
        description: `Order from ${config.siteName}`.slice(0, 127),
        amount: { currency_code: quote.currency, value: quote.amountUsd.toFixed(2) },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: config.siteName.slice(0, 127),
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: `${frontendUrl()}/checkout/paypal-success`,
            cancel_url: `${frontendUrl()}/checkout?payment=cancelled`,
          },
        },
      },
    },
  });

  if (!ok) {
    await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { status: "FAILED", providerStatus: data?.name || "CREATE_FAILED" } });
    const detail = data?.details?.[0]?.description || data?.message || "Unknown error";
    throw new ApiError(502, `PayPal order creation failed: ${detail}`);
  }

  const approveLink = data.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  if (!approveLink) throw new ApiError(502, "PayPal did not return an approval link");

  await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { providerRef: data.id, providerStatus: data.status } });

  res.status(200).json(new ApiResponsive(200, {
    paypalOrderId: data.id,
    approveLink,
    amountUsd: quote.amountUsd,
    total: quote.total,
  }, "PayPal order created"));
});

// ─── POST /payment/paypal/capture ─────────────────────────────────────────────
export const capturePayPalPayment = asyncHandler(async (req, res) => {
  const { paypalOrderId } = req.body;
  const userId = req.user.id;
  if (!paypalOrderId) throw new ApiError(400, "PayPal order ID required");

  const session = await prisma.intlPaymentSession.findUnique({ where: { providerRef: paypalOrderId } });
  if (!session || session.userId !== userId || session.provider !== "PAYPAL") {
    throw new ApiError(404, "Payment not found");
  }
  if (session.orderId) {
    const order = await prisma.order.findUnique({ where: { id: session.orderId } });
    return res.status(200).json(new ApiResponsive(200, { orderId: order.id, orderNumber: order.orderNumber, alreadyCaptured: true }, "Already captured"));
  }

  const config = await getPayPalConfig();
  const token = await getPayPalAccessToken(config);

  // Is it already captured (e.g. a retried request)? Otherwise check stock before taking money.
  const current = await paypalRequest(config, token, `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`);
  if (!current.ok) throw new ApiError(502, "Could not read the PayPal order");
  let orderData = current.data;

  if (orderData.status !== "COMPLETED") {
    if (orderData.status !== "APPROVED") {
      throw new ApiError(402, `PayPal payment is not approved yet (status: ${orderData.status})`);
    }
    // Never take money twice for the same items (e.g. the customer already paid in another tab)
    const duplicate = await findDuplicateOrder(session);
    if (duplicate) {
      await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { status: "FAILED", providerStatus: "DUPLICATE_NOT_CAPTURED" } });
      throw new ApiError(409, `You already placed order #${duplicate.orderNumber} for these items, so this PayPal payment was not taken.`);
    }
    await assertStock(session.quote);
    const capture = await paypalRequest(config, token, `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: "POST",
      requestId: `capture-${session.id}`,
    });
    if (!capture.ok) {
      const issue = capture.data?.details?.[0]?.issue;
      await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { providerStatus: issue || "CAPTURE_FAILED" } });
      if (issue === "INSTRUMENT_DECLINED") {
        throw new ApiError(402, "Your payment method was declined by PayPal. Please try again with another card or account.");
      }
      throw new ApiError(402, `PayPal capture failed: ${capture.data?.details?.[0]?.description || capture.data?.message || issue || "Unknown error"}`);
    }
    orderData = capture.data;
  }

  const unit = orderData.purchase_units?.[0];
  const cap = unit?.payments?.captures?.[0];
  if (!cap || cap.status !== "COMPLETED") {
    // PENDING captures (eCheck, review) are not money received yet
    await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { providerStatus: cap?.status || orderData.status } });
    throw new ApiError(402, `PayPal payment is ${cap?.status || orderData.status}. We will confirm your order once PayPal releases it.`);
  }
  const paid = parseFloat(cap.amount?.value || "0");
  const expected = parseFloat(session.amountUsd);
  const customId = unit.custom_id || cap.custom_id;
  if (cap.amount?.currency_code !== session.currency || Math.abs(paid - expected) > 0.009 || (customId && customId !== session.id)) {
    await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { status: "FAILED", providerStatus: "AMOUNT_MISMATCH" } });
    console.error(`PayPal mismatch for session ${session.id}: paid ${paid} ${cap.amount?.currency_code}, expected ${expected} ${session.currency}, capture ${cap.id}`);
    throw new ApiError(400, "Payment amount did not match your order. Please contact support with your PayPal receipt.");
  }

  await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { providerStatus: "COMPLETED" } });
  let order;
  try {
    ({ order } = await createOrderFromSession(session.id, {
      status: "PAID",
      paymentMethod: "PAYPAL",
      reference: paypalOrderId,
      captureId: cap.id,
      paidAmount: paid,
    }));
  } catch (err) {
    if (!(err instanceof DuplicatePaymentError)) throw err;
    // Money was already taken for items that were ordered elsewhere — give it straight back.
    const refund = await paypalRequest(config, token, `/v2/payments/captures/${encodeURIComponent(cap.id)}/refund`, {
      method: "POST",
      requestId: `dup-refund-${session.id}`,
      body: { note_to_payer: "Duplicate payment refunded automatically" },
    });
    await prisma.intlPaymentSession.update({
      where: { id: session.id },
      data: { status: "FAILED", providerStatus: refund.ok ? `DUPLICATE_REFUNDED:${refund.data.id}` : "DUPLICATE_REFUND_FAILED" },
    });
    if (!refund.ok) console.error(`MANUAL REFUND NEEDED: PayPal capture ${cap.id} (session ${session.id}) duplicates order ${err.duplicateOf.orderNumber}`);
    throw new ApiError(409, refund.ok
      ? `You already placed order #${err.duplicateOf.orderNumber} for these items. This duplicate PayPal payment has been refunded.`
      : `You already placed order #${err.duplicateOf.orderNumber} for these items. Please contact support to refund this duplicate payment (PayPal capture ${cap.id}).`);
  }

  res.status(200).json(new ApiResponsive(200, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    paypalCaptureId: cap.id,
    amountUsd: paid,
  }, "Payment captured and order created"));
});

// ─── POST /admin/site-settings/test-paypal ────────────────────────────────────
export const testPayPalConnection = asyncHandler(async (req, res) => {
  const config = await getPayPalConfig({ requireEnabled: false });
  await getPayPalAccessToken(config);
  res.status(200).json(new ApiResponsive(200, { connected: true, mode: config.mode }, `PayPal credentials are valid (${config.mode})`));
});
