import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get active addons for a product (public)
export const getPublicProductAddons = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const links = await prisma.productAddon.findMany({
    where: { productId, addonService: { isActive: true } },
    include: { addonService: true },
    orderBy: { createdAt: "asc" },
  });
  const addons = links.map((l) => ({
    id: l.addonService.id,
    name: l.addonService.name,
    description: l.addonService.description,
    price: parseFloat(l.addonService.price),
    icon: l.addonService.icon || null,
  }));
  res.json(new ApiResponsive(200, { addons }, "Addons fetched"));
});

// Set addons on a cart item (user must own the cart item)
export const setCartItemAddons = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { cartItemId } = req.params;
  const { addonServiceIds } = req.body; // array of ids

  if (!Array.isArray(addonServiceIds)) throw new ApiError(400, "addonServiceIds must be array");

  const cartItem = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
  if (!cartItem || cartItem.userId !== userId) throw new ApiError(404, "Cart item not found");

  // Get addon prices
  const addonServices = await prisma.addonService.findMany({
    where: { id: { in: addonServiceIds }, isActive: true },
  });

  await prisma.$transaction([
    prisma.cartItemAddon.deleteMany({ where: { cartItemId } }),
    ...addonServices.map((s) =>
      prisma.cartItemAddon.create({
        data: { cartItemId, addonServiceId: s.id, price: s.price },
      })
    ),
  ]);

  res.json(new ApiResponsive(200, null, "Cart item addons updated"));
});
