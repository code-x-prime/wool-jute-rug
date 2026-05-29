// Guest Cart Utilities
// This file handles cart functionality for non-logged-in users

import { fetchApi } from "./utils";

const GUEST_CART_KEY = "ecom_cart";

/**
 * Get effective unit price for a given quantity (pricing slabs or base price)
 * @param {object} item - Cart item with price, pricingSlabs
 * @param {number} qty - Quantity
 * @returns {{ price: number, priceSource: string }} - Rounded unit price and source
 */
const getPriceForQuantity = (item, qty) => {
  if (item.pricingSlabs && item.pricingSlabs.length > 0) {
    const slab = item.pricingSlabs.find(
      (s) => qty >= s.minQty && (s.maxQty == null || qty <= s.maxQty)
    );
    if (slab) {
      return {
        price: Math.round(parseFloat(slab.price)),
        priceSource: "VARIANT_SLAB",
      };
    }
  }
  return {
    price: Math.round(parseFloat(item.price) || 0),
    priceSource: "DEFAULT",
  };
};

// Get guest cart from localStorage
export const getGuestCart = () => {
  if (typeof window === "undefined") {
    return { items: [], subtotal: 0, itemCount: 0, totalQuantity: 0 };
  }

  try {
    const cartData = localStorage.getItem(GUEST_CART_KEY);
    const cart = cartData
      ? JSON.parse(cartData)
      : { items: [], subtotal: 0, itemCount: 0, totalQuantity: 0 };
    return cart;
  } catch (error) {
    console.error("Error reading guest cart:", error);
    return { items: [], subtotal: 0, itemCount: 0, totalQuantity: 0 };
  }
};

// Save guest cart to localStorage
export const saveGuestCart = (cart) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error("Error saving guest cart:", error);
  }
};

// Add item to guest cart
export const addToGuestCart = async (productVariantId, quantity = 1) => {
  try {
    // Fetch product variant details from backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api"
      }/public/products/variants/${productVariantId}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {

      throw new Error("Failed to fetch product variant");
    }

    const variantData = await response.json();
    const variant = variantData.data.variant;

    // API returns: price (flash-sale applied), originalPrice, moq, pricingSlabs
    const moq = variant.moq ?? 1;
    const effectiveQty = Math.max(quantity, moq);

    const currentCart = getGuestCart();

    // Check if item already exists in cart
    const existingItemIndex = currentCart.items.findIndex(
      (item) => item.productVariantId === productVariantId
    );

    if (existingItemIndex !== -1) {
      const existing = currentCart.items[existingItemIndex];
      const newQuantity = Math.max(existing.quantity + quantity, existing.moq ?? moq);
      const { price: unitPrice, priceSource } = getPriceForQuantity(
        { ...existing, price: variant.price ?? existing.price, pricingSlabs: variant.pricingSlabs ?? existing.pricingSlabs },
        newQuantity
      );
      existing.quantity = newQuantity;
      existing.price = unitPrice;
      existing.priceSource = priceSource;
      existing.subtotal = Math.round(unitPrice * newQuantity);
      // Refresh pricingSlabs/moq if API has newer data (e.g. on re-add)
      if (variant.pricingSlabs) existing.pricingSlabs = variant.pricingSlabs;
      if (variant.moq != null) existing.moq = variant.moq;
      if (variant.originalPrice != null) existing.originalPrice = variant.originalPrice;
    } else {
      const { price: unitPrice, priceSource } = getPriceForQuantity(
        { price: variant.price, pricingSlabs: variant.pricingSlabs },
        effectiveQty
      );
      const newItem = {
        id: `guest_${Date.now()}_${Math.random()}`,
        productVariantId: productVariantId,
        productId: variant.productId,
        productName: variant.product.name,
        productSlug: variant.product.slug,
        variantName: `${variant.color?.name || ""} ${variant.size?.name || ""}`.trim() || null,
        price: unitPrice,
        originalPrice: variant.originalPrice != null ? Math.round(variant.originalPrice) : undefined,
        priceSource,
        quantity: effectiveQty,
        subtotal: Math.round(unitPrice * effectiveQty),
        moq,
        pricingSlabs: variant.pricingSlabs || [],
        image: variant.images?.[0]?.url || variant.product?.image,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        variant: {
          color: variant.color,
          size: variant.size,
          images: variant.images || [],
        },
      };

      currentCart.items.push(newItem);
    }

    // Recalculate cart totals (whole numbers only)
    currentCart.subtotal = Math.round(
      currentCart.items.reduce((sum, item) => sum + (typeof item.subtotal === 'number' ? item.subtotal : parseFloat(item.subtotal)), 0)
    );
    currentCart.itemCount = currentCart.items.length;
    currentCart.totalQuantity = currentCart.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    saveGuestCart(currentCart);
    return currentCart;
  } catch (error) {
    console.error("Error adding to guest cart:", error);
    throw error;
  }
};

