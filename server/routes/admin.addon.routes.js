import express from "express";
import {
  getAddonServices,
  createAddonService,
  updateAddonService,
  deleteAddonService,
  getProductAddons,
  setProductAddons,
} from "../controllers/admin.addon.controller.js";
import { verifyAdminJWT, hasPermission } from "../middlewares/admin.middleware.js";

const router = express.Router();

// Addon services CRUD
router.get("/addon-services", verifyAdminJWT, hasPermission("products", "read"), getAddonServices);
router.post("/addon-services", verifyAdminJWT, hasPermission("products", "create"), createAddonService);
router.put("/addon-services/:id", verifyAdminJWT, hasPermission("products", "update"), updateAddonService);
router.delete("/addon-services/:id", verifyAdminJWT, hasPermission("products", "delete"), deleteAddonService);

// Product ↔ Addon linking
router.get("/products/:productId/addons", verifyAdminJWT, hasPermission("products", "read"), getProductAddons);
router.put("/products/:productId/addons", verifyAdminJWT, hasPermission("products", "update"), setProductAddons);

export default router;
