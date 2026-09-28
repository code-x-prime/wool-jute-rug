// Product prices are always stored in INR. The storefront always displays/charges in USD,
// converted live via Frankfurter rates, falling back to the admin's static rate, falling back
// to the hardcoded rate inside exchangeRates.js. There is no admin toggle for this — it's fixed.
import { prisma } from "../config/db.js";
import { getRates } from "./exchangeRates.js";

export const STORE_CURRENCIES = ["INR", "USD", "EUR"];

export async function getStoreCurrency(db = prisma) {
  const s = await db.siteSettings.findFirst({ select: { usdExchangeRate: true, eurExchangeRate: true } });
  const code = "USD";
  const staticUsd = s?.usdExchangeRate > 0 ? s.usdExchangeRate : 90;
  const eur = s?.eurExchangeRate > 0 ? s.eurExchangeRate : 100;

  // Live rate (INR per 1 USD) from the Frankfurter cache; admin's static rate is only the offline fallback.
  let usd = staticUsd;
  try {
    const rates = await getRates();
    if (rates?.INR && rates?.USD) usd = rates.INR / rates.USD;
  } catch {
    // keep staticUsd
  }

  return {
    code,
    usdRate: usd, // INR per 1 USD (live, falling back to admin static rate)
    staticUsdRate: staticUsd, // admin-set fallback rate, kept for reference/UI
    eurRate: eur, // INR per 1 EUR (admin static — EUR path unused for now)
    inrPerUnit: code === "INR" ? 1 : code === "USD" ? usd : eur, // INR per 1 unit of the display currency
  };
}

/** Convert an amount between INR / USD / EUR using cur's rates (INR is the pivot). */
export function convert(amount, from, to, cur) {
  if (from === to) return amount;
  const toInr = { INR: 1, USD: cur.usdRate, EUR: cur.eurRate };
  if (!toInr[from] || !toInr[to]) return null;
  return Math.round(((amount * toInr[from]) / toInr[to]) * 100) / 100;
}
