/**
 * Easyship Integration — International Shipping
 * Docs: https://developers.easyship.com/reference
 *
 * Flow:
 * 1. Admin saves Easyship API key in Site Settings
 * 2. On international order → fetch rates from Easyship
 * 3. Admin selects courier → creates shipment
 * 4. Track via Easyship tracking endpoint
 */

import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { decrypt } from "../utils/encryption.js";

const EASYSHIP_BASE = "https://api.easyship.com";

// ─── Helper: get API key ───────────────────────────────────────────────────────
async function getEasyshipConfig() {
  const settings = await prisma.siteSettings.findFirst({
    select: {
      easyshipApiKey: true,
      easyshipEnabled: true,
      easyshipAccountId: true,
      siteName: true,
      siteAddress: true,
      siteCity: true,
      siteState: true,
      sitePincode: true,
      siteEmail: true,
      sitePhone: true,
      usdExchangeRate: true,
    },
  });
  if (!settings?.easyshipEnabled || !settings?.easyshipApiKey) {
    throw new ApiError(400, "Easyship is not configured or not enabled. Add API key in Settings → International Shipping.");
  }
  const apiKey = settings.easyshipApiKey.startsWith("enc:")
    ? decrypt(settings.easyshipApiKey.replace("enc:", ""))
    : settings.easyshipApiKey;
  return { apiKey, settings };
}

function easyshipHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "accept": "application/json",
  };
}

// ─── GET /api/admin/easyship/status ───────────────────────────────────────────
export const getEasyshipStatus = asyncHandler(async (req, res) => {
  const settings = await prisma.siteSettings.findFirst({
    select: { easyshipEnabled: true, easyshipAccountId: true, easyshipApiKey: true },
  });

  res.status(200).json(new ApiResponsive(200, {
    enabled: settings?.easyshipEnabled || false,
    hasApiKey: !!(settings?.easyshipApiKey),
    accountId: settings?.easyshipAccountId || null,
  }, "OK"));
});

// ─── POST /api/admin/easyship/rates ───────────────────────────────────────────
export const getEasyshipRates = asyncHandler(async (req, res) => {
  const {
    orderId,
    destinationCountry,
    destinationPostal,
    destinationCity,
    destinationState,
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    declaredCurrency = "USD",
    declaredValue = 50,
  } = req.body;

  if (!destinationCountry) throw new ApiError(400, "destinationCountry required");

  const { apiKey, settings } = await getEasyshipConfig();

  const srSettings = await prisma.shiprocketSettings.findFirst();
  const defaultW = srSettings?.defaultWeight || 0.5;
  const defaultL = srSettings?.defaultLength || 20;
  const defaultB = srSettings?.defaultBreadth || 15;
  const defaultH = srSettings?.defaultHeight || 10;

  // If orderId provided, try to get dimensions from order items' variants
  let finalWeight = weightKg || defaultW;
  let finalLength = lengthCm || defaultL;
  let finalWidth = widthCm || defaultB;
  let finalHeight = heightCm || defaultH;
  let finalDeclaredValue = declaredValue;

  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: { select: { shippingWeight: true, shippingLength: true, shippingBreadth: true, shippingHeight: true, price: true } },
          },
        },
      },
    });
    if (order) {
      // Aggregate dimensions from all variants
      let totalWeight = 0, maxLength = 0, maxWidth = 0, maxHeight = 0, totalValue = 0;
      for (const item of order.items) {
        const v = item.variant;
        totalWeight += (v?.shippingWeight || defaultW) * item.quantity;
        maxLength = Math.max(maxLength, v?.shippingLength || defaultL);
        maxWidth = Math.max(maxWidth, v?.shippingBreadth || defaultB);
        maxHeight = Math.max(maxHeight, v?.shippingHeight || defaultH);
        totalValue += parseFloat(v?.price || 10) * item.quantity;
      }
      finalWeight = totalWeight || defaultW;
      finalLength = maxLength || defaultL;
      finalWidth = maxWidth || defaultB;
      finalHeight = maxHeight || defaultH;
      finalDeclaredValue = Math.round(totalValue / (settings.usdExchangeRate || 83.0)) || 50; // dynamic INR→USD conversion
    }
  }

  const payload = {
    origin_country_alpha2: "IN",
    origin_postal_code: settings.sitePincode || "110001",
    destination_country_alpha2: destinationCountry,
    destination_postal_code: destinationPostal || "",
    destination_city: destinationCity || "",
    destination_state: destinationState || "",
    taxes_duties_paid_by: "Sender",
    is_insured: false,
    apply_shipping_rules: true,
    parcels: [{
      total_actual_weight: finalWeight,
      box: { length: finalLength, width: finalWidth, height: finalHeight },
      items: [{
        declared_currency: declaredCurrency,
        declared_customs_value: finalDeclaredValue,
        quantity: 1,
        description: "Handicraft / Carpet / Rug",
        category: "home_and_garden",
        hs_code: "5702", // HS code for carpets
      }],
    }],
  };

  const response = await fetch(`${EASYSHIP_BASE}/2024-09/rates`, {
    method: "POST",
    headers: easyshipHeaders(apiKey),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(502, `Easyship rates error: ${data.error?.message || JSON.stringify(data)}`);
  }

  const rates = (data.rates || []).map((r) => ({
    courierId: r.courier_id,
    courierName: r.courier_name,
    courierLogo: r.courier_logo_url || null,
    serviceType: r.courier_service_name,
    totalCharge: r.total_charge,
    currency: r.currency,
    minDeliveryDays: r.min_delivery_time,
    maxDeliveryDays: r.max_delivery_time,
    trackingRating: r.tracking_rating,
    isTracked: (r.tracking_rating || 0) >= 3,
    isFuelSurcharge: r.fuel_surcharge > 0,
    fuelSurcharge: r.fuel_surcharge || 0,
  }));

  res.status(200).json(new ApiResponsive(200, {
    rates,
    dimensions: { weight: finalWeight, length: finalLength, width: finalWidth, height: finalHeight },
  }, "Rates fetched"));
});

