import express from "express";

import {
  getEasyshipRates,
  createEasyshipShipment,
  trackEasyshipShipment,
  getEasyshipStatus,
} from "../controllers/easyship.controller.js";
import { verifyJWTToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWTToken);

router.get("/status", getEasyshipStatus);
router.post("/rates", getEasyshipRates);
router.post("/shipments", createEasyshipShipment);
router.get("/track/:easyshipShipmentId", trackEasyshipShipment);

export default router;
