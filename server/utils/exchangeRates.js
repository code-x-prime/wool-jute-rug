// Live INR/USD exchange rates via the Frankfurter API (EUR pivot), cached for 1 hour.
const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,INR";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_RATES = { EUR: 1, USD: 1.08, INR: 98 };

let cache = { rates: FALLBACK_RATES, fetchedAt: 0 };

async function fetchRates() {
  const res = await fetch(FRANKFURTER_URL);
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);
  const json = await res.json();
  return { EUR: 1, USD: json.rates.USD, INR: json.rates.INR };
}

export async function getRates() {
  const isStale = Date.now() - cache.fetchedAt > CACHE_TTL_MS;
  if (isStale) {
    try {
      const rates = await fetchRates();
      cache = { rates, fetchedAt: Date.now() };
    } catch (err) {
      console.error("Failed to refresh currency rates, using cached/fallback:", err.message);
      if (cache.fetchedAt === 0) cache = { rates: FALLBACK_RATES, fetchedAt: Date.now() };
    }
  }
  return cache.rates;
}

export async function convertFromEur(amountEur, targetCurrency) {
  const rates = await getRates();
  const rate = rates[targetCurrency];
  if (!rate) throw new Error(`Unsupported currency: ${targetCurrency}`);
  return Math.round(Number(amountEur) * rate * 100) / 100;
}

/** Direct INR -> USD conversion via the EUR pivot. */
export async function convertInrToUsd(amountInr) {
  const rates = await getRates();
  const usd = (Number(amountInr) / rates.INR) * rates.USD;
  return Math.round(usd * 100) / 100;
}
