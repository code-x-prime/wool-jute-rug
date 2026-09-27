// Carrier registry + shipment lifecycle shared by the admin order page and order cancellation.
import { prisma } from "../../config/db.js";
import { ApiError } from "../ApiError.js";
import sendEmail from "../sendEmail.js";
import { getStoreConfigFromDb } from "../storeConfig.js";
import { buildShipmentContext } from "./context.js";
import * as fedex from "./fedex.js";
import * as dhl from "./dhl.js";
import * as easyship from "./easyship.js";
import * as shiprocket from "./shiprocket.js";

export const CARRIERS = {
  SHIPROCKET: { name: "Shiprocket", scope: "domestic", mod: shiprocket, config: shiprocket.shiprocketConfig },
  FEDEX: { name: "FedEx", scope: "international", mod: fedex, config: fedex.fedexConfig },
  DHL: { name: "DHL Express", scope: "international", mod: dhl, config: dhl.dhlConfig },
  EASYSHIP: { name: "Easyship", scope: "international", mod: easyship, config: easyship.easyshipConfig },
  MANUAL: { name: "Manual / other courier", scope: "any" },
};

const round2 = (n) => Math.round(n * 100) / 100;

function carrier(code) {
  const c = CARRIERS[code];
  if (!c) throw new ApiError(400, `Unknown carrier ${code}`);
  return c;
}

export async function carrierConfig(code, { requireEnabled = true } = {}) {
  const c = carrier(code);
  if (!c.config) return { mode: "manual" };
  const settings = await prisma.siteSettings.findFirst();
  return c.config(settings, { requireEnabled });
}

/** Which carriers the admin can use right now, with whether they are set up. */
export async function availableCarriers() {
  const settings = await prisma.siteSettings.findFirst();
  const out = [];
  for (const [code, c] of Object.entries(CARRIERS)) {
    let ready = true;
    let mode = null;
    if (c.config) {
      try {
        mode = (await c.config(settings, { requireEnabled: true })).mode;
      } catch {
        ready = false;
      }
    }
    out.push({ code, name: c.name, scope: c.scope, ready, mode });
  }
  return out;
}

const toInr = (amount, currency, rate) =>
  currency === "INR" ? round2(amount) : currency === "USD" ? round2(amount * rate) : null;

export async function quoteRates(orderId, code, parcelOverrides) {
  if (code === "MANUAL") return { rates: [], parcel: null };
  const ctx = await buildShipmentContext(orderId, parcelOverrides);
  const cfg = await carrierConfig(code);
  const rates = await carrier(code).mod.getRates(ctx, cfg);
  return {
    parcel: ctx.parcel,
    customsValueUsd: ctx.customs.valueUsd,
    rates: rates
      .map((r) => ({ ...r, amountInr: toInr(r.amount, r.currency, ctx.exchangeRate) }))
      .sort((a, b) => (a.amountInr ?? a.amount) - (b.amountInr ?? b.amount)),
  };
}

const ACTIVE = ["CREATING", "CREATED"];

/**
 * Book a shipment. A placeholder row is created under a per-order lock first, so two clicks
 * (or two admins) can never buy two labels for the same order.
 */
