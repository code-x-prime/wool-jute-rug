// Store-wide currency. All prices in the database are in this currency; nothing is converted when it changes.
import { prisma } from "../config/db.js";

export const STORE_CURRENCIES = ["INR", "USD", "EUR"];

export async function getStoreCurrency(db = prisma) {
  const s = await db.siteSettings.findFirst({ select: { storeCurrency: true, usdExchangeRate: true, eurExchangeRate: true } });
  const code = STORE_CURRENCIES.includes(s?.storeCurrency) ? s.storeCurrency : "INR";
  const usd = s?.usdExchangeRate > 0 ? s.usdExchangeRate : 90;
  const eur = s?.eurExchangeRate > 0 ? s.eurExchangeRate : 100;
  return {
    code,
    usdRate: usd, // INR per 1 USD
    eurRate: eur, // INR per 1 EUR
    inrPerUnit: code === "INR" ? 1 : code === "USD" ? usd : eur, // INR per 1 unit of store currency
  };
}

/** Convert an amount between INR / USD / EUR using the admin-set rates (INR is the pivot). */
export function convert(amount, from, to, cur) {
  if (from === to) return amount;
  const toInr = { INR: 1, USD: cur.usdRate, EUR: cur.eurRate };
  if (!toInr[from] || !toInr[to]) return null;
  return Math.round(((amount * toInr[from]) / toInr[to]) * 100) / 100;
}
