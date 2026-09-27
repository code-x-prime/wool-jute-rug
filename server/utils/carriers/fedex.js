// FedEx REST API (developer.fedex.com): OAuth → Rate → Ship (label + commercial invoice) → Track / Cancel.
import { ApiError } from "../ApiError.js";
import { secret, assertShipperReady, ymd } from "./context.js";

const tokenCache = new Map(); // key -> { token, expires }

export function fedexConfig(settings, { requireEnabled = true } = {}) {
  if ((requireEnabled && !settings?.fedexEnabled) || !settings?.fedexClientId || !settings?.fedexClientSecret || !settings?.fedexAccountNumber) {
    throw new ApiError(400, "FedEx is not configured or not enabled (Settings → International Shipping)");
  }
  const mode = settings.fedexMode === "live" ? "live" : "sandbox";
  return {
    mode,
    clientId: settings.fedexClientId.trim(),
    clientSecret: secret(settings.fedexClientSecret),
    account: settings.fedexAccountNumber.trim(),
    baseUrl: mode === "live" ? "https://apis.fedex.com" : "https://apis-sandbox.fedex.com",
  };
}

async function token(cfg) {
  const key = `${cfg.baseUrl}|${cfg.clientId}`;
  const cached = tokenCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.token;
  const res = await fetch(`${cfg.baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: cfg.clientId, client_secret: cfg.clientSecret }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new ApiError(400, `FedEx rejected the API credentials (${cfg.mode}): ${data.errors?.[0]?.message || res.status}`);
  }
  tokenCache.set(key, { token: data.access_token, expires: Date.now() + ((data.expires_in || 3600) - 120) * 1000 });
  return data.access_token;
}

async function call(cfg, path, { method = "POST", body } = {}) {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await token(cfg)}`,
      "Content-Type": "application/json",
      "X-locale": "en_US",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`;
    throw new ApiError(502, `FedEx: ${msg}`);
  }
  return data;
}

const address = (p) => ({
  streetLines: [p.street].filter(Boolean).map((s) => s.slice(0, 35)),
  city: p.city,
  ...(p.stateCode && { stateOrProvinceCode: p.stateCode }),
  postalCode: p.postalCode,
  countryCode: p.countryCode,
});

const commodities = (ctx) =>
  ctx.customs.items.map((i) => ({
    description: i.description,
    quantity: i.quantity,
    quantityUnits: "PCS",
    weight: { units: "KG", value: Math.max(i.unitWeightKg * i.quantity, 0.1) },
    unitPrice: { amount: i.unitValueUsd, currency: ctx.customs.currency },
    customsValue: { amount: Math.round(i.unitValueUsd * i.quantity * 100) / 100, currency: ctx.customs.currency },
    countryOfManufacture: "IN",
    harmonizedCode: i.hsCode,
  }));

const packageLine = (ctx) => [{
  weight: { units: "KG", value: ctx.parcel.weightKg },
  dimensions: { length: ctx.parcel.lengthCm, width: ctx.parcel.widthCm, height: ctx.parcel.heightCm, units: "CM" },
}];

export async function getRates(ctx, cfg) {
  assertShipperReady(ctx);
  const data = await call(cfg, "/rate/v1/rates/quotes", {
    body: {
      accountNumber: { value: cfg.account },
      rateRequestControlParameters: { returnTransitTimes: true },
      requestedShipment: {
        shipper: { address: address(ctx.shipper) },
        recipient: { address: { ...address(ctx.recipient), residential: true } },
        pickupType: "DROPOFF_AT_FEDEX_LOCATION",
        rateRequestType: ["ACCOUNT", "LIST"],
        ...(ctx.isInternational && {
          customsClearanceDetail: {
            dutiesPayment: { paymentType: "RECIPIENT" },
            commodities: commodities(ctx),
          },
        }),
        requestedPackageLineItems: packageLine(ctx),
      },
    },
  });
  return (data.output?.rateReplyDetails || []).map((r) => {
    const d = r.ratedShipmentDetails?.find((x) => x.rateType === "ACCOUNT") || r.ratedShipmentDetails?.[0] || {};
    return {
      serviceCode: r.serviceType,
      serviceName: `FedEx ${r.serviceName || r.serviceType}`,
      amount: Number(d.totalNetCharge ?? d.totalNetFedExCharge ?? 0),
      currency: d.currency || d.shipmentRateDetail?.currency || "INR",
      transit: r.commit?.transitDays?.description || r.operationalDetail?.transitTime || null,
      deliveryDate: r.commit?.dateDetail?.dayFormat || null,
    };
  });
}

export async function createShipment(ctx, cfg, { serviceCode }) {
  assertShipperReady(ctx);
  const s = ctx.shipper;
  const r = ctx.recipient;
  const data = await call(cfg, "/ship/v1/shipments", {
    body: {
      labelResponseOptions: "LABEL",
      accountNumber: { value: cfg.account },
      requestedShipment: {
        shipDatestamp: ymd(),
        serviceType: serviceCode,
        packagingType: "YOUR_PACKAGING",
        pickupType: "DROPOFF_AT_FEDEX_LOCATION",
        shipper: {
          contact: { personName: s.name, companyName: s.company, phoneNumber: s.phone, emailAddress: s.email },
          address: address(s),
          ...(s.gstin && { tins: [{ number: s.gstin, tinType: "BUSINESS_NATIONAL" }] }),
        },
        recipients: [{
          contact: { personName: r.name, phoneNumber: r.phone, emailAddress: r.email },
          address: { ...address(r), residential: true },
        }],
        shippingChargesPayment: { paymentType: "SENDER", payor: { responsibleParty: { accountNumber: { value: cfg.account } } } },
        ...(ctx.isInternational && { customsClearanceDetail: {
          dutiesPayment: { paymentType: "RECIPIENT" },
          isDocumentOnly: false,
          commercialInvoice: {
            shipmentPurpose: "SOLD",
            customerReferences: [{ customerReferenceType: "INVOICE_NUMBER", value: ctx.customs.invoiceNumber }],
            ...(s.iec && { specialInstructions: `IEC: ${s.iec}` }),
          },
          commodities: commodities(ctx),
          totalCustomsValue: { amount: ctx.customs.valueUsd, currency: ctx.customs.currency },
        } }),
        labelSpecification: { imageType: "PDF", labelStockType: "PAPER_4X6", labelFormatType: "COMMON2D" },
        ...(ctx.isInternational && {
          shippingDocumentSpecification: {
            shippingDocumentTypes: ["COMMERCIAL_INVOICE"],
            commercialInvoiceDetail: { documentFormat: { docType: "PDF", stockType: "PAPER_LETTER" } },
          },
        }),
        requestedPackageLineItems: packageLine(ctx),
      },
    },
  });

  const shipment = data.output?.transactionShipments?.[0];
  if (!shipment?.masterTrackingNumber) throw new ApiError(502, "FedEx did not return a tracking number");
  const labelDoc = shipment.pieceResponses?.[0]?.packageDocuments?.find((d) => d.contentType === "LABEL") || shipment.pieceResponses?.[0]?.packageDocuments?.[0];
  const invoiceDoc = shipment.shipmentDocuments?.find((d) => d.contentType === "COMMERCIAL_INVOICE");
  const charge = shipment.completedShipmentDetail?.shipmentRating?.shipmentRateDetails?.[0];

  return {
    trackingNumber: shipment.masterTrackingNumber,
    trackingUrl: `https://www.fedex.com/fedextrack/?trknbr=${shipment.masterTrackingNumber}`,
    externalId: shipment.masterTrackingNumber,
    labelData: labelDoc?.encodedLabel ? Buffer.from(labelDoc.encodedLabel, "base64") : null,
    labelUrl: labelDoc?.url || null,
    invoiceData: invoiceDoc?.encodedLabel ? Buffer.from(invoiceDoc.encodedLabel, "base64") : null,
    invoiceUrl: invoiceDoc?.url || null,
    cost: charge ? { amount: Number(charge.totalNetCharge), currency: charge.currency } : null,
    serviceName: `FedEx ${shipment.serviceName || serviceCode}`,
  };
}

