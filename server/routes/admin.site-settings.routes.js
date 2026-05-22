import express from "express";
import {
  getSiteSettings,
  updateSiteSettings,
  testRazorpayConnection,
  connectShiprocket,
} from "../controllers/admin.site-settings.controller.js";
import {
  getStorageConfig,
  updateStorageConfig,
} from "../controllers/admin.storage.controller.js";
import { verifyAdminJWT } from "../middlewares/admin.middleware.js";

const router = express.Router();

router.get("/site-settings", verifyAdminJWT, getSiteSettings);
router.put("/site-settings", verifyAdminJWT, updateSiteSettings);
router.post("/site-settings/test-razorpay", verifyAdminJWT, testRazorpayConnection);
router.post("/site-settings/connect-shiprocket", verifyAdminJWT, connectShiprocket);

router.get("/site-settings/storage", verifyAdminJWT, getStorageConfig);
router.put("/site-settings/storage", verifyAdminJWT, updateStorageConfig);

export default router;
