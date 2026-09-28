import crypto from "crypto";
import Razorpay from "razorpay";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import sendEmail from "../utils/sendEmail.js";
import { getOrderConfirmationTemplate } from "../email/temp/EmailTemplate.js";
import { getFileUrl } from "../utils/deleteFromS3.js";
import { processReferralReward } from "./referral.controller.js";
import { decrypt } from "../utils/encryption.js";
import { getStoreConfigFromDb } from "../utils/storeConfig.js";
import { applyFlashSalePrice } from "../utils/flashSaleHelpers.js";
import { buildIntlQuote, createOrderFromSession, findDuplicateOrder, DuplicatePaymentError, placeCodOrder } from "../utils/intlCheckout.js";
import { sendPriced, priceConvert } from "../utils/sendPriced.js";


export async function getPaymentGatewayConfig(userId = null, gateway = "RAZORPAY") {

  let paymentSettings;

  if (userId) {
    paymentSettings = await prisma.paymentGatewaySetting.findUnique({
      where: {
        userId_gateway: {
          userId,
          gateway: gateway.toUpperCase(),
        },
      },
    });
  }

  if (!paymentSettings) {
    paymentSettings = await prisma.paymentGatewaySetting.findFirst({
      where: {
        gateway: gateway.toUpperCase(),
        isActive: true,
      },
    });
  }

  // Fallback to SiteSettings for Razorpay when no PaymentGatewaySetting
  if ((!paymentSettings || !paymentSettings.isActive) && gateway.toUpperCase() === "RAZORPAY") {
    const siteSettings = await prisma.siteSettings.findFirst();
    if (siteSettings?.razorpayEnabled && siteSettings?.razorpayKeyId && siteSettings?.razorpayKeySecret) {
      let decryptedSecret;
      try {
        decryptedSecret = decrypt(siteSettings.razorpayKeySecret.startsWith("enc:")
          ? siteSettings.razorpayKeySecret.replace("enc:", "")
          : siteSettings.razorpayKeySecret);
      } catch (e) {
        decryptedSecret = siteSettings.razorpayKeySecret;
      }
      return {
        razorpayInstance: new Razorpay({
          key_id: siteSettings.razorpayKeyId,
          key_secret: decryptedSecret,
        }),
        paymentSettings: {
          gateway: "RAZORPAY",
          mode: "LIVE",
          userId: null,
          razorpayKeyId: siteSettings.razorpayKeyId,
          razorpayKeySecret: decryptedSecret,
        },
      };
    }
  }

  if (!paymentSettings || !paymentSettings.isActive) {
    throw new ApiError(
      400,
      `Payment gateway ${gateway} is not configured or not active. Please configure payment gateway keys in admin settings.`
    );
  }

  if (gateway.toUpperCase() === "RAZORPAY") {
    if (!paymentSettings.razorpayKeyId || !paymentSettings.razorpayKeySecret) {
      throw new ApiError(400, "Razorpay keys are not configured. Please configure Razorpay Key ID and Key Secret in Payment Gateway Settings.");
    }

    let decryptedSecret;
    try {
      decryptedSecret = decrypt(paymentSettings.razorpayKeySecret);
      if (!decryptedSecret || decryptedSecret.trim() === "") {
        throw new Error("Decrypted secret is empty");
      }
    } catch (decryptError) {
      console.error("Error decrypting Razorpay key secret:", decryptError);
      throw new ApiError(400, "Failed to decrypt Razorpay key secret. Please reconfigure your Razorpay keys.");
    }

    let razorpayInstance;
    try {
      razorpayInstance = new Razorpay({
        key_id: paymentSettings.razorpayKeyId,
        key_secret: decryptedSecret,
      });
    } catch (razorpayError) {
      console.error("Error initializing Razorpay:", razorpayError);
      throw new ApiError(400, `Failed to initialize Razorpay: ${razorpayError.message || "Invalid keys"}`);
    }

    return {
      razorpayInstance,
      paymentSettings: {
        gateway: paymentSettings.gateway,
        mode: paymentSettings.mode,
        userId: paymentSettings.userId,
        razorpayKeyId: paymentSettings.razorpayKeyId,
        razorpayKeySecret: decryptedSecret,
      },
    };
  }

  // For PhonePe, return settings without Razorpay instance
  return {
    razorpayInstance: null,
    paymentSettings: {
      gateway: paymentSettings.gateway,
      mode: paymentSettings.mode,
      userId: paymentSettings.userId,
      phonepeMerchantId: paymentSettings.phonepeMerchantId,
      phonepeSaltKey: paymentSettings.phonepeSaltKey
        ? decrypt(paymentSettings.phonepeSaltKey)
        : null,
      phonepeSaltIndex: paymentSettings.phonepeSaltIndex,
    },
  };
}

