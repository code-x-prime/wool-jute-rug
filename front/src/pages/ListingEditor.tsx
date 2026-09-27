import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronRight,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  GripVertical,
  Info,
  ChevronDown,
  Lightbulb,
  Video,
} from "lucide-react";
import {
  products,
  categories as categoriesApi,
  attributes as attributesApi,
  attributeValues as attributeValuesApi,
  listings,
  deliveryProfiles as deliveryApi,
  returnPolicies as returnApi,
} from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* ───────────────────────── types ───────────────────────── */

type Photo = { key: string; url: string; kind: "existing" | "variant" | "new"; id?: string; file?: File };
type VideoSlot = { url: string; file?: File } | null;
type VarOption = { valueId?: string; value: string; photoKey?: string | null };
type Variation = { key: string; attributeId?: string; name: string; linkPhotos: boolean; options: VarOption[] };
type VaryField = "prices" | "processing" | "quantities" | "skus";
type VarySetting = { on: boolean; by: string }; // by: "all" | variation.key
type Row = {
  key: string;
  id: string;
  valueIds: string[];
  values: Record<string, string>; // variation.key -> option value
  sku: string;
  price: string;
  priceUS: string;
  priceIntl: string;
  quantity: string;
  procMin: string;
  procMax: string;
  isActive: boolean;
  photoKeys: string[]; // explicit per-row photos (legacy variant images)
  passthrough: Record<string, unknown>;
};
type CustomField = { label: string; fieldType: "TEXT" | "IMAGE"; required: boolean; maxLength: string };
type DeliveryProfile = {
  id: string;
  name: string;
  pricingType: "FIXED" | "FREE";
  originPincode?: string | null;
  domesticCost: string | number;
  internationalCost?: string | number | null;
  minDeliveryDays?: number | null;
  maxDeliveryDays?: number | null;
  _count?: { products: number };
};
type ReturnPolicy = {
  id: string;
  name: string;
  acceptReturns: boolean;
  acceptExchanges: boolean;
  windowDays: number;
  buyerPaysReturnShipping: boolean;
};
type Category = { id: string; name: string; parentId?: string | null };
type Attribute = { id: string; name: string };
type AttrValue = { id: string; value: string };

/* ───────────────────────── constants ───────────────────────── */

const SECTIONS = [
  { id: "photos", label: "Photo & Video" },
  { id: "details", label: "Item Details" },
  { id: "options", label: "Item Options" },
  { id: "pricing", label: "Pricing & Delivery" },
  { id: "made", label: "How It's Made" },
  { id: "settings", label: "Settings" },
];
const MAX_PHOTOS = 20;
const MAX_TAGS = 13;
const MAX_MATERIALS = 5;
const MAX_VARIATIONS = 3;
const MAX_CUSTOM_FIELDS = 5;
const TITLE_MAX = 140;
const MAX_FILE = 10 * 1024 * 1024;
const MATERIAL_SUGGESTIONS = [
  "Wool", "New Zealand wool", "Jute", "Cotton", "Silk", "Bamboo silk", "Viscose", "Polyester", "Nylon",
  "Polypropylene", "Acrylic", "Linen", "Hemp", "Sisal", "Seagrass", "Leather", "Latex", "Chenille",
  "Tencel", "Recycled PET", "Felt", "Rubber", "Canvas", "Mohair", "Cashmere", "Alpaca",
];
const BUYER_TIPS = ["Product type", "Size", "Style", "Colour", "Material", "Technique", "Pattern", "Shape", "Origin", "Care", "Pile height", "Condition", "Backing", "Dyes", "Usage"];
const RETURN_WINDOWS = [7, 14, 21, 30, 45, 60, 90];
const WHO_MADE = ["I did", "A member of my shop", "Another company or person"];
const WHAT_IS_IT = ["A finished product", "A supply or tool to make things"];
const WHEN_MADE = ["Made to order", "2020 – 2026", "2010 – 2019", "2000 – 2009", "Before 2000"];
const STOREFRONT_URL = (import.meta.env.VITE_STOREFRONT_URL as string | undefined) || "http://localhost:3000";

/* ───────────────────────── helpers ───────────────────────── */

let keySeq = 0;
const newKey = (p: string) => `${p}-${Date.now().toString(36)}-${(keySeq++).toString(36)}`;
const comboKey = (ids: string[]) => [...ids].sort().join("|");
const apiMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const htmlToText = (html: string) => {
  if (!html) return "";
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ");
  const doc = new DOMParser().parseFromString(withBreaks, "text/html");
  return (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
};
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const textToHtml = (text: string) =>
  text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");

const cartesian = (lists: VarOption[][]): VarOption[][] =>
  lists.reduce<VarOption[][]>((acc, list) => acc.flatMap((combo) => list.map((o) => [...combo, o])), [[]]);

const num = (v: string) => (v === "" || v === undefined || v === null ? NaN : Number(v));
const money = (v: unknown) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

/* ───────────────────────── small UI pieces ───────────────────────── */

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section id={`listing-${id}`} data-listing-section={id} className="scroll-mt-44 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 md:p-8">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
      <div className="mt-6 space-y-8">{children}</div>
    </section>
  );
}

function FieldLabel({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div className="mb-2">
      <p className="text-base font-semibold text-[var(--text-primary)]">
        {children}
        {required && "*"}
      </p>
      {hint && <p className="text-sm text-[var(--text-secondary)]">{hint}</p>}
    </div>
  );
}

function PillButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--text-primary)] px-4 py-1.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:border-[var(--border-color)] disabled:text-[var(--text-secondary)]"
    >
      {children}
    </button>
  );
}

function ToggleRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Switch checked={checked} onCheckedChange={onChange} />
      <div className="text-sm text-[var(--text-primary)]">{children}</div>
    </div>
  );
}

/* ───────────────────────── main ───────────────────────── */

