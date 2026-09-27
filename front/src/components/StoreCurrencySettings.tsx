import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Coins, AlertTriangle } from "lucide-react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setStoreCurrency } from "@/lib/utils";

const OPTIONS = [
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
];

export default function StoreCurrencySettings() {
  const [saved, setSaved] = useState<string | null>(null);
  const [currency, setCurrency] = useState("INR");
  const [usd, setUsd] = useState("90");
  const [eur, setEur] = useState("100");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/api/admin/site-settings").then((r) => {
      const s = r.data.data.settings;
      setSaved(s.storeCurrency || "INR");
      setCurrency(s.storeCurrency || "INR");
      setUsd(String(s.usdExchangeRate ?? 90));
      setEur(String(s.eurExchangeRate ?? 100));
    }).catch(() => toast.error("Could not load currency settings"));
  }, []);

  const save = async () => {
    if (saved && currency !== saved && !window.confirm(
      `Switch the store from ${saved} to ${currency}?\n\nExisting product prices are NOT converted — a price of 1,000 will show as ${currency} 1,000. Update your listing prices after switching. Past orders keep their own currency.`
    )) return;
    setBusy(true);
    try {
      await api.put("/api/admin/site-settings", { storeCurrency: currency, usdExchangeRate: Number(usd), eurExchangeRate: Number(eur) });
      setSaved(currency);
      setStoreCurrency(currency);
      window.dispatchEvent(new CustomEvent("store-currency-changed", { detail: currency }));
      toast.success(`Store currency saved (${currency})`);
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
      <CardHeader>
        <CardTitle className="text-[var(--text-primary)] flex items-center gap-2"><Coins className="h-5 w-5 text-[var(--accent)]" /> Store currency</CardTitle>
        <p className="text-sm text-[var(--text-secondary)]">
          All prices are entered and shown in this currency — product cards, product page, cart, checkout, orders and emails — and customers pay in it.
          PayPal / Payoneer charge USD when the store is in INR.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-[var(--text-primary)]">Currency</Label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)]">
              {OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[var(--text-primary)]">1 USD = ? INR</Label>
            <Input type="number" min={0} step="0.01" value={usd} onChange={(e) => setUsd(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-[var(--text-primary)]">1 EUR = ? INR</Label>
            <Input type="number" min={0} step="0.01" value={eur} onChange={(e) => setEur(e.target.value)} className="mt-1" />
          </div>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Rates are used only to convert INR → USD for PayPal/Payoneer, courier charges (billed in INR) and customs values — never to change your product prices.
        </p>
        {saved && currency !== saved && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Existing prices will not be converted. Check that Razorpay International Payments is enabled if you charge in {currency}, and that COD makes sense for your buyers.
          </div>
        )}
        <Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save currency</Button>
      </CardContent>
    </Card>
  );
}
