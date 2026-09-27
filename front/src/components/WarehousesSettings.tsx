import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Star, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import { warehouses as warehousesApi } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Warehouse = {
  id: string; name: string; contactName: string; phone: string; email: string | null; street: string;
  city: string; state: string | null; postalCode: string; country: string; isDefault: boolean; isActive: boolean;
};
type Form = Omit<Warehouse, "id" | "email" | "state"> & { id?: string; email: string; state: string };

const EMPTY: Form = { name: "", contactName: "", phone: "", email: "", street: "", city: "", state: "", postalCode: "", country: "IN", isDefault: false, isActive: true };
const errMsg = (e: unknown, f: string) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || f;
const regionName = (code: string) => {
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code; } catch { return code; }
};

export default function WarehousesSettings() {
  const [list, setList] = useState<Warehouse[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => warehousesApi.list().then((r) => setList(r.data.data.warehouses)).catch((e) => toast.error(errMsg(e, "Could not load warehouses"))), []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form) return;
    setBusy("save");
    try {
      const { id, ...body } = form;
      if (id) await warehousesApi.update(id, body);
      else await warehousesApi.create(body);
      toast.success(id ? "Warehouse updated" : "Warehouse added");
      setForm(null);
      load();
    } catch (e) {
      toast.error(errMsg(e, "Could not save warehouse"));
    } finally {
      setBusy(null);
    }
  };

  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try { await fn(); toast.success(ok); load(); } catch (e) { toast.error(errMsg(e, "Failed")); } finally { setBusy(null); }
  };

  const field = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1" value={String(form?.[k] ?? "")} onChange={(e) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f))} {...props} />
    </div>
  );

  return (
    <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
      <CardHeader>
        <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
          <WarehouseIcon className="h-5 w-5 text-[var(--accent)]" /> Warehouses (ship-from locations)
        </CardTitle>
        <p className="text-xs text-[var(--text-secondary)]">
          Add every place you ship from — in India or abroad. On each order you pick the warehouse for FedEx, DHL, Easyship or manual shipments.
          With no warehouse, the store address from Settings → General is used. Shiprocket uses its own pickup addresses (Settings → Shipping).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {list === null ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : list.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No warehouses yet — shipments leave from your store address.</p>
        ) : (
          list.map((w) => (
            <div key={w.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--border-color)] p-3">
              <div className="min-w-0 text-sm">
                <p className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                  {w.name}
                  {w.isDefault && <Badge>Default</Badge>}
                  {!w.isActive && <Badge variant="secondary">Inactive</Badge>}
                </p>
                <p className="text-[var(--text-secondary)]">{[w.street, w.city, w.state, w.postalCode].filter(Boolean).join(", ")} · {regionName(w.country)}</p>
                <p className="text-xs text-[var(--text-secondary)]">{w.contactName} · {w.phone}</p>
              </div>
              <div className="flex gap-1">
                {!w.isDefault && (
                  <Button size="sm" variant="ghost" title="Make default" disabled={!!busy}
                    onClick={() => act(`def-${w.id}`, () => warehousesApi.update(w.id, { ...w, isDefault: true }), `${w.name} is now the default`)}>
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" title="Edit" disabled={!!busy}
                  onClick={() => setForm({ ...w, email: w.email || "", state: w.state || "" })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600" title="Delete" disabled={!!busy}
                  onClick={() => window.confirm(`Delete warehouse "${w.name}"? Past shipments keep their address.`) &&
                    act(`del-${w.id}`, () => warehousesApi.remove(w.id), "Warehouse deleted")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
        <Button variant="outline" onClick={() => setForm({ ...EMPTY, isDefault: !list?.length })}><Plus className="mr-1 h-4 w-4" /> Add warehouse</Button>
      </CardContent>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form?.id ? "Edit warehouse" : "Add warehouse"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">{field("name", "Warehouse name*", { placeholder: "e.g. Bhadohi workshop, New Jersey 3PL" })}</div>
              {field("contactName", "Contact person*")}
              {field("phone", "Phone*", { placeholder: "+91 …" })}
              <div className="sm:col-span-2">{field("email", "Email", { type: "email" })}</div>
              <div className="sm:col-span-2">{field("street", "Street address*")}</div>
              {field("city", "City*")}
              {field("state", "State / province", { placeholder: "2-letter code for US/CA, e.g. NJ" })}
              {field("postalCode", "Postal code*")}
              {field("country", "Country* (2-letter code or name)", { placeholder: "IN, US, GB…" })}
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Default ship-from location
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active (shown on orders)
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save} disabled={busy === "save"}>{busy === "save" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
