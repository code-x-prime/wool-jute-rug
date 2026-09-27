// DHL Express — MyDHL API (developer.dhl.com): Rates → Shipment (label + commercial invoice) → Tracking.
import { ApiError } from "../ApiError.js";
import { secret, assertShipperReady, ymd } from "./context.js";

export function dhlConfig(settings, { requireEnabled = true } = {}) {
  if ((requireEnabled && !settings?.dhlEnabled) || !settings?.dhlApiKey || !settings?.dhlApiSecret || !settings?.dhlAccountNumber) {
    throw new ApiError(400, "DHL Express is not configured or not enabled (Settings → International Shipping)");
  }
  const mode = settings.dhlMode === "live" ? "live" : "sandbox";
  return {
    mode,
    account: settings.dhlAccountNumber.trim(),
    baseUrl: mode === "live" ? "https://express.api.dhl.com/mydhlapi" : "https://express.api.dhl.com/mydhlapi/test",
    auth: `Basic ${Buffer.from(`${settings.dhlApiKey.trim()}:${secret(settings.dhlApiSecret).trim()}`).toString("base64")}`,
  };
}

async function call(cfg, path, { method = "GET", body } = {}) {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: { Authorization: cfg.auth, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new ApiError(400, `DHL rejected the API key/secret (${cfg.mode})`);
    const detail = data.additionalDetails?.join("; ") || data.detail || data.title || `HTTP ${res.status}`;
    throw new ApiError(502, `DHL: ${detail}`);
  }
  return data;
}

const pickPrice = (prices = []) =>
  prices.find((p) => p.currencyType === "BILLC" && p.price) || prices.find((p) => p.price) || null;

const postal = (p) => ({
  postalCode: p.postalCode,
  cityName: p.city,
  countryCode: p.countryCode,
  ...(p.stateCode && { provinceCode: p.stateCode }),
  addressLine1: (p.street || "").slice(0, 45),
});

export async function getRates(ctx, cfg) {
  assertShipperReady(ctx);
  const q = new URLSearchParams({
    accountNumber: cfg.account,
    originCountryCode: ctx.shipper.countryCode,
    originCityName: ctx.shipper.city,
    originPostalCode: ctx.shipper.postalCode,
    destinationCountryCode: ctx.recipient.countryCode,
    destinationCityName: ctx.recipient.city,
    destinationPostalCode: ctx.recipient.postalCode || "",
    weight: String(ctx.parcel.weightKg),
    length: String(ctx.parcel.lengthCm),
    width: String(ctx.parcel.widthCm),
    height: String(ctx.parcel.heightCm),
    plannedShippingDate: ymd(),
    isCustomsDeclarable: String(ctx.isInternational),
    unitOfMeasurement: "metric",
  });
  const data = await call(cfg, `/rates?${q}`);
  return (data.products || []).map((p) => {
    const price = pickPrice(p.totalPrice);
    return {
      serviceCode: p.productCode,
      serviceName: `DHL ${p.productName}`,
      amount: Number(price?.price || 0),
      currency: price?.priceCurrency || "INR",
      transit: p.deliveryCapabilities?.totalTransitDays ? `${p.deliveryCapabilities.totalTransitDays} days` : null,
      deliveryDate: p.deliveryCapabilities?.estimatedDeliveryDateAndTime?.slice(0, 10) || null,
    };
  });
}

