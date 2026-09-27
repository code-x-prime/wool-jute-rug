import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Truck, Loader2, FileText, Download, ExternalLink, RefreshCw, Mail, XCircle, CheckCircle, AlertTriangle, Copy, History,
} from "lucide-react";
import { shipments as shipmentsApi } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

type Carrier = { code: string; name: string; scope: "domestic" | "international" | "any"; ready: boolean; mode: string | null };
type Rate = { serviceCode: string; serviceName: string; amount: number; currency: string; amountInr: number | null; amountStore: number | null; transit: string | null; deliveryDate: string | null; cod?: boolean };
type Parcel = { weightKg: number; lengthCm: number; widthCm: number; heightCm: number };
type Place = { id: string; name: string; city: string; country?: string; pincode?: string; isDefault: boolean };
type FromLocation = { label?: string; city?: string; countryCode?: string; postalCode?: string } | null;
type Shipment = {
  id: string; carrier: string; serviceName: string | null; status: string; trackingNumber: string | null; trackingUrl: string | null;
  cost: string | null; costCurrency: string | null; costInr: string | null; weightKg: number | null;
  lastTrackingStatus: string | null; trackingEvents: { delivered?: boolean; events: { date: string; description: string; location?: string }[] } | null;
  trackedAt: string | null; customerNotifiedAt: string | null; cancelledAt: string | null; cancelNote: string | null; createdAt: string;
  hasLabel: boolean; hasInvoice: boolean; fromLocation: FromLocation;
};

const errMsg = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
const fmtDate = (d?: string | null) =>
  d ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d)) : "";

