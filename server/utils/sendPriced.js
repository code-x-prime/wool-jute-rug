// Sends an ApiResponsive after converting INR prices to the display currency (USD only, for now).
// Internal math (filters, slabs, coupons, stock) must already be finished — this only touches
// the response payload, right before it goes out.
import { ApiResponsive } from "./ApiResponsive.js";
import { getStoreCurrency } from "./currency.js";
import { convertPricesToUsd } from "./convertResponsePrices.js";

export async function sendPriced(res, statusCode, data, message = "Success") {
  const cur = await getStoreCurrency();
  const payload = cur.code === "USD" ? await convertPricesToUsd(data) : data;
  if (payload && typeof payload === "object" && "currency" in payload) {
    payload.currency = cur.code;
  }
  res.status(statusCode).json(new ApiResponsive(statusCode, payload, message));
}