export default function ListingEditor({ mode, productId }: { mode: "create" | "edit"; productId?: string }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState<null | "draft" | "publish">(null);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const scrollLock = useRef(0);

  // reference data
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allAttributes, setAllAttributes] = useState<Attribute[]>([]);
  const [attrValues, setAttrValues] = useState<Record<string, AttrValue[]>>({});
  const [profiles, setProfiles] = useState<DeliveryProfile[]>([]);
  const [policies, setPolicies] = useState<ReturnPolicy[]>([]);

  // listing state
  const [slug, setSlug] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [videos, setVideos] = useState<[VideoSlot, VideoSlot]>([null, null]);
  const [removedVideos, setRemovedVideos] = useState<[boolean, boolean]>([false, false]);
  const [categoryId, setCategoryId] = useState("");
  const [originalCategoryIds, setOriginalCategoryIds] = useState<string[]>([]);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [originalDescriptionHtml, setOriginalDescriptionHtml] = useState<string | null>(null);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [vary, setVary] = useState<Record<VaryField, VarySetting>>({
    prices: { on: false, by: "all" },
    processing: { on: false, by: "all" },
    quantities: { on: false, by: "all" },
    skus: { on: false, by: "all" },
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [globalPricing, setGlobalPricing] = useState(false);
  const [base, setBase] = useState({ price: "", priceUS: "", priceIntl: "", quantity: "1", sku: "", procMin: "", procMax: "" });
  const [allowRestock, setAllowRestock] = useState(false);
  const [deliveryProfileId, setDeliveryProfileId] = useState("");
  const [returnPolicyId, setReturnPolicyId] = useState("");
  const [whoMade, setWhoMade] = useState("");
  const [whatIsIt, setWhatIsIt] = useState("");
  const [whenMade, setWhenMade] = useState("");
  const [featured, setFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // ui state
  const [dragging, setDragging] = useState(false);
  const [dragPhotoIdx, setDragPhotoIdx] = useState<number | null>(null);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [materialQuery, setMaterialQuery] = useState("");
  const [materialOpen, setMaterialOpen] = useState(false);
  const [variationStep, setVariationStep] = useState<null | "pick" | "edit" | "manage">(null);
  const [draftVariations, setDraftVariations] = useState<Variation[]>([]);
  const [draftVary, setDraftVary] = useState(vary);
  const [editingVar, setEditingVar] = useState<Variation | null>(null);
  const [optionInput, setOptionInput] = useState("");
  const [photoPicker, setPhotoPicker] = useState<null | { target: "option"; optionIndex: number } | { target: "row"; rowKey: string }>(null);
  const [applyingVariations, setApplyingVariations] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [profileDialog, setProfileDialog] = useState<null | Partial<DeliveryProfile>>(null);
  const [profilePicker, setProfilePicker] = useState(false);
  const [policyDialog, setPolicyDialog] = useState<null | Partial<ReturnPolicy>>(null);
  const [policyPicker, setPolicyPicker] = useState(false);
  const [showPostage, setShowPostage] = useState(false);
  const [dialogBusy, setDialogBusy] = useState(false);

  const hasVariations = variations.length > 0;

  /* ── reference data ── */
  const loadProfiles = useCallback(() => deliveryApi.list().then((r) => setProfiles(r.data.data?.profiles || [])), []);
  const loadPolicies = useCallback(() => returnApi.list().then((r) => setPolicies(r.data.data?.policies || [])), []);

  useEffect(() => {
    categoriesApi.getCategories().then((r) => setAllCategories(r.data.data?.categories || [])).catch(() => toast.error("Failed to load categories"));
    attributesApi.getAttributes().then((r) => setAllAttributes(r.data.data?.attributes || [])).catch(() => { /* optional */ });
    loadProfiles().catch(() => toast.error("Failed to load delivery profiles"));
    loadPolicies().catch(() => toast.error("Failed to load return policies"));
  }, [loadProfiles, loadPolicies]);

  const ensureAttrValues = useCallback(async (attributeId: string) => {
    if (attrValues[attributeId]) return attrValues[attributeId];
    const r = await attributesApi.getAttributeValues(attributeId);
    const vals: AttrValue[] = r.data.data?.values || [];
    setAttrValues((p) => ({ ...p, [attributeId]: vals }));
    return vals;
  }, [attrValues]);

  /* ── load existing listing ── */
  useEffect(() => {
    if (mode !== "edit" || !productId) return;
    (async () => {
      try {
        const r = await listings.get(productId);
        const p = r.data.data.product;
        setSlug(p.slug);
        setTitle(p.name || "");
        setOriginalDescriptionHtml(p.description || "");
        setDescription(htmlToText(p.description || ""));
        const cats: { id: string; isPrimary: boolean }[] = p.categories || [];
        setOriginalCategoryIds(cats.map((c) => c.id));
        setCategoryId((cats.find((c) => c.isPrimary) || cats[0])?.id || "");
        setTags(p.tags || []);
        setMaterials(p.materials || []);
        setGlobalPricing(!!p.globalPricing);
        setAllowRestock(!!p.allowRestockRequests);
        setDeliveryProfileId(p.deliveryProfileId || "");
        setReturnPolicyId(p.returnPolicyId || "");
        setWhoMade(p.whoMade || "");
        setWhatIsIt(p.whatIsIt || "");
        setWhenMade(p.whenMade || "");
        setFeatured(!!p.featured);
        setIsActive(!!p.isActive);
        setCustomFields(
          (p.customFields || []).map((f: { label: string; fieldType: string; required: boolean; maxLength: number | null }) => ({
            label: f.label,
            fieldType: f.fieldType === "IMAGE" ? "IMAGE" : "TEXT",
            required: f.required,
            maxLength: f.maxLength ? String(f.maxLength) : "",
          }))
        );
        setVideos([p.videoUrl ? { url: p.videoUrl } : null, p.videoUrl2 ? { url: p.videoUrl2 } : null]);

        // photos: product gallery first, then variant-only images
        const loadedPhotos: Photo[] = (p.images || []).map((img: { id: string; url: string }) => ({
          key: newKey("ph"), url: img.url, kind: "existing" as const, id: img.id,
        }));
        const urlToKey = new Map(loadedPhotos.map((ph) => [ph.url, ph.key]));
        for (const v of p.variants || []) {
          for (const img of v.images || []) {
            if (!urlToKey.has(img.url)) {
              const ph: Photo = { key: newKey("ph"), url: img.url, kind: "variant" };
              loadedPhotos.push(ph);
              urlToKey.set(img.url, ph.key);
            }
          }
        }
        setPhotos(loadedPhotos.slice(0, MAX_PHOTOS));

        type ApiVariant = {
          id: string; sku: string; price: string; salePrice: string | null; quantity: number; isActive: boolean;
          priceUS: string | null; priceIntl: string | null; processingMinDays: number | null; processingMaxDays: number | null;
          images: { url: string }[]; attributes: { attributeId: string; attribute: string; attributeValueId: string; value: string }[];
          shippingLength: number | null; shippingBreadth: number | null; shippingHeight: number | null; shippingWeight: number | null;
          pricingSlabs?: { minQty: number; maxQty: number | null; price: string }[];
        };
        const variants: ApiVariant[] = p.variants || [];
        const passthrough = (v: ApiVariant) => ({
          salePrice: v.salePrice,
          shippingLength: v.shippingLength,
          shippingBreadth: v.shippingBreadth,
          shippingHeight: v.shippingHeight,
          shippingWeight: v.shippingWeight,
          pricingSlabs: v.pricingSlabs?.map((s) => ({ minQty: s.minQty, maxQty: s.maxQty, price: Number(s.price) })),
        });
        setBase((b) => ({ ...b, procMin: p.processingMinDays?.toString() ?? "", procMax: p.processingMaxDays?.toString() ?? "" }));

        const withAttrs = p.hasVariants ? variants.filter((v) => v.attributes.length > 0) : [];
        if (withAttrs.length === 0) {
          const v = variants[0];
          if (v) {
            setBase((b) => ({
              ...b,
              price: String(Number(v.price)),
              priceUS: v.priceUS ? String(Number(v.priceUS)) : "",
              priceIntl: v.priceIntl ? String(Number(v.priceIntl)) : "",
              quantity: String(v.quantity ?? 0),
              sku: v.sku || "",
            }));
            setRows([{
              key: "default", id: v.id, valueIds: [], values: {}, sku: v.sku || "", price: String(Number(v.price)),
              priceUS: v.priceUS ? String(Number(v.priceUS)) : "", priceIntl: v.priceIntl ? String(Number(v.priceIntl)) : "",
              quantity: String(v.quantity ?? 0), procMin: "", procMax: "", isActive: v.isActive, photoKeys: [], passthrough: passthrough(v),
            }]);
          }
          setLoading(false);
          return;
        }

        // rebuild variations from variant attributes
        const varMap = new Map<string, Variation>();
        for (const v of withAttrs) {
          for (const a of v.attributes) {
            let vr = varMap.get(a.attributeId);
            if (!vr) {
              vr = { key: a.attributeId, attributeId: a.attributeId, name: a.attribute, linkPhotos: false, options: [] };
              varMap.set(a.attributeId, vr);
            }
            if (!vr.options.some((o) => o.valueId === a.attributeValueId)) {
              vr.options.push({ valueId: a.attributeValueId, value: a.value, photoKey: null });
            }
          }
        }
        const vars = [...varMap.values()].slice(0, MAX_VARIATIONS);

        // detect a variation whose options map consistently to one photo
        let linkedVar: Variation | null = null;
        for (const vr of vars) {
          const optionPhoto = new Map<string, string | null>();
          let consistent = true;
          for (const v of withAttrs) {
            const valId = v.attributes.find((a) => a.attributeId === vr.attributeId)?.attributeValueId;
            if (!valId) continue;
            const first = v.images[0]?.url || null;
            if (v.images.length > 1) consistent = false;
            if (optionPhoto.has(valId) && optionPhoto.get(valId) !== first) consistent = false;
            optionPhoto.set(valId, first);
          }
          if (consistent && [...optionPhoto.values()].some(Boolean)) {
            vr.linkPhotos = true;
            vr.options = vr.options.map((o) => ({ ...o, photoKey: urlToKey.get(optionPhoto.get(o.valueId!) || "") || null }));
            linkedVar = vr;
            break;
          }
        }

        const loadedRows: Row[] = withAttrs.map((v) => {
          const values: Record<string, string> = {};
          v.attributes.forEach((a) => { values[a.attributeId] = a.value; });
          return {
            key: comboKey(v.attributes.map((a) => a.attributeValueId)),
            id: v.id,
            valueIds: v.attributes.map((a) => a.attributeValueId),
            values,
            sku: v.sku || "",
            price: String(Number(v.price)),
            priceUS: v.priceUS ? String(Number(v.priceUS)) : "",
            priceIntl: v.priceIntl ? String(Number(v.priceIntl)) : "",
            quantity: String(v.quantity ?? 0),
            procMin: v.processingMinDays?.toString() ?? "",
            procMax: v.processingMaxDays?.toString() ?? "",
            isActive: v.isActive,
            photoKeys: linkedVar ? [] : v.images.map((img) => urlToKey.get(img.url)).filter((k): k is string => !!k),
            passthrough: passthrough(v),
          };
        });

        const procVaries = withAttrs.some((v) => v.processingMinDays !== null || v.processingMaxDays !== null);
        const loadedVary: Record<VaryField, VarySetting> = {
          prices: { on: true, by: "all" },
          quantities: { on: true, by: "all" },
          skus: { on: true, by: "all" },
          processing: { on: procVaries, by: "all" },
        };
        setVariations(vars);
        setVary(loadedVary);
        setRows(loadedRows);
      } catch (err) {
        toast.error(apiMsg(err, "Failed to load listing"));
        navigate("/products");
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, productId, navigate]);

  /* ── scroll spy ── */
  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(`listing-${id}`);
    if (!el) return;
    setActiveSection(id);
    scrollLock.current = Date.now();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (loading) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-listing-section]"));
    const visible = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const id = (e.target as HTMLElement).dataset.listingSection!;
          if (e.isIntersecting) visible.set(id, e.boundingClientRect.top);
          else visible.delete(id);
        });
        if (Date.now() - scrollLock.current < 800 || !visible.size) return;
        setActiveSection([...visible.entries()].sort((a, b) => a[1] - b[1])[0][0]);
      },
      { rootMargin: "-180px 0px -55% 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [loading]);

  /* ── photos & video ── */
  const addFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const nextPhotos = [...photos];
    const nextVideos: [VideoSlot, VideoSlot] = [...videos];
    const nextRemoved: [boolean, boolean] = [...removedVideos];
    let skipped = 0;
    for (const f of files) {
      if (f.size > MAX_FILE) { skipped++; continue; }
      if (f.type.startsWith("image/")) {
        if (nextPhotos.length >= MAX_PHOTOS) { skipped++; continue; }
        nextPhotos.push({ key: newKey("ph"), url: URL.createObjectURL(f), kind: "new", file: f });
      } else if (f.type === "video/mp4" || f.type === "video/webm") {
        const slot = nextVideos.findIndex((v) => v === null);
        if (slot === -1) { skipped++; continue; }
        nextVideos[slot] = { url: URL.createObjectURL(f), file: f };
      } else {
        skipped++;
      }
    }
    setPhotos(nextPhotos);
    setVideos(nextVideos);
    setRemovedVideos(nextRemoved);
    if (skipped) toast.error(`${skipped} file(s) skipped — up to ${MAX_PHOTOS} photos and 2 videos (MP4/WebM), 10MB each`);
  };

  const removePhoto = (key: string) => {
    setPhotos((p) => p.filter((ph) => ph.key !== key));
    setVariations((vs) => vs.map((v) => ({ ...v, options: v.options.map((o) => (o.photoKey === key ? { ...o, photoKey: null } : o)) })));
    setRows((rs) => rs.map((r) => ({ ...r, photoKeys: r.photoKeys.filter((k) => k !== key) })));
  };

  const movePhoto = (from: number, to: number) => {
    if (from === to || to < 0 || to >= photos.length) return;
    setPhotos((p) => {
      const next = [...p];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const removeVideo = (slot: 0 | 1) => {
    const next: [VideoSlot, VideoSlot] = [...videos];
    const wasSaved = next[slot] && !next[slot]!.file;
    next[slot] = null;
    setVideos(next);
    if (wasSaved) {
      const r: [boolean, boolean] = [...removedVideos];
      r[slot] = true;
      setRemovedVideos(r);
    }
  };

  const photoByKey = useMemo(() => new Map(photos.map((p) => [p.key, p])), [photos]);

  /* ── category ── */
  const categoryLabel = useCallback((c: Category) => {
    const parent = c.parentId ? allCategories.find((x) => x.id === c.parentId) : null;
    return parent ? `${parent.name} › ${c.name}` : c.name;
  }, [allCategories]);
  const selectedCategory = allCategories.find((c) => c.id === categoryId);
  const categoryMatches = allCategories
    .filter((c) => categoryLabel(c).toLowerCase().includes(categoryQuery.toLowerCase()))
    .slice(0, 12);
  const topCategories = allCategories.filter((c) => !c.parentId).slice(0, 3);

  /* ── tags & materials ── */
  const addTag = () => {
    const t = tagInput.trim().replace(/,$/, "");
    if (!t) return;
    if (tags.length >= MAX_TAGS) return toast.error(`Maximum ${MAX_TAGS} tags`);
    if (t.length > 20) return toast.error("Tags can be up to 20 characters");
    if (!tags.some((x) => x.toLowerCase() === t.toLowerCase())) setTags([...tags, t]);
    setTagInput("");
  };
  const toggleMaterial = (m: string) => {
    if (materials.includes(m)) return setMaterials(materials.filter((x) => x !== m));
    if (materials.length >= MAX_MATERIALS) return toast.error(`Select up to ${MAX_MATERIALS} materials`);
    setMaterials([...materials, m]);
  };
  const materialOptions = [...new Set([...materials, ...MATERIAL_SUGGESTIONS])].filter((m) =>
    m.toLowerCase().includes(materialQuery.toLowerCase())
  );

  /* ── variations flow ── */
  const openVariations = () => {
    setDraftVariations(variations.map((v) => ({ ...v, options: [...v.options] })));
    setDraftVary(vary);
    setVariationStep(variations.length ? "manage" : "pick");
  };

  const startVariation = async (attr: Attribute | null) => {
    if (draftVariations.length >= MAX_VARIATIONS) return toast.error(`Up to ${MAX_VARIATIONS} variations`);
    if (attr && draftVariations.some((v) => v.attributeId === attr.id)) return toast.error(`${attr.name} is already added`);
    setEditingVar({ key: newKey("var"), attributeId: attr?.id, name: attr?.name || "", linkPhotos: false, options: [] });
    setOptionInput("");
    setVariationStep("edit");
    if (attr) ensureAttrValues(attr.id).catch(() => { /* suggestions optional */ });
  };

  const addOption = (value: string) => {
    if (!editingVar) return;
    const v = value.trim();
    if (!v) return;
    if (editingVar.options.some((o) => o.value.toLowerCase() === v.toLowerCase())) return toast.error("Option already added");
    if (editingVar.options.length >= 70) return toast.error("Up to 70 options per variation");
    setEditingVar({ ...editingVar, options: [...editingVar.options, { value: v, photoKey: null }] });
    setOptionInput("");
  };

  const saveEditingVar = () => {
    if (!editingVar) return;
    const name = editingVar.name.trim();
    if (!name) return toast.error("Variation name is required");
    if (!editingVar.options.length) return toast.error("Add at least one option");
    if (draftVariations.some((v) => v.key !== editingVar.key && v.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("A variation with this name already exists");
    }
    const updated = { ...editingVar, name };
    setDraftVariations((prev) => {
      let next = prev.some((v) => v.key === updated.key) ? prev.map((v) => (v.key === updated.key ? updated : v)) : [...prev, updated];
      if (updated.linkPhotos) next = next.map((v) => (v.key === updated.key ? v : { ...v, linkPhotos: false }));
      return next;
    });
    setEditingVar(null);
    setVariationStep("manage");
  };

  const varyLabel = (by: string, vars: Variation[]) =>
    by === "all" ? vars.map((v) => v.name).join(" and ") : vars.find((v) => v.key === by)?.name || "";

  // Resolve names/values to real attribute & value ids, then rebuild combination rows.
  const applyVariations = async (nextVary: Record<VaryField, VarySetting>) => {
    setApplyingVariations(true);
    try {
      const attrs = [...allAttributes];
      const resolved: Variation[] = [];
      for (const v of draftVariations) {
        let attributeId = v.attributeId;
        if (!attributeId) {
          const existing = attrs.find((a) => a.name.toLowerCase() === v.name.toLowerCase());
          if (existing) attributeId = existing.id;
          else {
            const r = await attributesApi.createAttribute({ name: v.name, inputType: "select" });
            const created: Attribute = r.data.data?.attribute || r.data.data;
            attrs.push(created);
            attributeId = created.id;
          }
        }
        const r = await attributesApi.getAttributeValues(attributeId);
        const existingVals: AttrValue[] = r.data.data?.values || [];
        const options: VarOption[] = [];
        for (const o of v.options) {
          let valueId = o.valueId;
          if (!valueId) {
            const found = existingVals.find((ev) => ev.value.toLowerCase() === o.value.toLowerCase());
            if (found) valueId = found.id;
            else {
              const cr = await attributeValuesApi.createAttributeValue(attributeId, { value: o.value });
              const created: AttrValue = cr.data.data?.value || cr.data.data;
              existingVals.push(created);
              valueId = created.id;
            }
          }
          options.push({ ...o, valueId });
        }
        setAttrValues((p) => ({ ...p, [attributeId!]: existingVals }));
        resolved.push({ ...v, key: attributeId, attributeId, options });
      }
      setAllAttributes(attrs);

      const oldByKey = new Map(rows.map((r) => [r.key, r]));
      const defaultRow = rows.find((r) => r.key === "default");
      const combos = resolved.length ? cartesian(resolved.map((v) => v.options)) : [];
      let newIdx = 0;
      const nextRows: Row[] = combos.map((combo) => {
        const valueIds = combo.map((o) => o.valueId!);
        const key = comboKey(valueIds);
        const values: Record<string, string> = {};
        combo.forEach((o, i) => { values[resolved[i].key] = o.value; });
        const old = oldByKey.get(key);
        if (old) return { ...old, values, valueIds };
        return {
          key, id: `new-${newIdx++}`, valueIds, values,
          sku: "", price: base.price, priceUS: base.priceUS, priceIntl: base.priceIntl,
          quantity: base.quantity || "0", procMin: base.procMin, procMax: base.procMax, isActive: true, photoKeys: [], passthrough: {},
        };
      });

      // Re-key vary "by" selections from draft keys to resolved attribute ids
      const keyMap = new Map(draftVariations.map((d, i) => [d.key, resolved[i]?.key]));
      const fixBy = (s: VarySetting): VarySetting => ({ ...s, by: s.by === "all" ? "all" : keyMap.get(s.by) || "all" });
      setVariations(resolved);
      setVary({
        prices: fixBy(nextVary.prices),
        processing: fixBy(nextVary.processing),
        quantities: fixBy(nextVary.quantities),
        skus: fixBy(nextVary.skus),
      });
      if (!resolved.length && defaultRow === undefined) {
        const first = rows[0];
        setRows([{
          key: "default", id: first && !first.id.startsWith("new-") ? first.id : "new-0", valueIds: [], values: {},
          sku: base.sku, price: base.price, priceUS: base.priceUS, priceIntl: base.priceIntl, quantity: base.quantity,
          procMin: "", procMax: "", isActive: true, photoKeys: [], passthrough: first?.passthrough || {},
        }]);
      } else {
        setRows(resolved.length ? nextRows : defaultRow ? [defaultRow] : []);
      }
      setSelectedRowKeys([]);
      setVariationStep(null);
      if (resolved.length) toast.success(`${nextRows.length} combination${nextRows.length === 1 ? "" : "s"} ready`);
    } catch (err) {
      toast.error(apiMsg(err, "Failed to save variations"));
    } finally {
      setApplyingVariations(false);
    }
  };

  // Editing a row field that varies by a single variation updates all rows sharing that option.
  const setRowField = (row: Row, field: keyof Row, value: string | boolean, varyField?: VaryField) => {
    const by = varyField ? vary[varyField].by : "all";
    setRows((rs) =>
      rs.map((r) => {
        const same = by === "all" || !varyField ? r.key === row.key : r.values[by] === row.values[by];
        return same ? { ...r, [field]: value } : r;
      })
    );
  };

  // Show a row's grouped field only on the first row of each group.
  const isGroupLead = (row: Row, varyField: VaryField) => {
    const by = vary[varyField].by;
    if (by === "all") return true;
    return rows.find((r) => r.values[by] === row.values[by])?.key === row.key;
  };

  const rowPhotoKeys = (row: Row) => {
    if (row.photoKeys.length) return row.photoKeys;
    const linked = variations.find((v) => v.linkPhotos);
    if (!linked) return [];
    const opt = linked.options.find((o) => o.value === row.values[linked.key]);
    return opt?.photoKey ? [opt.photoKey] : [];
  };

  /* ── delivery / returns dialogs ── */
  const saveProfile = async () => {
    if (!profileDialog) return;
    setDialogBusy(true);
    try {
      const payload = { ...profileDialog };
      const r = profileDialog.id
        ? await deliveryApi.update(profileDialog.id, payload)
        : await deliveryApi.create(payload);
      const saved: DeliveryProfile = r.data.data.profile;
      await loadProfiles();
      setDeliveryProfileId(saved.id);
      setProfileDialog(null);
      toast.success("Delivery profile saved");
    } catch (err) {
      toast.error(apiMsg(err, "Failed to save delivery profile"));
    } finally {
      setDialogBusy(false);
    }
  };

  const savePolicy = async () => {
    if (!policyDialog) return;
    setDialogBusy(true);
    try {
      const r = policyDialog.id
        ? await returnApi.update(policyDialog.id, policyDialog)
        : await returnApi.create(policyDialog);
      const saved: ReturnPolicy = r.data.data.policy;
      await loadPolicies();
      setReturnPolicyId(saved.id);
      setPolicyDialog(null);
      toast.success("Return policy saved");
    } catch (err) {
      toast.error(apiMsg(err, "Failed to save return policy"));
    } finally {
      setDialogBusy(false);
    }
  };

  const selectedProfile = profiles.find((p) => p.id === deliveryProfileId);
  const selectedPolicy = policies.find((p) => p.id === returnPolicyId);
  const policySummary = (p: ReturnPolicy) => {
    const parts = [p.acceptReturns && "Returns", p.acceptExchanges && "exchanges"].filter(Boolean).join(" and ");
    return parts ? `${parts.charAt(0).toUpperCase()}${parts.slice(1)} · ${p.windowDays} days` : "No returns or exchanges";
  };

  /* ── save ── */
  const buildVariantPayload = () => {
    const effective = (r: Row, f: VaryField, field: keyof Row, baseVal: string) =>
      hasVariations && vary[f].on ? (r[field] as string) : baseVal;
    return rows.map((r) => ({
      row: r,
      payload: {
        ...r.passthrough,
        id: r.id,
        attributeValueIds: r.valueIds,
        sku: effective(r, "skus", "sku", base.sku).trim(),
        price: effective(r, "prices", "price", base.price),
        quantity: effective(r, "quantities", "quantity", base.quantity),
        isActive: r.isActive,
      },
      extras: {
        priceUS: effective(r, "prices", "priceUS", base.priceUS),
        priceIntl: effective(r, "prices", "priceIntl", base.priceIntl),
        processingMinDays: effective(r, "processing", "procMin", ""),
        processingMaxDays: effective(r, "processing", "procMax", ""),
      },
    }));
  };

  const validate = (publish: boolean) => {
    const fail = (msg: string, section: string) => { toast.error(msg); scrollTo(section); return false; };
    if (!title.trim()) return fail("Title is required", "details");
    if (!categoryId) return fail("Category is required", "details");
    if (!publish) return true;
    if (!photos.length) return fail("Add at least one photo", "photos");
    if (!description.trim()) return fail("Description is required", "details");
    const entries = buildVariantPayload();
    if (!entries.length) {
      if (!(num(base.price) > 0)) return fail("Price is required", "pricing");
    }
    for (const { payload, extras } of entries) {
      if (!(num(payload.price as string) > 0)) return fail("Every variation needs a price in India", hasVariations && vary.prices.on ? "options" : "pricing");
      if (globalPricing && (!(num(extras.priceUS) > 0) || !(num(extras.priceIntl) > 0))) {
        return fail("Add US and everywhere-else prices, or turn off global pricing", hasVariations && vary.prices.on ? "options" : "pricing");
      }
      if (!(num(payload.quantity as string) >= 0)) return fail("Quantity is required", hasVariations && vary.quantities.on ? "options" : "pricing");
    }
    const pMin = num(base.procMin), pMax = num(base.procMax);
    if (!(hasVariations && vary.processing.on) && (isNaN(pMin) || isNaN(pMax) || pMin > pMax)) {
      return fail("Set a valid processing time", "pricing");
    }
    if (!deliveryProfileId) return fail("Choose a delivery option", "pricing");
    if (!returnPolicyId) return fail("Choose a returns and exchanges policy", "pricing");
    if (customFields.some((f) => !f.label.trim())) return fail("Every custom option needs a label", "options");
    return true;
  };

  const save = async (publish: boolean) => {
    if (!validate(publish)) return;
    setSaving(publish ? "publish" : "draft");
    let savedId = productId;
    try {
      const entries = buildVariantPayload();
      const variantPayload = entries.length
        ? entries.map((e) => e.payload)
        : [{ id: "new-0", attributeValueIds: [], sku: base.sku, price: base.price || "0", quantity: base.quantity || "0", isActive: true }];

      const fd = new FormData();
      fd.append("name", title.trim());
      const descHtml = !descriptionTouched && originalDescriptionHtml !== null ? originalDescriptionHtml : textToHtml(description);
      fd.append("description", descHtml);
      fd.append("hasVariants", String(hasVariations));
      fd.append("variants", JSON.stringify(variantPayload));
      fd.append("tags", JSON.stringify(tags));
      fd.append("isActive", String(publish));
      fd.append("featured", String(featured));
      if (mode === "create" || categoryTouched) {
        const ids = mode === "create" || !originalCategoryIds.includes(categoryId) ? [categoryId] : originalCategoryIds;
        fd.append("categoryIds", JSON.stringify(ids));
        fd.append("primaryCategoryId", categoryId);
      }
      if (mode === "create") {
        fd.append("deferImages", "true");
        fd.append("price", base.price || "0");
        fd.append("quantity", base.quantity || "0");
      }

      const res = mode === "create" ? await products.createProduct(fd as never) : await products.updateProduct(productId!, fd as never);
      if (!res.data.success) throw new Error(res.data.message || "Failed to save listing");
      savedId = res.data.data?.product?.id || productId;
      if (!savedId) throw new Error("Saved listing id missing");

      // Map local rows to saved variant ids
      const listing = await listings.get(savedId);
      const serverVariants: { id: string; attributes: { attributeValueId: string }[] }[] = listing.data.data.product.variants || [];
      const idForRow = (r: Row) => {
        if (!r.valueIds.length) return serverVariants[0]?.id;
        const k = comboKey(r.valueIds);
        return serverVariants.find((sv) => comboKey(sv.attributes.map((a) => a.attributeValueId)) === k)?.id;
      };

      // Media: photos order, uploads, variant photo links, videos
      const media = new FormData();
      const layout: unknown[] = [];
      let fileIdx = 0;
      const slotOfKey = new Map<string, number>();
      photos.forEach((ph, i) => {
        slotOfKey.set(ph.key, i);
        if (ph.kind === "existing") layout.push({ kind: "existing", id: ph.id });
        else if (ph.kind === "variant") layout.push({ kind: "variant", url: ph.url });
        else {
          media.append("photos", ph.file!);
          layout.push({ kind: "new", file: fileIdx++ });
        }
      });
      const variantLinks = rows
        .map((r) => ({ variantId: idForRow(r), slots: rowPhotoKeys(r).map((k) => slotOfKey.get(k)).filter((s): s is number => s !== undefined) }))
        .filter((l) => l.variantId && l.slots.length);
      media.append("layout", JSON.stringify(layout));
      media.append("variantLinks", JSON.stringify(variantLinks));
      if (videos[0]?.file) media.append("video", videos[0].file);
      if (videos[1]?.file) media.append("video2", videos[1].file);
      if (removedVideos[0]) media.append("removeVideo", "true");
      if (removedVideos[1]) media.append("removeVideo2", "true");
      await listings.saveMedia(savedId, media);

      await listings.saveExtras(savedId, {
        materials,
        allowRestockRequests: allowRestock,
        globalPricing,
        processingMinDays: hasVariations && vary.processing.on ? null : base.procMin,
        processingMaxDays: hasVariations && vary.processing.on ? null : base.procMax,
        deliveryProfileId: deliveryProfileId || null,
        returnPolicyId: returnPolicyId || null,
        whoMade,
        whatIsIt,
        whenMade,
        customFields: customFields.map((f) => ({ ...f, label: f.label.trim() })),
        variantExtras: entries
          .map((e) => ({ variantId: idForRow(e.row), ...e.extras }))
          .concat(entries.length ? [] : serverVariants.slice(0, 1).map((sv) => ({ variantId: sv.id, priceUS: base.priceUS, priceIntl: base.priceIntl, processingMinDays: "", processingMaxDays: "" })))
          .filter((v) => v.variantId),
      });

      toast.success(publish ? (mode === "create" ? "Listing published" : "Listing saved and active") : "Saved as draft");
      navigate("/products");
    } catch (err) {
      toast.error(apiMsg(err, (err as Error)?.message || "Failed to save listing"));
      if (mode === "create" && savedId) {
        toast.info("The listing was created — finish the remaining details here.");
        navigate(`/products/edit/${savedId}`);
      }
    } finally {
      setSaving(null);
    }
  };

  /* ───────────────────────── render ───────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const variesText = (f: VaryField) => `${varyLabel(vary[f].by, variations)}`;

  return (
    <div className="relative">
      {/* Sticky header + tabs */}
      <div className="sticky -top-4 z-30 -mx-4 -mt-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 pt-3 lg:-top-8 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-4">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <Link to="/products" className="hover:underline">Listings</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate text-[var(--text-primary)]">{mode === "create" ? "New listing" : title || "Edit listing"}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{mode === "create" ? "New listing" : "Edit listing"}</h1>
          <nav className="-mb-px mt-3 flex gap-7 overflow-x-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={`whitespace-nowrap border-b-2 pb-2.5 text-[15px] transition-colors ${activeSection === s.id
                  ? "border-[var(--text-primary)] font-medium text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-5xl space-y-6 pb-4">
        {/* ── Photo & Video ── */}
        <Section id="photos" title="Photo and video" subtitle="Show off different angles, available options, or even a peek behind the scenes at your process.">
          <div>
            <p className="flex items-center gap-1.5 text-base font-semibold text-[var(--text-primary)]">
              Add up to {MAX_PHOTOS} photos and 2 videos.* <HelpCircle className="h-4 w-4" />
            </p>
            <p className="text-sm text-[var(--text-secondary)]">Drag to reorder. The first photo is your thumbnail.</p>
          </div>

          {(photos.length > 0 || videos.some(Boolean)) && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {photos.map((ph, i) => (
                <div
                  key={ph.key}
                  draggable
                  onDragStart={() => setDragPhotoIdx(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dragPhotoIdx !== null) movePhoto(dragPhotoIdx, i);
                    setDragPhotoIdx(null);
                  }}
                  className={`group relative aspect-square cursor-grab overflow-hidden rounded-lg border bg-[var(--bg-secondary)] ${i === 0 ? "border-2 border-[var(--text-primary)]" : "border-[var(--border-color)]"}`}
                >
                  <img src={ph.url} alt="" className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute bottom-2 left-2 rounded-full bg-[var(--text-primary)] px-2 py-0.5 text-[11px] font-semibold text-[var(--bg-card)]">Thumbnail</span>}
                  <button type="button" onClick={() => removePhoto(ph.key)} className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-gray-800 opacity-0 shadow transition group-hover:opacity-100" title="Delete photo">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <GripVertical className="absolute left-1.5 top-1.5 h-4 w-4 text-white opacity-0 drop-shadow group-hover:opacity-100" />
                </div>
              ))}
              {videos.map((v, i) =>
                v ? (
                  <div key={`video-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border-color)] bg-black">
                    <video src={v.url} className="h-full w-full object-cover" muted controls />
                    <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] text-white"><Video className="h-3 w-3" /> Video {i + 1}</span>
                    <button type="button" onClick={() => removeVideo(i as 0 | 1)} className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-gray-800 shadow" title="Delete video">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null
              )}
            </div>
          )}

          <label
            onDragOver={(e) => { e.preventDefault(); if (dragPhotoIdx === null) setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (dragPhotoIdx === null && e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-12 text-center transition ${dragging ? "border-[var(--text-primary)] bg-[var(--bg-secondary)]" : "border-[var(--border-color)]"}`}
          >
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
            />
            <p className="text-base text-[var(--text-primary)]">Drag and drop files or</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-secondary)] px-5 py-2 text-sm font-semibold text-[var(--text-primary)]">
              <Plus className="h-4 w-4" /> Upload
            </span>
            <p className="text-xs text-[var(--text-secondary)]">{photos.length}/{MAX_PHOTOS} photos · {videos.filter(Boolean).length}/2 videos · max 10MB each</p>
          </label>
        </Section>

        {/* ── Item details ── */}
        <Section id="details" title="Item details" subtitle="Help buyers understand your item better, and share any special options you offer.">
          <div className="relative max-w-xl">
            <FieldLabel required>Category</FieldLabel>
            <Input
              value={categoryOpen ? categoryQuery : selectedCategory ? categoryLabel(selectedCategory) : categoryQuery}
              onFocus={() => { setCategoryOpen(true); setCategoryQuery(""); }}
              onBlur={() => setTimeout(() => setCategoryOpen(false), 150)}
              onChange={(e) => setCategoryQuery(e.target.value)}
              placeholder="Type to search"
              className="h-12 rounded-lg"
            />
            {categoryOpen && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg">
                {categoryMatches.length ? categoryMatches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setCategoryId(c.id); setCategoryTouched(true); setCategoryOpen(false); }}
                    className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--bg-secondary)] ${c.id === categoryId ? "font-semibold" : ""}`}
                  >
                    {categoryLabel(c)}
                  </button>
                )) : <p className="px-4 py-3 text-sm text-[var(--text-secondary)]">No categories found</p>}
              </div>
            )}
            {topCategories.length > 0 && (
              <div className="mt-2 text-sm text-[var(--text-secondary)]">
                Your top categories:
                <div className="mt-1 flex flex-wrap gap-4">
                  {topCategories.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setCategoryId(c.id); setCategoryTouched(true); }} className="font-semibold text-[var(--text-primary)] hover:underline">
                      + {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-end justify-between">
              <FieldLabel required hint="Make sure your title is easy to understand and clearly describes what you're selling.">Title</FieldLabel>
              <span className="mb-2 text-xs text-[var(--text-secondary)]">{title.length}/{TITLE_MAX}</span>
            </div>
            <Input value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} className="h-12 rounded-lg" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div>
              <FieldLabel required hint="What makes your item special? Buyers will only see the first few lines unless they expand the description.">Description</FieldLabel>
              <Textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setDescriptionTouched(true); }}
                rows={8}
                className="rounded-lg"
              />
            </div>
            <div className="h-fit rounded-xl border border-[var(--border-color)] p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><Lightbulb className="h-4 w-4" /> What buyers want to know about your listing</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Consider including these details in your description:</p>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-[var(--text-primary)]">
                {BUYER_TIPS.map((t) => <li key={t}>• {t}</li>)}
              </ul>
            </div>
          </div>
        </Section>

        {/* ── Item options ── */}
        <Section id="options" title="Item options" subtitle="Let buyers know what choices are available for this item.">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <FieldLabel hint="Add options like colour, size, or material that may affect your available inventory quantities.">Variations</FieldLabel>
            {hasVariations ? (
              <PillButton onClick={openVariations}>Manage variations</PillButton>
            ) : (
              <PillButton onClick={openVariations}><Plus className="h-4 w-4" /> Add variation</PillButton>
            )}
          </div>

          {hasVariations && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{variations.map((v) => v.name).join(" and ")}</p>
                <p className="text-xs text-[var(--text-secondary)]">{rows.length} variant{rows.length === 1 ? "" : "s"}</p>
              </div>
              {selectedRowKeys.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-[var(--text-secondary)]">{selectedRowKeys.length} selected</span>
                  <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => { setRows((rs) => rs.map((r) => (selectedRowKeys.includes(r.key) ? { ...r, isActive: true } : r))); }}>Make visible</Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => { setRows((rs) => rs.map((r) => (selectedRowKeys.includes(r.key) ? { ...r, isActive: false } : r))); }}>Hide</Button>
                  {vary.prices.on && (
                    <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => {
                      const v = window.prompt("Price in India (₹) for selected variants:");
                      if (v !== null && num(v) >= 0) setRows((rs) => rs.map((r) => (selectedRowKeys.includes(r.key) ? { ...r, price: v } : r)));
                    }}>Set price</Button>
                  )}
                  {vary.quantities.on && (
                    <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => {
                      const v = window.prompt("Quantity for selected variants:");
                      if (v !== null && num(v) >= 0) setRows((rs) => rs.map((r) => (selectedRowKeys.includes(r.key) ? { ...r, quantity: String(parseInt(v) || 0) } : r)));
                    }}>Set quantity</Button>
                  )}
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-left text-[13px] font-semibold text-[var(--text-primary)]">
                      <th className="w-10 px-3 py-3">
                        <input type="checkbox" checked={selectedRowKeys.length === rows.length && rows.length > 0} onChange={(e) => setSelectedRowKeys(e.target.checked ? rows.map((r) => r.key) : [])} className="h-4 w-4" />
                      </th>
                      <th className="px-3 py-3">Photo</th>
                      {variations.map((v) => <th key={v.key} className="px-3 py-3 underline decoration-dotted">{v.name}</th>)}
                      {vary.skus.on && <th className="px-3 py-3 underline decoration-dotted">SKU</th>}
                      {vary.prices.on && <th className="px-3 py-3 underline decoration-dotted">Price in India</th>}
                      {vary.prices.on && globalPricing && <th className="px-3 py-3 underline decoration-dotted">Price in United States</th>}
                      {vary.prices.on && globalPricing && <th className="px-3 py-3 underline decoration-dotted">Price in everywhere else</th>}
                      {vary.quantities.on && <th className="px-3 py-3 underline decoration-dotted">Quantity</th>}
                      {vary.processing.on && <th className="px-3 py-3 underline decoration-dotted">Processing (days)</th>}
                      <th className="px-3 py-3">Visible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const pk = rowPhotoKeys(r)[0];
                      const ph = pk ? photoByKey.get(pk) : undefined;
                      const cell = (f: VaryField, field: keyof Row, props: React.InputHTMLAttributes<HTMLInputElement> = {}) =>
                        isGroupLead(r, f) ? (
                          <Input
                            value={r[field] as string}
                            onChange={(e) => setRowField(r, field, e.target.value, f)}
                            className="h-11 rounded-lg"
                            {...props}
                          />
                        ) : <span className="text-xs text-[var(--text-secondary)]">Same as {r.values[vary[f].by]}</span>;
                      return (
                        <tr key={r.key} className={`border-b border-[var(--border-color)] last:border-0 ${r.isActive ? "" : "opacity-50"}`}>
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={selectedRowKeys.includes(r.key)} onChange={(e) => setSelectedRowKeys((s) => (e.target.checked ? [...s, r.key] : s.filter((k) => k !== r.key)))} className="h-4 w-4" />
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => setPhotoPicker({ target: "row", rowKey: r.key })} title="Choose photo" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                              {ph ? <img src={ph.url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-[var(--text-secondary)]" />}
                            </button>
                          </td>
                          {variations.map((v) => <td key={v.key} className="px-3 py-2 text-[var(--text-primary)]">{r.values[v.key]}</td>)}
                          {vary.skus.on && <td className="px-3 py-2">{cell("skus", "sku", { className: "h-11 w-36 rounded-lg" })}</td>}
                          {vary.prices.on && <td className="px-3 py-2"><div className="w-32">{cell("prices", "price", { type: "number", min: 0, placeholder: "₹" })}</div></td>}
                          {vary.prices.on && globalPricing && <td className="px-3 py-2"><div className="w-32">{cell("prices", "priceUS", { type: "number", min: 0, placeholder: "₹" })}</div></td>}
                          {vary.prices.on && globalPricing && <td className="px-3 py-2"><div className="w-32">{cell("prices", "priceIntl", { type: "number", min: 0, placeholder: "₹" })}</div></td>}
                          {vary.quantities.on && <td className="px-3 py-2"><div className="w-24">{cell("quantities", "quantity", { type: "number", min: 0 })}</div></td>}
                          {vary.processing.on && (
                            <td className="px-3 py-2">
                              {isGroupLead(r, "processing") ? (
                                <div className="flex items-center gap-1">
                                  <Input type="number" min={0} value={r.procMin} onChange={(e) => setRowField(r, "procMin", e.target.value, "processing")} className="h-11 w-16 rounded-lg" />
                                  <span>–</span>
                                  <Input type="number" min={0} value={r.procMax} onChange={(e) => setRowField(r, "procMax", e.target.value, "processing")} className="h-11 w-16 rounded-lg" />
                                </div>
                              ) : <span className="text-xs text-[var(--text-secondary)]">Same as {r.values[vary.processing.by]}</span>}
                            </td>
                          )}
                          <td className="px-3 py-2"><Switch checked={r.isActive} onCheckedChange={(c) => setRowField(r, "isActive", c)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="border-t border-[var(--border-color)] pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <FieldLabel hint="Create up to 5 input fields to collect details from buyers like text, images, or names. These won't affect your available inventory.">Custom options</FieldLabel>
              <PillButton onClick={() => setCustomFields([...customFields, { label: "", fieldType: "TEXT", required: false, maxLength: "" }])} disabled={customFields.length >= MAX_CUSTOM_FIELDS}>
                <Plus className="h-4 w-4" /> Add field
              </PillButton>
            </div>
            {customFields.length > 0 && (
              <div className="mt-4 space-y-3">
                {customFields.map((f, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-color)] p-4">
                    <div className="min-w-[200px] flex-1">
                      <Label className="text-xs">Field label*</Label>
                      <Input value={f.label} maxLength={120} placeholder="e.g. Name to engrave" onChange={(e) => setCustomFields(customFields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className="mt-1 h-10" />
                    </div>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <select value={f.fieldType} onChange={(e) => setCustomFields(customFields.map((x, j) => (j === i ? { ...x, fieldType: e.target.value as "TEXT" | "IMAGE" } : x)))} className="mt-1 block h-10 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm">
                        <option value="TEXT">Text</option>
                        <option value="IMAGE">Image upload</option>
                      </select>
                    </div>
                    {f.fieldType === "TEXT" && (
                      <div className="w-28">
                        <Label className="text-xs">Max characters</Label>
                        <Input type="number" min={1} value={f.maxLength} onChange={(e) => setCustomFields(customFields.map((x, j) => (j === i ? { ...x, maxLength: e.target.value } : x)))} className="mt-1 h-10" />
                      </div>
                    )}
                    <label className="flex h-10 items-center gap-2 text-sm">
                      <input type="checkbox" checked={f.required} onChange={(e) => setCustomFields(customFields.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)))} className="h-4 w-4" />
                      Required
                    </label>
                    <button type="button" onClick={() => setCustomFields(customFields.filter((_, j) => j !== i))} className="flex h-10 items-center text-[var(--text-secondary)] hover:text-red-600" title="Remove field">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border-color)] pt-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Attributes</h3>
            <p className="text-sm text-[var(--text-secondary)]">These details help buyers find your item in search as they get specific about what they're looking for.</p>

            <div className="mt-6">
              <FieldLabel hint={`Add up to ${MAX_TAGS} tags to help people search for your listings.`}>Tags</FieldLabel>
              <div className="flex max-w-2xl items-center gap-3">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                  placeholder="Shape, colour, style, function, etc."
                  className="h-12 rounded-lg"
                />
                <button type="button" onClick={addTag} className="text-sm font-semibold text-[var(--text-primary)] hover:underline">Add</button>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{MAX_TAGS - tags.length} left</p>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-sm">
                      {t}
                      <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} title="Remove tag"><X className="h-3.5 w-3.5" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="relative mt-6 max-w-2xl">
              <FieldLabel hint={`Select up to ${MAX_MATERIALS}`}>Materials</FieldLabel>
              <div className="relative">
                <Input
                  value={materialQuery}
                  onFocus={() => setMaterialOpen(true)}
                  onBlur={() => setTimeout(() => setMaterialOpen(false), 150)}
                  onChange={(e) => setMaterialQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && materialQuery.trim()) {
                      e.preventDefault();
                      toggleMaterial(materialQuery.trim());
                      setMaterialQuery("");
                    }
                  }}
                  placeholder="Type to search..."
                  className="h-12 rounded-lg pr-10"
                />
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              </div>
              {materialOpen && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg">
                  {materialQuery.trim() && !materialOptions.some((m) => m.toLowerCase() === materialQuery.trim().toLowerCase()) && (
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { toggleMaterial(materialQuery.trim()); setMaterialQuery(""); }} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--bg-secondary)]">
                      + Add "{materialQuery.trim()}"
                    </button>
                  )}
                  {materialOptions.map((m) => (
                    <label key={m} onMouseDown={(e) => e.preventDefault()} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--bg-secondary)]">
                      <input type="checkbox" checked={materials.includes(m)} onChange={() => toggleMaterial(m)} className="h-4 w-4" />
                      {m}
                    </label>
                  ))}
                </div>
              )}
              {materials.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {materials.map((m) => (
                    <span key={m} className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-sm">
                      {m}
                      <button type="button" onClick={() => toggleMaterial(m)} title="Remove material"><X className="h-3.5 w-3.5" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── Pricing & Delivery ── */}
        <Section id="pricing" title="Price and inventory" subtitle="Set your item price, and how many are available for sale.">
          <div className="flex items-start justify-between gap-4">
            <FieldLabel hint="Set prices for buyers in different locations.">Domestic and global pricing</FieldLabel>
            <Switch checked={globalPricing} onCheckedChange={setGlobalPricing} />
          </div>

          <div>
            <FieldLabel required>Price</FieldLabel>
            {hasVariations && vary.prices.on ? (
              <p className="text-sm text-[var(--text-primary)]">
                {globalPricing ? "Domestic and global pricing" : "Prices"} vary for each {variesText("prices")}
                <button type="button" onClick={() => scrollTo("options")} className="mt-1 block font-semibold hover:underline">Edit in variations →</button>
              </p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {([["price", "Price in India"], ...(globalPricing ? [["priceUS", "Price in United States"], ["priceIntl", "Price in everywhere else"]] : [])] as [keyof typeof base, string][]).map(([k, label]) => (
                  <div key={k} className="w-48">
                    <Label className="text-xs">{label}</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">₹</span>
                      <Input type="number" min={0} value={base[k]} onChange={(e) => setBase({ ...base, [k]: e.target.value })} className="h-12 rounded-lg pl-7" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <FieldLabel required>Quantity</FieldLabel>
            {hasVariations && vary.quantities.on ? (
              <p className="text-sm text-[var(--text-primary)]">
                Quantities vary for each {variesText("quantities")}
                <button type="button" onClick={() => scrollTo("options")} className="mt-1 block font-semibold hover:underline">Edit in variations →</button>
              </p>
            ) : (
              <Input type="number" min={0} value={base.quantity} onChange={(e) => setBase({ ...base, quantity: e.target.value })} className="h-12 w-48 rounded-lg" />
            )}
          </div>

          <div>
            <FieldLabel required>SKU</FieldLabel>
            {hasVariations && vary.skus.on ? (
              <p className="text-sm text-[var(--text-primary)]">
                SKUs vary for each {variesText("skus")}
                <button type="button" onClick={() => scrollTo("options")} className="mt-1 block font-semibold hover:underline">Edit in variations →</button>
              </p>
            ) : (
              <>
                <Input value={base.sku} onChange={(e) => setBase({ ...base, sku: e.target.value })} placeholder="Leave blank to auto-generate" className="h-12 w-72 rounded-lg" />
              </>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            <FieldLabel hint="When this sells out, shoppers can sign up to be alerted when it's back in stock.">Allow restock requests</FieldLabel>
            <Switch checked={allowRestock} onCheckedChange={setAllowRestock} />
          </div>

          <div className="border-t border-[var(--border-color)] pt-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Delivery</h3>
            <p className="text-sm text-[var(--text-secondary)]">Set your processing time and delivery option.</p>
          </div>

          <div>
            <FieldLabel required>Processing profile</FieldLabel>
            {hasVariations && vary.processing.on ? (
              <p className="text-sm text-[var(--text-primary)]">
                Processing varies for each {variesText("processing")}
                <button type="button" onClick={() => scrollTo("options")} className="mt-1 block font-semibold hover:underline">Edit in variations →</button>
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-primary)]">
                Ready to dispatch in
                <Input type="number" min={0} value={base.procMin} onChange={(e) => setBase({ ...base, procMin: e.target.value })} className="h-11 w-20 rounded-lg" />
                –
                <Input type="number" min={0} value={base.procMax} onChange={(e) => setBase({ ...base, procMax: e.target.value })} className="h-11 w-20 rounded-lg" />
                business days
              </div>
            )}
          </div>

          <div>
            <FieldLabel required>Delivery option</FieldLabel>
            {selectedProfile ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] p-4">
                <div>
                  <p className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                    {selectedProfile.name}
                    <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[11px] font-medium">{selectedProfile.pricingType === "FREE" ? "Free" : "Fixed"}</span>
                  </p>
                  {selectedProfile.originPincode && <p className="text-sm text-[var(--text-secondary)]">From {selectedProfile.originPincode}</p>}
                  <p className="text-sm text-[var(--text-secondary)]">{selectedProfile._count?.products ?? 0} active listings</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setProfilePicker(true)} className="px-2 text-sm font-semibold hover:underline">Change</button>
                  <button type="button" onClick={() => setProfileDialog({ ...selectedProfile })} className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-semibold">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {profiles.length > 0 && <PillButton onClick={() => setProfilePicker(true)}>Choose delivery option</PillButton>}
                <PillButton onClick={() => setProfileDialog({ pricingType: "FIXED", name: "", domesticCost: 0 })}><Plus className="h-4 w-4" /> Create delivery option</PillButton>
              </div>
            )}
            {selectedProfile && (
              <div className="mt-3">
                <button type="button" onClick={() => setShowPostage(!showPostage)} className="flex items-center gap-1 text-sm font-semibold text-[var(--text-primary)]">
                  Preview postage cost <ChevronDown className={`h-4 w-4 transition ${showPostage ? "rotate-180" : ""}`} />
                </button>
                {showPostage && (
                  <div className="mt-2 rounded-lg bg-[var(--bg-secondary)] p-3 text-sm">
                    <p>Within India: <b>{selectedProfile.pricingType === "FREE" ? "Free" : money(selectedProfile.domesticCost)}</b></p>
                    <p>International: <b>{selectedProfile.internationalCost != null ? money(selectedProfile.internationalCost) : "Not offered"}</b></p>
                    {(selectedProfile.minDeliveryDays || selectedProfile.maxDeliveryDays) && (
                      <p>Delivery time: {selectedProfile.minDeliveryDays ?? "?"}–{selectedProfile.maxDeliveryDays ?? "?"} days</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <FieldLabel required>Returns and exchanges</FieldLabel>
            {selectedPolicy ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] p-4">
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{policySummary(selectedPolicy)}</p>
                  {(selectedPolicy.acceptReturns || selectedPolicy.acceptExchanges) && (
                    <p className="text-sm text-[var(--text-secondary)]">
                      {selectedPolicy.buyerPaysReturnShipping
                        ? "Buyer is responsible for return postage costs and any loss in value if an item isn't returned in original condition."
                        : "Seller covers return postage costs."}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPolicyPicker(true)} className="rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-semibold">Change policy</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {policies.length > 0 && <PillButton onClick={() => setPolicyPicker(true)}>Choose policy</PillButton>}
                <PillButton onClick={() => setPolicyDialog({ name: "", acceptReturns: true, acceptExchanges: true, windowDays: 7, buyerPaysReturnShipping: true })}><Plus className="h-4 w-4" /> Create policy</PillButton>
              </div>
            )}
          </div>
        </Section>

        {/* ── How it's made ── */}
        <Section id="made" title="How it's made" subtitle="Tell buyers who made this item, what it is and when it was made.">
          {([
            ["Who made it?", WHO_MADE, whoMade, setWhoMade],
            ["What is it?", WHAT_IS_IT, whatIsIt, setWhatIsIt],
            ["When was it made?", WHEN_MADE, whenMade, setWhenMade],
          ] as [string, string[], string, (v: string) => void][]).map(([label, options, value, set]) => (
            <div key={label}>
              <FieldLabel>{label}</FieldLabel>
              <select value={value} onChange={(e) => set(e.target.value)} className="h-12 w-full max-w-md rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)]">
                <option value="">Select an option</option>
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </Section>

        {/* ── Settings ── */}
        <Section id="settings" title="Settings" subtitle="Choose how this listing will display in your shop.">
          <div className="flex items-start justify-between gap-4">
            <FieldLabel hint="Featured listings appear first in your shop's featured section.">Feature this listing</FieldLabel>
            <Switch checked={featured} onCheckedChange={setFeatured} />
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              Status: <b className="text-[var(--text-primary)]">{mode === "create" ? "New" : isActive ? "Active" : "Draft"}</b>. Use <b>Publish</b> to make the listing live or <b>Save as draft</b> to keep it hidden from buyers.
            </span>
          </div>
        </Section>
      </div>

      {/* Sticky footer */}
      <div className="sticky -bottom-4 z-20 -mx-4 -mb-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3 lg:-bottom-8 lg:-mx-8 lg:-mb-8 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button type="button" onClick={() => navigate("/products")} className="text-sm font-semibold text-[var(--text-primary)] hover:underline" disabled={!!saving}>Cancel</button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-2 border-[var(--text-primary)] font-semibold"
              disabled={mode === "create" || !slug || !!saving}
              title={mode === "create" ? "Save the listing first to preview it" : "Open on your storefront"}
              onClick={() => window.open(`${STOREFRONT_URL}/products/${slug}`, "_blank", "noopener")}
            >
              Preview
            </Button>
            <Button type="button" variant="outline" className="rounded-full border-2 border-[var(--text-primary)] font-semibold" disabled={!!saving} onClick={() => save(false)}>
              {saving === "draft" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save as draft
            </Button>
            <Button type="button" className="rounded-full px-6 font-semibold" disabled={!!saving} onClick={() => save(true)}>
              {saving === "publish" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Publish
            </Button>
          </div>
        </div>
      </div>

      {/* ── Variation: pick ── */}
      <Dialog open={variationStep === "pick"} onOpenChange={(o) => !o && setVariationStep(draftVariations.length ? "manage" : null)}>
        <DialogContent className="max-w-2xl rounded-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add up to {MAX_VARIATIONS} variations for your item</DialogTitle>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
            <li>If you use the options listed here, buyers can find your listing via search filters.</li>
            <li>You can create your own custom options, but buyers won't be able to filter for these in search results.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {allAttributes.filter((a) => !draftVariations.some((v) => v.attributeId === a.id || v.name.toLowerCase() === a.name.toLowerCase())).map((a) => (
              <button key={a.id} type="button" onClick={() => startVariation(a)} className="rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--border-color)]">
                {a.name}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => startVariation(null)} className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Plus className="h-4 w-4" /> Create your own
          </button>
          <DialogFooter className="mt-4 sm:justify-start">
            <button type="button" className="text-sm font-semibold hover:underline" onClick={() => setVariationStep(draftVariations.length ? "manage" : null)}>Cancel</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Variation: edit ── */}
      <Dialog open={variationStep === "edit" && !!editingVar} onOpenChange={(o) => { if (!o) { setEditingVar(null); setVariationStep(draftVariations.length ? "manage" : null); } }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl p-8">
          {editingVar && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{editingVar.attributeId ? editingVar.name : "Custom variation"}</DialogTitle>
              </DialogHeader>
              {!editingVar.attributeId && (
                <div>
                  <Label className="font-semibold">Name*</Label>
                  <Input value={editingVar.name} onChange={(e) => setEditingVar({ ...editingVar, name: e.target.value })} className="mt-1 h-12 rounded-lg" maxLength={40} />
                </div>
              )}
              <ToggleRow checked={editingVar.linkPhotos} onChange={(v) => setEditingVar({ ...editingVar, linkPhotos: v })}>Link photos to this variation</ToggleRow>
              <div className="border-t border-[var(--border-color)] pt-4">
                <p className="font-semibold">Options</p>
                <p className="text-sm text-[var(--text-secondary)]">Buyers can choose from the following options.</p>
                <div className="mt-3 flex items-center gap-3">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(optionInput); } }}
                    placeholder="Enter an option..."
                    className="h-12 max-w-sm rounded-lg"
                  />
                  <button type="button" onClick={() => addOption(optionInput)} className="text-sm font-semibold hover:underline">Add</button>
                </div>
                {editingVar.attributeId && (attrValues[editingVar.attributeId] || []).some((av) => !editingVar.options.some((o) => o.value.toLowerCase() === av.value.toLowerCase())) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(attrValues[editingVar.attributeId] || [])
                      .filter((av) => !editingVar.options.some((o) => o.value.toLowerCase() === av.value.toLowerCase()))
                      .map((av) => (
                        <button key={av.id} type="button" onClick={() => setEditingVar({ ...editingVar, options: [...editingVar.options, { value: av.value, valueId: av.id, photoKey: null }] })} className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs hover:bg-[var(--bg-secondary)]">
                          + {av.value}
                        </button>
                      ))}
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  {editingVar.options.map((o, i) => {
                    const ph = o.photoKey ? photoByKey.get(o.photoKey) : undefined;
                    return (
                      <div key={`${o.value}-${i}`} className="flex items-center gap-3 rounded-lg border border-[var(--border-color)] px-3 py-2.5">
                        <div className="flex flex-col">
                          <button type="button" disabled={i === 0} onClick={() => {
                            const opts = [...editingVar.options];
                            [opts[i - 1], opts[i]] = [opts[i], opts[i - 1]];
                            setEditingVar({ ...editingVar, options: opts });
                          }} className="text-[var(--text-secondary)] disabled:opacity-30" title="Move up"><ChevronDown className="h-3.5 w-3.5 rotate-180" /></button>
                          <button type="button" disabled={i === editingVar.options.length - 1} onClick={() => {
                            const opts = [...editingVar.options];
                            [opts[i + 1], opts[i]] = [opts[i], opts[i + 1]];
                            setEditingVar({ ...editingVar, options: opts });
                          }} className="text-[var(--text-secondary)] disabled:opacity-30" title="Move down"><ChevronDown className="h-3.5 w-3.5" /></button>
                        </div>
                        {editingVar.linkPhotos && (
                          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded bg-[var(--bg-secondary)]">
                            {ph ? <img src={ph.url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-[var(--text-secondary)]" />}
                          </div>
                        )}
                        <span className="flex-1 text-sm">{o.value}</span>
                        {editingVar.linkPhotos && (
                          <button type="button" onClick={() => setPhotoPicker({ target: "option", optionIndex: i })} className="flex items-center gap-1.5 text-sm font-medium hover:underline">
                            <ImageIcon className="h-4 w-4" /> Select photo
                          </button>
                        )}
                        <button type="button" onClick={() => setEditingVar({ ...editingVar, options: editingVar.options.filter((_, j) => j !== i) })} title="Delete option" className="text-[var(--text-secondary)] hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <DialogFooter className="mt-2 flex items-center justify-between sm:justify-between">
                <button type="button" className="flex items-center gap-1.5 text-sm font-semibold hover:underline" onClick={() => {
                  setDraftVariations((p) => p.filter((v) => v.key !== editingVar.key));
                  setEditingVar(null);
                  setVariationStep(draftVariations.filter((v) => v.key !== editingVar.key).length ? "manage" : null);
                }}>
                  <Trash2 className="h-4 w-4" /> Delete variation
                </button>
                <Button type="button" className="rounded-full px-6" onClick={saveEditingVar}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Variation: manage ── */}
      <Dialog open={variationStep === "manage"} onOpenChange={(o) => !o && setVariationStep(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl">Manage variations</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {draftVariations.map((v) => (
              <div key={v.key} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border-color)] p-4">
                <div className="min-w-0">
                  <p className="font-semibold">{v.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{v.options.length} option{v.options.length === 1 ? "" : "s"}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {v.options.map((o) => (
                      <span key={o.value} className="flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 text-xs">
                        {v.linkPhotos && o.photoKey && photoByKey.get(o.photoKey) && <img src={photoByKey.get(o.photoKey)!.url} alt="" className="h-4 w-4 rounded-full object-cover" />}
                        {o.value}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button type="button" title="Edit" onClick={() => { setEditingVar({ ...v, options: [...v.options] }); setVariationStep("edit"); if (v.attributeId) ensureAttrValues(v.attributeId).catch(() => { /* optional */ }); }} className="rounded-full bg-[var(--bg-secondary)] p-2"><Pencil className="h-4 w-4" /></button>
                  <button type="button" title="Delete" onClick={() => setDraftVariations((p) => p.filter((x) => x.key !== v.key))} className="rounded-full bg-[var(--bg-secondary)] p-2"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          {draftVariations.length < MAX_VARIATIONS && (
            <div><PillButton onClick={() => setVariationStep("pick")}><Plus className="h-4 w-4" /> Add a variation</PillButton></div>
          )}

          {draftVariations.length > 0 && (
            <div className="space-y-4 border-t border-[var(--border-color)] pt-5">
              {([
                ["prices", "Prices vary"],
                ["processing", "Processing profiles vary"],
                ["quantities", "Quantities vary"],
                ["skus", "SKUs vary"],
              ] as [VaryField, string][]).map(([f, label]) => (
                <div key={f} className="flex flex-wrap items-center gap-3">
                  <Switch checked={draftVary[f].on} onCheckedChange={(on) => setDraftVary({ ...draftVary, [f]: { ...draftVary[f], on } })} />
                  <span className="text-sm">{label}{draftVary[f].on && " for each"}</span>
                  {draftVary[f].on && (
                    <select
                      value={draftVary[f].by}
                      onChange={(e) => setDraftVary({ ...draftVary, [f]: { ...draftVary[f], by: e.target.value } })}
                      className="h-10 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm"
                    >
                      {draftVariations.length > 1 && <option value="all">{draftVariations.map((v) => v.name).join(" and ")}</option>}
                      {draftVariations.map((v) => <option key={v.key} value={v.key}>{v.name}</option>)}
                    </select>
                  )}
                </div>
              ))}
              {Object.values(draftVary).some((v) => v.on) && (
                <div className="flex items-start gap-2 rounded-lg bg-[var(--bg-secondary)] p-3 text-sm">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  Because you are varying for each {draftVariations.map((v) => v.name).join(" and ")} in at least one area, {draftVariations.reduce((n, v) => n * Math.max(v.options.length, 1), 1)} option combinations will be created automatically.
                </div>
              )}
            </div>
          )}
          <DialogFooter className="mt-2 flex items-center justify-between sm:justify-between">
            <button type="button" className="text-sm font-semibold hover:underline" onClick={() => setVariationStep(null)}>Cancel</button>
            <Button type="button" className="rounded-full px-6" disabled={applyingVariations} onClick={() => {
              let next = { ...draftVary };
              // "by" must reference a variation that still exists
              (Object.keys(next) as VaryField[]).forEach((k) => {
                const by = next[k].by;
                const valid = by === "all" ? draftVariations.length > 1 : draftVariations.some((v) => v.key === by);
                if (!valid) next[k] = { ...next[k], by: draftVariations.length === 1 ? draftVariations[0].key : "all" };
              });
              // with variations but nothing varying, price/qty/SKU per combination is the useful default
              if (draftVariations.length && !Object.values(next).some((v) => v.on)) {
                next = { ...next, prices: { ...next.prices, on: true }, quantities: { ...next.quantities, on: true }, skus: { ...next.skus, on: true } };
              }
              setDraftVary(next);
              applyVariations(next);
            }}>
              {applyingVariations && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Photo picker ── */}
      <Dialog open={!!photoPicker} onOpenChange={(o) => !o && setPhotoPicker(null)}>
        <DialogContent className="max-w-xl rounded-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-xl">Link a photo to this option</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">Choose the photo you want to show buyers when they view this option.</p>
          {photos.length === 0 && <p className="text-sm">Upload photos in the Photo & Video section first.</p>}
          <div className="grid grid-cols-4 gap-2">
            {photos.map((ph) => (
              <button key={ph.key} type="button" onClick={() => {
                if (photoPicker?.target === "option" && editingVar) {
                  setEditingVar({ ...editingVar, options: editingVar.options.map((o, j) => (j === photoPicker.optionIndex ? { ...o, photoKey: ph.key } : o)) });
                } else if (photoPicker?.target === "row") {
                  setRows((rs) => rs.map((r) => (r.key === photoPicker.rowKey ? { ...r, photoKeys: [ph.key] } : r)));
                }
                setPhotoPicker(null);
              }} className="aspect-square overflow-hidden rounded-lg border border-[var(--border-color)] hover:ring-2 hover:ring-[var(--text-primary)]">
                <img src={ph.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <DialogFooter className="sm:justify-start">
            <PillButton onClick={() => {
              if (photoPicker?.target === "option" && editingVar) {
                setEditingVar({ ...editingVar, options: editingVar.options.map((o, j) => (j === photoPicker.optionIndex ? { ...o, photoKey: null } : o)) });
              } else if (photoPicker?.target === "row") {
                setRows((rs) => rs.map((r) => (r.key === photoPicker.rowKey ? { ...r, photoKeys: [] } : r)));
              }
              setPhotoPicker(null);
            }}>None</PillButton>
            <button type="button" className="ml-3 text-sm font-semibold hover:underline" onClick={() => setPhotoPicker(null)}>Cancel</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delivery profile picker ── */}
      <Dialog open={profilePicker} onOpenChange={setProfilePicker}>
        <DialogContent className="max-w-lg rounded-2xl p-8">
          <DialogHeader><DialogTitle className="text-xl">Delivery options</DialogTitle></DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {profiles.map((p) => (
              <div key={p.id} className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${p.id === deliveryProfileId ? "border-[var(--text-primary)]" : "border-[var(--border-color)]"}`}>
                <button type="button" className="flex-1 text-left" onClick={() => { setDeliveryProfileId(p.id); setProfilePicker(false); }}>
                  <p className="font-semibold">{p.name} <span className="text-xs font-normal text-[var(--text-secondary)]">({p.pricingType === "FREE" ? "Free" : money(p.domesticCost)})</span></p>
                  <p className="text-xs text-[var(--text-secondary)]">{p._count?.products ?? 0} active listings</p>
                </button>
                <button type="button" title="Delete profile" className="text-[var(--text-secondary)] hover:text-red-600" onClick={async () => {
                  if (!window.confirm(`Delete delivery option "${p.name}"? Listings using it will need a new one.`)) return;
                  try { await deliveryApi.remove(p.id); if (deliveryProfileId === p.id) setDeliveryProfileId(""); await loadProfiles(); } catch (err) { toast.error(apiMsg(err, "Delete failed")); }
                }}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <DialogFooter className="sm:justify-start">
            <PillButton onClick={() => { setProfilePicker(false); setProfileDialog({ pricingType: "FIXED", name: "", domesticCost: 0 }); }}><Plus className="h-4 w-4" /> Create delivery option</PillButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delivery profile edit ── */}
      <Dialog open={!!profileDialog} onOpenChange={(o) => !o && setProfileDialog(null)}>
        <DialogContent className="max-w-lg rounded-2xl p-8">
          <DialogHeader><DialogTitle className="text-xl">{profileDialog?.id ? "Edit delivery option" : "Create delivery option"}</DialogTitle></DialogHeader>
          {profileDialog && (
            <div className="space-y-4">
              <div>
                <Label>Profile name*</Label>
                <Input value={profileDialog.name || ""} onChange={(e) => setProfileDialog({ ...profileDialog, name: e.target.value })} placeholder="e.g. FREE DELIVERY 40" className="mt-1 h-11" />
              </div>
              <div>
                <Label>Origin pincode</Label>
                <Input value={profileDialog.originPincode || ""} onChange={(e) => setProfileDialog({ ...profileDialog, originPincode: e.target.value })} className="mt-1 h-11" />
              </div>
              <div className="flex gap-4">
                {(["FIXED", "FREE"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={profileDialog.pricingType === t} onChange={() => setProfileDialog({ ...profileDialog, pricingType: t })} />
                    {t === "FIXED" ? "Fixed price" : "Free delivery"}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {profileDialog.pricingType === "FIXED" && (
                  <div>
                    <Label>Within India (₹)</Label>
                    <Input type="number" min={0} value={String(profileDialog.domesticCost ?? "")} onChange={(e) => setProfileDialog({ ...profileDialog, domesticCost: e.target.value })} className="mt-1 h-11" />
                  </div>
                )}
                <div>
                  <Label>International (₹, blank = not offered)</Label>
                  <Input type="number" min={0} value={profileDialog.internationalCost == null ? "" : String(profileDialog.internationalCost)} onChange={(e) => setProfileDialog({ ...profileDialog, internationalCost: e.target.value === "" ? null : e.target.value })} className="mt-1 h-11" />
                </div>
                <div>
                  <Label>Delivery min days</Label>
                  <Input type="number" min={0} value={profileDialog.minDeliveryDays ?? ""} onChange={(e) => setProfileDialog({ ...profileDialog, minDeliveryDays: e.target.value === "" ? null : Number(e.target.value) })} className="mt-1 h-11" />
                </div>
                <div>
                  <Label>Delivery max days</Label>
                  <Input type="number" min={0} value={profileDialog.maxDeliveryDays ?? ""} onChange={(e) => setProfileDialog({ ...profileDialog, maxDeliveryDays: e.target.value === "" ? null : Number(e.target.value) })} className="mt-1 h-11" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <button type="button" className="text-sm font-semibold hover:underline" onClick={() => setProfileDialog(null)}>Cancel</button>
            <Button type="button" className="rounded-full px-6" disabled={dialogBusy} onClick={saveProfile}>{dialogBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Return policy picker ── */}
      <Dialog open={policyPicker} onOpenChange={setPolicyPicker}>
        <DialogContent className="max-w-lg rounded-2xl p-8">
          <DialogHeader><DialogTitle className="text-xl">Returns and exchanges</DialogTitle></DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {policies.map((p) => (
              <div key={p.id} className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${p.id === returnPolicyId ? "border-[var(--text-primary)]" : "border-[var(--border-color)]"}`}>
                <button type="button" className="flex-1 text-left" onClick={() => { setReturnPolicyId(p.id); setPolicyPicker(false); }}>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{policySummary(p)}</p>
                </button>
                <button type="button" title="Edit policy" className="text-[var(--text-secondary)]" onClick={() => { setPolicyPicker(false); setPolicyDialog({ ...p }); }}><Pencil className="h-4 w-4" /></button>
                <button type="button" title="Delete policy" className="text-[var(--text-secondary)] hover:text-red-600" onClick={async () => {
                  if (!window.confirm(`Delete policy "${p.name}"?`)) return;
                  try { await returnApi.remove(p.id); if (returnPolicyId === p.id) setReturnPolicyId(""); await loadPolicies(); } catch (err) { toast.error(apiMsg(err, "Delete failed")); }
                }}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <DialogFooter className="sm:justify-start">
            <PillButton onClick={() => { setPolicyPicker(false); setPolicyDialog({ name: "", acceptReturns: true, acceptExchanges: true, windowDays: 7, buyerPaysReturnShipping: true }); }}><Plus className="h-4 w-4" /> Create policy</PillButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Return policy edit ── */}
      <Dialog open={!!policyDialog} onOpenChange={(o) => !o && setPolicyDialog(null)}>
        <DialogContent className="max-w-lg rounded-2xl p-8">
          <DialogHeader><DialogTitle className="text-xl">{policyDialog?.id ? "Edit policy" : "Create policy"}</DialogTitle></DialogHeader>
          {policyDialog && (
            <div className="space-y-4">
              <div>
                <Label>Policy name*</Label>
                <Input value={policyDialog.name || ""} onChange={(e) => setPolicyDialog({ ...policyDialog, name: e.target.value })} placeholder="e.g. 7-day returns" className="mt-1 h-11" />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!policyDialog.acceptReturns} onChange={(e) => setPolicyDialog({ ...policyDialog, acceptReturns: e.target.checked })} /> Accept returns</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!policyDialog.acceptExchanges} onChange={(e) => setPolicyDialog({ ...policyDialog, acceptExchanges: e.target.checked })} /> Accept exchanges</label>
              {(policyDialog.acceptReturns || policyDialog.acceptExchanges) && (
                <>
                  <div>
                    <Label>Return and exchange window</Label>
                    <select value={policyDialog.windowDays ?? 7} onChange={(e) => setPolicyDialog({ ...policyDialog, windowDays: Number(e.target.value) })} className="mt-1 block h-11 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm">
                      {RETURN_WINDOWS.map((d) => <option key={d} value={d}>{d} days</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={policyDialog.buyerPaysReturnShipping !== false} onChange={(e) => setPolicyDialog({ ...policyDialog, buyerPaysReturnShipping: e.target.checked })} /> Buyer pays return postage</label>
                </>
              )}
            </div>
          )}
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <button type="button" className="text-sm font-semibold hover:underline" onClick={() => setPolicyDialog(null)}>Cancel</button>
            <Button type="button" className="rounded-full px-6" disabled={dialogBusy} onClick={savePolicy}>{dialogBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
