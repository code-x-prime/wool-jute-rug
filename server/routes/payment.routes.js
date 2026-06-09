import express from "express";
import { verifyJWTToken } from "../middlewares/auth.middleware.js";
import {
  getPaymentSettings,
  getRazorpayKey,
  checkout,
  paymentVerification,
  getOrderHistory,
  getOrderDetails,
  cancelOrder,
  createCashOrder,
  phonePeCallback,
} from "../controllers/payment.controller.js";
import {
  getPayPalClientId,
  createPayPalOrder,
  capturePayPalPayment,
} from "../controllers/paypal.controller.js";
import {
  getPayoneerSettings,
  createPayoneerPayment,
  verifyPayoneerPayment,
  payoneerWebhook,
} from "../controllers/payoneer.controller.js";

const router = express.Router();

// Public route - Get payment settings
router.get("/settings", getPaymentSettings);

// PhonePe callback (public route - called by PhonePe)
router.post("/phonepe-callback", phonePeCallback);

// PayPal client ID (public — needed to init PayPal JS SDK on frontend)
router.get("/paypal/client-id", getPayPalClientId);

// Payoneer public endpoints
router.get("/payoneer/settings", getPayoneerSettings);
router.post("/payoneer/webhook", payoneerWebhook);

// All other payment routes require authentication
router.use(verifyJWTToken);

// Get Razorpay key
router.get("/razorpay-key", getRazorpayKey);

// PayPal
router.post("/paypal/create-order", createPayPalOrder);
router.post("/paypal/capture", capturePayPalPayment);

// Payoneer
router.post("/payoneer/create-payment", createPayoneerPayment);
router.post("/payoneer/verify", verifyPayoneerPayment);

// Create order (checkout)
router.post("/checkout", checkout);

// Verify payment
router.post("/verify", paymentVerification);

// Create Cash on Delivery order
router.post("/cash-order", createCashOrder);

// Order history
router.get("/orders", getOrderHistory);

// Order details
router.get("/orders/:orderId", getOrderDetails);

// Cancel order
router.post("/orders/:orderId/cancel", cancelOrder);

export default router;
