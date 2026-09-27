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
  if (masked.paypalClientSecret) masked.paypalClientSecret = "••••••••";
  if (masked.payoneerApiKey) masked.payoneerApiKey = "••••••••";
  if (masked.easyshipApiKey) masked.easyshipApiKey = "••••••••";
  if (masked.razorpayWebhookSecret) masked.razorpayWebhookSecret = "••••••••";
  if (masked.fedexClientSecret) masked.fedexClientSecret = "••••••••";
  if (masked.dhlApiSecret) masked.dhlApiSecret = "••••••••";
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
    // PayPal
    paypalClientId,
    paypalClientSecret,
    paypalEnabled,
    paypalMode,
    // Payoneer
    payoneerApiKey,
    payoneerProgramId,
    payoneerEnabled,
    payoneerMode,
    // Easyship
    easyshipApiKey,
    easyshipEnabled,
    easyshipAccountId,
    usdExchangeRate,
    razorpayWebhookSecret,
    storeCurrency,
    eurExchangeRate,
    fedexEnabled,
    fedexMode,
    fedexClientId,
    fedexClientSecret,
    fedexAccountNumber,
    dhlEnabled,
    dhlMode,
    dhlApiKey,
    dhlApiSecret,
    dhlAccountNumber,
    exporterIec,
    intlHsCode,
    intlCustomsDescription,
    shiprocketWebhookToken,
    clearGateway, // "razorpay" | "paypal" | "payoneer" — removes saved credentials and disables it
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

  // PayPal
  if (paypalMode !== undefined && !["sandbox", "live"].includes(paypalMode)) {
    throw new ApiError(400, "PayPal mode must be sandbox or live");
  }
  if (paypalClientId !== undefined) updateData.paypalClientId = paypalClientId ? String(paypalClientId).trim() : null;
  if (typeof paypalEnabled === "boolean") updateData.paypalEnabled = paypalEnabled;
  if (paypalMode !== undefined) updateData.paypalMode = paypalMode;
  if (paypalClientSecret && paypalClientSecret !== "••••••••") {
    try {
      updateData.paypalClientSecret = "enc:" + encrypt(paypalClientSecret.trim());
    } catch (e) {
      throw new ApiError(400, "Failed to encrypt PayPal secret");
    }
  }

  // Payoneer
  if (payoneerMode !== undefined && !["sandbox", "live"].includes(payoneerMode)) {
    throw new ApiError(400, "Payoneer mode must be sandbox or live");
  }
  if (payoneerMode !== undefined) updateData.payoneerMode = payoneerMode;
  if (payoneerProgramId !== undefined) updateData.payoneerProgramId = payoneerProgramId ? String(payoneerProgramId).trim() : null;
  if (typeof payoneerEnabled === "boolean") updateData.payoneerEnabled = payoneerEnabled;
  if (payoneerApiKey && payoneerApiKey !== "••••••••") {
    try {
      updateData.payoneerApiKey = "enc:" + encrypt(payoneerApiKey.trim());
    } catch (e) {
      throw new ApiError(400, "Failed to encrypt Payoneer key");
    }
  }

  if (razorpayWebhookSecret !== undefined && razorpayWebhookSecret !== "••••••••") {
    updateData.razorpayWebhookSecret = razorpayWebhookSecret ? "enc:" + encrypt(String(razorpayWebhookSecret).trim()) : null;
  }

  // Store currency — every price is entered and shown in it (no conversion of existing prices)
  if (storeCurrency !== undefined) {
    if (!["INR", "USD", "EUR"].includes(storeCurrency)) throw new ApiError(400, "Store currency must be INR, USD or EUR");
    updateData.storeCurrency = storeCurrency;
  }
  if (eurExchangeRate !== undefined) {
    if (!(parseFloat(eurExchangeRate) > 0)) throw new ApiError(400, "EUR exchange rate must be greater than 0");
    updateData.eurExchangeRate = parseFloat(eurExchangeRate);
  }

  // FedEx / DHL Express
  for (const [label, mode] of [["FedEx", fedexMode], ["DHL", dhlMode]]) {
    if (mode !== undefined && !["sandbox", "live"].includes(mode)) throw new ApiError(400, `${label} mode must be sandbox or live`);
  }
  const trimOrNull = (v) => (v ? String(v).trim() : null);
  if (typeof fedexEnabled === "boolean") updateData.fedexEnabled = fedexEnabled;
  if (fedexMode !== undefined) updateData.fedexMode = fedexMode;
  if (fedexClientId !== undefined) updateData.fedexClientId = trimOrNull(fedexClientId);
  if (fedexAccountNumber !== undefined) updateData.fedexAccountNumber = trimOrNull(fedexAccountNumber);
  if (fedexClientSecret && fedexClientSecret !== "••••••••") updateData.fedexClientSecret = "enc:" + encrypt(String(fedexClientSecret).trim());
  if (typeof dhlEnabled === "boolean") updateData.dhlEnabled = dhlEnabled;
  if (dhlMode !== undefined) updateData.dhlMode = dhlMode;
  if (dhlApiKey !== undefined) updateData.dhlApiKey = trimOrNull(dhlApiKey);
  if (dhlAccountNumber !== undefined) updateData.dhlAccountNumber = trimOrNull(dhlAccountNumber);
  if (dhlApiSecret && dhlApiSecret !== "••••••••") updateData.dhlApiSecret = "enc:" + encrypt(String(dhlApiSecret).trim());
  if (exporterIec !== undefined) updateData.exporterIec = trimOrNull(exporterIec);
  if (intlHsCode !== undefined) {
    if (!/^\d{4,10}$/.test(String(intlHsCode).trim())) throw new ApiError(400, "HS code must be 4–10 digits");
    updateData.intlHsCode = String(intlHsCode).trim();
  }
  if (intlCustomsDescription !== undefined) {
    if (!String(intlCustomsDescription).trim()) throw new ApiError(400, "Customs description is required");
    updateData.intlCustomsDescription = String(intlCustomsDescription).trim().slice(0, 70);
  }
  if (shiprocketWebhookToken !== undefined) updateData.shiprocketWebhookToken = trimOrNull(shiprocketWebhookToken);

  // Easyship
  if (typeof easyshipEnabled === "boolean") updateData.easyshipEnabled = easyshipEnabled;
  if (easyshipAccountId !== undefined) updateData.easyshipAccountId = easyshipAccountId;
  if (easyshipApiKey && easyshipApiKey !== "••••••••") {
    try {
      updateData.easyshipApiKey = "enc:" + encrypt(easyshipApiKey.trim());
    } catch (e) {
      throw new ApiError(400, "Failed to encrypt Easyship key");
    }
  }

  if (clearGateway !== undefined) {
    const clears = {
      fedex: { fedexEnabled: false, fedexClientId: null, fedexClientSecret: null, fedexAccountNumber: null },
      dhl: { dhlEnabled: false, dhlApiKey: null, dhlApiSecret: null, dhlAccountNumber: null },
      easyship: { easyshipEnabled: false, easyshipApiKey: null, easyshipAccountId: null },
      razorpay: { razorpayEnabled: false, razorpayKeyId: null, razorpayKeySecret: null, razorpayWebhookSecret: null },
      paypal: { paypalEnabled: false, paypalClientId: null, paypalClientSecret: null },
      payoneer: { payoneerEnabled: false, payoneerProgramId: null, payoneerApiKey: null },
    };
    if (!clears[clearGateway]) throw new ApiError(400, "Unknown gateway");
    Object.assign(updateData, clears[clearGateway]);
    if (clearGateway === "razorpay") {
      await prisma.paymentSettings.updateMany({ data: { razorpayEnabled: false } });
    }
  }

  // A gateway cannot be switched on without complete credentials
  const after = { ...settings, ...updateData };
  if (after.fedexEnabled && (!after.fedexClientId || !after.fedexClientSecret || !after.fedexAccountNumber)) {
    throw new ApiError(400, "Add FedEx API key, secret key and account number before enabling FedEx");
  }
  if (after.dhlEnabled && (!after.dhlApiKey || !after.dhlApiSecret || !after.dhlAccountNumber)) {
    throw new ApiError(400, "Add DHL API key, secret and account number before enabling DHL Express");
  }
  if (after.easyshipEnabled && !after.easyshipApiKey) {
    throw new ApiError(400, "Add the Easyship API key before enabling Easyship");
  }
  if (after.razorpayEnabled && (!after.razorpayKeyId || !after.razorpayKeySecret)) {
    throw new ApiError(400, "Add Razorpay Key ID and Key Secret before enabling Razorpay");
  }
  if (after.paypalEnabled && (!after.paypalClientId || !after.paypalClientSecret)) {
    throw new ApiError(400, "Add PayPal Client ID and Client Secret before enabling PayPal");
  }
  if (after.payoneerEnabled && (!after.payoneerProgramId || !after.payoneerApiKey)) {
    throw new ApiError(400, "Add Payoneer merchant code and API token before enabling Payoneer");
  }
  if (usdExchangeRate !== undefined && !(parseFloat(usdExchangeRate) > 0)) {
    throw new ApiError(400, "USD exchange rate must be greater than 0");
  }

  if (usdExchangeRate !== undefined) {
    updateData.usdExchangeRate = parseFloat(usdExchangeRate) || 83.0;
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

  if (!settings?.razorpayKeyId) {
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
