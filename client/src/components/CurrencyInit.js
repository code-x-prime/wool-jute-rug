"use client";

import { setStoreCurrency } from "@/lib/utils";

// Sets the store currency before anything renders, on the server and in the browser, so prices never flash in the wrong currency.
export default function CurrencyInit({ currency, children }) {
  setStoreCurrency(currency);
  return children;
}
