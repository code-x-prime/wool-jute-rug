import express from "express";
import {
  getAllCategories,
  getProductsByCategory,
  getCategoriesWithSubCategories,
} from "../controllers/category.controller.js";
import {
  getAllProducts,
  getProductBySlug,
  getProductVariant,
  getProductVariantById,
  getMaxPrice,
  getProductsByType,
} from "../controllers/product.controller.js";
import { trackProductView } from "../middlewares/tracking.middleware.js";
import {
  getBrandsByTag,
  getBrandBySlug,
  getFilterAttributes,
  getPriceVisibilitySettings,
  getPublicSettings,
  getOAuthProviders,
} from "../controllers/public.controller.js";
import { getPublishedBanners } from "../controllers/admin.banner.controller.js";
import { getActiveFlashSales, getActiveProductSections, getShoppableVideoCarousel } from "../controllers/public.controller.js";
import { getPublicTawkToConfig } from "../controllers/tawkto.controller.js";

const router = express.Router();

// Categories
router.get("/categories", getAllCategories);
router.get("/categories-with-subcategories", getCategoriesWithSubCategories);
router.get("/categories/:slug/products", getProductsByCategory);

// Products
router.get("/products", getAllProducts);
router.get("/products/max-price", getMaxPrice);
router.get("/products/type/:productType", getProductsByType);
router.get("/products/:slug", trackProductView, getProductBySlug);
router.get("/product-variant", getProductVariant);
router.get("/products/variants/:id", getProductVariantById);

// Brands
router.get("/brands-by-tag", getBrandsByTag);
router.get("/brand/:slug", getBrandBySlug);

// Banners
router.get("/banners", getPublishedBanners);

// Flash Sales
router.get("/flash-sales", getActiveFlashSales);

// Product Sections
router.get("/product-sections", getActiveProductSections);

// Shoppable Video Carousel
router.get("/shoppable-carousel", getShoppableVideoCarousel);

// Filter Attributes (Colors and Sizes)
router.get("/filter-attributes", getFilterAttributes);

// Price Visibility Settings
router.get("/price-visibility-settings", getPriceVisibilitySettings);

// OAuth enabled providers (for auth page - Google, Facebook, etc.)
router.get("/oauth-providers", getOAuthProviders);

// Tawk.to Chat Widget Settings (Public)
router.get("/tawkto-settings", getPublicTawkToConfig);

// Public Site Settings (for client checkout - site name, Razorpay key)
router.get("/settings", getPublicSettings);

export default router;
