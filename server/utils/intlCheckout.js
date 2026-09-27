// Shared logic for international checkouts (PayPal, Payoneer).
// Totals are always computed here from the user's cart — never trusted from the browser.
import { prisma } from "../config/db.js";
import { ApiError } from "./ApiError.js";
import { applyFlashSalePrice } from "./flashSaleHelpers.js";
import sendEmail from "./sendEmail.js";
import { getOrderConfirmationTemplate } from "../email/temp/EmailTemplate.js";
import { getStoreConfigFromDb } from "./storeConfig.js";
import { processReferralReward } from "../controllers/referral.controller.js";

const round2 = (n) => Math.round(n * 100) / 100;

// "United States" / "USA" / "us" -> "US"
let countryIndex = null;
export function toCountryCode(country) {
  if (!country) return null;
  const raw = String(country).trim();
  if (!countryIndex) {
    countryIndex = new Map();
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        const name = names.of(code);
        if (name && name !== code) countryIndex.set(name.toLowerCase(), code);
      }
    }
    for (const [alias, code] of [["usa", "US"], ["united states of america", "US"], ["uk", "GB"], ["england", "GB"], ["uae", "AE"], ["bharat", "IN"]]) {
      countryIndex.set(alias, code);
    }
  }
  const byName = countryIndex.get(raw.toLowerCase());
  if (byName) return byName;
  if (/^[A-Za-z]{2}$/.test(raw)) {
    const code = raw.toUpperCase();
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    return name && name !== code ? code : null;
  }
  return null;
}

async function effectiveUnitPrice(variant, quantity) {
  let price = parseFloat(variant.salePrice || variant.price);
  const flash = await applyFlashSalePrice(price, variant.productId);
  price = Math.round(flash.hasFlashSale ? flash.price : price);
  // Same precedence as the cart: variant slabs, then product slabs (ascending minQty, first match)
  const slabs = [...(variant.pricingSlabs || []), ...(variant.product?.pricingSlabs || [])].sort(
    (a, b) => a.minQty - b.minQty
  );
  for (const slab of slabs) {
    if (quantity >= slab.minQty && (slab.maxQty === null || quantity <= slab.maxQty)) {
      return Math.round(parseFloat(slab.price));
    }
  }
  return price;
}

async function couponDiscount(couponCode, items) {
  if (!couponCode) return { discount: 0, coupon: null };
  const coupon = await prisma.coupon.findFirst({
    where: { code: couponCode, isActive: true },
    include: { categories: true, products: true, brands: true },
  });
  if (!coupon) throw new ApiError(400, "Coupon is no longer valid");
  if (coupon.maxUses && (coupon.usedCount || 0) >= coupon.maxUses) {
    throw new ApiError(400, "Coupon usage limit exceeded");
  }

  const categorySet = new Set(coupon.categories.map((c) => c.categoryId));
  const productSet = new Set(coupon.products.map((p) => p.productId));
  const brandSet = new Set(coupon.brands.map((b) => b.brandId));
  const hasTargets = categorySet.size || productSet.size || brandSet.size;

  let applicable = 0;
  for (const item of items) {
    const matches =
      !hasTargets ||
      productSet.has(item.productId) ||
      (item.brandId && brandSet.has(item.brandId)) ||
      item.categoryIds.some((c) => categorySet.has(c));
    if (matches) applicable += item.unitPrice * item.quantity;
  }
  if (hasTargets && applicable === 0) throw new ApiError(400, "Coupon does not apply to your cart");
  if (coupon.minOrderAmount && applicable < parseFloat(coupon.minOrderAmount)) {
    throw new ApiError(400, `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`);
  }

  let discount =
    coupon.discountType === "PERCENTAGE"
      ? (applicable * Math.min(parseFloat(coupon.discountValue), 90)) / 100
      : parseFloat(coupon.discountValue);
  discount = Math.round(Math.min(discount, applicable * 0.9));
  return { discount, coupon: { id: coupon.id, code: coupon.code } };
}

/**
 * Price the user's current cart for an international payment.
 * Throws if the cart is empty, an item is inactive, or stock is insufficient.
 */
