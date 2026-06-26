// PayPal Controller v2 — redirect flow (approveLink support)
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { decrypt } from "../utils/encryption.js";
import sendEmail from "../utils/sendEmail.js";
import { getOrderConfirmationTemplate } from "../email/temp/EmailTemplate.js";
import { applyFlashSalePrice } from "../utils/flashSaleHelpers.js";
import { processOrderForShipping } from "../utils/shiprocket.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getPayPalConfig() {
  const settings = await prisma.siteSettings.findFirst();
  if (!settings?.paypalEnabled || !settings?.paypalClientId || !settings?.paypalClientSecret) {
    throw new ApiError(400, "PayPal is not configured or not enabled");
  }
  const clientSecret = settings.paypalClientSecret.startsWith("enc:")
    ? decrypt(settings.paypalClientSecret.replace("enc:", ""))
    : settings.paypalClientSecret;

  const mode = settings.paypalMode || "sandbox";
  return {
    clientId: settings.paypalClientId,
    clientSecret,
    mode,
    baseUrl: mode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com",
  };
}

async function getPayPalAccessToken(config) {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const res = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(502, `PayPal auth failed: ${data.error_description || "Unknown"}`);
  return data.access_token;
}

// ─── GET /payment/paypal/client-id (public) ───────────────────────────────────
export const getPayPalClientId = asyncHandler(async (req, res) => {
  const settings = await prisma.siteSettings.findFirst({
    select: { paypalClientId: true, paypalEnabled: true, paypalMode: true },
  });
  if (!settings?.paypalEnabled || !settings?.paypalClientId) {
    return res.status(404).json(new ApiResponsive(404, null, "PayPal not enabled"));
  }
  res.status(200).json(new ApiResponsive(200, {
    clientId: settings.paypalClientId,
    mode: settings.paypalMode || "sandbox",
  }, "OK"));
});

// ─── GET /payment/paypal/settings (public) ────────────────────────────────────
export const getPayPalSettings = asyncHandler(async (req, res) => {
  const settings = await prisma.siteSettings.findFirst({
    select: { paypalEnabled: true, payoneerEnabled: true },
  });
  res.status(200).json(new ApiResponsive(200, {
    paypalEnabled: settings?.paypalEnabled || false,
    payoneerEnabled: settings?.payoneerEnabled || false,
  }, "OK"));
});

