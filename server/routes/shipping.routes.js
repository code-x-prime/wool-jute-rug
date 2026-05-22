import express from "express";
import { verifyJWTToken } from "../middlewares/auth.middleware.js";
import { getShippingRates } from "../controllers/shipping.controller.js";

const router = express.Router();

router.use(verifyJWTToken);

router.post("/rates", getShippingRates);

export default router;
