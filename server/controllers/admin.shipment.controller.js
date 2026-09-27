import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  availableCarriers,
  quoteRates,
  bookShipment,
  cancelShipment,
  refreshTracking,
  sendTrackingEmail,
  testCarrier,
} from "../utils/carriers/index.js";
import { toCountryCode } from "../utils/intlCheckout.js";
import { getStoreCurrency } from "../utils/currency.js";

// Never send the stored PDF bytes in JSON — only whether they exist
const publicShipment = ({ labelData, invoiceData, ...s }) => ({
  ...s,
  hasLabel: !!(labelData || s.labelUrl),
  hasInvoice: !!(invoiceData || s.invoiceUrl),
});

// GET /admin/shipments/order/:orderId
export const getOrderShipments = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, shippingCost: true, currency: true, shippingAddress: { select: { country: true } } },
  });
  if (!order) throw new ApiError(404, "Order not found");
  const shipments = await prisma.shipment.findMany({ where: { orderId }, orderBy: { createdAt: "desc" } });
  const country = toCountryCode(order.shippingAddress?.country);
  const cur = await getStoreCurrency();
  res.status(200).json(new ApiResponsive(200, {
    shipments: shipments.map(publicShipment),
    // Ship-from choices: warehouses for FedEx/DHL/Easyship/manual, pickup addresses for Shiprocket
    warehouses: await prisma.warehouse.findMany({ where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { name: "asc" }], select: { id: true, name: true, city: true, country: true, isDefault: true } }),
    shiprocketPickups: (await prisma.shiprocketPickupAddress.findMany({ orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }))
      .map((p) => ({ id: p.id, name: p.nickname || p.name, city: p.city, pincode: p.pincode, isDefault: p.isDefault })),
    carriers: await availableCarriers(),
    isInternational: country ? country !== "IN" : null,
    destinationCountry: country,
    chargedToCustomer: parseFloat(order.shippingCost || 0),
    currency: order.currency || "INR",
    // INR per 1 unit of the order currency, to compare courier cost (INR) with what the customer paid
    inrPerUnit: (order.currency || "INR") === "INR" ? 1 : order.currency === "USD" ? cur.usdRate : cur.eurRate,
  }, "Shipments fetched"));
});

// POST /admin/shipments/order/:orderId/rates  { carrier, parcel? }
export const getShipmentRates = asyncHandler(async (req, res) => {
  const { carrier, parcel, fromId } = req.body;
  if (!carrier) throw new ApiError(400, "carrier is required");
  const data = await quoteRates(req.params.orderId, carrier, parcel || {}, fromId || undefined);
  res.status(200).json(new ApiResponsive(200, data, "Rates fetched"));
});

// POST /admin/shipments/order/:orderId  { carrier, serviceCode, serviceName, amount, currency, parcel, manual, notifyCustomer }
export const createShipment = asyncHandler(async (req, res) => {
  const { carrier, serviceCode, serviceName, amount, currency, parcel, manual, notifyCustomer = true, fromId } = req.body;
  if (!carrier) throw new ApiError(400, "carrier is required");
  if (carrier !== "MANUAL" && !serviceCode) throw new ApiError(400, "Choose a courier service first");
  const shipment = await bookShipment({
    orderId: req.params.orderId,
    carrierCode: carrier,
    serviceCode: serviceCode ? String(serviceCode) : null,
    serviceName,
    quotedAmount: amount,
    quotedCurrency: currency,
    parcel: parcel || {},
    manual,
    adminId: req.admin?.id,
    notifyCustomer: !!notifyCustomer,
    fromId: fromId || undefined,
  });
  res.status(201).json(new ApiResponsive(201, { shipment: publicShipment(shipment) }, "Shipment created"));
});

// POST /admin/shipments/:shipmentId/cancel  { note }
export const cancelShipmentById = asyncHandler(async (req, res) => {
  const { shipment, message } = await cancelShipment(req.params.shipmentId, { note: req.body?.note, adminId: req.admin?.id });
  res.status(200).json(new ApiResponsive(200, { shipment: publicShipment(shipment) }, message));
});

