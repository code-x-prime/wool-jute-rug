import express from "express";
import {
  getCarousel,
  upsertCarousel,
  createCarouselItem,
  updateCarouselItem,
  reorderItems,
  deleteCarouselItem,
} from "../controllers/admin.shoppableCarousel.controller.js";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";
import { uploadFiles } from "../middlewares/multer.middlerware.js";

const router = express.Router();

router.get(
  "/shoppable-carousel",
  verifyAdminJWT,
  hasPermission("banners", "read"),
  getCarousel
);

router.patch(
  "/shoppable-carousel",
  verifyAdminJWT,
  hasPermission("banners", "update"),
  upsertCarousel
);

router.post(
  "/shoppable-carousel/items",
  verifyAdminJWT,
  hasPermission("banners", "create"),
  uploadFiles.fields([
    { name: "media", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  createCarouselItem
);

router.put(
  "/shoppable-carousel/items/:itemId",
  verifyAdminJWT,
  hasPermission("banners", "update"),
  uploadFiles.fields([
    { name: "media", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  updateCarouselItem
);

router.patch(
  "/shoppable-carousel/items/reorder",
  verifyAdminJWT,
  hasPermission("banners", "update"),
  reorderItems
);

router.delete(
  "/shoppable-carousel/items/:itemId",
  verifyAdminJWT,
  hasPermission("banners", "delete"),
  deleteCarouselItem
);

export default router;
