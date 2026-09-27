import express from "express";
import {
  getListing,
  saveListingMedia,
  saveListingExtras,
  listDeliveryProfiles,
  createDeliveryProfile,
  updateDeliveryProfile,
  deleteDeliveryProfile,
  listReturnPolicies,
  createReturnPolicy,
  updateReturnPolicy,
  deleteReturnPolicy,
  checkSkus,
} from "../controllers/admin.listing.controller.js";
import { verifyAdminJWT, hasPermission } from "../middlewares/admin.middleware.js";
import { uploadFiles } from "../middlewares/multer.middlerware.js";

const router = express.Router();
const read = [verifyAdminJWT, hasPermission("products", "read")];
const write = [verifyAdminJWT, hasPermission("products", "update")];

router.post("/products/sku-check", ...read, checkSkus);
router.get("/products/:productId/listing", ...read, getListing);
router.post(
  "/products/:productId/listing-media",
  ...write,
  uploadFiles.fields([
    { name: "photos", maxCount: 20 },
    { name: "video", maxCount: 1 },
    { name: "video2", maxCount: 1 },
  ]),
  saveListingMedia
);
router.put("/products/:productId/listing-extras", ...write, saveListingExtras);

router.get("/delivery-profiles", ...read, listDeliveryProfiles);
router.post("/delivery-profiles", ...write, createDeliveryProfile);
router.put("/delivery-profiles/:id", ...write, updateDeliveryProfile);
router.delete("/delivery-profiles/:id", ...write, deleteDeliveryProfile);

router.get("/return-policies", ...read, listReturnPolicies);
router.post("/return-policies", ...write, createReturnPolicy);
router.put("/return-policies/:id", ...write, updateReturnPolicy);
router.delete("/return-policies/:id", ...write, deleteReturnPolicy);

export default router;
