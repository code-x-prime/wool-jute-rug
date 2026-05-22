import express from "express";
import { otpRateLimiter } from "../middlewares/rateLimiter.js";
import {
  registerAdmin,
  loginAdmin,
  forgotAdminPassword,
  resetAdminPassword,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getAllAdmins,
  updateAdminRole,
  deleteAdmin,
  updateAdminPermissions,
  getLowStockAlerts,
  getUsers,
  getUserById,
  verifyUserEmail,
  deleteUser,
  updateUserDetails,
  getPaymentSettings,
  updatePaymentSettings,
  getPriceVisibilitySettings,
  updatePriceVisibilitySettings,
  sendUserPasswordReset,
} from "../controllers/admin.controller.js";
import {
  verifyAdminJWT,
  hasPermission,
  hasRole,
} from "../middlewares/admin.middleware.js";
import {
  getMostViewedPages,
  getMostViewedProducts,
  getUsersWithProductsInCart,
  getAnalyticsDashboard,
  getTopSellingProducts,
  getRepeatProducts,
  getRepeatUsers,
  getUserAnalytics,
} from "../controllers/analytics.controller.js";
import {
  getTawkToConfig,
  updateTawkToConfig,
} from "../controllers/tawkto.controller.js";

const router = express.Router();

// Admin Auth Routes
router.post("/login", loginAdmin);
router.post("/forgot-password", otpRateLimiter, forgotAdminPassword);
router.post("/reset-password/:token", resetAdminPassword);

// Register admin - require authentication and Super Admin role
router.post("/register", verifyAdminJWT, hasRole("SUPER_ADMIN"), registerAdmin);

// Admin Profile Routes
router.get("/profile", verifyAdminJWT, getAdminProfile);
router.patch("/profile", verifyAdminJWT, updateAdminProfile);
router.post("/change-password", verifyAdminJWT, changeAdminPassword);

// Dashboard Routes
router.get(
  "/inventory-alerts",
  verifyAdminJWT,
  hasPermission("inventory", "read"),
  getLowStockAlerts
);

// Admin Management Routes (Super Admin Only)
router.get("/admins", verifyAdminJWT, hasRole("SUPER_ADMIN"), getAllAdmins);

router.patch(
  "/admins/:adminId",
  verifyAdminJWT,
  hasRole("SUPER_ADMIN"),
  updateAdminRole
);

router.delete(
  "/admins/:adminId",
  verifyAdminJWT,
  hasRole("SUPER_ADMIN"),
  deleteAdmin
);

// Update admin permissions (can be used to fix missing permissions)
router.post(
  "/admins/:adminId/update-permissions",
  verifyAdminJWT,
  hasRole("SUPER_ADMIN"),
  updateAdminPermissions
);

// User Management Routes
router.get("/users", verifyAdminJWT, hasPermission("users", "read"), getUsers);

router.get(
  "/users/:userId",
  verifyAdminJWT,
  hasPermission("users", "read"),
  getUserById
);

router.post(
  "/users/:userId/verify-email",
  verifyAdminJWT,
  hasPermission("users", "update"),
  verifyUserEmail
);

router.patch(
  "/users/:userId",
  verifyAdminJWT,
  hasPermission("users", "update"),
  updateUserDetails
);

router.delete(
  "/users/:userId",
  verifyAdminJWT,
  hasPermission("users", "delete"),
  deleteUser
);

router.post(
  "/users/:userId/send-password-reset",
  verifyAdminJWT,
  hasPermission("users", "update"),
  sendUserPasswordReset
);

// Analytics routes
router.get(
  "/analytics/dashboard",
  verifyAdminJWT,
  hasPermission("analytics", "read"),
  getAnalyticsDashboard
);
router.get(
  "/analytics/pages",
  verifyAdminJWT,
  hasPermission("analytics", "read"),
  getMostViewedPages
);
router.get(
  "/analytics/products",
  verifyAdminJWT,
  hasPermission("analytics", "read"),
  getMostViewedProducts
);
router.get(
  "/analytics/carts",
  verifyAdminJWT,
  hasPermission("analytics", "read"),
  getUsersWithProductsInCart
);

router.get(
  "/analytics/products/top-selling",
  verifyAdminJWT,
  hasPermission("analytics", "read"),
  getTopSellingProducts
);

router.get(
  "/analytics/products/repeat",
  verifyAdminJWT,
  hasPermission("analytics", "read"),
  getRepeatProducts
);

router.get(
  "/analytics/users/repeat",
  verifyAdminJWT,
  hasPermission("analytics", "read"),
  getRepeatUsers
);

router.get(
  "/analytics/users/stats",
  verifyAdminJWT,
  hasPermission("analytics", "read"),
  getUserAnalytics
);

// Payment Settings Routes
router.get(
  "/payment-settings",
  verifyAdminJWT,
  hasPermission("settings", "read"),
  getPaymentSettings
);

router.patch(
  "/payment-settings",
  verifyAdminJWT,
  hasPermission("settings", "update"),
  updatePaymentSettings
);

// Price Visibility Settings Routes
router.get(
  "/price-visibility-settings",
  verifyAdminJWT,
  hasPermission("settings", "read"),
  getPriceVisibilitySettings
);

router.patch(
  "/price-visibility-settings",
  verifyAdminJWT,
  hasPermission("settings", "update"),
  updatePriceVisibilitySettings
);

// Tawk.to Chat Widget Settings Routes
router.get(
  "/tawkto-settings",
  verifyAdminJWT,
  hasPermission("settings", "read"),
  getTawkToConfig
);

router.patch(
  "/tawkto-settings",
  verifyAdminJWT,
  hasPermission("settings", "update"),
  updateTawkToConfig
);

export default router;
