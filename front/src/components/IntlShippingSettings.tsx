import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, Truck, Eye, EyeOff, Globe } from "lucide-react";
import api from "@/api/api";
import { shipments as shipmentsApi } from "@/api/adminService";
import WarehousesSettings from "@/components/WarehousesSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type Carrier = "fedex" | "dhl" | "easyship";
type Field = { key: string; label: string; secret?: boolean; placeholder?: string; hint?: string };

const MASK = "••••••••";
const CARRIERS: Record<Carrier, { title: string; testCode: string; enabledKey: string; modeKey?: string; fields: Field[]; help: string }> = {
  fedex: {
    title: "FedEx",
    testCode: "FEDEX",
    enabledKey: "fedexEnabled",
    modeKey: "fedexMode",
    help: "Create a project at developer.fedex.com with the Ship, Rate and Track APIs and link your FedEx shipping account. Sandbox keys only work in Sandbox mode.",
    fields: [
      { key: "fedexClientId", label: "API Key (Client ID)" },
      { key: "fedexClientSecret", label: "Secret Key", secret: true },
      { key: "fedexAccountNumber", label: "FedEx account number", placeholder: "9 digits" },
    ],
  },
  dhl: {
    title: "DHL Express",
    testCode: "DHL",
    enabledKey: "dhlEnabled",
    modeKey: "dhlMode",
    help: "Request MyDHL API access at developer.dhl.com (DHL Express – MyDHL API) using your DHL Express account. Test credentials only work in Sandbox mode.",
    fields: [
      { key: "dhlApiKey", label: "API key (username)" },
      { key: "dhlApiSecret", label: "API secret (password)", secret: true },
      { key: "dhlAccountNumber", label: "DHL Express account number", placeholder: "9 digits" },
    ],
  },
  easyship: {
    title: "Easyship",
    testCode: "EASYSHIP",
    enabledKey: "easyshipEnabled",
    help: "One account with rates from FedEx, DHL, UPS, Aramex and more. Create a production API token at app.easyship.com → Connect → API integration.",
    fields: [
      { key: "easyshipApiKey", label: "API access token", secret: true },
      { key: "easyshipAccountId", label: "Account ID (optional)" },
    ],
  },
};

const errMsg = (e: unknown, f: string) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || f;