// Get payment settings (public endpoint for checkout page)
export const getPaymentSettings = asyncHandler(async (req, res) => {
  // Get or create payment settings (singleton)
  let paymentSettings = await prisma.paymentSettings.findFirst();

  // If no settings exist, create default ones
  if (!paymentSettings) {
    paymentSettings = await prisma.paymentSettings.create({
      data: {
        cashEnabled: true,
        razorpayEnabled: false,
        codCharge: 0,
      },
    });
  }

  // Check if payment gateway keys are configured
  // For now, we'll check for any active payment gateway settings
  // In a multi-merchant system, we might need to check for the order owner's keys
  // For now, checking if any admin has configured keys

  // Check Razorpay keys (PaymentGatewaySetting or SiteSettings)
  let razorpaySettings = await prisma.paymentGatewaySetting.findFirst({
    where: {
      gateway: "RAZORPAY",
      isActive: true,
      razorpayKeyId: { not: null },
      razorpayKeySecret: { not: null },
    },
  });
  if (!razorpaySettings) {
    const siteSettings = await prisma.siteSettings.findFirst();
    if (siteSettings?.razorpayEnabled && siteSettings?.razorpayKeyId && siteSettings?.razorpayKeySecret) {
      razorpaySettings = { id: "site" };
    }
  }

  // Check PhonePe keys
  const phonepeSettings = await prisma.paymentGatewaySetting.findFirst({
    where: {
      gateway: "PHONEPE",
      isActive: true,
      phonepeMerchantId: { not: null },
      phonepeSaltKey: { not: null },
      phonepeSaltIndex: { not: null },
    },
  });

  // Check PayPal + Payoneer from SiteSettings
  const siteSettings2 = await prisma.siteSettings.findFirst({
    select: {
      paypalEnabled: true,
      paypalClientId: true,
      payoneerEnabled: true,
      payoneerApiKey: true,
      usdExchangeRate: true,
    },
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        cashEnabled: paymentSettings.cashEnabled,
        razorpayEnabled: paymentSettings.razorpayEnabled && !!razorpaySettings,
        phonepeEnabled: !!phonepeSettings,
        codCharge: parseFloat(paymentSettings.codCharge) || 0,
        paypalEnabled: !!(siteSettings2?.paypalEnabled && siteSettings2?.paypalClientId),
        payoneerEnabled: !!(siteSettings2?.payoneerEnabled && siteSettings2?.payoneerApiKey),
        usdExchangeRate: siteSettings2?.usdExchangeRate || 83.0,
      },
      "Payment settings fetched successfully"
    )
  );
});

// Get Razorpay Key (from DB for the user)
export const getRazorpayKey = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.body.userId;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const paymentConfig = await getPaymentGatewayConfig(userId, "RAZORPAY");

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { key: paymentConfig.paymentSettings.razorpayKeyId || null },
        "Razorpay key fetched successfully"
      )
    );
});

// ─── Razorpay ─────────────────────────────────────────────────────────────────
// 1. checkout: server prices the cart, stores a payment session, creates a Razorpay order for exactly that amount.
// 2. verify (browser) and webhook (Razorpay) both call settleRazorpaySession — the first one creates the order,
//    the other finds it. Amount, currency and order id are checked against Razorpay's own payment record.

const razorpayMode = (config) =>
  String(config.paymentSettings.razorpayKeyId || "").startsWith("rzp_test") ? "sandbox" : "live";

