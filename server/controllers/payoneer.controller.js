// Payoneer Checkout (hosted payment page).
// Credentials: merchant code + payment API token from the Payoneer Checkout merchant portal.
// 1. create-payment: server prices the cart, stores an IntlPaymentSession, opens a LIST session -> redirect link.
// 2. Buyer pays on Payoneer and returns to /checkout/payoneer-success?longId=...&transactionId=...
// 3. verify + webhook: the LIST status is re-read from Payoneer (never trusted from the URL) before any order is created.
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { decrypt } from "../utils/encryption.js";
import { buildIntlQuote, createOrderFromSession as createOrder, toCountryCode, DuplicatePaymentError } from "../utils/intlCheckout.js";

// Payoneer charges on its own page, so a duplicate can only be flagged for a manual refund.
async function createOrderFromSession(sessionId, payment) {
  try {
    return await createOrder(sessionId, payment);
  } catch (err) {
    if (!(err instanceof DuplicatePaymentError)) throw err;
    await prisma.intlPaymentSession.update({ where: { id: sessionId }, data: { status: "FAILED", providerStatus: "DUPLICATE_REFUND_NEEDED" } });
    console.error(`MANUAL REFUND NEEDED: Payoneer session ${sessionId} duplicates order ${err.duplicateOf.orderNumber}`);
    throw new ApiError(409, `You already placed order #${err.duplicateOf.orderNumber} for these items. Our team has been notified and will refund this duplicate Payoneer payment.`);
  }
}

const MEDIA_TYPE = "application/vnd.optile.payment.enterprise-v1-extensible+json";
const PAID_CODES = new Set(["charged", "paid_out"]);
const PENDING_CODES = new Set(["pending", "listed", "preordered", "registered"]);

export async function getPayoneerConfig({ requireEnabled = true } = {}) {
  const s = await prisma.siteSettings.findFirst({
    select: { payoneerEnabled: true, payoneerApiKey: true, payoneerProgramId: true, payoneerMode: true, siteName: true },
  });
  if ((requireEnabled && !s?.payoneerEnabled) || !s?.payoneerApiKey || !s?.payoneerProgramId) {
    throw new ApiError(400, "Payoneer is not configured or not enabled");
  }
  const token = s.payoneerApiKey.startsWith("enc:") ? decrypt(s.payoneerApiKey.slice(4)) : s.payoneerApiKey;
  const mode = s.payoneerMode === "live" ? "live" : "sandbox";
  return {
    mode,
    merchantCode: s.payoneerProgramId.trim(),
    siteName: s.siteName || "Store",
    baseUrl: mode === "live" ? "https://api.live.oscato.com/api" : "https://api.sandbox.oscato.com/api",
    authHeader: `Basic ${Buffer.from(`${s.payoneerProgramId.trim()}:${token.trim()}`).toString("base64")}`,
  };
}