export default function IntlShippingSettings() {
  const [s, setS] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [customs, setCustoms] = useState({ exporterIec: "", intlHsCode: "", intlCustomsDescription: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const r = await api.get("/api/admin/site-settings");
    const st = r.data.data.settings;
    setS(st);
    const f: Record<string, string> = {};
    for (const c of Object.values(CARRIERS)) {
      for (const fld of c.fields) f[fld.key] = st[fld.key] ? (fld.secret ? MASK : String(st[fld.key])) : "";
      if (c.modeKey) f[c.modeKey] = st[c.modeKey] || "sandbox";
    }
    setForm(f);
    setCustoms({ exporterIec: st.exporterIec || "", intlHsCode: st.intlHsCode || "570242", intlCustomsDescription: st.intlCustomsDescription || "" });
  }, []);

  useEffect(() => { load().catch((e) => toast.error(errMsg(e, "Could not load settings"))); }, [load]);

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      const r = (await fn()) as { data?: { message?: string } } | undefined;
      toast.success(r?.data?.message && key.startsWith("test") ? r.data.message : ok);
      await load();
    } catch (e) {
      toast.error(errMsg(e, "Failed"));
    } finally {
      setBusy(null);
    }
  };

  const save = (c: Carrier) => {
    const cfg = CARRIERS[c];
    const body: Record<string, unknown> = {};
    for (const fld of cfg.fields) {
      const v = form[fld.key];
      if (fld.secret) { if (v && v !== MASK) body[fld.key] = v; }
      else body[fld.key] = v || null;
    }
    if (cfg.modeKey) body[cfg.modeKey] = form[cfg.modeKey];
    return run(`save-${c}`, () => api.put("/api/admin/site-settings", body), `${cfg.title} credentials saved`);
  };

  if (!s) {
    return <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-primary)] flex items-center gap-2"><Globe className="h-5 w-5 text-[var(--accent)]" /> International shipping</CardTitle>
          <p className="text-sm text-[var(--text-secondary)]">
            Nothing is booked automatically. On each international order page you pick FedEx, DHL or Easyship, compare live prices,
            buy the label, download the label + commercial invoice, and email tracking to the customer. Indian orders use Shiprocket.
          </p>
        </CardHeader>
      </Card>

      <WarehousesSettings />

      {(Object.keys(CARRIERS) as Carrier[]).map((c) => {
        const cfg = CARRIERS[c];
        const enabled = !!s[cfg.enabledKey];
        const saved = cfg.fields.some((f) => !!s[f.key]);
        return (
          <Card key={c} className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
                <Truck className="h-5 w-5 text-[var(--accent)]" /> {cfg.title}
                <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Enabled" : "Disabled"}</Badge>
                {cfg.modeKey && enabled && <Badge variant="outline">{s[cfg.modeKey] === "live" ? "Live" : "Sandbox"}</Badge>}
              </CardTitle>
              <p className="text-xs text-[var(--text-secondary)]">{cfg.help}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-[var(--border-color)] p-3">
                <Label className="text-[var(--text-primary)]">Use {cfg.title} for international orders</Label>
                <Switch checked={enabled} disabled={busy === `toggle-${c}`}
                  onCheckedChange={(v) => run(`toggle-${c}`, () => api.put("/api/admin/site-settings", { [cfg.enabledKey]: v }), `${cfg.title} ${v ? "enabled" : "disabled"}`)} />
              </div>
              {cfg.modeKey && (
                <div className="flex items-center gap-4">
                  <Label className="w-24 shrink-0 text-[var(--text-primary)]">Mode</Label>
                  <div className="flex gap-3">
                    {(["sandbox", "live"] as const).map((m) => (
                      <button key={m} type="button" onClick={() => setForm({ ...form, [cfg.modeKey!]: m })}
                        className={`rounded-md border px-4 py-1.5 text-sm font-medium ${form[cfg.modeKey!] === m ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border-color)] text-[var(--text-primary)]"}`}>
                        {m === "live" ? "Live" : "Sandbox"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {cfg.fields.map((fld) => (
                <div key={fld.key}>
                  <Label className="text-[var(--text-primary)]">{fld.label}</Label>
                  <div className="relative mt-1">
                    <Input
                      type={fld.secret && !reveal[fld.key] ? "password" : "text"}
                      value={form[fld.key] || ""}
                      placeholder={fld.placeholder || (fld.secret ? MASK : "")}
                      onChange={(e) => setForm({ ...form, [fld.key]: e.target.value })}
                    />
                    {fld.secret && (
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setReveal({ ...reveal, [fld.key]: !reveal[fld.key] })}>
                        {reveal[fld.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => save(c)} disabled={!!busy}>
                  {busy === `save-${c}` && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save {cfg.title}
                </Button>
                <Button variant="outline" disabled={!!busy || !saved} onClick={() => run(`test-${c}`, () => shipmentsApi.test(cfg.testCode), `${cfg.title} connected`)}>
                  {busy === `test-${c}` && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Test connection
                </Button>
                {saved && (
                  <Button variant="ghost" className="text-red-600 hover:text-red-700" disabled={!!busy}
                    onClick={() => window.confirm(`Remove saved ${cfg.title} credentials? It will be disabled. Existing shipments keep their labels.`) &&
                      run(`remove-${c}`, () => api.put("/api/admin/site-settings", { clearGateway: c }), `${cfg.title} credentials removed`)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Remove credentials
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-primary)]">Customs & exporter details</CardTitle>
          <p className="text-xs text-[var(--text-secondary)]">
            Printed on the commercial invoice for every international shipment. The shipper address, phone and GSTIN come from Settings → General — fill those in first.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-[var(--text-primary)]">IEC (Import Export Code)</Label>
              <Input className="mt-1" value={customs.exporterIec} onChange={(e) => setCustoms({ ...customs, exporterIec: e.target.value })} placeholder="10-digit IEC" />
            </div>
            <div>
              <Label className="text-[var(--text-primary)]">HS code</Label>
              <Input className="mt-1" value={customs.intlHsCode} onChange={(e) => setCustoms({ ...customs, intlHsCode: e.target.value })} placeholder="570242" />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">570242 = tufted carpets of man-made fibres; 570241 / 570231 for wool — confirm with your CHA.</p>
            </div>
          </div>
          <div>
            <Label className="text-[var(--text-primary)]">Customs description</Label>
            <Input className="mt-1" maxLength={70} value={customs.intlCustomsDescription} onChange={(e) => setCustoms({ ...customs, intlCustomsDescription: e.target.value })} placeholder="Hand-tufted wool rug" />
          </div>
          <Button disabled={!!busy} onClick={() => run("customs", () => api.put("/api/admin/site-settings", customs), "Customs details saved")}>
            {busy === "customs" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save customs details
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** Shiprocket webhook token (Settings → Shipping). Tracking updates without this token are rejected. */
export function ShiprocketWebhookSettings() {
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const webhookUrl = `${(import.meta.env.VITE_API_URL as string || "").replace(/\/+$/, "")}/api/webhooks/shiprocket/webhook`;

  useEffect(() => {
    api.get("/api/admin/site-settings").then((r) => {
      const t = r.data.data.settings.shiprocketWebhookToken || "";
      setToken(t);
      setSaved(!!t);
    }).catch(() => { });
  }, []);

  const save = async (value: string) => {
    setBusy(true);
    try {
      await api.put("/api/admin/site-settings", { shiprocketWebhookToken: value || null });
      setToken(value);
      setSaved(!!value);
      toast.success(value ? "Webhook token saved" : "Webhook token removed");
    } catch (e) {
      toast.error(errMsg(e, "Could not save"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
      <CardHeader>
        <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
          Shiprocket tracking webhook
          <Badge variant={saved ? "default" : "secondary"}>{saved ? "Secured" : "Not set"}</Badge>
        </CardTitle>
        <p className="text-xs text-[var(--text-secondary)]">
          Shipments are never created automatically — book them from each order page. To receive live courier status, add this URL in
          Shiprocket → Settings → API → Webhooks and put the same token in its “x-api-key” / token field.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-[var(--text-primary)]">Webhook URL</Label>
          <Input readOnly value={webhookUrl} className="mt-1 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        </div>
        <div>
          <Label className="text-[var(--text-primary)]">Token</Label>
          <div className="mt-1 flex gap-2">
            <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Any long random string" />
            <Button type="button" variant="outline" onClick={() => setToken(crypto.randomUUID().replace(/-/g, ""))}>Generate</Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button disabled={busy || !token.trim()} onClick={() => save(token.trim())}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save token</Button>
          {saved && <Button variant="ghost" className="text-red-600" disabled={busy} onClick={() => save("")}><Trash2 className="mr-1 h-4 w-4" />Remove</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