export async function settleRazorpaySession(session, config, { paymentId, signature } = {}) {
  const rz = config.razorpayInstance;
  let payment;
  if (paymentId) {
    payment = await rz.payments.fetch(paymentId);
  } else {
    const list = await rz.orders.fetchPayments(session.providerRef);
    payment = list.items?.find((p) => p.status === "captured") || list.items?.find((p) => p.status === "authorized");
  }
  if (!payment) throw new ApiError(402, "Razorpay has no successful payment for this order yet");
  if (payment.order_id !== session.providerRef) throw new ApiError(400, "Payment does not belong to this checkout");

  const expected = Math.round(parseFloat(session.amountInr) * 100);
  if (payment.currency !== session.currency || payment.amount !== expected) {
    await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { status: "FAILED", providerStatus: "AMOUNT_MISMATCH" } });
    console.error(`Razorpay mismatch: session ${session.id} paid ${payment.amount} ${payment.currency}, expected ${expected} ${session.currency} (payment ${payment.id})`);
    throw new ApiError(400, "Payment amount did not match your order. Please contact support.");
  }

  // Same payment already turned into an order (verify + webhook race, page refresh)
  const existing = await prisma.razorpayPayment.findUnique({ where: { razorpayPaymentId: payment.id }, include: { order: true } });
  if (existing) return existing.order;

  if (payment.status === "authorized") {
    // Don't capture money for items that were already ordered elsewhere; Razorpay voids uncaptured payments.
    const duplicate = await findDuplicateOrder(session);
    if (duplicate) {
      await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { status: "FAILED", providerStatus: "DUPLICATE_NOT_CAPTURED" } });
      throw new ApiError(409, `You already placed order #${duplicate.orderNumber} for these items, so this payment was not captured and will be released by your bank.`);
    }
    payment = await rz.payments.capture(payment.id, expected, session.currency);
  }
  if (payment.status !== "captured") {
    await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { providerStatus: payment.status } });
    throw new ApiError(402, `Payment is ${payment.status}. You have not been charged.`);
  }

  try {
    const { order } = await createOrderFromSession(session.id, {
      status: "PAID",
      paymentMethod: "RAZORPAY",
      reference: session.providerRef,
      paidAmount: payment.amount / 100,
      afterCreate: (tx, order) =>
        tx.razorpayPayment.create({
          data: {
            orderId: order.id,
            amount: (payment.amount / 100).toString(),
            razorpayOrderId: session.providerRef,
            razorpayPaymentId: payment.id,
            razorpaySignature: signature || null,
            status: "CAPTURED",
            paymentMethod: mapRazorpayMethod(payment.method),
            notes: payment,
          },
        }),
    });
    return order;
  } catch (err) {
    if (err?.code === "P2002") {
      const again = await prisma.razorpayPayment.findUnique({ where: { razorpayPaymentId: payment.id }, include: { order: true } });
      if (again) return again.order;
    }
    if (!(err instanceof DuplicatePaymentError)) throw err;
    // Captured money for items that were already ordered — refund it in full.
    try {
      const refund = await rz.payments.refund(payment.id, { amount: payment.amount, notes: { reason: "Duplicate payment", session: session.id } });
      await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { status: "FAILED", providerStatus: `DUPLICATE_REFUNDED:${refund.id}` } });
      throw new ApiError(409, `You already placed order #${err.duplicateOf.orderNumber} for these items. This duplicate payment has been refunded.`);
    } catch (refundErr) {
      if (refundErr instanceof ApiError) throw refundErr;
      await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { status: "FAILED", providerStatus: "DUPLICATE_REFUND_FAILED" } });
      console.error(`MANUAL REFUND NEEDED: Razorpay payment ${payment.id} duplicates order ${err.duplicateOf.orderNumber}`, refundErr);
      throw new ApiError(409, `You already placed order #${err.duplicateOf.orderNumber} for these items. Please contact support to refund this duplicate payment (${payment.id}).`);
    }
  }
}

