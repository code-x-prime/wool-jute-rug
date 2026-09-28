// Converts INR money fields to the display currency (USD) at the API-response boundary only.
// Internal computations (filtering, slabs, coupons, stock, etc.) must stay in INR — this runs
// last, after every number has already been computed.
import { convertInrToUsd } from "./exchangeRates.js";

// Keys anywhere in a response payload that hold an INR amount to be shown to the customer.
const PRICE_KEYS = new Set([
  "price",
  "salePrice",
  "basePrice",
  "regularPrice",
  "originalPrice",
  "flashSalePrice",
  "flashSaleOriginalPrice",
  "unitPrice",
  "subtotal",
  "subTotal",
  "total",
  "grandTotal",
  "shippingTotal",
  "shippingCost",
  "freeShippingThreshold",
  "discount",
  "discountValue",
  "addonsTotal",
  "itemTotal",
  "codCharge",
  "tax",
  "amount",
  "min",
  "max",
  "maxPrice",
]);

async function convertValue(value, memo) {
  if (value == null) return value;
  const key = String(value);
  if (memo.has(key)) return memo.get(key);
  const usd = await convertInrToUsd(value);
  memo.set(key, usd);
  return usd;
}

/** Deep-clones `data` and converts every recognised INR price key to USD, in place on the clone. */
export async function convertPricesToUsd(data) {
  const memo = new Map();

  async function walk(node) {
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) node[i] = await walk(node[i]);
      return node;
    }
    if (node && typeof node === "object") {
      for (const key of Object.keys(node)) {
        const val = node[key];
        if (PRICE_KEYS.has(key) && typeof val === "number") {
          node[key] = await convertValue(val, memo);
        } else if (val && typeof val === "object") {
          node[key] = await walk(val);
        }
      }
      return node;
    }
    return node;
  }

  return walk(JSON.parse(JSON.stringify(data)));
}
