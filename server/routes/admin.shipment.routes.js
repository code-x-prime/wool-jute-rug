import express from "express";
import { verifyAdminJWT, hasPermission } from "../middlewares/admin.middleware.js";
import {
  getOrderShipments,
  getShipmentRates,
  createShipment,
  cancelShipmentById,
  trackShipmentById,
  notifyCustomer,
  getShipmentDocument,
  testCarrierConnection,
} from "../controllers/admin.shipment.controller.js";

const router = express.Router();
const read = [verifyAdminJWT, hasPermission("orders", "read")];
const write = [verifyAdminJWT, hasPermission("orders", "update")];

router.get("/shipments/order/:orderId", ...read, getOrderShipments);
router.post("/shipments/order/:orderId/rates", ...write, getShipmentRates);
router.post("/shipments/order/:orderId", ...write, createShipment);
router.post("/shipments/:shipmentId/cancel", ...write, cancelShipmentById);
router.post("/shipments/:shipmentId/track", ...write, trackShipmentById);
router.post("/shipments/:shipmentId/notify", ...write, notifyCustomer);
router.get("/shipments/:shipmentId/document/:kind", ...read, getShipmentDocument);
router.post("/shipments/test/:carrier", verifyAdminJWT, testCarrierConnection);

export default router;