// ─── POST /api/admin/easyship/shipments ───────────────────────────────────────
export const createEasyshipShipment = asyncHandler(async (req, res) => {
  const {
    orderId,
    courierId,
    buyerName,
    buyerEmail,
    buyerPhone,
    destinationLine1,
    destinationLine2,
    destinationCity,
    destinationState,
    destinationPostal,
    destinationCountry,
    declaredValue = 50,
    declaredCurrency = "USD",
  } = req.body;

  if (!orderId) throw new ApiError(400, "orderId required");
  if (!courierId) throw new ApiError(400, "courierId required");

  // Load order with items + variants for dimensions
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: {
            select: {
              shippingWeight: true,
              shippingLength: true,
              shippingBreadth: true,
              shippingHeight: true,
              price: true,
              sku: true,
            },
          },
          product: { select: { name: true } },
        },
      },
      shippingAddress: true,
      user: { select: { name: true, email: true, phone: true } },
    },
  });
  if (!order) throw new ApiError(404, "Order not found");
  if (order.easyshipShipmentId) throw new ApiError(400, "Easyship shipment already created for this order");

  const { apiKey, settings } = await getEasyshipConfig();

  // Resolve buyer info (from order if not passed)
  const resolvedBuyerName = buyerName || order.user?.name || "Customer";
  const resolvedBuyerEmail = buyerEmail || order.user?.email || "";
  const resolvedBuyerPhone = buyerPhone || order.user?.phone || order.shippingAddress?.phone || "";

  // Resolve destination (from order shipping address if not passed)
  const addr = order.shippingAddress;
  const resolvedLine1 = destinationLine1 || addr?.street || "";
  const resolvedLine2 = destinationLine2 || addr?.street2 || "";
  const resolvedCity = destinationCity || addr?.city || "";
  const resolvedState = destinationState || addr?.state || "";
  const resolvedPostal = destinationPostal || addr?.postalCode || "";
  const resolvedCountry = destinationCountry || addr?.country || "US";

  const srSettings = await prisma.shiprocketSettings.findFirst();
  const defaultW = srSettings?.defaultWeight || 0.5;
  const defaultL = srSettings?.defaultLength || 20;
  const defaultB = srSettings?.defaultBreadth || 15;
  const defaultH = srSettings?.defaultHeight || 10;

  // Aggregate dimensions from order items
  let totalWeight = 0, maxLength = 0, maxWidth = 0, maxHeight = 0, totalValue = 0;
  const easyshipItems = [];

  for (const item of order.items) {
    const v = item.variant || {};
    const itemWeight = (v.shippingWeight || defaultW) * item.quantity;
    totalWeight += itemWeight;
    maxLength = Math.max(maxLength, v.shippingLength || defaultL);
    maxWidth = Math.max(maxWidth, v.shippingBreadth || defaultB);
    maxHeight = Math.max(maxHeight, v.shippingHeight || defaultH);
    const itemValue = parseFloat(v.price || 10) * item.quantity;
    totalValue += itemValue;

    easyshipItems.push({
      description: item.product?.name || "Carpet / Rug",
      category: "home_and_garden",
      quantity: item.quantity,
      declared_currency: declaredCurrency,
      declared_customs_value: Math.round((itemValue / (settings.usdExchangeRate || 83.0)) * 100) / 100, // INR → USD dynamic conversion
      hs_code: "5702",
      sku: v.sku || undefined,
    });
  }

  const payload = {
    parcels: [{
      total_actual_weight: totalWeight || defaultW,
      box: {
        length: maxLength || defaultL,
        width: maxWidth || defaultB,
        height: maxHeight || defaultH,
      },
      items: easyshipItems,
    }],
    destination_address: {
      name: resolvedBuyerName,
      company_name: "",
      first_line: resolvedLine1,
      second_line: resolvedLine2,
      city: resolvedCity,
      state: resolvedState,
      postal_code: resolvedPostal,
      country_alpha2: resolvedCountry.length === 2 ? resolvedCountry : "US",
      phone_number: resolvedBuyerPhone,
      email_address: resolvedBuyerEmail,
    },
    origin_address: {
      name: settings.siteName || "Store",
      company_name: settings.siteName || "Store",
      first_line: settings.siteAddress || "",
      city: settings.siteCity || "",
      postal_code: settings.sitePincode || "110001",
      country_alpha2: "IN",
      phone_number: settings.sitePhone || "",
      email_address: settings.siteEmail || "",
    },
    courier_id: courierId,
    output_currency: declaredCurrency,
    label_paid_by: "Sender",
    order_data: {
      platform_order_number: order.orderNumber,
      buyer_notes: order.notes || "",
    },
  };

  const response = await fetch(`${EASYSHIP_BASE}/2024-09/shipments`, {
    method: "POST",
    headers: easyshipHeaders(apiKey),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(502, `Easyship shipment error: ${data.error?.message || JSON.stringify(data)}`);
  }

  const shipment = data.shipment;
  if (!shipment) throw new ApiError(502, "Easyship returned no shipment data");

  const easyshipShipmentId = shipment.easyship_shipment_id;
  const awbNumber = shipment.tracking_number || easyshipShipmentId;
  const trackingUrl = `https://app.easyship.com/shipment/${easyshipShipmentId}`;
  const labelUrl = shipment.label_url || null;
  const courierName = shipment.courier_name || courierId;

  // Update order with Easyship data
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PROCESSING",
      easyshipShipmentId,
      easyshipTrackingNumber: awbNumber,
      easyshipLabelUrl: labelUrl,
      awbCode: awbNumber,
      trackingUrl,
      courierName,
      shippingProvider: "EASYSHIP",
    },
  });

  res.status(200).json(new ApiResponsive(200, {
    easyshipShipmentId,
    awbNumber,
    trackingUrl,
    labelUrl,
    courierName,
    status: shipment.shipment_state,
  }, "Shipment created"));
});