async function payoneerRequest(config, path, { method = "GET", body } = {}) {
  const res = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: { Authorization: config.authHeader, "Content-Type": MEDIA_TYPE, Accept: MEDIA_TYPE },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const frontendUrl = () => (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
const backendUrl = () => (process.env.BASE_URL || "").replace(/\/+$/, "");

// Read the authoritative payment state for a session from Payoneer.
async function fetchListStatus(config, longId) {
  const { ok, status, data } = await payoneerRequest(config, `/lists/${encodeURIComponent(longId)}`);
  if (!ok) throw new ApiError(502, `Could not read Payoneer payment status (${status})`);
  const code = String(data?.status?.code || "").toLowerCase();
  const amount = parseFloat(data?.payment?.amount ?? "NaN");
  const currency = data?.payment?.currency;
  return { code, reason: data?.status?.reason, amount, currency, transactionId: data?.transactionId };
}

// Create the order (PAID or PENDING) or report failure, based on Payoneer's own status.
async function settleSession(session, config) {
  const st = await fetchListStatus(config, session.providerRef);
  await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { providerStatus: `${st.code}${st.reason ? `:${st.reason}` : ""}` } });

  if (st.transactionId && st.transactionId !== session.id) {
    throw new ApiError(400, "Payoneer payment does not belong to this checkout");
  }
  if (Number.isFinite(st.amount) && (st.currency !== session.currency || Math.abs(st.amount - parseFloat(session.amountUsd)) > 0.009)) {
    await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { status: "FAILED" } });
    throw new ApiError(400, "Payment amount did not match your order. Please contact support.");
  }

  if (PAID_CODES.has(st.code)) {
    const existing = session.orderId ? await prisma.order.findUnique({ where: { id: session.orderId } }) : null;
    if (existing && existing.status === "PENDING") {
      // Webhook upgrade: payment that was pending is now confirmed
      await prisma.order.update({ where: { id: existing.id }, data: { status: "PAID", paidAmount: st.amount || existing.paidAmount } });
      return { order: { ...existing, status: "PAID" }, state: "PAID" };
    }
    const { order } = await createOrderFromSession(session.id, {
      status: "PAID",
      paymentMethod: "PAYONEER",
      reference: session.providerRef,
      paidAmount: Number.isFinite(st.amount) ? st.amount : parseFloat(session.amountUsd),
    });
    return { order, state: "PAID" };
  }

  if (PENDING_CODES.has(st.code) && st.code !== "listed") {
    // Money is on its way (e.g. bank transfer) — create a PENDING order the admin can see; the webhook upgrades it.
    const { order } = await createOrderFromSession(session.id, {
      status: "PENDING",
      paymentMethod: "PAYONEER",
      reference: session.providerRef,
      paidAmount: null,
      note: `Payoneer payment pending (${st.code}${st.reason ? `: ${st.reason}` : ""}) — do not ship until it is confirmed as PAID.`,
    });
    return { order, state: "PENDING" };
  }

  return { order: null, state: st.code || "unknown" };
}

// ─── GET /payment/payoneer/settings (public) ──────────────────────────────────
export const getPayoneerSettings = asyncHandler(async (req, res) => {
  const s = await prisma.siteSettings.findFirst({ select: { payoneerEnabled: true, payoneerApiKey: true, payoneerProgramId: true } });
  res.status(200).json(new ApiResponsive(200, { enabled: !!(s?.payoneerEnabled && s?.payoneerApiKey && s?.payoneerProgramId) }, "OK"));
});

// ─── POST /payment/payoneer/create-payment ────────────────────────────────────
export const createPayoneerPayment = asyncHandler(async (req, res) => {
  const { shippingAddressId, couponCode } = req.body;
  const userId = req.user.id;
  if (!shippingAddressId) throw new ApiError(400, "Shipping address required");

  const config = await getPayoneerConfig();
  if (!frontendUrl() || !backendUrl()) throw new ApiError(500, "FRONTEND_URL / BASE_URL are not configured on the server");
  const { quote, address } = await buildIntlQuote(userId, shippingAddressId, couponCode);
  const country = toCountryCode(address.country);
  if (!country) throw new ApiError(400, `Unrecognised country "${address.country}" on your address. Please edit the address.`);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  const session = await prisma.intlPaymentSession.create({
    data: { provider: "PAYONEER", mode: config.mode, userId, shippingAddressId, quote, amountInr: quote.total, amountUsd: quote.amountUsd, currency: quote.currency },
  });

  const [firstName, ...rest] = (address.name || user?.name || "Customer").trim().split(/\s+/);
  const { ok, status, data } = await payoneerRequest(config, "/lists", {
    method: "POST",
    body: {
      transactionId: session.id,
      country,
      integration: "HOSTED",
      customer: {
        number: userId,
        email: user?.email,
        name: { firstName, lastName: rest.join(" ") || firstName },
        addresses: {
          shipping: { street: address.street, zip: address.postalCode, city: address.city, state: address.state, country },
          billing: { street: address.street, zip: address.postalCode, city: address.city, state: address.state, country },
        },
      },
      payment: {
        amount: quote.amountUsd,
        currency: quote.currency,
        reference: `Order from ${config.siteName}`.slice(0, 128),
        invoiceId: session.id,
      },
      products: quote.items.map((i) => ({ code: i.sku || i.variantId, name: i.name.slice(0, 128), quantity: i.quantity })),
      callback: {
        returnUrl: `${frontendUrl()}/checkout/payoneer-success`,
        cancelUrl: `${frontendUrl()}/checkout?payment=cancelled`,
        notificationUrl: `${backendUrl()}/api/payment/payoneer/webhook`,
      },
      style: { language: "en_US" },
    },
  });

  const redirectUrl = data?.links?.redirect;
  const longId = data?.identification?.longId;
  if (!ok || !redirectUrl || !longId) {
    await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { status: "FAILED", providerStatus: `CREATE_FAILED:${status}` } });
    console.error("Payoneer LIST failed:", status, JSON.stringify(data).slice(0, 500));
    throw new ApiError(502, `Payoneer checkout could not be started: ${data?.resultInfo || data?.interaction?.reason || status}`);
  }

  await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { providerRef: longId, providerStatus: data?.status?.code || "listed" } });
  res.status(200).json(new ApiResponsive(200, { redirectUrl, amountUsd: quote.amountUsd, total: quote.total }, "Payoneer checkout created"));
});

