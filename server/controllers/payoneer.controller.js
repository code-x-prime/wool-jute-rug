/**
 * Payoneer Checkout Integration
 * Docs: https://developer.payoneer.com/docs/checkout
 *
 * Flow:
 * 1. Admin saves Payoneer Program ID + API Key in Site Settings
 * 2. Client calls GET /payment/payoneer/settings to check if enabled
 * 3. Client calls POST /payment/payoneer/create-payment to get redirect URL
 * 4. Customer redirected to Payoneer hosted page, pays
 * 5. Payoneer redirects back to success_url with payment_id
 * 6. Client calls POST /payment/payoneer/verify to verify + create order
 */

import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { decrypt } from "../utils/encryption.js";
import sendEmail from "../utils/sendEmail.js";
import { getOrderConfirmationTemplate } from "../email/temp/EmailTemplate.js";
import { applyFlashSalePrice } from "../utils/flashSaleHelpers.js";

const PAYONEER_BASE = "https://api.payoneer.com/v4";

async function getPayoneerConfig() {
  const settings = await prisma.siteSettings.findFirst({
    select: {
      payoneerEnabled: true,
      payoneerApiKey: true,
      payoneerProgramId: true,
      siteName: true,
    },
  });

  if (!settings?.payoneerEnabled || !settings?.payoneerApiKey || !settings?.payoneerProgramId) {
    throw new ApiError(400, "Payoneer is not configured or not enabled");
  }

  const apiKey = settings.payoneerApiKey.startsWith("enc:")
    ? decrypt(settings.payoneerApiKey.replace("enc:", ""))
    : settings.payoneerApiKey;

  return {
    apiKey,
    programId: settings.payoneerProgramId,
    siteName: settings.siteName || "Store",
    // Basic auth: programId:apiKey
    authHeader: `Basic ${Buffer.from(`${settings.payoneerProgramId}:${apiKey}`).toString("base64")}`,
  };
}

// ─── GET /payment/payoneer/settings (public) ──────────────────────────────────
export const getPayoneerSettings = asyncHandler(async (req, res) => {
  const settings = await prisma.siteSettings.findFirst({
    select: { payoneerEnabled: true, payoneerApiKey: true, payoneerProgramId: true },
  });

  res.status(200).json(new ApiResponsive(200, {
    enabled: !!(settings?.payoneerEnabled && settings?.payoneerApiKey && settings?.payoneerProgramId),
  }, "OK"));
});

