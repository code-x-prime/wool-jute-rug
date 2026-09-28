import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Coins } from "lucide-react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function StoreCurrencySettings() {
  const [usd, setUsd] = useState("90");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/api/admin/site-settings").then((r) => {
      const s = r.data.data.settings;
      setUsd(String(s.usdExchangeRate ?? 90));
    }).catch(() => toast.error("Could not load currency settings"));
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      await api.put("/api/admin/site-settings", { usdExchangeRate: Number(usd) });
      toast.success("Fallback rate saved");
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
          Product prices are always entered in INR. The storefront always shows and charges customers in USD, converted
          live using current exchange rates — there is no on/off switch for this.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs">
          <Label className="text-[var(--text-primary)]">1 USD = ? INR (fallback rate)</Label>
          <Input type="number" min={0} step="0.01" value={usd} onChange={(e) => setUsd(e.target.value)} className="mt-1" />
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          USD prices are converted using live exchange rates, refreshed hourly. This fallback rate is used only if the
          live rate service is temporarily unavailable — it is not the primary rate source.
        </p>
        <Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save fallback rate</Button>
      </CardContent>
    </Card>
  );
}