// ─── POST /payment/paypal/create-order ────────────────────────────────────────
export const createPayPalOrder = asyncHandler(async (req, res) => {
  const { amount, currency = "USD", shippingAddressId } = req.body;
  const userId = req.user?.id;

  if (!userId) throw new ApiError(401, "Authentication required");
  if (!amount || parseFloat(amount) <= 0) throw new ApiError(400, "Invalid amount");
  if (!shippingAddressId) throw new ApiError(400, "Shipping address required");

  // Validate address belongs to user
  const addr = await prisma.address.findFirst({ where: { id: shippingAddressId, userId } });
  if (!addr) throw new ApiError(400, "Shipping address not found");

  const config = await getPayPalConfig();
  const accessToken = await getPayPalAccessToken(config);

  const siteSettings = await prisma.siteSettings.findFirst({ select: { siteName: true } });

  const payload = {
    intent: "CAPTURE",
    purchase_units: [{
      amount: { currency_code: currency, value: parseFloat(amount).toFixed(2) },
      description: `Order from ${siteSettings?.siteName || "Store"}`,
      custom_id: `${userId}:${shippingAddressId}`, // used in capture to verify
    }],
    application_context: {
      brand_name: siteSettings?.siteName || "Store",
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
      return_url: `${process.env.FRONTEND_URL}/checkout/paypal-success`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout`,
    },
  };

  const response = await fetch(`${config.baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const order = await response.json();
  if (!response.ok) {
    throw new ApiError(502, `PayPal order creation failed: ${order.message || JSON.stringify(order.details || order)}`);
  }

  // Extract the approval URL for redirect flow (more reliable than JS SDK for live mode)
  const approveLink = order.links?.find((l) => l.rel === "approve")?.href || null;

  res.status(200).json(new ApiResponsive(200, {
    paypalOrderId: order.id,
    status: order.status,
    approveLink, // URL to redirect user to PayPal hosted checkout
  }, "PayPal order created"));
});

// ─── POST /payment/paypal/capture ─────────────────────────────────────────────
export const capturePayPalPayment = asyncHandler(async (req, res) => {
  const { paypalOrderId, shippingAddressId, couponCode, notes = "" } = req.body;
  const userId = req.user?.id;

  if (!paypalOrderId) throw new ApiError(400, "PayPal order ID required");
  if (!userId) throw new ApiError(401, "Authentication required");
  if (!shippingAddressId) throw new ApiError(400, "Shipping address required");

  // ── Idempotency: check if already captured ────────────────────────────────
  const existing = await prisma.order.findFirst({
    where: { userId, paypalCaptureId: { not: null }, notes: { contains: paypalOrderId } },
  });
  if (existing) {
    return res.status(200).json(new ApiResponsive(200, {
      orderId: existing.id,
      orderNumber: existing.orderNumber,
      alreadyCaptured: true,
    }, "Already captured"));
  }

  const config = await getPayPalConfig();
  const accessToken = await getPayPalAccessToken(config);

  // ── Capture at PayPal ──────────────────────────────────────────────────────
  const captureRes = await fetch(`${config.baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });
  const captureData = await captureRes.json();

  if (!captureRes.ok || captureData.status !== "COMPLETED") {
    throw new ApiError(402, `PayPal capture failed: ${captureData.message || captureData.status || JSON.stringify(captureData)}`);
  }

  const captureUnit = captureData.purchase_units?.[0]?.payments?.captures?.[0];
  const paidAmount = parseFloat(captureUnit?.amount?.value || "0");
  const currency = captureUnit?.amount?.currency_code || "USD";
  const paypalCaptureId = captureUnit?.id;

  if (!paypalCaptureId) throw new ApiError(502, "PayPal did not return capture ID");

  // ── Validate address ───────────────────────────────────────────────────────
  const shippingAddr = await prisma.address.findFirst({ where: { id: shippingAddressId, userId } });
  if (!shippingAddr) throw new ApiError(400, "Shipping address not found");

  // ── Load cart items (CartItem model, not Cart) ─────────────────────────────
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      addons: { include: { addonService: true } },
      productVariant: {
        include: {
          product: {
            include: {
              flashSales: { include: { flashSale: true } },
            },
          },
          pricingSlabs: true,
        },
      },
    },
  });
  if (!cartItems?.length) throw new ApiError(400, "Cart is empty");

  // ── Coupon ─────────────────────────────────────────────────────────────────
  let couponRecord = null;
  if (couponCode) {
    couponRecord = await prisma.coupon.findFirst({
      where: { code: couponCode, isActive: true },
    });
  }

  // ── Build order items + calculate totals ───────────────────────────────────
  const orderItems = [];
  let subtotal = 0;

  for (const cartItem of cartItems) {
    const variant = cartItem.productVariant;
    if (!variant || !variant.isActive) continue;

    const flashSaleDiscount = variant.product?.flashSales?.[0]?.flashSale?.discountPercentage ?? null;
    const priceInfo = applyFlashSalePrice(variant, cartItem.quantity, flashSaleDiscount);
    const lineTotal = priceInfo.price * cartItem.quantity;

    // Add addon prices to line total
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
    discount = Math.round(discount * 100) / 100;
  }

  const shippingCost = 0; // International — flat handled at checkout
  const tax = 0;
  const total = Math.max(Math.round((subtotal - discount + shippingCost + tax) * 100) / 100, 0);

  const settings = await prisma.siteSettings.findFirst({ select: { usdExchangeRate: true } });
  const exchangeRate = settings?.usdExchangeRate || 83.0;

  // Sanity check: paidAmount should be >= total (allow small FX rounding difference)
  let checkTotal = total;
  if (currency === "USD") {
    checkTotal = Math.max(parseFloat((total / exchangeRate).toFixed(2)), 0.01);
  }
  if (paidAmount > 0 && Math.abs(paidAmount - checkTotal) > 5) {
    throw new ApiError(400, `Amount mismatch: paid ${paidAmount} but order total ${checkTotal} USD (${total} INR)`);
  }

  // ── Create DB order in transaction ─────────────────────────────────────────
  const dbOrder = await prisma.$transaction(async (tx) => {
    // Double-capture guard inside transaction
    const alreadyDone = await tx.order.findFirst({
      where: { paypalCaptureId },
    });
    if (alreadyDone) return alreadyDone;

    const settings = await tx.siteSettings.findFirst({ select: { orderPrefix: true } });
    const orderCount = await tx.order.count();
    const orderNumber = `${settings?.orderPrefix || "ORD"}${String(orderCount + 1).padStart(6, "0")}`;

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: "PAID",
        paymentMethod: "PAYPAL",
        paymentGateway: "PAYPAL",
        paymentMode: config.mode === "live" ? "LIVE" : "TEST",
        subTotal: subtotal,
        shippingCost,
        discount,
        tax,
        total,
        shippingProvider: "EASYSHIP",
        shippingAddressId: shippingAddr.id,
        couponId: couponRecord?.id || null,
        couponCode: couponRecord?.code || null,
        paypalCaptureId,
        notes: `${notes} [paypal:${paypalOrderId}]`.trim(),
        items: {
          create: orderItems.map((item) => ({
            variantId: item.variantId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
        },
      },
      include: { items: true, shippingAddress: true, user: true },
    });

    // Save OrderItemAddon records for each order item
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

    // Deduct inventory
    for (const item of orderItems) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    // Clear cart items for this user
    await tx.cartItem.deleteMany({ where: { userId } });

    // Apply coupon usage
    if (couponRecord) {
      await tx.coupon.update({
        where: { id: couponRecord.id },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {});
    }

    return order;
  });

  // ── Send confirmation email (non-blocking) ─────────────────────────────────
  prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
    .then((u) => {
      if (u?.email) {
        const html = getOrderConfirmationTemplate({ ...dbOrder, user: u });
        sendEmail({ to: u.email, subject: `Order Confirmed #${dbOrder.orderNumber}`, html }).catch(() => {});
      }
    })
    .catch(() => {});

  res.status(200).json(new ApiResponsive(200, {
    orderId: dbOrder.id,
    orderNumber: dbOrder.orderNumber,
    paypalCaptureId,
    total,
    currency,
  }, "Payment captured and order created"));
});
