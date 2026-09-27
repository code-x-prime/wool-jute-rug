import express from "express";

import {
  getEasyshipRates,
  createEasyshipShipment,
  trackEasyshipShipment,
  getEasyshipStatus,
} from "../controllers/easyship.controller.js";
// Admin-only: these endpoints spend money on the store Easyship account
import { verifyAdminJWT } from "../middlewares/admin.middleware.js";

const router = express.Router();

router.use(verifyAdminJWT);

router.get("/status", getEasyshipStatus);
router.post("/rates", getEasyshipRates);
router.post("/shipments", createEasyshipShipment);
router.get("/track/:easyshipShipmentId", trackEasyshipShipment);

export default router;