export async function bookShipment({ orderId, carrierCode, serviceCode, serviceName, quotedAmount, quotedCurrency, parcel, manual, adminId, notifyCustomer }) {
  const c = carrier(carrierCode);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Order not found");
  if (["CANCELLED", "REFUNDED", "DELIVERED"].includes(order.status)) {
    throw new ApiError(400, `Order is ${order.status} — it cannot be shipped`);
  }
  if (order.status === "PENDING" && order.paymentMethod !== "CASH") {
    throw new ApiError(400, "Payment for this order is not confirmed yet — do not ship it");
  }

  const placeholder = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"ship:" + orderId}))`;
    const active = await tx.shipment.findFirst({ where: { orderId, status: { in: ACTIVE } } });
    if (active) {
      throw new ApiError(409, `This order already has an active ${CARRIERS[active.carrier]?.name || active.carrier} shipment (${active.trackingNumber || "being created"}). Cancel it first.`);
    }
    return tx.shipment.create({ data: { orderId, carrier: carrierCode, serviceCode, serviceName, status: "CREATING", createdBy: adminId } });
  });

  try {
    let result;
    let weightKg = null;
    let exchangeRate = order.exchangeRate || 90;
    if (carrierCode === "MANUAL") {
      if (!manual?.courierName?.trim() || !manual?.trackingNumber?.trim()) {
        throw new ApiError(400, "Courier name and tracking number are required");
      }
      result = {
        trackingNumber: manual.trackingNumber.trim(),
        trackingUrl: manual.trackingUrl?.trim() || null,
        serviceName: manual.courierName.trim(),
        cost: manual.cost ? { amount: Number(manual.cost), currency: "INR" } : null,
      };
    } else {
      const ctx = await buildShipmentContext(orderId, parcel);
      weightKg = ctx.parcel.weightKg;
      exchangeRate = ctx.exchangeRate;
      if (c.scope === "domestic" && ctx.isInternational) throw new ApiError(400, `${c.name} cannot ship outside India`);
      if (c.scope === "international" && !ctx.isInternational) throw new ApiError(400, `${c.name} here is set up for international orders — use Shiprocket for India`);
      const cfg = await carrierConfig(carrierCode);
      result = await c.mod.createShipment(ctx, cfg, { serviceCode });
    }

    const cost = result.cost || (quotedAmount != null ? { amount: Number(quotedAmount), currency: quotedCurrency || "INR" } : null);
    const shipment = await prisma.shipment.update({
      where: { id: placeholder.id },
      data: {
        status: "CREATED",
        serviceName: result.serviceName || serviceName || c.name,
        trackingNumber: result.trackingNumber,
        trackingUrl: result.trackingUrl,
        externalId: result.externalId || null,
        labelUrl: result.labelUrl || null,
        labelData: result.labelData || null,
        invoiceUrl: result.invoiceUrl || null,
        invoiceData: result.invoiceData || null,
        cost: cost ? round2(cost.amount) : null,
        costCurrency: cost?.currency || null,
        costInr: cost ? toInr(cost.amount, cost.currency, exchangeRate) : null,
        weightKg,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        awbCode: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
        courierName: shipment.serviceName,
        shippingProvider: carrierCode,
        ...(carrierCode === "EASYSHIP" && { easyshipShipmentId: shipment.externalId, easyshipTrackingNumber: shipment.trackingNumber }),
        ...(["PAID", "PENDING"].includes(order.status) && { status: "PROCESSING" }),
      },
    });

    if (notifyCustomer) {
      await sendTrackingEmail(shipment.id).catch((err) => console.error("Tracking email failed:", err.message));
    }
    return shipment;
  } catch (err) {
    // Nothing was bought unless the carrier returned an id — keep that for manual follow-up
    if (err.externalId) {
      await prisma.shipment.update({ where: { id: placeholder.id }, data: { status: "CANCELLED", externalId: err.externalId, cancelNote: `Failed: ${err.message}` } });
    } else {
      await prisma.shipment.delete({ where: { id: placeholder.id } }).catch(() => { });
    }
    throw err;
  }
}

export async function cancelShipment(shipmentId, { note, adminId } = {}) {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId }, include: { order: true } });
  if (!shipment) throw new ApiError(404, "Shipment not found");
  if (shipment.status === "CANCELLED") return { shipment, message: "Already cancelled" };
  if (shipment.status === "CREATING") throw new ApiError(409, "Shipment is still being created — try again in a moment");

  let remote = { cancelledRemotely: false, note: "Manual shipment — inform the courier yourself if needed." };
  if (shipment.carrier !== "MANUAL") {
    const cfg = await carrierConfig(shipment.carrier, { requireEnabled: false });
    remote = await carrier(shipment.carrier).mod.cancel(shipment, cfg, { order: shipment.order });
  }

  const cancelNote = [note, remote.note, adminId ? `by admin ${adminId}` : null].filter(Boolean).join(" · ");
  const updated = await prisma.shipment.update({
    where: { id: shipmentId },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelNote },
  });
  // Clear tracking on the order if this was its current shipment
  if (shipment.order.awbCode === shipment.trackingNumber) {
    await prisma.order.update({
      where: { id: shipment.orderId },
      data: {
        awbCode: null,
        trackingUrl: null,
        courierName: null,
        ...(shipment.carrier === "EASYSHIP" && { easyshipShipmentId: null, easyshipTrackingNumber: null }),
        ...(shipment.order.status === "PROCESSING" && { status: shipment.order.paymentMethod === "CASH" ? "PENDING" : "PAID" }),
      },
    });
  }
  return { shipment: updated, message: remote.cancelledRemotely ? "Shipment cancelled with the carrier" : remote.note };
}

/** Best-effort cancel of every active shipment (used when an order is cancelled). */
export async function cancelActiveShipments(orderId, note) {
  const active = await prisma.shipment.findMany({ where: { orderId, status: "CREATED" } });
  const problems = [];
  for (const s of active) {
    try {
      await cancelShipment(s.id, { note });
    } catch (err) {
      problems.push(`${CARRIERS[s.carrier]?.name || s.carrier} ${s.trackingNumber}: ${err.message}`);
    }
  }
  return problems;
}

export async function refreshTracking(shipmentId) {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) throw new ApiError(404, "Shipment not found");
  if (shipment.carrier === "MANUAL") throw new ApiError(400, "Manual shipments have no live tracking — use the courier's website");
  if (!shipment.trackingNumber) throw new ApiError(400, "Shipment has no tracking number yet");
  const cfg = await carrierConfig(shipment.carrier, { requireEnabled: false });
  const t = await carrier(shipment.carrier).mod.track(shipment, cfg);
  return prisma.shipment.update({
    where: { id: shipmentId },
    data: { lastTrackingStatus: t.status, trackingEvents: { delivered: !!t.delivered, events: t.events.slice(0, 50) }, trackedAt: new Date() },
  });
}

export async function testCarrier(code) {
  const cfg = await carrierConfig(code, { requireEnabled: false });
  return carrier(code).mod.test(cfg);
}

export async function sendTrackingEmail(shipmentId) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { order: { include: { user: true, shippingAddress: true } } },
  });
  if (!shipment || shipment.status !== "CREATED") throw new ApiError(400, "Only active shipments can be emailed");
  const user = shipment.order.user;
  if (!user?.email) throw new ApiError(400, "Customer has no email address");
  const store = await getStoreConfigFromDb().catch(() => null);
  const storeName = store?.storeName || "our store";
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const link = shipment.trackingUrl
    ? `<p style="margin:24px 0"><a href="${esc(shipment.trackingUrl)}" style="background:#3D1C02;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600">Track your parcel</a></p>`
    : "";
  await sendEmail({
    email: user.email,
    subject: `Your order #${shipment.order.orderNumber} has shipped`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222">
      <h2 style="color:#3D1C02">Your order is on its way</h2>
      <p>Hi ${esc(user.name || "there")},</p>
      <p>Good news — order <b>#${esc(shipment.order.orderNumber)}</b> has been handed to <b>${esc(shipment.serviceName || shipment.carrier)}</b>.</p>
      <table style="border-collapse:collapse;margin:12px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Courier</td><td><b>${esc(shipment.serviceName || shipment.carrier)}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Tracking number</td><td><b>${esc(shipment.trackingNumber)}</b></td></tr>
      </table>
      ${link}
      <p style="color:#666;font-size:13px">Tracking can take up to 24 hours to show the first update.</p>
      <p>Thank you for shopping with ${esc(storeName)}.</p>
    </div>`,
  });
  return prisma.shipment.update({ where: { id: shipmentId }, data: { customerNotifiedAt: new Date() } });
}
