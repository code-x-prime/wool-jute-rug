import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ── Addon Services CRUD ──────────────────────────────────────────────────────

export const getAddonServices = asyncHandler(async (req, res) => {
  const addons = await prisma.addonService.findMany({
    orderBy: { createdAt: "asc" },
  });
  res.json(new ApiResponsive(200, { addons }, "Addon services fetched"));
});

export const createAddonService = asyncHandler(async (req, res) => {
  const { name, description, price, icon, isActive } = req.body;
  if (!name || price === undefined) throw new ApiError(400, "name and price required");

  const addon = await prisma.addonService.create({
    data: { name, description: description || null, price: parseFloat(price), icon: icon || null, isActive: isActive !== false },
  });
  res.status(201).json(new ApiResponsive(201, { addon }, "Addon service created"));
});

export const updateAddonService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, price, icon, isActive } = req.body;

  const existing = await prisma.addonService.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Addon service not found");

  const addon = await prisma.addonService.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(icon !== undefined && { icon: icon || null }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  res.json(new ApiResponsive(200, { addon }, "Addon service updated"));
});

export const deleteAddonService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.addonService.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Addon service not found");

  await prisma.addonService.delete({ where: { id } });
  res.json(new ApiResponsive(200, null, "Addon service deleted"));
});

// ── Product ↔ Addon linking ──────────────────────────────────────────────────

export const getProductAddons = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const links = await prisma.productAddon.findMany({
    where: { productId },
    include: { addonService: true },
  });
  const addons = links.map((l) => l.addonService);
  res.json(new ApiResponsive(200, { addons }, "Product addons fetched"));
});

export const setProductAddons = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { addonServiceIds } = req.body; // array of ids to link

  if (!Array.isArray(addonServiceIds)) throw new ApiError(400, "addonServiceIds must be array");

  await prisma.$transaction([
    prisma.productAddon.deleteMany({ where: { productId } }),
    ...addonServiceIds.map((addonServiceId) =>
      prisma.productAddon.create({ data: { productId, addonServiceId } })
    ),
  ]);

  const links = await prisma.productAddon.findMany({
    where: { productId },
    include: { addonService: true },
  });
  res.json(new ApiResponsive(200, { addons: links.map((l) => l.addonService) }, "Product addons updated"));
});
