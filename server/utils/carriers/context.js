// Builds everything a carrier needs to rate / ship an order: addresses, parcel and customs data.
import { prisma } from "../../config/db.js";
import { ApiError } from "../ApiError.js";
import { decrypt } from "../encryption.js";
import { toCountryCode } from "../intlCheckout.js";
import { getStoreCurrency, convert } from "../currency.js";

const round2 = (n) => Math.round(n * 100) / 100;

export const secret = (value) => (value && value.startsWith("enc:") ? decrypt(value.slice(4)) : value);

const US_STATES = { alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY", "puerto rico": "PR" };
const CA_PROVINCES = { alberta: "AB", "british columbia": "BC", manitoba: "MB", "new brunswick": "NB", "newfoundland and labrador": "NL", "nova scotia": "NS", ontario: "ON", "prince edward island": "PE", quebec: "QC", saskatchewan: "SK", "northwest territories": "NT", nunavut: "NU", yukon: "YT" };

// US/CA carriers require 2-letter state codes
export function stateCode(state, countryCode) {
  if (!state) return undefined;
  const raw = String(state).trim();
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  const map = countryCode === "US" ? US_STATES : countryCode === "CA" ? CA_PROVINCES : null;
  return map ? map[raw.toLowerCase()] || undefined : undefined;
}

export const phoneDigits = (p) => String(p || "").replace(/[^\d+]/g, "");
export const ymd = (d = new Date()) => d.toISOString().slice(0, 10);

/**
 * @param {string} orderId
 * @param {{weightKg?:number,lengthCm?:number,widthCm?:number,heightCm?:number}} overrides admin-edited parcel
 * @param {{fromId?:string}} opts warehouse to ship from (FedEx/DHL/Easyship/manual) or Shiprocket pickup id
 */
export async function buildShipmentContext(orderId, overrides = {}, opts = {}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      shippingAddress: true,
      items: { include: { product: { select: { name: true } }, variant: true } },
    },
  });
  if (!order) throw new ApiError(404, "Order not found");
  if (!order.shippingAddress) throw new ApiError(400, "Order has no shipping address");

  const settings = await prisma.siteSettings.findFirst();
  const sr = await prisma.shiprocketSettings.findFirst();
  const def = {
    weight: sr?.defaultWeight || 0.5,
    length: sr?.defaultLength || 20,
    width: sr?.defaultBreadth || 15,
    height: sr?.defaultHeight || 10,
  };

  let weight = 0, length = 0, width = 0, height = 0;
  for (const item of order.items) {
    const v = item.variant || {};
    weight += (v.shippingWeight || def.weight) * item.quantity;
    length = Math.max(length, v.shippingLength || def.length);
    width = Math.max(width, v.shippingBreadth || def.width);
    height += (v.shippingHeight || def.height) * item.quantity;
  }
  const parcel = {
    weightKg: round2(Number(overrides.weightKg) > 0 ? Number(overrides.weightKg) : weight || def.weight),
    lengthCm: Math.ceil(Number(overrides.lengthCm) > 0 ? Number(overrides.lengthCm) : length || def.length),
    widthCm: Math.ceil(Number(overrides.widthCm) > 0 ? Number(overrides.widthCm) : width || def.width),
    heightCm: Math.ceil(Number(overrides.heightCm) > 0 ? Number(overrides.heightCm) : Math.min(height || def.height, 150)),
  };

  const addr = order.shippingAddress;
  const countryCode = toCountryCode(addr.country);
  if (!countryCode) throw new ApiError(400, `Unrecognised country "${addr.country}" on the shipping address`);

  // Customs are declared in the order currency; INR orders are declared in USD at the admin rate
  const cur = await getStoreCurrency();
  const orderCurrency = order.currency || "INR";
  const customsCurrency = orderCurrency === "INR" ? "USD" : orderCurrency;
  const toCustoms = (n) => convert(n, orderCurrency, customsCurrency, cur);
  const exchangeRate = cur.inrPerUnit;
  const goodsInr = Math.max(parseFloat(order.subTotal) - parseFloat(order.discount || 0), 0);
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0) || 1;
  const perUnitWeight = round2(parcel.weightKg / totalQty) || 0.1;
  const customsItems = order.items.map((i) => ({
    description: (settings?.intlCustomsDescription || i.product?.name || "Rug").slice(0, 70),
    productName: i.product?.name || "Rug",
    sku: i.variant?.sku,
    quantity: i.quantity,
    unitValueUsd: Math.max(round2(toCustoms(parseFloat(i.price))), 1),
    unitWeightKg: perUnitWeight,
    hsCode: settings?.intlHsCode || "570242",
  }));

  const shipper = await resolveShipFrom(opts.fromId, settings);

  // Shiprocket: chosen pickup address, else the default one
  let shiprocketPickup = null;
  if ("shiprocketPickupId" in opts) {
    const p = opts.shiprocketPickupId
      ? await prisma.shiprocketPickupAddress.findUnique({ where: { id: opts.shiprocketPickupId } })
      : await prisma.shiprocketPickupAddress.findFirst({ orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
    if (!p) throw new ApiError(400, opts.shiprocketPickupId ? "That pickup address no longer exists" : "Add a pickup address in Settings → Shipping");
    shiprocketPickup = { id: p.id, label: p.nickname, nickname: p.nickname, name: p.name, phone: p.phone, street: p.address, city: p.city, state: p.state, postalCode: p.pincode, pincode: p.pincode, countryCode: "IN" };
  }

  return {
    order,
    settings,
    // Customs / international rules depend on where the parcel leaves from
    isInternational: countryCode !== shipper.countryCode,
    recipientCountry: countryCode,
    shiprocketPickup,
    shipper,
    recipient: {
      name: addr.name || order.user?.name || "Customer",
      phone: phoneDigits(addr.phone || order.user?.phone),
      email: order.user?.email || "",
      street: addr.street,
      city: addr.city,
      state: addr.state,
      stateCode: stateCode(addr.state, countryCode),
      postalCode: addr.postalCode,
      countryCode,
    },
    parcel,
    customs: {
      currency: customsCurrency,
      valueUsd: Math.max(round2(toCustoms(goodsInr)), 1),
      items: customsItems,
      invoiceNumber: order.orderNumber,
      invoiceDate: ymd(new Date(order.createdAt)),
    },
    exchangeRate,
    orderCurrency,
    cur,
  };
}

/**
 * Ship-from address: the chosen warehouse, else the default warehouse, else the store address (Settings → General).
 * The returned object is also stored on the shipment as a snapshot.
 */
export async function resolveShipFrom(fromId, settings) {
  const wh = fromId
    ? await prisma.warehouse.findFirst({ where: { id: fromId, isActive: true } })
    : await prisma.warehouse.findFirst({ where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  if (fromId && !wh) throw new ApiError(400, "That warehouse no longer exists or is inactive");
  const store = {
    name: settings?.siteName || "Store",
    company: settings?.siteName || "Store",
    gstin: settings?.siteGSTIN || null,
    iec: settings?.exporterIec || null,
  };
  if (wh) {
    const cc = toCountryCode(wh.country) || "IN";
    return {
      ...store,
      warehouseId: wh.id,
      label: wh.name,
      name: wh.contactName,
      phone: phoneDigits(wh.phone),
      email: wh.email || settings?.siteEmail || "",
      street: wh.street,
      city: wh.city,
      state: wh.state || "",
      stateCode: stateCode(wh.state, cc),
      postalCode: wh.postalCode,
      countryCode: cc,
      // Indian GSTIN / IEC only apply to parcels leaving India
      ...(cc !== "IN" && { gstin: null, iec: null }),
    };
  }
  return {
    ...store,
    warehouseId: null,
    label: "Store address",
    phone: phoneDigits(settings?.sitePhone),
    email: settings?.siteEmail || "",
    street: settings?.siteAddress || "",
    city: settings?.siteCity || "",
    state: settings?.siteState || "",
    postalCode: settings?.sitePincode || "",
    countryCode: "IN",
  };
}

/** International carriers need a complete exporter address. */
export function assertShipperReady(ctx) {
  const s = ctx.shipper;
  const missing = [
    !s.street && "store address",
    !s.city && "city",
    !s.postalCode && "pincode",
    !s.phone && "phone",
  ].filter(Boolean);
  if (missing.length) {
    throw new ApiError(400, s.warehouseId
      ? `Warehouse "${s.label}" is missing its ${missing.join(", ")} — edit it in Settings → International Shipping`
      : `Fill your ${missing.join(", ")} in Site Settings → General (or add a warehouse) before booking shipments`);
  }
  const r = ctx.recipient;
  if (!r.phone) throw new ApiError(400, "Customer phone number is missing on the shipping address — carriers require it");
  if (["US", "CA"].includes(r.countryCode) && !r.stateCode) {
    throw new ApiError(400, `State "${r.state}" is not a valid ${r.countryCode} state — edit the shipping address`);
  }
}