// Create Razorpay order for the server-priced cart
export const checkout = asyncHandler(async (req, res) => {
  const { shippingAddressId, couponCode } = req.body;
  const userId = req.user.id;
  if (!shippingAddressId) throw new ApiError(400, "Shipping address is required");

  const paymentSettings = await prisma.paymentSettings.findFirst();
  if (!paymentSettings?.razorpayEnabled) throw new ApiError(400, "Online payment is not enabled");

  const config = await getPaymentGatewayConfig(userId, "RAZORPAY");
  // Razorpay charges the store currency (USD/EUR need International Payments enabled on the Razorpay account)
  const { quote } = await buildIntlQuote(userId, shippingAddressId, couponCode, { payInStoreCurrency: true });

  const session = await prisma.intlPaymentSession.create({
    data: {
      provider: "RAZORPAY",
      mode: razorpayMode(config),
      userId,
      shippingAddressId,
      quote,
      amountInr: quote.total,
      amountUsd: quote.amountUsd,
      currency: quote.currency,
    },
  });

  let rzOrder;
  try {
    rzOrder = await config.razorpayInstance.orders.create({
      amount: Math.round(quote.total * 100),
      currency: quote.currency,
      receipt: session.id.slice(0, 40),
      notes: { sessionId: session.id, userId },
    });
  } catch (error) {
    await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { status: "FAILED", providerStatus: "CREATE_FAILED" } });
    throw new ApiError(502, error?.error?.description || error?.message || "Could not start Razorpay payment");
  }

  await prisma.intlPaymentSession.update({ where: { id: session.id }, data: { providerRef: rzOrder.id, providerStatus: rzOrder.status } });

  res.status(200).json(new ApiResponsive(200, {
    id: rzOrder.id,
    amount: rzOrder.amount,
    currency: rzOrder.currency,
    total: quote.total,
  }, "Order created successfully"));
});

// Verify payment signature and create the order
export const paymentVerification = asyncHandler(async (req, res) => {
  const razorpay_order_id = req.body.razorpay_order_id || req.body.razorpayOrderId;
  const razorpay_payment_id = req.body.razorpay_payment_id || req.body.razorpayPaymentId;
  const razorpay_signature = req.body.razorpay_signature || req.body.razorpaySignature;
  const userId = req.user.id;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Missing payment details");
  }

  const session = await prisma.intlPaymentSession.findUnique({ where: { providerRef: razorpay_order_id } });
  if (!session || session.userId !== userId || session.provider !== "RAZORPAY") {
    throw new ApiError(404, "Payment not found");
  }

  const config = await getPaymentGatewayConfig(userId, "RAZORPAY");
  const expectedSignature = crypto
    .createHmac("sha256", config.paymentSettings.razorpayKeySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  const given = Buffer.from(String(razorpay_signature));
  const wanted = Buffer.from(expectedSignature);
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
    throw new ApiError(400, "Invalid payment signature");
  }

  if (session.orderId) {
    const order = await prisma.order.findUnique({ where: { id: session.orderId } });
    return res.status(200).json(new ApiResponsive(200, { orderId: order.id, orderNumber: order.orderNumber, alreadyProcessed: true }, "Payment already verified"));
  }

  const order = await settleRazorpaySession(session, config, { paymentId: razorpay_payment_id, signature: razorpay_signature });
  res.status(200).json(new ApiResponsive(200, { orderId: order.id, orderNumber: order.orderNumber }, "Payment verified and order created successfully"));
});

// Razorpay webhook — creates the order even if the customer closed the browser after paying.
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const settings = await prisma.siteSettings.findFirst({ select: { razorpayWebhookSecret: true } });
  if (!settings?.razorpayWebhookSecret) return res.status(200).json({ ignored: "webhook secret not configured" });

  const secret = settings.razorpayWebhookSecret.startsWith("enc:")
    ? decrypt(settings.razorpayWebhookSecret.slice(4))
    : settings.razorpayWebhookSecret;
  const signature = String(req.headers["x-razorpay-signature"] || "");
  const expected = crypto.createHmac("sha256", secret).update(req.rawBody || Buffer.from("")).digest("hex");
  if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(400).json({ error: "invalid signature" });
  }

  const event = req.body?.event;
  const entity = req.body?.payload?.payment?.entity;
  res.status(200).json({ received: true });

  if (!["payment.captured", "payment.authorized", "order.paid"].includes(event) || !entity?.order_id) return;
  try {
    const session = await prisma.intlPaymentSession.findUnique({ where: { providerRef: entity.order_id } });
    if (!session || session.provider !== "RAZORPAY" || session.orderId) return;
    const config = await getPaymentGatewayConfig(session.userId, "RAZORPAY");
    await settleRazorpaySession(session, config, { paymentId: entity.id });
  } catch (err) {
    console.error(`Razorpay webhook (${event}) could not settle order ${entity.order_id}:`, err?.message || err);
  }
});

