import express from "express";
import { googleAuthRedirect, googleAuthCallback } from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/google", googleAuthRedirect);
router.get("/google/callback", googleAuthCallback);

export default router;