// ─── POST /payment/payoneer/verify ────────────────────────────────────────────
export const verifyPayoneerPayment = asyncHandler(async (req, res) => {
  const { longId, transactionId } = req.body;
  const userId = req.user.id;
  if (!longId && !transactionId) throw new ApiError(400, "Payment reference required");

  const session = await prisma.intlPaymentSession.findFirst({
    where: { provider: "PAYONEER", userId, ...(longId ? { providerRef: longId } : { id: transactionId }) },
  });
  if (!session || !session.providerRef) throw new ApiError(404, "Payment not found");

  if (session.orderId) {
    const order = await prisma.order.findUnique({ where: { id: session.orderId } });
    return res.status(200).json(new ApiResponsive(200, { orderId: order.id, orderNumber: order.orderNumber, state: order.status }, "Already processed"));
  }

  const config = await getPayoneerConfig({ requireEnabled: false });
  const { order, state } = await settleSession(session, config);
  if (!order) {
    const msg = ["declined", "failed", "aborted", "rejected", "canceled", "cancelled"].includes(state)
      ? "Your Payoneer payment was not completed. You have not been charged."
      : `Payoneer has not confirmed the payment yet (status: ${state}). Please wait a minute and refresh.`;
    throw new ApiError(402, msg);
  }
  res.status(200).json(new ApiResponsive(200, { orderId: order.id, orderNumber: order.orderNumber, state }, "Payoneer payment processed"));
});

// ─── POST|GET /payment/payoneer/webhook (public) ──────────────────────────────
// Notification parameters are not trusted: they only tell us which session to re-check with Payoneer.
export const payoneerWebhook = asyncHandler(async (req, res) => {
  const params = { ...(req.query || {}), ...(typeof req.body === "object" ? req.body : {}) };
  const longId = params.longId || params.listLongId;
  const transactionId = params.transactionId;
  res.status(200).json({ received: true });

  try {
    const session = await prisma.intlPaymentSession.findFirst({
      where: { provider: "PAYONEER", OR: [longId ? { providerRef: String(longId) } : undefined, transactionId ? { id: String(transactionId) } : undefined].filter(Boolean) },
    });
    if (!session?.providerRef) return;
    const config = await getPayoneerConfig({ requireEnabled: false });
    await settleSession(session, config);
  } catch (err) {
    console.error("Payoneer webhook processing failed:", err?.message || err);
  }
});

// ─── POST /admin/site-settings/test-payoneer ──────────────────────────────────
export const testPayoneerConnection = asyncHandler(async (req, res) => {
  const config = await getPayoneerConfig({ requireEnabled: false });
  // An unknown LIST id returns 404 when credentials are valid and 401/403 when they are not.
  const { status } = await payoneerRequest(config, "/lists/connection-test-000000");
  if (status === 401 || status === 403) {
    throw new ApiError(400, `Payoneer rejected the merchant code / API token (${config.mode})`);
  }
  if (status >= 500 || status === 0) throw new ApiError(502, `Payoneer ${config.mode} API is unreachable (${status})`);
  res.status(200).json(new ApiResponsive(200, { connected: true, mode: config.mode }, `Payoneer credentials accepted (${config.mode})`));
});