// Get order history
export const getOrderHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Get total count
  const totalOrders = await prisma.order.count({
    where: { userId },
  });

  // Get orders with pagination
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          variant: {
            include: {
              attributes: {
                include: {
                  attributeValue: {
                    include: {
                      attribute: true,
                    },
                  },
                },
              },
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          addons: { include: { addonService: true } },
          returnRequests: {
            select: {
              id: true,
              status: true,
              reason: true,
              customReason: true,
              createdAt: true,
              processedAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
      tracking: true,
      razorpayPayment: {
        select: {
          paymentMethod: true,
          status: true,
          razorpayPaymentId: true,
        },
      },
      coupon: {
        select: {
          code: true,
          discountType: true,
          discountValue: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  // Format response
  const formattedOrders = orders.map((order) => {
    // Ensure we use the original total without modifying it
    const originalTotal = parseFloat(order.total);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      currency: order.currency || "INR",
      date: order.createdAt,
      status: order.status,
      // Use the original stored total
      total: originalTotal,
      subTotal: parseFloat(order.subTotal),
      shippingCost: parseFloat(order.shippingCost) || 0,
      tax: parseFloat(order.tax) || 0,
      discount: parseFloat(order.discount) || 0,
      couponCode: order.couponCode || null,
      couponDetails: order.coupon
        ? {
          code: order.coupon.code,
          discountType: order.coupon.discountType,
          discountValue: parseFloat(order.coupon.discountValue),
        }
        : null,
      paymentMethod: order.paymentMethod || order.razorpayPayment?.paymentMethod || "ONLINE",
      paymentStatus: order.razorpayPayment?.status || order.status,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        image: item.product.images[0]
          ? getFileUrl(item.product.images[0].url)
          : null,
        slug: item.product.slug,
        // Extract all attributes dynamically
        attributes: (() => {
          if (!item.variant?.attributes) return {};
          const attributesMap = {};
          item.variant.attributes.forEach((vav) => {
            const attrName = vav.attributeValue?.attribute?.name;
            const attrValue = vav.attributeValue?.value;
            if (attrName && attrValue) {
              attributesMap[attrName] = attrValue;
            }
          });
          return attributesMap;
        })(),
        // Backward compatibility - keep color and size for existing code
        color: (() => {
          const colorAttr = item.variant?.attributes?.find(
            (attr) => attr.attributeValue?.attribute?.name === "Color"
          );
          return colorAttr?.attributeValue?.value || null;
        })(),
        size: (() => {
          const sizeAttr = item.variant?.attributes?.find(
            (attr) => attr.attributeValue?.attribute?.name === "Size"
          );
          return sizeAttr?.attributeValue?.value || null;
        })(),
        price: parseFloat(item.price),
        quantity: item.quantity,
        subtotal: parseFloat(item.subtotal),
        addons: (item.addons || []).map((a) => ({
          id: a.addonServiceId,
          name: a.name,
          price: parseFloat(a.price),
          icon: a.addonService?.icon || null,
        })),
        // Include return request information
        returnRequest: item.returnRequests && item.returnRequests.length > 0
          ? {
            id: item.returnRequests[0].id,
            status: item.returnRequests[0].status,
            reason: item.returnRequests[0].reason,
            customReason: item.returnRequests[0].customReason,
            createdAt: item.returnRequests[0].createdAt,
            processedAt: item.returnRequests[0].processedAt,
          }
          : null,
      })),
      tracking: order.tracking
        ? {
          carrier: order.tracking.carrier,
          trackingNumber: order.tracking.trackingNumber,
          status: order.tracking.status,
          estimatedDelivery: order.tracking.estimatedDelivery,
        }
        : null,
      trackingUrl: order.trackingUrl,
      awbCode: order.awbCode,
      courierName: order.courierName,
    };
  });

  const convertedOrders = await priceConvert(formattedOrders);

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        orders: convertedOrders,
        pagination: {
          total: totalOrders,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalOrders / parseInt(limit)),
        },
      },
      "Order history fetched successfully"
    )
  );
});

