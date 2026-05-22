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

export function formatCurrency(amount: number | string | undefined | null, currency = "INR"): string {
  if (amount === undefined || amount === null) return "₹0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return isNaN(num) ? "₹0" : new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function debugData(_label: string, _data: unknown, _verbose?: boolean): void {
  if (import.meta.env.DEV) {
    console.log(_label, _data);
  }
}
