import { useState, useEffect } from "react";
import { addonServices } from "@/api/adminService";
import AddonSvgIcon from "@/components/AddonSvgIcon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface AddonService {
  id: string;
  name: string;
  description?: string;
  price: number;
  icon?: string;
  isActive: boolean;
}

type FormState = { name: string; description: string; price: string; icon: string; isActive: boolean };
const EMPTY: FormState = { name: "", description: "", price: "", icon: "", isActive: true };

// Common icons for rug/home addon services
const ICON_PRESETS = [
  { label: "Anti-Slip", icon: "🛡️" },
  { label: "Stain Resist", icon: "✨" },
  { label: "Wash", icon: "🧺" },
  { label: "Custom Size", icon: "📐" },
  { label: "Delivery", icon: "🚚" },
  { label: "Install", icon: "🔧" },
  { label: "Protect", icon: "🔒" },
  { label: "Gift Wrap", icon: "🎁" },
  { label: "Fragrance", icon: "🌸" },
  { label: "Repair", icon: "🪡" },
  { label: "Cleaning", icon: "🧹" },
  { label: "Padding", icon: "📦" },
];

export default function AddonServicesPage() {
  const [list, setList] = useState<AddonService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const fetchAll = async () => {
    try {
      const res = await addonServices.getAll();
      setList(res.data.data?.addons || []);
    } catch {
      toast.error("Failed to load addon services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const startEdit = (a: AddonService) => {
    setEditingId(a.id);
    setShowCreate(false);
    setShowIconPicker(false);
    setForm({ name: a.name, description: a.description || "", price: String(a.price), icon: a.icon || "", isActive: a.isActive });
  };

  const cancelEdit = () => { setEditingId(null); setForm(EMPTY); setShowIconPicker(false); };
  const cancelCreate = () => { setShowCreate(false); setForm(EMPTY); setShowIconPicker(false); };

  const handleSave = async (id?: string) => {
    if (!form.name.trim() || !form.price) { toast.error("Name and price required"); return; }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        description: form.description || undefined,
        price: parseFloat(form.price),
        icon: form.icon || undefined,
        isActive: form.isActive,
      };
      if (id) {
        await addonServices.update(id, data);
        toast.success("Updated");
        setEditingId(null);
      } else {
        await addonServices.create(data);
        toast.success("Created");
        setShowCreate(false);
      }
      setForm(EMPTY);
      setShowIconPicker(false);
      fetchAll();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this addon service?")) return;
    try {
      await addonServices.delete(id);
      toast.success("Deleted");
      setList((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error("Delete failed");
    }
  };

  const FormRow = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <div className="grid grid-cols-1 gap-3 p-4 rounded-lg border border-dashed border-primary/40 bg-muted/30">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Name *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Anti-Slip Mat" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Price (₹) *</Label>
          <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 5200" className="h-8 text-sm" min="0" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description shown to customer" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Icon (emoji)</Label>
          <div className="flex gap-2">
            <Input
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="emoji or leave blank"
              className="h-8 text-sm flex-1"
              maxLength={8}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2 text-xs"
              onClick={() => setShowIconPicker((v) => !v)}
            >
              Pick
            </Button>
          </div>
          {showIconPicker && (
            <div className="flex flex-wrap gap-1.5 mt-2 p-2 rounded border bg-background">
              {ICON_PRESETS.map((p) => (
                <button
                  key={p.icon}
                  type="button"
                  title={p.label}
                  onClick={() => { setForm((f) => ({ ...f, icon: p.icon })); setShowIconPicker(false); }}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded hover:bg-muted text-center transition-colors ${form.icon === p.icon ? "bg-muted ring-1 ring-primary" : ""}`}
                >
                  <AddonSvgIcon icon={p.icon} size={24} className="text-gray-700" />
                  <span className="text-[10px] text-muted-foreground">{p.label}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setForm((f) => ({ ...f, icon: "" })); setShowIconPicker(false); }}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded hover:bg-muted text-center transition-colors text-muted-foreground"
              >
                <span className="text-xl">✕</span>
                <span className="text-[10px]">None</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4" />
        <Label htmlFor="isActive" className="text-xs cursor-pointer">Active (visible to customers)</Label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving} className="h-7 text-xs">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 text-xs">
          <X className="h-3 w-3" /> Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Addon Services</h1>
          <p className="text-sm text-muted-foreground">Optional paid services customers can add to their order (e.g. Anti-Slip Mat, Stain Resistance Coating)</p>
        </div>
        <Button size="sm" onClick={() => { setShowCreate(true); setEditingId(null); setForm(EMPTY); }}>
          <Plus className="h-4 w-4 mr-1" /> New Addon
        </Button>
      </div>

      {showCreate && <FormRow onSave={() => handleSave()} onCancel={cancelCreate} />}

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No addon services yet. Create one to get started.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Icon</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Description</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Price</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((addon) => (
                <>
                  <tr key={addon.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      {addon.icon ? <AddonSvgIcon icon={addon.icon} size={22} className="text-gray-700" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-sm">{addon.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{addon.description || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">₹{parseFloat(String(addon.price)).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={addon.isActive ? "default" : "secondary"} className="text-xs">
                        {addon.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(addon)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(addon.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {editingId === addon.id && (
                    <tr key={`edit-${addon.id}`} className="border-b bg-muted/10">
                      <td colSpan={6} className="px-4 py-3">
                        <FormRow onSave={() => handleSave(addon.id)} onCancel={cancelEdit} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
