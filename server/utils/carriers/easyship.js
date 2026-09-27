// Easyship (aggregator — FedEx, DHL, UPS, Aramex … through one account). API version 2024-09.
import { ApiError } from "../ApiError.js";
import { secret, assertShipperReady } from "./context.js";

const BASE = "https://public-api.easyship.com/2024-09";

export function easyshipConfig(settings, { requireEnabled = true } = {}) {
  if ((requireEnabled && !settings?.easyshipEnabled) || !settings?.easyshipApiKey) {
    throw new ApiError(400, "Easyship is not configured or not enabled (Settings → International Shipping)");
  }
  return { mode: "live", apiKey: secret(settings.easyshipApiKey).trim() };
}

async function call(cfg, path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new ApiError(400, "Easyship rejected the API key");
    const e = data.error || {};
    throw new ApiError(502, `Easyship: ${[e.message, ...(e.details || [])].filter(Boolean).join("; ") || `HTTP ${res.status}`}`);
  }
  return data;
}

const address = (p, isOrigin) => ({
  contact_name: p.name,
  company_name: isOrigin ? p.company : undefined,
  line_1: (p.street || "").slice(0, 35),
  city: p.city,
  state: p.stateCode || p.state || undefined,
  postal_code: p.postalCode,
  country_alpha2: p.countryCode,
  contact_phone: p.phone,
  contact_email: p.email,
});

const parcels = (ctx) => [{
  total_actual_weight: ctx.parcel.weightKg,
  box: { length: ctx.parcel.lengthCm, width: ctx.parcel.widthCm, height: ctx.parcel.heightCm },
  items: ctx.customs.items.map((i) => ({
    description: i.description,
    category: "home_decor",
    sku: i.sku,
    quantity: i.quantity,
    declared_currency: "USD",
    declared_customs_value: i.unitValueUsd,
    hs_code: i.hsCode,
    origin_country_alpha2: "IN",
    actual_weight: i.unitWeightKg,
  })),
}];

const rateId = (r) => r.courier_service?.id || r.courier_id;
const rateName = (r) => r.courier_service?.umbrella_name
  ? `${r.courier_service.umbrella_name} ${r.courier_service.name || ""}`.trim()
  : r.courier_service?.name || r.courier_name || "Courier";

export async function getRates(ctx, cfg) {
  assertShipperReady(ctx);
  const data = await call(cfg, "/rates", {
    method: "POST",
    body: {
      origin_address: address(ctx.shipper, true),
      destination_address: address(ctx.recipient, false),
      incoterms: "DDU",
      insurance: { is_insured: false },
      courier_settings: { show_courier_logo_url: false, apply_shipping_rules: true },
      shipping_settings: { units: { weight: "kg", dimensions: "cm" }, output_currency: "INR" },
      parcels: parcels(ctx),
    },
  });
  return (data.rates || []).map((r) => ({
    serviceCode: rateId(r),
    serviceName: rateName(r),
    amount: Number(r.total_charge || 0),
    currency: r.currency || "INR",
    transit: r.min_delivery_time != null ? `${r.min_delivery_time}–${r.max_delivery_time} days` : null,
    deliveryDate: null,
  }));
}

export async function createShipment(ctx, cfg, { serviceCode }) {
  assertShipperReady(ctx);
  const data = await call(cfg, "/shipments", {
    method: "POST",
    body: {
      origin_address: address(ctx.shipper, true),
      destination_address: address(ctx.recipient, false),
      incoterms: "DDU",
      insurance: { is_insured: false },
      courier_settings: { courier_service_id: serviceCode, allow_fallback: false },
      shipping_settings: {
        units: { weight: "kg", dimensions: "cm" },
        output_currency: "INR",
        buy_label: true,
        buy_label_synchronous: true,
        printing_options: { format: "pdf", label: "4x6", commercial_invoice: "A4", packing_slip: "none" },
      },
      order_data: { platform_order_number: ctx.order.orderNumber },
      parcels: parcels(ctx),
    },
  });
  const sh = data.shipment;
  if (!sh?.easyship_shipment_id) throw new ApiError(502, "Easyship returned no shipment");
  const tracking = sh.trackings?.[0]?.tracking_number || sh.tracking_number;
  const doc = (cat) => sh.shipping_documents?.find((d) => d.category === cat);
  const docData = (d) => (d?.base64_encoded_strings?.length ? Buffer.concat(d.base64_encoded_strings.map((b) => Buffer.from(b, "base64"))) : null);
  const label = doc("label");
  const invoice = doc("commercial_invoice");
  const rate = sh.rates?.[0];
  if (sh.label_state && !["generated", "printed"].includes(sh.label_state)) {
    throw Object.assign(new ApiError(502, `Easyship created shipment ${sh.easyship_shipment_id} but the label is "${sh.label_state}". Check the Easyship dashboard.`), { externalId: sh.easyship_shipment_id });
  }
  return {
    trackingNumber: tracking || sh.easyship_shipment_id,
    trackingUrl: sh.tracking_page_url || `https://www.trackmyshipment.co/shipment-tracking/${sh.easyship_shipment_id}`,
    externalId: sh.easyship_shipment_id,
    labelData: docData(label),
    labelUrl: label?.url || null,
    invoiceData: docData(invoice),
    invoiceUrl: invoice?.url || null,
    cost: rate ? { amount: Number(rate.total_charge), currency: rate.currency } : null,
    serviceName: sh.courier_service ? rateName({ courier_service: sh.courier_service }) : undefined,
  };
}

export async function cancel(shipment, cfg) {
  await call(cfg, `/shipments/${encodeURIComponent(shipment.externalId)}/cancel`, { method: "POST" });
  return { cancelledRemotely: true };
}

export async function track(shipment, cfg) {
  const data = await call(cfg, `/shipments/${encodeURIComponent(shipment.externalId)}`);
  const sh = data.shipment || {};
  const t = sh.trackings?.[0] || {};
  return {
    status: t.tracking_state || sh.delivery_state || sh.shipment_state || "Unknown",
    delivered: /delivered/i.test(t.tracking_state || sh.delivery_state || ""),
    events: (t.checkpoints || []).map((c) => ({
      date: c.checkpoint_time,
      description: c.message,
      location: [c.city, c.country_name].filter(Boolean).join(", "),
    })),
  };
}

export async function test(cfg) {
  await call(cfg, "/account");
  return "Easyship API key is valid";
}