// Update guest cart item quantity
export const updateGuestCartItem = (cartItemId, quantity) => {
  const currentCart = getGuestCart();
  const itemIndex = currentCart.items.findIndex(
    (item) => item.id === cartItemId
  );

  if (itemIndex === -1) throw new Error("Item not found in cart");

  if (quantity <= 0) {
    // Remove item if quantity is 0 or negative
    currentCart.items.splice(itemIndex, 1);
  } else {
    const item = currentCart.items[itemIndex];
    const moq = item.moq ?? 1;
    const effectiveQty = Math.max(quantity, moq);
    const { price: unitPrice, priceSource } = getPriceForQuantity(item, effectiveQty);
    item.quantity = effectiveQty;
    item.price = unitPrice;
    item.priceSource = priceSource;
    item.subtotal = Math.round(unitPrice * effectiveQty);
  }

  // Recalculate cart totals
  currentCart.subtotal = Math.round(
    currentCart.items.reduce((sum, item) => sum + (typeof item.subtotal === 'number' ? item.subtotal : parseFloat(item.subtotal)), 0)
  );
  currentCart.itemCount = currentCart.items.length;
  currentCart.totalQuantity = currentCart.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  saveGuestCart(currentCart);
  return currentCart;
};

// Remove item from guest cart
export const removeFromGuestCart = (cartItemId) => {
  const currentCart = getGuestCart();
  const itemIndex = currentCart.items.findIndex(
    (item) => item.id === cartItemId
  );

  if (itemIndex === -1) throw new Error("Item not found in cart");

  currentCart.items.splice(itemIndex, 1);

  // Recalculate cart totals
  currentCart.subtotal = Math.round(
    currentCart.items.reduce((sum, item) => sum + (typeof item.subtotal === 'number' ? item.subtotal : parseFloat(item.subtotal)), 0)
  );
  currentCart.itemCount = currentCart.items.length;
  currentCart.totalQuantity = currentCart.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  saveGuestCart(currentCart);
  return currentCart;
};

// Clear guest cart
export const clearGuestCart = () => {
  const emptyCart = { items: [], subtotal: 0, itemCount: 0, totalQuantity: 0 };
  saveGuestCart(emptyCart);
  return emptyCart;
};

// Merge guest cart with user cart after login
export const mergeGuestCartWithUserCart = async () => {
  const guestCart = getGuestCart();

  if (guestCart.items.length === 0) {
    return { success: true, message: "No guest cart items to merge" };
  }

  try {
    const guestItemsToMerge = [...guestCart.items];
    const successfullyMergedIds = [];

    // Process all items in parallel for faster merging
    const mergePromises = guestItemsToMerge.map(async (guestItem) => {
      try {
        // Validate quantity (respect MOQ)
        const moq = guestItem.moq ?? 1;
        const quantity = Math.max(moq, parseInt(guestItem.quantity) || 1);

        await fetchApi("/cart/add", {
          method: "POST",
          body: JSON.stringify({
            productVariantId: guestItem.productVariantId,
            quantity: quantity,
          }),
        });

        successfullyMergedIds.push(guestItem.id);
        return { success: true, item: guestItem };
      } catch (error) {
        console.error(
          `Error merging item ${guestItem.productVariantId}:`,
          error
        );
        return { success: false, item: guestItem, error: error.message };
      }
    });

    // Wait for all merge operations to complete
    const results = await Promise.all(mergePromises);

    // Filter guest cart to only keep items that FAILED to merge
    const remainingGuestItems = guestItemsToMerge.filter(
      (item) => !successfullyMergedIds.includes(item.id)
    );

    // Save remaining items back to guest cart
    const updatedGuestCart = {
      items: remainingGuestItems,
      subtotal: Math.round(
        remainingGuestItems.reduce((sum, item) => sum + (typeof item.subtotal === 'number' ? item.subtotal : parseFloat(item.subtotal)), 0)
      ),
      itemCount: remainingGuestItems.length,
      totalQuantity: remainingGuestItems.reduce((sum, item) => sum + item.quantity, 0),
    };
    saveGuestCart(updatedGuestCart);

    const mergedCount = successfullyMergedIds.length;
    const failedCount = guestItemsToMerge.length - mergedCount;

    let message = `Successfully merged ${mergedCount} items from guest cart`;
    if (failedCount > 0) {
      message += `. ${failedCount} items could not be merged.`;
    }

    if (mergedCount > 0) {
      message += " Your existing cart items have been preserved.";
    }

    return {
      success: true,
      message,
      mergedItems: mergedCount,
      skippedItems: failedCount,
    };
  } catch (error) {
    console.error("Error merging guest cart:", error);

    return {
      success: false,
      message: "Failed to merge cart items. Please try again.",
    };
  }
};

// Check if guest cart has items
export const hasGuestCartItems = () => {
  const cart = getGuestCart();
  return cart.items.length > 0;
};

// Get guest cart item count for navbar display
export const getGuestCartItemCount = () => {
  const cart = getGuestCart();
  return cart.totalQuantity || 0;
};