export async function createShipment(ctx, cfg, { serviceCode }) {
  assertShipperReady(ctx);
  const s = ctx.shipper;
  const r = ctx.recipient;
  const data = await call(cfg, "/shipments", {
    method: "POST",
    body: {
      plannedShippingDateAndTime: `${ymd()}T17:00:00 GMT+05:30`,
      pickup: { isRequested: false },
      productCode: serviceCode,
      accounts: [{ typeCode: "shipper", number: cfg.account }],
      outputImageProperties: {
        encodingFormat: "pdf",
        imageOptions: [
          { typeCode: "label", templateName: "ECOM26_84_001" },
          ...(ctx.isInternational ? [{ typeCode: "invoice", templateName: "COMMERCIAL_INVOICE_P_10", isRequested: true, invoiceType: "commercial" }] : []),
        ],
      },
      customerDetails: {
        shipperDetails: {
          postalAddress: postal(s),
          contactInformation: { email: s.email, phone: s.phone, companyName: s.company, fullName: s.name },
        },
        receiverDetails: {
          postalAddress: postal(r),
          contactInformation: { email: r.email, phone: r.phone, companyName: r.name, fullName: r.name },
        },
      },
      content: {
        packages: [{
          weight: ctx.parcel.weightKg,
          dimensions: { length: ctx.parcel.lengthCm, width: ctx.parcel.widthCm, height: ctx.parcel.heightCm },
        }],
        isCustomsDeclarable: ctx.isInternational,
        ...(ctx.isInternational && { declaredValue: ctx.customs.valueUsd, declaredValueCurrency: ctx.customs.currency }),
        description: ctx.customs.items[0]?.description || "Rug",
        incoterm: "DAP",
        unitOfMeasurement: "metric",
        ...(ctx.isInternational && { exportDeclaration: {
          lineItems: ctx.customs.items.map((i, idx) => ({
            number: idx + 1,
            description: i.description,
            price: i.unitValueUsd,
            quantity: { value: i.quantity, unitOfMeasurement: "PCS" },
            commodityCodes: [{ typeCode: "outbound", value: i.hsCode }],
            exportReasonType: "permanent",
            manufacturerCountry: "IN",
            weight: { netValue: Math.max(i.unitWeightKg * i.quantity, 0.1), grossValue: Math.max(i.unitWeightKg * i.quantity, 0.1) },
          })),
          invoice: { number: ctx.customs.invoiceNumber, date: ctx.customs.invoiceDate },
          exportReason: "sale",
          ...(s.iec && { remarks: [{ value: `IEC: ${s.iec}` }] }),
        } }),
      },
    },
  });

  if (!data.shipmentTrackingNumber) throw new ApiError(502, "DHL did not return a tracking number");
  const doc = (type) => data.documents?.find((d) => d.typeCode === type);
  const label = doc("label");
  const invoice = doc("invoice");
  const charge = pickPrice(data.shipmentCharges);
  return {
    trackingNumber: data.shipmentTrackingNumber,
    trackingUrl: `https://www.dhl.com/in-en/home/tracking/tracking-express.html?submit=1&tracking-id=${data.shipmentTrackingNumber}`,
    externalId: data.shipmentTrackingNumber,
    labelData: label?.content ? Buffer.from(label.content, "base64") : null,
    invoiceData: invoice?.content ? Buffer.from(invoice.content, "base64") : null,
    cost: charge ? { amount: Number(charge.price), currency: charge.priceCurrency } : null,
  };
}

// DHL Express has no void API for labels; an unused label is never scanned and so never billed.
export async function cancel() {
  return {
    cancelledRemotely: false,
    note: "DHL labels cannot be voided online. Do not hand the parcel to DHL — an unscanned label is not charged.",
  };
}

export async function track(shipment, cfg) {
  const data = await call(cfg, `/shipments/${encodeURIComponent(shipment.trackingNumber)}/tracking?trackingView=all-checkpoints&levelOfDetail=all`);
  const s = data.shipments?.[0];
  const events = (s?.events || []).map((e) => ({
    date: `${e.date}${e.time ? ` ${e.time}` : ""}`,
    description: e.description,
    location: e.serviceArea?.[0]?.description || "",
  }));
  return {
    status: s?.status || events[0]?.description || "Unknown",
    delivered: /deliver/i.test(s?.status || "") && !/out for/i.test(s?.status || ""),
    events,
  };
}

export async function test(cfg) {
  await call(cfg, "/address-validate?type=delivery&countryCode=IN&postalCode=110001&cityName=New%20Delhi");
  return `DHL Express credentials are valid (${cfg.mode})`;
}
