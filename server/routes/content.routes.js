import { Router } from "express";
import {
  getBlogPosts,
  getBlogPostBySlug,
  getBlogCategories,
  getAboutPageContent,
  getShippingPolicy,
  getFaqs,
  submitCustomRugRequest,
  getContactInfo,
} from "../controllers/content.controller.js";

const router = Router();

// Blog routes for public access
router.get("/blog", getBlogPosts);
router.get("/blog/:slug", getBlogPostBySlug);
router.get("/blog-categories", getBlogCategories);

// Static pages content
router.get("/pages/about", getAboutPageContent);
router.get("/pages/shipping", getShippingPolicy);

// FAQs
router.get("/faqs", getFaqs);

// Custom Rug routes
router.post("/custom-rugs", submitCustomRugRequest);
router.get("/contact-info", getContactInfo);

export default router;
