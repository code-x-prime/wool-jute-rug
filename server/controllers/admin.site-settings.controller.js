/**
 * Site Settings Controller
 * Company details, Razorpay, Shiprocket configuration
 */

import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import Razorpay from "razorpay";

// Fields to never return in API responses
const SENSITIVE_FIELDS = ["razorpayKeySecret", "shiprocketPassword"];

function maskSettings(settings) {
  if (!settings) return null;
  const masked = { ...settings };
  if (masked.razorpayKeySecret) masked.razorpayKeySecret = "••••••••";
  if (masked.shiprocketPassword) masked.shiprocketPassword = "••••••••";
  return masked;
}

export const getSiteSettings = asyncHandler(async (req, res) => {
  let settings = await prisma.siteSettings.findFirst();

  if (!settings) {
    settings = await prisma.siteSettings.create({
      data: {},
    });
  }

  const masked = maskSettings(settings);
  res
    .status(200)
    .json(
      new ApiResponsive(200, { settings: masked }, "Site settings fetched")
    );
});

export const updateSiteSettings = asyncHandler(async (req, res) => {
  const {
    siteName,
    siteDescription,
    siteEmail,
    sitePhone,
    siteAddress,
    siteCity,
    siteState,
    sitePincode,
    siteCountry,
    siteGSTIN,
    sitePAN,
    siteLogo,
    siteFavicon,
    orderPrefix,
    orderEmailFooter,
    razorpayKeyId,
    razorpayKeySecret,
    razorpayEnabled,
    shiprocketEmail,
    shiprocketPassword,
    shiprocketEnabled,
  } = req.body;

  let settings = await prisma.siteSettings.findFirst();

  if (!settings) {
    settings = await prisma.siteSettings.create({
      data: {},
    });
  }

  const updateData = {};

  if (siteName !== undefined) updateData.siteName = siteName;
  if (siteDescription !== undefined) updateData.siteDescription = siteDescription;
  if (siteEmail !== undefined) updateData.siteEmail = siteEmail;
  if (sitePhone !== undefined) updateData.sitePhone = sitePhone;
  if (siteAddress !== undefined) updateData.siteAddress = siteAddress;
  if (siteCity !== undefined) updateData.siteCity = siteCity;
  if (siteState !== undefined) updateData.siteState = siteState;
  if (sitePincode !== undefined) updateData.sitePincode = sitePincode;
  if (siteCountry !== undefined) updateData.siteCountry = siteCountry;
  if (siteGSTIN !== undefined) updateData.siteGSTIN = siteGSTIN;
  if (sitePAN !== undefined) updateData.sitePAN = sitePAN;
  if (siteLogo !== undefined) updateData.siteLogo = siteLogo;
  if (siteFavicon !== undefined) updateData.siteFavicon = siteFavicon;
  if (orderPrefix !== undefined) updateData.orderPrefix = orderPrefix;
  if (orderEmailFooter !== undefined) updateData.orderEmailFooter = orderEmailFooter;
  if (razorpayKeyId !== undefined) updateData.razorpayKeyId = razorpayKeyId;
  if (typeof razorpayEnabled === "boolean") updateData.razorpayEnabled = razorpayEnabled;
  if (shiprocketEmail !== undefined) updateData.shiprocketEmail = shiprocketEmail;
  if (typeof shiprocketEnabled === "boolean") updateData.shiprocketEnabled = shiprocketEnabled;

  if (razorpayKeySecret && razorpayKeySecret !== "••••••••") {
    try {
      updateData.razorpayKeySecret = "enc:" + encrypt(razorpayKeySecret.trim());
    } catch (e) {
      throw new ApiError(400, "Failed to encrypt Razorpay secret");
    }
  }

  if (shiprocketPassword && shiprocketPassword !== "••••••••") {
    try {
      updateData.shiprocketPassword = "enc:" + encrypt(shiprocketPassword.trim());
      updateData.shiprocketToken = null;
      updateData.shiprocketTokenExpiry = null;
    } catch (e) {
      throw new ApiError(400, "Failed to encrypt Shiprocket password");
    }
  }

  const updated = await prisma.siteSettings.update({
    where: { id: settings.id },
    data: updateData,
  });

  res
    .status(200)
    .json(
      new ApiResponsive(200, { settings: maskSettings(updated) }, "Site settings updated")
    );
});

export const testRazorpayConnection = asyncHandler(async (req, res) => {
  const settings = await prisma.siteSettings.findFirst();

  if (!settings?.razorpayEnabled || !settings?.razorpayKeyId) {
    return res.status(200).json(
      new ApiResponsive(200, { connected: false }, "Razorpay not configured")
    );
  }

  let secret = settings.razorpayKeySecret;
  if (secret?.startsWith("enc:")) {
    secret = decrypt(secret.replace("enc:", ""));
  }

  if (!secret) {
    return res.status(200).json(
      new ApiResponsive(200, { connected: false }, "Razorpay secret not set")
    );
  }

  try {
    const rzp = new Razorpay({
      key_id: settings.razorpayKeyId,
      key_secret: secret,
    });
    await rzp.payments.all({ count: 1 });
    res.status(200).json(
      new ApiResponsive(200, { connected: true }, "Razorpay connected")
    );
  } catch (err) {
    res.status(200).json(
      new ApiResponsive(200, { connected: false }, err.message || "Connection failed")
    );
  }
});

export const connectShiprocket = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password required");
  }

  let settings = await prisma.siteSettings.findFirst();
  if (!settings) {
    settings = await prisma.siteSettings.create({ data: {} });
  }

  const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!data.token) {
    throw new ApiError(400, data.message || "Shiprocket authentication failed");
  }

  const expiry = new Date(Date.now() + 23 * 60 * 60 * 1000);

  const encryptedPassword = password.startsWith("enc:") ? settings.shiprocketPassword : "enc:" + encrypt(password);

  await prisma.siteSettings.update({
    where: { id: settings.id },
    data: {
      shiprocketEmail: email,
      shiprocketPassword: encryptedPassword,
      shiprocketToken: data.token,
      shiprocketTokenExpiry: expiry,
      shiprocketEnabled: true,
    },
  });

  res.status(200).json(
    new ApiResponsive(200, {
      connected: true,
      tokenExpiry: expiry.toISOString(),
    }, "Shiprocket connected successfully")
  );
});