export async function buildIntlQuote(userId, shippingAddressId, couponCode, { currency = "USD" } = {}) {
  const address = await prisma.address.findFirst({ where: { id: shippingAddressId, userId } });
  if (!address) throw new ApiError(400, "Shipping address not found");

  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      addons: { include: { addonService: true } },
      productVariant: {
        include: {
          pricingSlabs: true,
          product: { include: { pricingSlabs: { where: { variantId: null } }, categories: true } },
        },
      },
    },
  });
  if (!cartItems.length) throw new ApiError(400, "Your cart is empty");

  const items = [];
  let subTotal = 0;
  for (const ci of cartItems) {
    const v = ci.productVariant;
    if (!v || !v.isActive || !v.product?.isActive) {
      throw new ApiError(400, `${v?.product?.name || "An item"} is no longer available`);
    }
    if (v.quantity < ci.quantity) {
      throw new ApiError(409, `Only ${v.quantity} left of ${v.product.name}. Please update your cart.`);
    }
    const unitPrice = await effectiveUnitPrice(v, ci.quantity);
    const addons = ci.addons.map((a) => ({
      addonServiceId: a.addonServiceId,
      name: a.addonService?.name || "",
      price: round2(parseFloat(a.price)),
    }));
    const addonsTotal = Math.round(addons.reduce((s, a) => s + a.price, 0));
    const lineTotal = Math.round(unitPrice * ci.quantity) + addonsTotal;
    subTotal += lineTotal;
    items.push({
      variantId: v.id,
      productId: v.productId,
      name: v.product.name,
      sku: v.sku,
      quantity: ci.quantity,
      unitPrice,
      subtotal: lineTotal,
      addons,
      brandId: v.product.brandId,
      categoryIds: v.product.categories.map((c) => c.categoryId),
    });
  }
  subTotal = Math.round(subTotal);

  // Shipping — same rule as the cart page
  let shippingCost = 0;
  const shipSettings = await prisma.shiprocketSettings.findFirst();
  if (shipSettings) {
    const charge = parseFloat(shipSettings.shippingCharge) || 0;
    const threshold = charge > 0 ? parseFloat(shipSettings.freeShippingThreshold) || 0 : 0;
    shippingCost = charge > 0 && !(threshold > 0 && subTotal >= threshold) ? Math.round(charge) : 0;
  }

  const { discount, coupon } = await couponDiscount(couponCode, items);
  const total = Math.max(Math.round(subTotal - discount + shippingCost), 1);

  const settings = await prisma.siteSettings.findFirst({ select: { usdExchangeRate: true } });
  const exchangeRate = settings?.usdExchangeRate > 0 ? settings.usdExchangeRate : 90;
  const amountUsd = Math.max(round2(total / exchangeRate), 0.01);

  return {
    address,
    quote: {
      items: items.map(({ brandId, categoryIds, ...rest }) => rest),
      subTotal,
      discount,
      shippingCost,
      total,
      coupon,
      exchangeRate,
      amountUsd,
      currency,
    },
  };
}

/** Throws a 409 if any quoted item no longer has enough stock (call before taking money). */
export async function assertStock(quote) {
  for (const item of quote.items) {
    const v = await prisma.productVariant.findUnique({ where: { id: item.variantId }, select: { quantity: true, isActive: true } });
    if (!v || !v.isActive || v.quantity < item.quantity) {
      throw new ApiError(409, `${item.name} just went out of stock. You have not been charged.`);
    }
  }
}

/**
 * A session is a duplicate when the same items were already ordered (by any payment method,
 * including COD) after this checkout was started — e.g. the customer paid in a second tab.
 */
export async function findDuplicateOrder(session, db = prisma) {
  const variantIds = (session.quote?.items || []).map((i) => i.variantId);
  if (!variantIds.length) return null;
  return db.order.findFirst({
    where: {
      userId: session.userId,
      createdAt: { gt: session.createdAt },
      status: { notIn: ["CANCELLED", "REFUNDED"] },
      ...(session.orderId && { id: { not: session.orderId } }),
      items: { some: { variantId: { in: variantIds } } },
    },
    select: { id: true, orderNumber: true },
  });
}

export class DuplicatePaymentError extends ApiError {
  constructor(order) {
    super(409, `These items were already ordered in order #${order.orderNumber}.`);
    this.duplicateOf = order;
  }
}

/**
 * Create the order from a payment session exactly once.
 * `payment` = { status: "PAID" | "PENDING", paymentMethod, reference, captureId?, paidAmount, note? }
 * Returns { order, created } — created=false when another request already completed it.
 */
