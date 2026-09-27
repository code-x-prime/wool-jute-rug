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
    select: { id: true, shippingCost: true, shippingAddress: { select: { country: true } } },
  });
  if (!order) throw new ApiError(404, "Order not found");
  const shipments = await prisma.shipment.findMany({ where: { orderId }, orderBy: { createdAt: "desc" } });
  const country = toCountryCode(order.shippingAddress?.country);
  res.status(200).json(new ApiResponsive(200, {
    shipments: shipments.map(publicShipment),
    carriers: await availableCarriers(),
    isInternational: country ? country !== "IN" : null,
    destinationCountry: country,
    chargedToCustomer: parseFloat(order.shippingCost || 0),
  }, "Shipments fetched"));
});

// POST /admin/shipments/order/:orderId/rates  { carrier, parcel? }
export const getShipmentRates = asyncHandler(async (req, res) => {
  const { carrier, parcel } = req.body;
  if (!carrier) throw new ApiError(400, "carrier is required");
  const data = await quoteRates(req.params.orderId, carrier, parcel || {});
  res.status(200).json(new ApiResponsive(200, data, "Rates fetched"));
});

// POST /admin/shipments/order/:orderId  { carrier, serviceCode, serviceName, amount, currency, parcel, manual, notifyCustomer }
export const createShipment = asyncHandler(async (req, res) => {
  const { carrier, serviceCode, serviceName, amount, currency, parcel, manual, notifyCustomer = true } = req.body;
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
