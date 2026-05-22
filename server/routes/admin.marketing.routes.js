/**
 * Marketing Admin Routes
 * Routes for email and WhatsApp marketing management
 */

import { Router } from "express";
import {
    getConfig,
    updateConfig,
    testEmailConnection,
    testWhatsAppConnectionHandler,
    getAudienceCount,
    getAudienceUsers,
    sendEmailCampaign,
    sendWhatsAppCampaign,
    getCampaigns,
    getCampaignDetails,
} from "../controllers/admin.marketing.controller.js";
import { isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Configuration
router.get("/config", isAdmin, getConfig);
router.put("/config", isAdmin, updateConfig);

// Test connections
router.post("/test-email", isAdmin, testEmailConnection);
router.post("/test-whatsapp", isAdmin, testWhatsAppConnectionHandler);

// Audience targeting
router.get("/audience/:type", isAdmin, getAudienceCount);
router.get("/audience/:type/users", isAdmin, getAudienceUsers);

// Campaign operations
router.post("/send/email", isAdmin, sendEmailCampaign);
router.post("/send/whatsapp", isAdmin, sendWhatsAppCampaign);

// Campaign history
router.get("/campaigns", isAdmin, getCampaigns);
router.get("/campaigns/:id", isAdmin, getCampaignDetails);

export default router;
