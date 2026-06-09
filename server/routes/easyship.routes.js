import express from "express";
import { verifyAdminJWT } from "../middlewares/auth.middleware.js";
import {
  getEasyshipRates,
  createEasyshipShipment,
  trackEasyshipShipment,
  getEasyshipStatus,
} from "../controllers/easyship.controller.js";

const router = express.Router();

router.use(verifyAdminJWT);

router.get("/status", getEasyshipStatus);
router.post("/rates", getEasyshipRates);
router.post("/shipments", createEasyshipShipment);
router.get("/track/:easyshipShipmentId", trackEasyshipShipment);

export default router;