// Get order details by ID
export const getOrderDetails = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;

  // Get order with details
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          variant: {
            include: {
              attributes: {
                include: {
                  attributeValue: {
                    include: {
                      attribute: true,
                    },
                  },
                },
              },
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          addons: true,
          // Include return requests for each item
          returnRequests: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      shippingAddress: true,
      tracking: {
        include: {
          updates: {
            orderBy: {
              timestamp: "desc",
            },
          },
        },
      },
      razorpayPayment: true,
      coupon: {
        select: {
          code: true,
          description: true,
          discountType: true,
          discountValue: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Format response - use original values to maintain historical pricing
  const formattedOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    currency: order.currency || "INR",
    date: order.createdAt,
    status: order.status,
    cancelReason: order.cancelReason || null,
    cancelledAt: order.cancelledAt || null,
    cancelledBy: order.cancelledBy || null,
    subTotal: parseFloat(order.subTotal),
    tax: parseFloat(order.tax),
    shippingCost: parseFloat(order.shippingCost),
    discount: parseFloat(order.discount) || 0,
    // Use the original total stored in the database to preserve historical pricing
    total: parseFloat(order.total),
    paymentMethod: order.paymentMethod || order.razorpayPayment?.paymentMethod || "ONLINE",
    paymentId: order.razorpayPayment?.razorpayPaymentId || order.paypalCaptureId || order.paymentReference || undefined,
    paymentGateway: order.paymentGateway,
    paypalCaptureId: order.paypalCaptureId,
    paymentCurrency: order.paymentCurrency,
    paidAmount: order.paidAmount != null ? parseFloat(order.paidAmount) : null,
    codCharge: parseFloat(order.codCharge) || 0,
    trackingUrl: order.trackingUrl,
    awbCode: order.awbCode,
    courierName: order.courierName,
    paymentStatus: order.razorpayPayment?.status || order.status,
    notes: order.notes,
    couponCode: order.couponCode,
    couponId: order.couponId,
    // Add detailed coupon information
    couponDetails: order.coupon
      ? {
        code: order.coupon.code,
        description: order.coupon.description,
        discountType: order.coupon.discountType,
        discountValue: parseFloat(order.coupon.discountValue),
      }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      image: item.product.images[0]
        ? getFileUrl(item.product.images[0].url)
        : null,
      slug: item.product.slug,
      color: item.variant.color?.name,
      size: item.variant.size?.name || null,
      price: parseFloat(item.price),
      quantity: item.quantity,
      subtotal: parseFloat(item.subtotal),
      addons: (item.addons || []).map((a) => ({
        id: a.addonServiceId,
        name: a.name,
        price: parseFloat(a.price),
      })),
      // Include return request information
      returnRequest: item.returnRequests && item.returnRequests.length > 0
        ? {
          id: item.returnRequests[0].id,
          status: item.returnRequests[0].status,
          reason: item.returnRequests[0].reason,
          customReason: item.returnRequests[0].customReason,
          createdAt: item.returnRequests[0].createdAt,
          processedAt: item.returnRequests[0].processedAt,
        }
        : null,
    })),
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddressSameAsShipping
      ? order.shippingAddress
      : order.billingAddress,
    tracking: order.tracking
      ? {
        carrier: order.tracking.carrier,
        trackingNumber: order.tracking.trackingNumber,
        status: order.tracking.status,
        estimatedDelivery: order.tracking.estimatedDelivery,
        updates: order.tracking.updates.map((update) => ({
          status: update.status,
          timestamp: update.timestamp,
          location: update.location,
          description: update.description,
        })),
      }
      : null,
  };

  await sendPriced(res, 200, formattedOrder, "Order details fetched successfully");
});