export async function createOrderFromSession(sessionId, payment) {
  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.intlPaymentSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new ApiError(404, "Payment session not found");
    if (session.orderId) {
      return { order: await tx.order.findUnique({ where: { id: session.orderId } }), created: false };
    }
    // Same per-user lock as COD, so two payments settling at once see each other's order
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"order:" + session.userId}))`;
    // Re-read after the lock: a parallel call for this same session may have just finished
    const fresh = await tx.intlPaymentSession.findUnique({ where: { id: sessionId } });
    if (fresh.orderId) {
      return { order: await tx.order.findUnique({ where: { id: fresh.orderId } }), created: false };
    }
    const duplicate = await findDuplicateOrder(fresh, tx);
    if (duplicate) throw new DuplicatePaymentError(duplicate);

    // Claim the session so concurrent callbacks (return page + webhook) cannot both create orders
    const claimed = await tx.intlPaymentSession.updateMany({
      where: { id: sessionId, orderId: null, status: { in: ["CREATED", "PROCESSING"] } },
      data: { status: "PROCESSING" },
    });
    if (!claimed.count) {
      const latest = await tx.intlPaymentSession.findUnique({ where: { id: sessionId } });
      if (latest?.orderId) {
        return { order: await tx.order.findUnique({ where: { id: latest.orderId } }), created: false };
      }
      throw new ApiError(409, "Payment session is not payable");
    }

    const quote = session.quote;
    const address = await tx.address.findUnique({ where: { id: session.shippingAddressId } });
    const settings = await tx.siteSettings.findFirst({ select: { orderPrefix: true } });
    const orderNumber = `${settings?.orderPrefix || "ORD"}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const isIndia = toCountryCode(address?.country) === "IN";

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: session.userId,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        paymentGateway: session.provider,
        paymentMode: session.mode === "live" ? "LIVE" : "TEST",
        subTotal: quote.subTotal,
        shippingCost: quote.shippingCost,
        discount: quote.discount,
        tax: 0,
        total: quote.total,
        shippingAddressId: session.shippingAddressId,
        shippingProvider: isIndia ? "SHIPROCKET" : "EASYSHIP",
        couponId: quote.coupon?.id || null,
        couponCode: quote.coupon?.code || null,
        paypalCaptureId: payment.captureId || null,
        paymentCurrency: quote.currency,
        paidAmount: payment.paidAmount,
        exchangeRate: quote.exchangeRate,
        paymentReference: payment.reference,
        notes: payment.note || null,
      },
    });

    for (const item of quote.items) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          price: item.unitPrice,
          quantity: item.quantity,
          subtotal: item.subtotal,
        },
      });
      if (item.addons.length) {
        await tx.orderItemAddon.createMany({
          data: item.addons.map((a) => ({ orderItemId: orderItem.id, addonServiceId: a.addonServiceId, name: a.name, price: a.price })),
        });
      }
      // Money is already taken, so never block here — log a negative stock for the admin instead.
      const before = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { quantity: true } });
      await tx.productVariant.update({ where: { id: item.variantId }, data: { quantity: { decrement: item.quantity } } });
      await tx.inventoryLog.create({
        data: {
          variantId: item.variantId,
          quantityChange: -item.quantity,
          reason: "sale",
          referenceId: order.id,
          previousQuantity: before?.quantity ?? 0,
          newQuantity: (before?.quantity ?? 0) - item.quantity,
          createdBy: session.userId,
          notes: before && before.quantity < item.quantity ? "Oversold — stock went negative after international payment" : null,
        },
      });
    }

    if (quote.coupon?.id) {
      await tx.coupon.update({ where: { id: quote.coupon.id }, data: { usedCount: { increment: 1 } } });
      await tx.userCoupon.updateMany({ where: { userId: session.userId, couponId: quote.coupon.id, isActive: true }, data: { isActive: false } });
    }

    // Only remove what was bought — the customer may have added items in another tab.
    await tx.cartItem.deleteMany({ where: { userId: session.userId, productVariantId: { in: quote.items.map((i) => i.variantId) } } });

    if (payment.afterCreate) await payment.afterCreate(tx, order);

    await tx.intlPaymentSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED", orderId: order.id },
    });
    return { order, created: true };
  });

  if (result.created) {
    sendConfirmationEmail(result.order.id).catch((err) => console.error("Order email failed:", err));
    processReferralReward(result.order.id, result.order.userId).catch((err) => console.error("Referral reward failed:", err));
  }
  return result;
}

async function sendConfirmationEmail(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      shippingAddress: true,
      items: { include: { product: true, variant: { include: { attributes: { include: { attributeValue: true } } } } } },
    },
  });
  if (!order?.user?.email) return;
  const storeConfig = await getStoreConfigFromDb();
  const methodLabel = { PAYPAL: "PayPal", PAYONEER: "Payoneer", RAZORPAY: "Online payment (Razorpay)" }[order.paymentMethod] || "Online";
  await sendEmail({
    email: order.user.email,
    subject: `Order Confirmation - #${order.orderNumber}`,
    html: getOrderConfirmationTemplate(
      {
        userName: order.user.name || "Valued Customer",
        orderNumber: order.orderNumber,
        orderDate: order.createdAt,
        paymentMethod: order.paymentCurrency && order.paymentCurrency !== "INR" ? `${methodLabel} (${order.paymentCurrency} ${Number(order.paidAmount || 0).toFixed(2)})` : methodLabel,
        items: order.items.map((i) => ({
          name: i.product.name,
          variant: i.variant.attributes.map((a) => a.attributeValue.value).join(" "),
          quantity: i.quantity,
          price: parseFloat(i.price).toFixed(2),
        })),
        subtotal: parseFloat(order.subTotal).toFixed(2),
        shipping: parseFloat(order.shippingCost).toFixed(2),
        tax: "0.00",
        total: parseFloat(order.total).toFixed(2),
        shippingAddress: order.shippingAddress,
      },
      storeConfig
    ),
  });
}