// ─── GET /api/admin/easyship/track/:easyshipShipmentId ────────────────────────
export const trackEasyshipShipment = asyncHandler(async (req, res) => {
  const { easyshipShipmentId } = req.params;
  if (!easyshipShipmentId) throw new ApiError(400, "Shipment ID required");

  const { apiKey } = await getEasyshipConfig();

  const response = await fetch(`${EASYSHIP_BASE}/2024-09/shipments/${easyshipShipmentId}`, {
    headers: easyshipHeaders(apiKey),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(502, `Easyship tracking error: ${data.error?.message || JSON.stringify(data)}`);
  }

  const s = data.shipment;
  res.status(200).json(new ApiResponsive(200, {
    status: s?.shipment_state,
    awbNumber: s?.tracking_number,
    courierName: s?.courier_name,
    trackingUrl: `https://app.easyship.com/shipment/${easyshipShipmentId}`,
    lastUpdate: s?.updated_at,
    events: s?.tracking_events || [],
    labelUrl: s?.label_url || null,
  }, "Tracking info fetched"));
});

// Helper for order cancellation
export async function deleteEasyshipShipment(easyshipShipmentId) {
  try {
    const { apiKey } = await getEasyshipConfig();
    const response = await fetch(`${EASYSHIP_BASE}/2024-09/shipments/${easyshipShipmentId}`, {
      method: "DELETE",
      headers: easyshipHeaders(apiKey),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to delete Easyship shipment:", error);
    return false;
  }
}