// Cancel order
export const cancelOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new ApiError(400, "Cancellation reason is required");
  }

  // Find order
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: {
        include: {
          variant: true,
        },
      },
      razorpayPayment: true,
      shipments: { where: { status: { in: ["CREATING", "CREATED"] } }, select: { id: true } },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Only allow cancellation for certain statuses (allow PAID if not yet shipped)
  const allowedStatuses = ["PENDING", "PROCESSING", "PAID"];
  if (!allowedStatuses.includes(order.status)) {
    throw new ApiError(400, "This order cannot be cancelled");
  }
  // Once a courier label exists the parcel may already be packed — the store has to handle it
  if (order.shipments.length || order.awbCode) {
    throw new ApiError(400, "This order has already been handed to the courier. Please contact support to cancel it.");
  }
  const { wasPaidOnline } = await import("./admin.order.controller.js");
  const refundOwed = wasPaidOnline(order);

  // Process cancellation in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Update order status
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelReason: reason,
        cancelledAt: new Date(),
        cancelledBy: userId,
        refundPending: refundOwed,
      },
    });

    // 2. Return items to inventory
    for (const item of order.items) {
      // Update inventory
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });

      // Log inventory change
      await tx.inventoryLog.create({
        data: {
          variantId: item.variantId,
          quantityChange: item.quantity,
          reason: "cancellation",
          referenceId: order.id,
          previousQuantity: item.variant.quantity,
          newQuantity: item.variant.quantity + item.quantity,
          createdBy: userId,
        },
      });
    }

    // 3. Online payments are refunded by the admin ("Refund" on the order page), which sends the money back
  });

  // Cancel Shiprocket order if it exists (outside transaction, non-blocking)
  if (order.shiprocketOrderId) {
    try {
      const { cancelShiprocketOrder, getShiprocketSettings } = await import("../utils/shiprocket.js");
      const settings = await getShiprocketSettings();
      if (settings.isEnabled) {
        await cancelShiprocketOrder(order.shiprocketOrderId);
        // Update order shiprocket status
        await prisma.order.update({
          where: { id: orderId },
          data: { shiprocketStatus: "CANCELLED" },
        });
        console.log(`Shiprocket order ${order.shiprocketOrderId} cancelled`);
      }
    } catch (error) {
      console.error("Failed to cancel Shiprocket order:", error.message);
      // Non-critical - order is already cancelled in our system
    }
  }

  // Cancel Easyship shipment if it exists (outside transaction, non-blocking)
  if (order.easyshipShipmentId) {
    try {
      const { deleteEasyshipShipment } = await import("./easyship.controller.js");
      await deleteEasyshipShipment(order.easyshipShipmentId);
      console.log(`Easyship shipment ${order.easyshipShipmentId} cancelled`);
    } catch (error) {
      console.error("Failed to cancel Easyship shipment:", error.message);
    }
  }

  res
    .status(200)
    .json(
      new ApiResponsive(200, { success: true, refundPending: refundOwed }, refundOwed
        ? "Order cancelled. Your refund will be processed by our team."
        : "Order cancelled successfully")
    );
});

