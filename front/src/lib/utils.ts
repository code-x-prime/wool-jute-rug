import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Store-wide currency (INR / USD / EUR) from Site Settings; loaded once by DashboardLayout.
let STORE_CURRENCY = "INR";
const SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€" };

export function setStoreCurrency(code: string | undefined | null) {
  if (code && SYMBOLS[code]) STORE_CURRENCY = code;
}
export const getStoreCurrency = () => STORE_CURRENCY;
export const currencySymbol = (code: string = STORE_CURRENCY) => SYMBOLS[code] || code;

export function formatCurrency(amount: number | string | undefined | null, currency: string = STORE_CURRENCY): string {
  const code = SYMBOLS[currency] ? currency : STORE_CURRENCY;
  const num = amount === undefined || amount === null ? 0 : typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(code === "INR" ? "en-IN" : code === "EUR" ? "en-IE" : "en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num);
}

export function debugData(_label: string, _data: unknown, _verbose?: boolean): void {
  if (import.meta.env.DEV) {
    console.log(_label, _data);
  }
}
