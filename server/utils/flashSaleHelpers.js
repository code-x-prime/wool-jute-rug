/**
 * Flash sale price helpers - apply discount when product is in active flash sale
 */

import { prisma } from "../config/db.js";

let _activeFlashSaleCache = null;
let _cacheExpiry = 0;
const CACHE_MS = 60 * 1000; // 1 min

/**
 * Get active flash sales with product ids (cached)
 */
export async function getActiveFlashSalesForProducts() {
  const now = Date.now();
  if (_activeFlashSaleCache && _cacheExpiry > now) {
    return _activeFlashSaleCache;
  }

  const flashSales = await prisma.flashSale.findMany({
    where: {
      isActive: true,
      startTime: { lte: new Date() },
      endTime: { gte: new Date() },
    },
    include: {
      products: { select: { productId: true } },
    },
  });

  // Map: productId -> { discountPercentage, flashSaleId }
  const productToFlashSale = new Map();
  for (const sale of flashSales) {
    for (const fp of sale.products) {
      productToFlashSale.set(fp.productId, {
        discountPercentage: sale.discountPercentage,
        flashSaleId: sale.id,
      });
    }
  }

  _activeFlashSaleCache = productToFlashSale;
  _cacheExpiry = now + CACHE_MS;
  return productToFlashSale;
}

/**
 * Apply flash sale discount to a price
 * @param {number} basePrice - Original price (variant.price or variant.salePrice || variant.price)
 * @param {string} productId - Product ID
 * @returns {{ price: number, originalPrice: number, hasFlashSale: boolean, discountPercentage?: number }}
 */
export async function applyFlashSalePrice(basePrice, productId) {
  const flashMap = await getActiveFlashSalesForProducts();
  const fs = flashMap.get(productId);
  if (!fs) {
    const p = Number(basePrice) || 0;
    return { price: p, originalPrice: p, hasFlashSale: false };
  }
  const orig = Number(basePrice) || 0;
  const discountAmount = (orig * fs.discountPercentage) / 100;
  const discounted = Math.round(Math.max(0, orig - discountAmount));
  return {
    price: discounted,
    originalPrice: Math.round(orig),
    hasFlashSale: true,
    discountPercentage: fs.discountPercentage,
  };
}

/**
 * Invalidate cache (call when flash sale is created/updated)
 */
export function invalidateFlashSaleCache() {
  _activeFlashSaleCache = null;
  _cacheExpiry = 0;
}