// Create Cash on Delivery order
// PhonePe Callback Handler
export const phonePeCallback = asyncHandler(async (req, res) => {
  try {
    // PhonePe sends callback as POST with base64 encoded response
    const { response } = req.body;

    if (!response) {
      throw new ApiError(400, "Response data is required");
    }

    // Decode response
    const decodedResponse = JSON.parse(Buffer.from(response, "base64").toString());
    const {
      success,
      code,
      message,
      data
    } = decodedResponse;

    const transactionId = data?.merchantTransactionId;

    if (!transactionId) {
      throw new ApiError(400, "Transaction ID is required");
    }

    // Get stored transaction
    const storedTransaction = await prisma.phonePeTransaction.findUnique({
      where: { transactionId },
    });

    if (!storedTransaction) {
      throw new ApiError(404, "Transaction not found");
    }

    const orderData = JSON.parse(storedTransaction.orderData);

    // Check payment status
    if (success && code === "PAYMENT_SUCCESS") {
      // Payment successful - create order (similar to createCashOrder)
      const userId = orderData.userId;

      // Get cart items
      const cartItems = await prisma.cartItem.findMany({
        where: { userId },
        include: {
          addons: { include: { addonService: true } },
          productVariant: {
            include: {
              product: true,
            },
          },
        },
      });

      if (cartItems.length === 0) {
        throw new ApiError(400, "Cart is empty");
      }

      // Calculate totals
      let subTotal = 0;
      for (const item of cartItems) {
        const variant = item.productVariant;
        const price = parseFloat(variant.salePrice || variant.price);
        subTotal += price * item.quantity;
      }

      let discount = orderData.discountAmount || 0;
      const tax = 0;
      const shippingCost = 0;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Create order
      const result = await prisma.$transaction(async (tx) => {
        // Create order
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            subTotal: subTotal.toFixed(2),
            tax: tax.toFixed(2),
            shippingCost,
            discount,
            total: (subTotal - discount).toFixed(2),
            paymentMethod: "PHONEPE",
            paymentGateway: orderData.paymentGateway,
            paymentMode: orderData.paymentMode,
            paymentOwnerId: orderData.paymentOwnerId,
            shippingAddressId: orderData.shippingAddressId,
            billingAddressSameAsShipping: orderData.billingAddressSameAsShipping,
            status: "PAID",
            couponCode: orderData.couponCode,
            couponId: orderData.couponId,
            notes: JSON.stringify({
              phonepeTransactionId: transactionId,
              phonepePaymentId: data?.transactionId,
            }),
          },
        });

        // Create order items
        for (const item of cartItems) {
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              price: parseFloat(item.productVariant.salePrice || item.productVariant.price),
            },
          });

          // Update inventory
          await tx.productVariant.update({
            where: { id: item.productVariantId },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Clear cart
        await tx.cartItem.deleteMany({
          where: { userId },
        });

        // Update transaction status
        await tx.phonePeTransaction.update({
          where: { transactionId },
          data: { status: "SUCCESS", orderId: order.id },
        });

        return order;
      });

      // Redirect to success page
      res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/account/orders?success=true&orderId=${result.id}`);
    } else {
      // Payment failed
      await prisma.phonePeTransaction.update({
        where: { transactionId },
        data: { status: "FAILED", errorMessage: message || code },
      });

      res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/payment/failed?transactionId=${transactionId}&error=${encodeURIComponent(message || code)}`);
    }
  } catch (error) {
    console.error("PhonePe callback error:", error);
    res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/payment/failed?error=${encodeURIComponent(error.message)}`);
  }
});

export const createCashOrder = asyncHandler(async (req, res) => {
  const { shippingAddressId, billingAddressSameAsShipping = true, billingAddress, couponCode, notes } = req.body;
  if (!shippingAddressId) throw new ApiError(400, "Shipping address is required");

  const paymentSettings = await prisma.paymentSettings.findFirst();
  if (!paymentSettings || !paymentSettings.cashEnabled) {
    throw new ApiError(400, "Cash on Delivery is not enabled");
  }

  // Same pricing, coupon, stock and duplicate-click protection as online payments
  const { order, created } = await placeCodOrder({
    userId: req.user.id,
    shippingAddressId,
    couponCode,
    codCharge: parseFloat(paymentSettings.codCharge) || 0,
    billingAddressSameAsShipping,
    billingAddress,
    notes,
  });

  return res.status(200).json(new ApiResponsive(200, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    currency: order.currency || "INR",
    paymentMethod: "CASH",
    ...(!created && { alreadyPlaced: true }),
  }, created ? "Cash on Delivery order created successfully" : "Order already placed"));
});

// Helper function to map Razorpay payment method to our enum
function mapRazorpayMethod(method) {
  const methodMap = {
    card: "CARD",
    netbanking: "NETBANKING",
    wallet: "WALLET",
    upi: "UPI",
    emi: "EMI",
  };

  return methodMap[method] || "OTHER";
}
