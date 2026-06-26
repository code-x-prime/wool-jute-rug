import express from "express";
import { verifyJWTToken } from "../middlewares/auth.middleware.js";
import {
  getUserCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../controllers/cart.controller.js";
import { setCartItemAddons } from "../controllers/addon.controller.js";

const router = express.Router();

// All cart routes require authentication
router.use(verifyJWTToken);

// Get user's cart
router.get("/", getUserCart);

// Add item to cart
router.post("/add", addToCart);

// Update cart item quantity
router.patch("/update/:cartItemId", updateCartItem);

// Remove item from cart
router.delete("/remove/:cartItemId", removeFromCart);

// Clear entire cart
router.delete("/clear", clearCart);

// Set addons on a cart item
router.put("/addons/:cartItemId", setCartItemAddons);

export default router;