export default function ShipmentPanel({
  orderId, orderStatus, paymentMethod, onChanged,
}: { orderId: string; orderStatus: string; paymentMethod?: string; onChanged: () => void }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Shipment[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [isIntl, setIsIntl] = useState<boolean | null>(null);
  const [charged, setCharged] = useState(0);
  const [orderCurrency, setOrderCurrency] = useState("INR");
  const [inrPerUnit, setInrPerUnit] = useState(1);
  const [warehouses, setWarehouses] = useState<Place[]>([]);
  const [pickups, setPickups] = useState<Place[]>([]);
  const [fromId, setFromId] = useState("");

  const [carrier, setCarrier] = useState("");
  const [parcel, setParcel] = useState<Partial<Parcel>>({});
  const [rates, setRates] = useState<Rate[] | null>(null);
  const [ratesError, setRatesError] = useState("");
  const [loadingRates, setLoadingRates] = useState(false);
  const [selected, setSelected] = useState<Rate | null>(null);
  const [notify, setNotify] = useState(true);
  const [booking, setBooking] = useState(false);
  const [manual, setManual] = useState({ courierName: "", trackingNumber: "", trackingUrl: "", cost: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await shipmentsApi.forOrder(orderId);
      const d = r.data.data;
      setList(d.shipments);
      setCarriers(d.carriers);
      setIsIntl(d.isInternational);
      setCharged(d.chargedToCustomer || 0);
      setOrderCurrency(d.currency || "INR");
      setInrPerUnit(d.inrPerUnit || 1);
      setWarehouses(d.warehouses || []);
      setPickups(d.shiprocketPickups || []);
    } catch (e) {
      toast.error(errMsg(e, "Could not load shipments"));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const active = list.find((s) => s.status === "CREATED" || s.status === "CREATING");
  const history = list.filter((s) => s !== active);
  const usable = useMemo(
    () => carriers.filter((c) => c.scope === "any" || isIntl === null || (isIntl ? c.scope === "international" : c.scope === "domestic")),
    [carriers, isIntl],
  );
  const canShip = !["CANCELLED", "REFUNDED", "DELIVERED"].includes(orderStatus) && !(orderStatus === "PENDING" && paymentMethod !== "CASH");

  useEffect(() => {
    if (!carrier) {
      const first = usable.find((c) => c.ready && c.code !== "MANUAL") || usable.find((c) => c.code === "MANUAL");
      if (first) setCarrier(first.code);
    }
  }, [usable, carrier]);

  const fromOptions = carrier === "SHIPROCKET" ? pickups : warehouses;
  useEffect(() => {
    const def = fromOptions.find((p) => p.isDefault) || fromOptions[0];
    setFromId(def?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrier, warehouses, pickups]);

  const chooseCarrier = (code: string) => {
    setCarrier(code);
    setRates(null);
    setSelected(null);
    setRatesError("");
  };

  const getRates = async () => {
    setLoadingRates(true);
    setRatesError("");
    setRates(null);
    setSelected(null);
    try {
      const r = await shipmentsApi.rates(orderId, carrier, parcel, fromId || undefined);
      setRates(r.data.data.rates);
      if (r.data.data.parcel) setParcel(r.data.data.parcel);
      if (!r.data.data.rates.length) setRatesError("No services available for this destination and parcel.");
    } catch (e) {
      setRatesError(errMsg(e, "Could not fetch rates"));
    } finally {
      setLoadingRates(false);
    }
  };

  const book = async () => {
    const carrierName = carriers.find((c) => c.code === carrier)?.name;
    const price = selected ? ` for ${selected.amountStore != null ? formatCurrency(selected.amountStore, orderCurrency) : `${selected.currency} ${selected.amount}`}` : "";
    if (carrier !== "MANUAL" && !window.confirm(`Buy a ${selected?.serviceName || carrierName} label${price}? The carrier will charge your account.`)) return;
    setBooking(true);
    try {
      await shipmentsApi.create(orderId, carrier === "MANUAL"
        ? { carrier, fromId: fromId || undefined, manual: { ...manual, cost: manual.cost ? Number(manual.cost) : undefined }, notifyCustomer: notify }
        : { carrier, fromId: fromId || undefined, serviceCode: selected?.serviceCode, serviceName: selected?.serviceName, amount: selected?.amount, currency: selected?.currency, parcel, notifyCustomer: notify });
      toast.success(notify ? "Shipment created — tracking emailed to the customer" : "Shipment created");
      setRates(null);
      setSelected(null);
      setManual({ courierName: "", trackingNumber: "", trackingUrl: "", cost: "" });
      await load();
      onChanged();
    } catch (e) {
      toast.error(errMsg(e, "Could not create shipment"));
      load();
    } finally {
      setBooking(false);
    }
  };

  const act = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(success);
      await load();
    } catch (e) {
      toast.error(errMsg(e, "Action failed"));
    } finally {
      setBusy(null);
    }
  };

  const openDocument = async (s: Shipment, kind: "label" | "invoice") => {
    setBusy(`${kind}-${s.id}`);
    try {
      const r = await shipmentsApi.document(s.id, kind);
      const blob: Blob = r.data;
      if (blob.type.includes("json")) {
        const json = JSON.parse(await blob.text());
        window.open(json.data.url, "_blank", "noopener");
      } else {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch (e) {
      let msg = `Could not open the ${kind}`;
      const data = (e as { response?: { data?: Blob } })?.response?.data;
      if (data instanceof Blob) {
        try { msg = JSON.parse(await data.text()).message || msg; } catch { /* keep default */ }
      }
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const money = (n: number) => formatCurrency(n, orderCurrency);
  const costInOrderCurrency = (s: Shipment) => (s.costInr != null ? Number(s.costInr) / inrPerUnit : null);
  const carrierName = (code: string) => carriers.find((c) => c.code === code)?.name || code;
  const costLine = (s: Shipment) =>
    s.costInr != null ? money(costInOrderCurrency(s)!) : s.cost != null ? `${s.costCurrency} ${Number(s.cost).toFixed(2)}` : "—";

  return (
    <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
      <CardHeader className="px-6 pt-6 pb-4">
        <CardTitle className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Truck className="h-5 w-5 text-[var(--accent)]" />
          Shipping
          {isIntl !== null && (
            <Badge className={cn("text-xs border", isIntl ? "bg-purple-500/10 text-purple-700 border-purple-400/30" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]")}>
              {isIntl ? "International" : "Domestic"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : active ? (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-5 w-5" /> {carrierName(active.carrier)}
              </div>
              <span className="text-xs text-[var(--text-secondary)]">{fmtDate(active.createdAt)}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {active.fromLocation && (
                <>
                  <span className="text-[var(--text-secondary)]">Ships from</span>
                  <span className="text-[var(--text-primary)]">
                    {active.fromLocation.label}{active.fromLocation.city ? ` · ${active.fromLocation.city}` : ""}{active.fromLocation.countryCode ? `, ${active.fromLocation.countryCode}` : ""}
                  </span>
                </>
              )}
              <span className="text-[var(--text-secondary)]">Service</span>
              <span className="text-[var(--text-primary)]">{active.serviceName || "—"}</span>
              <span className="text-[var(--text-secondary)]">Tracking / AWB</span>
              <span className="flex items-center gap-1 font-mono text-[var(--text-primary)]">
                {active.trackingNumber || "—"}
                {active.trackingNumber && (
                  <button type="button" title="Copy" onClick={() => { navigator.clipboard.writeText(active.trackingNumber!); toast.success("Copied"); }}>
                    <Copy className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                  </button>
                )}
              </span>
              <span className="text-[var(--text-secondary)]">Courier cost</span>
              <span className="text-[var(--text-primary)] font-medium">{costLine(active)}</span>
              <span className="text-[var(--text-secondary)]">Customer paid for shipping</span>
              <span className="text-[var(--text-primary)]">{money(charged)}</span>
              {active.costInr != null && (
                <>
                  <span className="text-[var(--text-secondary)]">Shipping margin</span>
                  <span className={cn("font-medium", charged - costInOrderCurrency(active)! < 0 ? "text-[var(--destructive)]" : "text-emerald-600")}>
                    {money(charged - costInOrderCurrency(active)!)}
                  </span>
                </>
              )}
              {active.weightKg != null && (
                <>
                  <span className="text-[var(--text-secondary)]">Billed weight</span>
                  <span className="text-[var(--text-primary)]">{active.weightKg} kg</span>
                </>
              )}
            </div>

            {active.lastTrackingStatus && (
              <div className="rounded-md bg-[var(--bg-secondary)] p-3 text-sm">
                <p className="font-medium text-[var(--text-primary)]">{active.lastTrackingStatus}</p>
                {active.trackedAt && <p className="text-xs text-[var(--text-secondary)]">Checked {fmtDate(active.trackedAt)}</p>}
                {active.trackingEvents?.events?.slice(0, 5).map((ev, i) => (
                  <p key={i} className="mt-1 text-xs text-[var(--text-secondary)]">
                    {ev.date} · {ev.description}{ev.location ? ` · ${ev.location}` : ""}
                  </p>
                ))}
                {active.trackingEvents?.delivered && orderStatus !== "DELIVERED" && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">Carrier reports delivered — mark the order as Delivered when you're ready.</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {active.hasLabel && (
                <Button size="sm" variant="outline" disabled={busy === `label-${active.id}`} onClick={() => openDocument(active, "label")}>
                  {busy === `label-${active.id}` ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />} Label
                </Button>
              )}
              {active.hasInvoice && (
                <Button size="sm" variant="outline" disabled={busy === `invoice-${active.id}`} onClick={() => openDocument(active, "invoice")}>
                  {busy === `invoice-${active.id}` ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileText className="mr-1 h-4 w-4" />} Invoice
                </Button>
              )}
              {active.trackingUrl && (
                <Button size="sm" variant="outline" onClick={() => window.open(active.trackingUrl!, "_blank", "noopener")}>
                  <ExternalLink className="mr-1 h-4 w-4" /> Track
                </Button>
              )}
              {active.carrier !== "MANUAL" && (
                <Button size="sm" variant="outline" disabled={busy === "track"} onClick={() => act("track", () => shipmentsApi.track(active.id), "Tracking updated")}>
                  <RefreshCw className={cn("mr-1 h-4 w-4", busy === "track" && "animate-spin")} /> Refresh status
                </Button>
              )}
              <Button size="sm" variant="outline" disabled={busy === "notify"}
                onClick={() => act("notify", () => shipmentsApi.notify(active.id), "Tracking email sent")}>
                <Mail className="mr-1 h-4 w-4" /> {active.customerNotifiedAt ? "Resend email" : "Email customer"}
              </Button>
              <Button size="sm" variant="outline" className="text-[var(--destructive)] border-[var(--destructive)]/40" disabled={busy === "cancel"}
                onClick={() => {
                  const note = window.prompt("Cancel this shipment? The label will be voided with the carrier where possible.\n\nReason (optional):");
                  if (note === null) return;
                  act("cancel", () => shipmentsApi.cancel(active.id, note || undefined), "Shipment cancelled").then(onChanged);
                }}>
                <XCircle className="mr-1 h-4 w-4" /> Cancel shipment
              </Button>
            </div>
            {active.customerNotifiedAt && <p className="text-xs text-[var(--text-secondary)]">Customer emailed {fmtDate(active.customerNotifiedAt)}</p>}
          </div>
        ) : !canShip ? (
          <p className="text-sm text-[var(--text-secondary)]">
            {orderStatus === "PENDING" ? "Payment is not confirmed yet — shipping is locked until the order is paid." : `Order is ${orderStatus.toLowerCase()} — no shipment needed.`}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {usable.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => chooseCarrier(c.code)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    carrier === c.code ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-medium" : "border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
                    !c.ready && "opacity-60",
                  )}
                >
                  {c.name}{c.mode === "sandbox" ? " (test)" : ""}{!c.ready ? " · not set up" : ""}
                </button>
              ))}
            </div>

            {carrier && carriers.find((c) => c.code === carrier)?.ready && (
              <div>
                <Label className="text-xs">Ship from</Label>
                {fromOptions.length ? (
                  <select
                    value={fromId}
                    onChange={(e) => { setFromId(e.target.value); setRates(null); setSelected(null); }}
                    className="mt-1 h-9 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] px-2 text-sm text-[var(--text-primary)]"
                  >
                    {fromOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.city}{p.country ? `, ${p.country}` : ""}{p.pincode ? ` ${p.pincode}` : ""}{p.isDefault ? " (default)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {carrier === "SHIPROCKET" ? (
                      <>No pickup address yet — <Link to="/site-settings?tab=shipping" className="underline">add one in Settings → Shipping</Link>.</>
                    ) : (
                      <>Store address from Settings → General. <Link to="/site-settings?tab=intl-shipping" className="underline">Add warehouses</Link> to ship from other locations.</>
                    )}
                  </p>
                )}
              </div>
            )}

            {carrier && !carriers.find((c) => c.code === carrier)?.ready ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
                {carrierName(carrier)} is not set up or is disabled.{" "}
                <Link to={isIntl ? "/site-settings?tab=intl-shipping" : "/site-settings?tab=shipping"} className="font-medium underline">Open settings</Link>
              </div>
            ) : carrier === "MANUAL" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label className="text-xs">Courier name*</Label><Input value={manual.courierName} onChange={(e) => setManual({ ...manual, courierName: e.target.value })} placeholder="e.g. India Post, Aramex" className="mt-1" /></div>
                <div><Label className="text-xs">Tracking number*</Label><Input value={manual.trackingNumber} onChange={(e) => setManual({ ...manual, trackingNumber: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Tracking link</Label><Input value={manual.trackingUrl} onChange={(e) => setManual({ ...manual, trackingUrl: e.target.value })} placeholder="https://…" className="mt-1" /></div>
                <div><Label className="text-xs">What you paid the courier (₹)</Label><Input type="number" min={0} value={manual.cost} onChange={(e) => setManual({ ...manual, cost: e.target.value })} className="mt-1" /></div>
              </div>
            ) : carrier ? (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {([["weightKg", "Weight kg"], ["lengthCm", "L cm"], ["widthCm", "W cm"], ["heightCm", "H cm"]] as [keyof Parcel, string][]).map(([k, label]) => (
                    <div key={k}>
                      <Label className="text-xs">{label}</Label>
                      <Input type="number" min={0} step="0.1" value={parcel[k] ?? ""} placeholder="auto"
                        onChange={(e) => { setParcel({ ...parcel, [k]: e.target.value === "" ? undefined : Number(e.target.value) }); setRates(null); setSelected(null); }}
                        className="mt-1 h-9" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">Leave blank to use product shipping dimensions. Rates change with the packed parcel size.</p>
                <Button size="sm" variant="outline" onClick={getRates} disabled={loadingRates}>
                  {loadingRates ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Get {carrierName(carrier)} rates
                </Button>
                {ratesError && (
                  <div className="flex items-start gap-2 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {ratesError}
                  </div>
                )}
                {rates && rates.length > 0 && (
                  <div className="space-y-2">
                    {rates.map((r) => (
                      <label key={r.serviceCode} className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                        selected?.serviceCode === r.serviceCode ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border-color)] hover:bg-[var(--bg-secondary)]",
                      )}>
                        <input type="radio" name="rate" checked={selected?.serviceCode === r.serviceCode} onChange={() => setSelected(r)} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{r.serviceName}</p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {[r.transit, r.deliveryDate && `by ${r.deliveryDate}`, r.cod && "COD"].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{r.amountStore != null ? money(r.amountStore) : `${r.currency} ${r.amount}`}</p>
                          {r.currency !== orderCurrency && <p className="text-xs text-[var(--text-secondary)]">{r.currency} {r.amount}</p>}
                        </div>
                      </label>
                    ))}
                    <p className="text-xs text-[var(--text-secondary)]">Customer paid {money(charged)} for shipping on this order.</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No carriers available. Set one up in Settings.</p>
            )}

            {carrier && carriers.find((c) => c.code === carrier)?.ready && (
              <>
                <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                  <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email tracking details to the customer
                </label>
                <Button className="w-full" onClick={book}
                  disabled={booking || (carrier === "MANUAL" ? !manual.courierName.trim() || !manual.trackingNumber.trim() : !selected)}>
                  {booking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating shipment…</> : carrier === "MANUAL" ? "Save shipment" : "Buy label & create shipment"}
                </Button>
              </>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <History className="h-3.5 w-3.5" /> {history.length} earlier shipment{history.length === 1 ? "" : "s"}
            </button>
            {showHistory && (
              <div className="mt-2 space-y-2">
                {history.map((s) => (
                  <div key={s.id} className="rounded-md border border-[var(--border-color)] p-2 text-xs text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">{carrierName(s.carrier)}</span> · {s.trackingNumber || "no AWB"} · {costLine(s)} · cancelled {fmtDate(s.cancelledAt)}
                    {s.cancelNote && <p className="mt-0.5">{s.cancelNote}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