// POST /admin/shipments/:shipmentId/track
export const trackShipmentById = asyncHandler(async (req, res) => {
  const shipment = await refreshTracking(req.params.shipmentId);
  res.status(200).json(new ApiResponsive(200, { shipment: publicShipment(shipment) }, "Tracking updated"));
});

// POST /admin/shipments/:shipmentId/notify
export const notifyCustomer = asyncHandler(async (req, res) => {
  const shipment = await sendTrackingEmail(req.params.shipmentId);
  res.status(200).json(new ApiResponsive(200, { shipment: publicShipment(shipment) }, "Tracking email sent to the customer"));
});

// GET /admin/shipments/:shipmentId/document/:kind  (kind = label | invoice)
export const getShipmentDocument = asyncHandler(async (req, res) => {
  const { shipmentId, kind } = req.params;
  if (!["label", "invoice"].includes(kind)) throw new ApiError(400, "Unknown document");
  const s = await prisma.shipment.findUnique({ where: { id: shipmentId }, include: { order: { select: { orderNumber: true } } } });
  if (!s) throw new ApiError(404, "Shipment not found");
  const data = kind === "label" ? s.labelData : s.invoiceData;
  const url = kind === "label" ? s.labelUrl : s.invoiceUrl;
  if (data) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${kind}-${s.order.orderNumber}-${s.trackingNumber || s.id}.pdf"`);
    return res.send(Buffer.from(data));
  }
  if (url) return res.status(200).json(new ApiResponsive(200, { url }, "Document URL"));
  throw new ApiError(404, `The carrier did not return a ${kind} for this shipment`);
});

// POST /admin/shipments/test/:carrier
export const testCarrierConnection = asyncHandler(async (req, res) => {
  const message = await testCarrier(String(req.params.carrier).toUpperCase());
  res.status(200).json(new ApiResponsive(200, { connected: true }, message));
});

// ── Warehouses (ship-from locations) ────────────────────────────────────────
const warehouseData = (b) => {
  const req = ["name", "contactName", "phone", "street", "city", "postalCode", "country"];
  for (const k of req) if (!String(b[k] || "").trim()) throw new ApiError(400, `${k} is required`);
  const country = toCountryCode(b.country);
  if (!country) throw new ApiError(400, `Unrecognised country "${b.country}"`);
  return {
    name: String(b.name).trim(),
    contactName: String(b.contactName).trim(),
    phone: String(b.phone).trim(),
    email: b.email ? String(b.email).trim() : null,
    street: String(b.street).trim(),
    city: String(b.city).trim(),
    state: b.state ? String(b.state).trim() : null,
    postalCode: String(b.postalCode).trim(),
    country,
    isActive: b.isActive !== false,
  };
};

export const listWarehouses = asyncHandler(async (req, res) => {
  const warehouses = await prisma.warehouse.findMany({ orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  res.status(200).json(new ApiResponsive(200, { warehouses }, "OK"));
});

// Only one default; the first warehouse becomes default automatically
async function saveWarehouse(id, body) {
  const data = warehouseData(body);
  return prisma.$transaction(async (tx) => {
    const count = await tx.warehouse.count();
    const makeDefault = !!body.isDefault || count === 0 || (id && count === 1);
    if (makeDefault) await tx.warehouse.updateMany({ data: { isDefault: false } });
    return id
      ? tx.warehouse.update({ where: { id }, data: { ...data, ...(makeDefault && { isDefault: true }) } })
      : tx.warehouse.create({ data: { ...data, isDefault: makeDefault } });
  });
}

export const createWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await saveWarehouse(null, req.body);
  res.status(201).json(new ApiResponsive(201, { warehouse }, "Warehouse added"));
});

export const updateWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await saveWarehouse(req.params.id, req.body);
  res.status(200).json(new ApiResponsive(200, { warehouse }, "Warehouse updated"));
});

export const deleteWarehouse = asyncHandler(async (req, res) => {
  const wh = await prisma.warehouse.delete({ where: { id: req.params.id } });
  if (wh.isDefault) {
    const next = await prisma.warehouse.findFirst({ orderBy: { createdAt: "asc" } });
    if (next) await prisma.warehouse.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  // Past shipments keep their ship-from snapshot, so deleting is safe
  res.status(200).json(new ApiResponsive(200, {}, "Warehouse deleted"));
});
