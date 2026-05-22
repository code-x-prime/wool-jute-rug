import express from "express";
import { uploadFiles } from "../middlewares/multer.middlerware.js";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";

import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getAllBlogPosts,
  getBlogPostById,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
  getAllBlogCategories,
  updatePageContent,
  getPageContent,
  getAllPageContents,
  createFaq,
  updateFaq,
  deleteFaq,
  getAllFaqs,
  getCustomRugRequests,
  getCustomRugRequestById,
  updateCustomRugRequest,
  deleteCustomRugRequest,
} from "../controllers/admin.content.controller.js";

const router = express.Router();

// Blog Posts
router.post(
  "/blog",
  verifyAdminJWT,
  hasPermission("content", "create"),
  uploadFiles.single("coverImage"),
  createBlogPost
);

router.put(
  "/blog/:id",
  verifyAdminJWT,
  hasPermission("content", "update"),
  uploadFiles.single("coverImage"),
  updateBlogPost
);

router.delete(
  "/blog/:id",
  verifyAdminJWT,
  hasPermission("content", "delete"),
  deleteBlogPost
);

router.get(
  "/blog",
  verifyAdminJWT,
  hasPermission("content", "read"),
  getAllBlogPosts
);

router.get(
  "/blog/:id",
  verifyAdminJWT,
  hasPermission("content", "read"),
  getBlogPostById
);

// Blog Categories
router.post(
  "/blog-categories",
  verifyAdminJWT,
  hasPermission("content", "create"),
  createBlogCategory
);

router.put(
  "/blog-categories/:id",
  verifyAdminJWT,
  hasPermission("content", "update"),
  updateBlogCategory
);

router.delete(
  "/blog-categories/:id",
  verifyAdminJWT,
  hasPermission("content", "delete"),
  deleteBlogCategory
);

router.get(
  "/blog-categories",
  verifyAdminJWT,
  hasPermission("content", "read"),
  getAllBlogCategories
);

// Page Contents (about, shipping policy, etc.)
router.put(
  "/pages/:slug",
  verifyAdminJWT,
  hasPermission("content", "update"),
  updatePageContent
);

router.get(
  "/pages/:slug",
  verifyAdminJWT,
  hasPermission("content", "read"),
  getPageContent
);

router.get(
  "/pages",
  verifyAdminJWT,
  hasPermission("content", "read"),
  getAllPageContents
);

// FAQs
router.post(
  "/faqs",
  verifyAdminJWT,
  hasPermission("content", "create"),
  createFaq
);

router.put(
  "/faqs/:id",
  verifyAdminJWT,
  hasPermission("content", "update"),
  updateFaq
);

router.delete(
  "/faqs/:id",
  verifyAdminJWT,
  hasPermission("content", "delete"),
  deleteFaq
);

router.get(
  "/faqs",
  verifyAdminJWT,
  hasPermission("content", "read"),
  getAllFaqs
);

// Custom Rug Requests
router.get(
  "/custom-rugs",
  verifyAdminJWT,
  hasPermission("contact", "read"), // Keeping permission string 'contact' for backward compatibility or change to 'custom_rugs' if permissions table updated, but safer to keep.
  getCustomRugRequests
);

router.get(
  "/custom-rugs/:id",
  verifyAdminJWT,
  hasPermission("contact", "read"),
  getCustomRugRequestById
);

router.put(
  "/custom-rugs/:id/status",
  verifyAdminJWT,
  hasPermission("contact", "update"),
  updateCustomRugRequest
);

router.delete(
  "/custom-rugs/:id",
  verifyAdminJWT,
  hasPermission("contact", "delete"),
  deleteCustomRugRequest
);

export default router;
