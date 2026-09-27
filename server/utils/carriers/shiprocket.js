// Shiprocket (domestic India) behind the same carrier interface. Nothing happens automatically:
// the admin picks a courier from live rates, then we create the Shiprocket order, assign the AWB and fetch label/invoice.
import { prisma } from "../../config/db.js";
import { ApiError } from "../ApiError.js";
import {
  isShiprocketEnabled,
  checkServiceability,
  buildShiprocketOrderPayload,
  createShiprocketOrder,
  assignAWB,
  schedulePickup,
  generateLabel,
  printInvoice,
  cancelShiprocketOrder,
  trackShipment,
  getDefaultPickupAddress,
} from "../shiprocket.js";

export async function shiprocketConfig(_settings, { requireEnabled = true } = {}) {
  if (requireEnabled && !(await isShiprocketEnabled())) {
    throw new ApiError(400, "Shiprocket is not configured or not enabled (Settings → Shipping)");
  }
  return { mode: "live" };
}

export async function getRates(ctx) {
  if (ctx.isInternational) throw new ApiError(400, "Shiprocket is for Indian addresses only — use FedEx, DHL or Easyship");
  const pickup = await getDefaultPickupAddress();
  if (!pickup) throw new ApiError(400, "Add a default pickup address in Settings → Shipping");
  const res = await checkServiceability({
    pickupPincode: pickup.pincode,
    deliveryPincode: ctx.recipient.postalCode,
    weight: ctx.parcel.weightKg,
    cod: ctx.order.paymentMethod === "CASH",
  });
  const list = res?.data?.available_courier_companies || [];
  return list.map((c) => ({
    serviceCode: String(c.courier_company_id),
    serviceName: c.courier_name,
    amount: Number(c.rate || c.freight_charge || 0),
    currency: "INR",
    transit: c.etd || (c.estimated_delivery_days ? `${c.estimated_delivery_days} days` : null),
    deliveryDate: null,
    cod: c.cod === 1,
  }));
}

export async function createShipment(ctx, _cfg, { serviceCode }) {
  let order = ctx.order;
  if (!order.shiprocketOrderId || !order.shiprocketShipmentId) {
    const payload = await buildShiprocketOrderPayload({ ...order, user: order.user, shippingAddress: order.shippingAddress });
    payload.length = ctx.parcel.lengthCm;
    payload.breadth = ctx.parcel.widthCm;
    payload.height = ctx.parcel.heightCm;
    payload.weight = ctx.parcel.weightKg;
    const created = await createShiprocketOrder(payload);
    if (!created?.shipment_id) throw new ApiError(502, `Shiprocket did not create the order: ${created?.message || "unknown error"}`);
    order = await prisma.order.update({
      where: { id: order.id },
      data: { shiprocketOrderId: created.order_id, shiprocketShipmentId: created.shipment_id, shiprocketStatus: "CREATED" },
    });
  }

  const awb = await assignAWB(order.shiprocketShipmentId, Number(serviceCode));
  const awbData = awb?.response?.data || {};
  if (!awbData.awb_code) {
    throw new ApiError(502, `Shiprocket could not assign an AWB: ${awb?.message || awbData.awb_assign_error || "courier unavailable"}`);
  }

  try {
    await schedulePickup(order.shiprocketShipmentId);
  } catch (err) {
    console.error("Shiprocket pickup scheduling failed (can be retried in Shiprocket):", err.message);
  }

  let labelUrl = null;
  let invoiceUrl = null;
  try {
    labelUrl = (await generateLabel(order.shiprocketShipmentId))?.label_url || null;
  } catch (err) {
    console.error("Shiprocket label failed:", err.message);
  }
  try {
    invoiceUrl = (await printInvoice(order.shiprocketOrderId))?.invoice_url || null;
  } catch (err) {
    console.error("Shiprocket invoice failed:", err.message);
  }

  await prisma.order.update({ where: { id: order.id }, data: { shiprocketStatus: "AWB_ASSIGNED" } });

  return {
    trackingNumber: awbData.awb_code,
    trackingUrl: `https://shiprocket.co/tracking/${awbData.awb_code}`,
    externalId: String(order.shiprocketShipmentId),
    labelUrl,
    invoiceUrl,
    cost: awbData.freight_charges != null ? { amount: Number(awbData.freight_charges), currency: "INR" } : null,
    serviceName: awbData.courier_name,
  };
}

export async function cancel(shipment, _cfg, { order }) {
  if (order.shiprocketOrderId) await cancelShiprocketOrder(order.shiprocketOrderId);
  // Clear the ids so the order can be shipped again after re-opening
  await prisma.order.update({
    where: { id: order.id },
    data: { shiprocketOrderId: null, shiprocketShipmentId: null, shiprocketStatus: "CANCELLED" },
  });
  return { cancelledRemotely: true };
}

export async function track(shipment) {
  const data = await trackShipment(shipment.trackingNumber);
  const t = data?.tracking_data || {};
  const status = t.shipment_track?.[0]?.current_status || t.shipment_status_text || String(t.shipment_status ?? "Unknown");
  return {
    status,
    delivered: /delivered/i.test(status) && !/undelivered|rto/i.test(status),
    events: (t.shipment_track_activities || []).map((a) => ({ date: a.date, description: a.activity, location: a.location })),
  };
}

export async function test() {
  const { authenticate } = await import("../shiprocket.js");
  await authenticate();
  return "Shiprocket login successful";
}
