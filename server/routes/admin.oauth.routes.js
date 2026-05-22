import express from "express";
import { getOAuthSettings, updateOAuthProvider } from "../controllers/admin.oauth.controller.js";
import { verifyAdminJWT } from "../middlewares/admin.middleware.js";

const router = express.Router();

router.get("/oauth-settings", verifyAdminJWT, getOAuthSettings);
router.put("/oauth-settings/:provider", verifyAdminJWT, updateOAuthProvider);

export default router;