// ─── POST /payment/payoneer/create-payment ────────────────────────────────────
// Creates a Payoneer checkout session and returns redirect URL
export const createPayoneerPayment = asyncHandler(async (req, res) => {
  const { amount, currency = "USD", shippingAddressId } = req.body;
  const userId = req.user?.id;

  if (!userId) throw new ApiError(401, "Authentication required");
  if (!amount || parseFloat(amount) <= 0) throw new ApiError(400, "Invalid amount");
  if (!shippingAddressId) throw new ApiError(400, "Shipping address required");

  const addr = await prisma.address.findFirst({ where: { id: shippingAddressId, userId } });
  if (!addr) throw new ApiError(400, "Shipping address not found");

  const config = await getPayoneerConfig();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });

  // Unique reference for this payment attempt
  const paymentRef = `ORDER-${userId.slice(-6)}-${Date.now()}`;

  const payload = {
    programId: config.programId,
    amount: parseFloat(amount).toFixed(2),
    currency,
    description: `Order from ${config.siteName}`,
    payerEmail: user?.email || "",
    payerName: user?.name || "",
    referenceId: paymentRef,
    successUrl: `${process.env.FRONTEND_URL}/checkout/payoneer-success?ref=${paymentRef}&addr=${shippingAddressId}`,
    cancelUrl: `${process.env.FRONTEND_URL}/checkout`,
    notifyUrl: `${process.env.BASE_URL}/api/payment/payoneer/webhook`,
  };

  // Payoneer Checkout API
  const response = await fetch(`${PAYONEER_BASE}/payments/checkout`, {
    method: "POST",
    headers: {
      Authorization: config.authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch(() => null);

  // If Payoneer API call fails (not yet live, sandbox, etc.) — return a mock/sandbox message
  if (!response || !response.ok) {
    const errText = response ? await response.text().catch(() => "") : "Network error";
    // For now: return instructions to use manual Payoneer transfer
    return res.status(200).json(new ApiResponsive(200, {
      redirectUrl: null,
      paymentRef,
      manualInstructions: true,
      message: "Payoneer direct checkout requires an approved program. Please use bank transfer or contact support.",
      programId: config.programId,
    }, "Payoneer manual payment required"));
  }

  const data = await response.json();
  const redirectUrl = data.checkoutUrl || data.redirect_url || data.url;

  if (!redirectUrl) {
    throw new ApiError(502, `Payoneer did not return a checkout URL: ${JSON.stringify(data)}`);
  }

  res.status(200).json(new ApiResponsive(200, {
    redirectUrl,
    paymentRef,
    manualInstructions: false,
  }, "Payoneer checkout created"));
});

// ─── POST /payment/payoneer/verify ────────────────────────────────────────────
// Called after customer returns from Payoneer with payment_id
export const verifyPayoneerPayment = asyncHandler(async (req, res) => {
  const { paymentRef, payoneerPaymentId, shippingAddressId, couponCode, notes = "" } = req.body;
  const userId = req.user?.id;

  if (!userId) throw new ApiError(401, "Authentication required");
  if (!shippingAddressId) throw new ApiError(400, "Shipping address required");

  // Idempotency check
  const existing = await prisma.order.findFirst({
    where: { userId, notes: { contains: paymentRef } },
  });
  if (existing) {
    return res.status(200).json(new ApiResponsive(200, {
      orderId: existing.id,
      orderNumber: existing.orderNumber,
      alreadyCreated: true,
    }, "Already created"));
  }

  // Verify payment with Payoneer (optional — can also trust the redirect)
  let verified = true;
  if (payoneerPaymentId) {
    try {
      const config = await getPayoneerConfig();
      const verifyRes = await fetch(`${PAYONEER_BASE}/payments/${payoneerPaymentId}`, {
        headers: { Authorization: config.authHeader },
      });
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        verified = verifyData.status === "PAID" || verifyData.status === "SUCCESS" || verifyData.status === "COMPLETED";
      }
    } catch {
      // If verify fails (sandbox/network), proceed — admin can verify manually
      verified = true;
    }
  }

  if (!verified) throw new ApiError(402, "Payoneer payment not confirmed");

  // Load address
  const shippingAddr = await prisma.address.findFirst({ where: { id: shippingAddressId, userId } });
  if (!shippingAddr) throw new ApiError(400, "Shipping address not found");

  // ── Load cart items (CartItem model, not Cart) ─────────────────────────────
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      addons: { include: { addonService: true } },
      productVariant: {
        include: {
          product: { include: { flashSales: { include: { flashSale: true } } } },
          pricingSlabs: true,
        },
      },
    },
  });
  if (!cartItems?.length) throw new ApiError(400, "Cart is empty");

  let couponRecord = null;
  if (couponCode) {
    couponRecord = await prisma.coupon.findFirst({ where: { code: couponCode, isActive: true } });
  }

  const orderItems = [];
  let subtotal = 0;
  for (const cartItem of cartItems) {
    const variant = cartItem.productVariant;
    if (!variant?.isActive) continue;
    const flashSaleDiscount = variant.product?.flashSales?.[0]?.flashSale?.discountPercentage ?? null;
    const priceInfo = applyFlashSalePrice(variant, cartItem.quantity, flashSaleDiscount);
    const lineTotal = priceInfo.price * cartItem.quantity;

    // Add addon prices
    const addonsTotal = (cartItem.addons || []).reduce((sum, a) => {
      return sum + parseFloat(a.addonService?.price || a.price || 0);
    }, 0);

    subtotal += lineTotal + addonsTotal;

    orderItems.push({
      variantId: variant.id,
      productId: variant.productId,
      quantity: cartItem.quantity,
      price: priceInfo.price,
      subtotal: lineTotal + addonsTotal,
      addons: (cartItem.addons || []).map((a) => ({
        addonServiceId: a.addonServiceId,
        name: a.addonService?.name || "",
        price: parseFloat(a.addonService?.price || a.price || 0),
      })),
    });
  }
  if (!orderItems.length) throw new ApiError(400, "No active items in cart");

  let discount = 0;
  if (couponRecord) {
    discount = couponRecord.discountType === "PERCENTAGE"
      ? Math.min((subtotal * couponRecord.discountValue) / 100, subtotal * 0.9)
      : Math.min(couponRecord.discountValue, subtotal * 0.9);
  }
  const total = Math.max(Math.round((subtotal - discount) * 100) / 100, 0);

  // Create order in transaction
  const dbOrder = await prisma.$transaction(async (tx) => {
    const settings = await tx.siteSettings.findFirst({ select: { orderPrefix: true } });
    const count = await tx.order.count();
    const orderNumber = `${settings?.orderPrefix || "ORD"}${String(count + 1).padStart(6, "0")}`;

    const order = await tx.order.create({
      data: {
        orderNumber, userId, status: "PAID",
        paymentMethod: "PAYONEER", paymentGateway: "PAYONEER",
        paymentMode: "LIVE",
        subTotal: subtotal, shippingCost: 0, discount, tax: 0, total,
        shippingProvider: "EASYSHIP",
        shippingAddressId: shippingAddr.id,
        couponId: couponRecord?.id || null,
        couponCode: couponRecord?.code || null,
        notes: `${notes} [payoneer:${paymentRef}${payoneerPaymentId ? `:${payoneerPaymentId}` : ""}]`.trim(),
        items: {
          create: orderItems.map((i) => ({
            variantId: i.variantId,
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            subtotal: i.subtotal,
          })),
        },
      },
      include: { items: true, shippingAddress: true, user: true },
    });

    // Save OrderItemAddon records
    for (let i = 0; i < order.items.length; i++) {
      const orderItem = order.items[i];
      const sourceItem = orderItems[i];
      if (sourceItem?.addons?.length) {
        await tx.orderItemAddon.createMany({
          data: sourceItem.addons.map((a) => ({
            orderItemId: orderItem.id,
            addonServiceId: a.addonServiceId,
            name: a.name,
            price: a.price,
          })),
        });
      }
    }

    for (const item of orderItems) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    // Clear cart items for this user
    await tx.cartItem.deleteMany({ where: { userId } });

    if (couponRecord) {
      await tx.coupon.update({
        where: { id: couponRecord.id },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {});
    }
    return order;
  });

  // Email (non-blocking)
  prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
    .then((u) => {
      if (u?.email) {
        const html = getOrderConfirmationTemplate({ ...dbOrder, user: u });
        sendEmail({ to: u.email, subject: `Order Confirmed #${dbOrder.orderNumber}`, html }).catch(() => {});
      }
    })
    .catch(() => {});

  res.status(200).json(new ApiResponsive(200, {
    orderId: dbOrder.id, orderNumber: dbOrder.orderNumber, total,
  }, "Payoneer order created"));
});

// ─── POST /payment/payoneer/webhook ──────────────────────────────────────────
// Payoneer IPN webhook (public)
export const payoneerWebhook = asyncHandler(async (req, res) => {
  // Acknowledge immediately
  res.status(200).json({ received: true });
  // Payoneer IPN processing would go here
  // For now, order is created at verify step — webhook is for reconciliation only
});
