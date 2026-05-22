import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { encrypt } from "../utils/encryption.js";

const VALID_PROVIDERS = ["google", "facebook", "twitter"];

// Get all OAuth provider settings (admin)
export const getOAuthSettings = asyncHandler(async (req, res) => {
  const settings = await prisma.oAuthProviderSetting.findMany({
    orderBy: { provider: "asc" },
  });
  const byProvider = {};
  for (const p of VALID_PROVIDERS) {
    byProvider[p] = settings.find((s) => s.provider === p) || {
      provider: p,
      isEnabled: false,
      clientId: null,
      clientSecret: null,
    };
  }
  const formatted = Object.values(byProvider).map((s) => ({
    provider: s.provider,
    isEnabled: s.isEnabled ?? false,
    clientId: s.clientId || "",
    clientSecret: s.clientSecret ? "********" : "",
    hasSecret: !!s.clientSecret,
  }));
  res.status(200).json(new ApiResponsive(200, { providers: formatted }, "OAuth settings fetched"));
});

// Update OAuth provider setting (admin)
export const updateOAuthProvider = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { isEnabled, clientId, clientSecret } = req.body;

  if (!VALID_PROVIDERS.includes(provider)) {
    throw new ApiError(400, `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}`);
  }

  const updateData = {};
  if (typeof isEnabled === "boolean") updateData.isEnabled = isEnabled;
  if (clientId !== undefined) updateData.clientId = clientId?.trim() || null;

  if (clientSecret !== undefined && clientSecret !== "" && clientSecret !== "********") {
    const trimmed = clientSecret.trim();
    if (provider === "google") {
      if (!trimmed.match(/^[a-zA-Z0-9_-]{20,}$/)) {
        throw new ApiError(400, "Invalid Google Client Secret format");
      }
    }
    try {
      updateData.clientSecret = "enc:" + encrypt(trimmed);
    } catch (e) {
      throw new ApiError(500, "Failed to encrypt secret");
    }
  }

  const existing = await prisma.oAuthProviderSetting.findUnique({
    where: { provider },
  });

  let result;
  if (existing) {
    result = await prisma.oAuthProviderSetting.update({
      where: { provider },
      data: updateData,
    });
  } else {
    result = await prisma.oAuthProviderSetting.create({
      data: {
        provider,
        isEnabled: isEnabled ?? false,
        clientId: updateData.clientId ?? null,
        clientSecret: updateData.clientSecret ?? null,
      },
    });
  }

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        provider: result.provider,
        isEnabled: result.isEnabled,
        clientId: result.clientId || "",
        hasSecret: !!result.clientSecret,
      },
      "OAuth provider updated"
    )
  );
});