export async function cancel(shipment, cfg) {
  const data = await call(cfg, "/ship/v1/shipments/cancel", {
    method: "PUT",
    body: {
      accountNumber: { value: cfg.account },
      emailShipment: false,
      senderCountryCode: shipment.fromLocation?.countryCode || "IN",
      deletionControl: "DELETE_ALL_PACKAGES",
      trackingNumber: shipment.trackingNumber,
    },
  });
  if (data.output?.cancelledShipment === false) {
    throw new ApiError(400, `FedEx could not cancel: ${data.output?.message || "already in transit?"}`);
  }
  return { cancelledRemotely: true };
}

export async function track(shipment, cfg) {
  const data = await call(cfg, "/track/v1/trackingnumbers", {
    body: { includeDetailedScans: true, trackingInfo: [{ trackingNumberInfo: { trackingNumber: shipment.trackingNumber } }] },
  });
  const t = data.output?.completeTrackResults?.[0]?.trackResults?.[0];
  if (t?.error) throw new ApiError(400, `FedEx: ${t.error.message}`);
  return {
    status: t?.latestStatusDetail?.description || t?.latestStatusDetail?.statusByLocale || "Unknown",
    delivered: t?.latestStatusDetail?.code === "DL",
    events: (t?.scanEvents || []).map((e) => ({
      date: e.date,
      description: e.eventDescription,
      location: [e.scanLocation?.city, e.scanLocation?.countryCode].filter(Boolean).join(", "),
    })),
  };
}

export async function test(cfg) {
  await token(cfg);
  return `FedEx credentials are valid (${cfg.mode})`;
}
