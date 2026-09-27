import { useState, useEffect, Fragment, useMemo } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { products, categories } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SafeRender } from "@/components/SafeRender";
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  X,
  Settings,
  ChevronDown,
  Eye,
  Star,
  Power,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteProductDialog } from "@/components/DeleteProductDialog";
import { useDebounce } from "@/utils/debounce";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/context/LanguageContext";
import ListingEditor from "./ListingEditor";
import { formatCurrency } from "@/lib/utils";

export default function ProductsPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNewProduct = location.pathname.includes("/new");
  const isEditProduct = !!id;

  // Show appropriate content based on route
  if (isNewProduct) {
    return <ListingEditor mode="create" />;
  }

  if (isEditProduct) {
    return <ListingEditor key={id} mode="edit" productId={id} />;
  }

  return <ProductsList />;
}

// Product List Component (Etsy-style listings grid)
type ListingStatus = "all" | "active" | "inactive";

const getListingImage = (product: any) => {
  if (product.images?.length) {
    return (product.images.find((img: any) => img.isPrimary) || product.images[0])?.url;
  }
  const v = product.variants?.find((x: any) => x.images?.length);
  if (v) return (v.images.find((img: any) => img.isPrimary) || v.images[0])?.url;
  return null;
};

const getListingPriceRange = (product: any) => {
  const prices = (product.variants || [])
    .map((v: any) => Number(v.salePrice || v.price))
    .filter((n: number) => !isNaN(n) && n > 0);
  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

const getListingStock = (product: any) =>
  (product.variants || []).reduce(
    (sum: number, v: any) => sum + (Number(v.stock ?? v.quantity) || 0),
    0
  );

const getListingSku = (product: any) =>
  product.sku || product.variants?.find((v: any) => v.sku)?.sku || "";

const inr = (n: number) => formatCurrency(n);

function ProductsList() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [productsList, setProductsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [status, setStatus] = useState<ListingStatus>("all");
  const [sortKey, setSortKey] = useState("createdAt:desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      return (localStorage.getItem("products-view") as "grid" | "list") || "grid";
    } catch {
      return "grid";
    }
  });
  const [statusCounts, setStatusCounts] = useState({ all: 0, active: 0, inactive: 0 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForceDeleteDialogOpen, setIsForceDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const PAGE_SIZE = 20;

  useEffect(() => {
    try {
      localStorage.setItem("products-view", viewMode);
    } catch {
      // storage unavailable (private mode)
    }
  }, [viewMode]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const [sort, order] = sortKey.split(":");
        const response = await products.getProducts({
          page: currentPage,
          limit: PAGE_SIZE,
          sort,
          order: order as "asc" | "desc",
          ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
          ...(selectedCategory && { category: selectedCategory }),
          ...(status !== "all" && { isActive: status === "active" ? "true" : "false" }),
        });
        if (response.data.success) {
          setProductsList(response.data.data?.products || []);
          setTotalPages(response.data.data?.pagination?.pages || 1);
          setTotalCount(response.data.data?.pagination?.total || 0);
          setError(null);
        } else {
          setError(response.data.message || "Failed to fetch products");
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to load products. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [currentPage, debouncedSearchQuery, selectedCategory, status, sortKey, reloadKey]);

  useEffect(() => {
    const base = {
      limit: 1,
      ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
      ...(selectedCategory && { category: selectedCategory }),
    };
    Promise.all([
      products.getProducts(base),
      products.getProducts({ ...base, isActive: "true" }),
      products.getProducts({ ...base, isActive: "false" }),
    ])
      .then(([a, b, c]) =>
        setStatusCounts({
          all: a.data.data?.pagination?.total || 0,
          active: b.data.data?.pagination?.total || 0,
          inactive: c.data.data?.pagination?.total || 0,
        })
      )
      .catch(() => { });
  }, [debouncedSearchQuery, selectedCategory, reloadKey]);

  useEffect(() => {
    categories
      .getCategories()
      .then((r) => {
        if (r.data.success) setCategoriesList(r.data.data?.categories || []);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    setSelectedIds([]);
  }, [currentPage, debouncedSearchQuery, selectedCategory, status, sortKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  const hierarchicalCategories = useMemo(
    () =>
      categoriesList
        .filter((c) => !c.parentId)
        .map((p) => ({ ...p, children: categoriesList.filter((c) => c.parentId === p.id) })),
    [categoriesList]
  );

  const renderCategoryOption = (category: any, level = 0): any => (
    <Fragment key={category.id}>
      <option value={category.id}>
        {level > 0 ? "↳ ".repeat(level) : ""}
        {category.name}
      </option>
      {category.children?.map((child: any) => renderCategoryOption(child, level + 1))}
    </Fragment>
  );

  const updateLocal = (id: string, patch: any) =>
    setProductsList((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const patchProduct = async (id: string, fields: Record<string, string>) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    const res = await products.updateProduct(id, fd as any);
    if (!res.data.success) throw new Error(res.data.message || "Update failed");
  };

  const handleToggleProductStatus = async (id: string, current: boolean) => {
    try {
      await patchProduct(id, { isActive: String(!current) });
      updateLocal(id, { isActive: !current });
      toast.success(`Listing ${current ? "deactivated" : "activated"}`);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleToggleFeatured = async (id: string, current: boolean) => {
    updateLocal(id, { featured: !current });
    try {
      await patchProduct(id, { featured: String(!current) });
    } catch (err: any) {
      updateLocal(id, { featured: current });
      toast.error(err.message || "Failed to update featured");
    }
  };

  const handleDeleteProduct = async (productId: string, force = false) => {
    setDeletingProduct(true);
    try {
      const response = await products.deleteProduct(productId, force);
      const msg: string = response.data.message || "";
      if (!response.data.success) {
        toast.error(msg || "Failed to delete product");
      } else if (!force && msg.includes("has associated orders") && msg.includes("cannot be deleted")) {
        setProductToDelete(productId);
        setIsForceDeleteDialogOpen(true);
      } else if (msg.includes("cannot be deleted") && msg.includes("marked as inactive")) {
        toast.success("Product marked as inactive");
        updateLocal(productId, { isActive: false });
        setIsDeleteDialogOpen(false);
        setIsForceDeleteDialogOpen(false);
        refresh();
      } else {
        toast.success("Product deleted successfully");
        setProductsList((prev) => prev.filter((p) => p.id !== productId));
        setIsDeleteDialogOpen(false);
        setIsForceDeleteDialogOpen(false);
        refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while deleting the product");
    } finally {
      setDeletingProduct(false);
    }
  };

  const handleMarkAsInactive = async (productId: string) => {
    try {
      await patchProduct(productId, { isActive: "false" });
      updateLocal(productId, { isActive: false });
      toast.success("Product marked as inactive successfully");
      setIsForceDeleteDialogOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark product as inactive");
    }
  };

  const runBulk = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    let ok = 0;
    for (const id of selectedIds) {
      try {
        if (action === "delete") {
          const r = await products.deleteProduct(id, false);
          if (r.data.success) ok++;
        } else {
          await patchProduct(id, { isActive: String(action === "activate") });
          ok++;
        }
      } catch {
        /* counted as failure */
      }
    }
    setBulkBusy(false);
    setBulkDeleteOpen(false);
    const failed = selectedIds.length - ok;
    toast[failed ? "warning" : "success"](
      `${ok} listing${ok === 1 ? "" : "s"} updated${failed ? `, ${failed} failed` : ""}`
    );
    setSelectedIds([]);
    refresh();
  };

  const allOnPageSelected =
    productsList.length > 0 && productsList.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () =>
    setSelectedIds(allOnPageSelected ? [] : productsList.map((p) => p.id));

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const GearMenu = ({ product }: { product: any }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-0.5 rounded-full px-2 py-1 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          title="Options"
        >
          <Settings className="h-4 w-4" />
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-lg">
        <DropdownMenuItem onClick={() => navigate(`/products/edit/${product.id}`)}>
          <Edit className="h-4 w-4 mr-2" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/products/${product.id}`)}>
          <Eye className="h-4 w-4 mr-2" /> View details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleToggleFeatured(product.id, !!product.featured)}>
          <Star className="h-4 w-4 mr-2" /> {product.featured ? "Remove from featured" : "Mark as featured"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleToggleProductStatus(product.id, product.isActive)}>
          <Power className="h-4 w-4 mr-2" /> {product.isActive ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[var(--border-color)]" />
        <DropdownMenuItem
          className="text-[var(--destructive)]"
          onClick={() => {
            setProductToDelete(product.id);
            setIsDeleteDialogOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const ListingMeta = ({ product }: { product: any }) => {
    const range = getListingPriceRange(product);
    const stock = getListingStock(product);
    const sku = getListingSku(product);
    const primaryCat = product.categories?.find((c: any) => c.isPrimary) || product.categories?.[0];
    return (
      <div className="space-y-0.5 text-xs text-[var(--text-secondary)]">
        {sku && <p className="truncate">{sku}</p>}
        <p className={stock === 0 ? "text-[var(--destructive)] font-medium" : ""}>
          {stock === 0 ? "Out of stock" : `${stock} in stock`}
        </p>
        <p className="text-[var(--text-primary)] font-medium">
          {range
            ? range.min === range.max
              ? inr(range.min)
              : `${inr(range.min)} – ${inr(range.max)}`
            : "No price"}
        </p>
        <p className="truncate">
          {primaryCat?.name || "Uncategorized"}
          {product.hasVariants && product.variants?.length > 0 && ` · ${product.variants.length} variants`}
        </p>
      </div>
    );
  };

  const ListingStats = ({ product }: { product: any }) => {
    const s = product.stats || {};
    const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
    return (
      <div className="space-y-2 text-[11px]">
        <div>
          <p className="font-semibold uppercase tracking-wide text-[var(--text-primary)]">Last 30 days</p>
          <p className="text-[var(--text-secondary)]">
            {plural(s.visits30d || 0, "visit")} · {plural(s.favourites30d || 0, "favourite")}
          </p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-[var(--text-primary)]">All time</p>
          <p className="text-[var(--text-secondary)]">
            {plural(s.sales || 0, "sale")} · {inr(Math.round(s.revenue || 0))} revenue
          </p>
          <p className="text-[var(--text-secondary)]">
            {plural(s.favouritesAll || 0, "favourite")} · {plural(product._count?.reviews || 0, "review")}
          </p>
        </div>
      </div>
    );
  };

  const statusOptions: { key: ListingStatus; label: string; count: number }[] = [
    { key: "all", label: "All", count: statusCounts.all },
    { key: "active", label: "Active", count: statusCounts.active },
    { key: "inactive", label: "Inactive / Draft", count: statusCounts.inactive },
  ];

  return (
    <div className="space-y-5">
      <DeleteProductDialog
        open={isDeleteDialogOpen}
        setOpen={setIsDeleteDialogOpen}
        title={t("products.details.dialogs.delete_title")}
        description={t("products.details.dialogs.delete_desc")}
        onConfirm={() => productToDelete && handleDeleteProduct(productToDelete, false)}
        loading={deletingProduct}
        confirmText={t("products.details.actions.delete")}
      />
      <DeleteProductDialog
        open={isForceDeleteDialogOpen}
        setOpen={setIsForceDeleteDialogOpen}
        title={t("products.details.dialogs.force_delete_title")}
        description={t("products.details.dialogs.force_delete_desc")}
        onConfirm={() => productToDelete && handleDeleteProduct(productToDelete, true)}
        loading={deletingProduct}
        confirmText={t("products.details.actions.delete")}
        isDestructive={true}
        secondaryAction={{
          text: t("products.details.dialogs.mark_inactive"),
          onClick: () => productToDelete && handleMarkAsInactive(productToDelete),
        }}
      />
      <DeleteProductDialog
        open={bulkDeleteOpen}
        setOpen={setBulkDeleteOpen}
        title={`Delete ${selectedIds.length} listing${selectedIds.length === 1 ? "" : "s"}?`}
        description="Listings with existing orders will be marked inactive instead of deleted."
        onConfirm={() => runBulk("delete")}
        loading={bulkBusy}
        confirmText="Delete"
        isDestructive={true}
      />

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Listings</h1>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-96">
            <Input
              type="search"
              placeholder="Search by title or description"
              className="rounded-full pr-10"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          </div>
          <Button asChild className="rounded-full whitespace-nowrap">
            <Link to="/products/new">
              <Plus className="mr-1.5 h-4 w-4" /> Add a listing
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-5 lg:flex-row">
        {/* Main */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Bulk action bar */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-[var(--border-color)] px-3 text-sm">
              <Checkbox checked={allOnPageSelected} onCheckedChange={toggleSelectAll} />
              {selectedIds.length > 0 && <span className="text-xs">{selectedIds.length}</span>}
            </label>
            <Button variant="outline" size="sm" className="rounded-full" disabled={!selectedIds.length || bulkBusy} onClick={() => runBulk("activate")}>
              Activate
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" disabled={!selectedIds.length || bulkBusy} onClick={() => runBulk("deactivate")}>
              Deactivate
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" disabled={!selectedIds.length || bulkBusy} onClick={() => setBulkDeleteOpen(true)}>
              Delete
            </Button>
            {bulkBusy && <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />}
            <span className="ml-auto text-xs text-[var(--text-secondary)]">
              {totalCount} listing{totalCount === 1 ? "" : "s"}
            </span>
          </div>

          {error && productsList.length === 0 ? (
            <Card className="flex flex-col items-center py-16 text-center">
              <AlertTriangle className="mb-3 h-8 w-8 text-[var(--destructive)]" />
              <p className="mb-4 text-[var(--text-secondary)]">{error}</p>
              <Button variant="outline" onClick={refresh}>Try Again</Button>
            </Card>
          ) : isLoading && productsList.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
            </div>
          ) : productsList.length === 0 ? (
            <Card className="py-16 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-[var(--text-secondary)]" />
              <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">{t("products.list.table.no_products")}</h3>
              <p className="mx-auto mb-6 max-w-sm text-sm text-[var(--text-secondary)]">{t("products.list.table.empty_desc")}</p>
              <Button asChild className="rounded-full">
                <Link to="/products/new"><Plus className="mr-1.5 h-4 w-4" /> Add a listing</Link>
              </Button>
            </Card>
          ) : (
            <div className={`relative ${isLoading ? "pointer-events-none opacity-60" : ""}`}>
              <SafeRender>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {productsList.map((product) => {
                      const img = getListingImage(product);
                      const selected = selectedIds.includes(product.id);
                      return (
                        <div
                          key={product.id}
                          className={`group flex flex-col overflow-hidden rounded-lg border bg-[var(--bg-card)] transition-shadow hover:shadow-md ${selected ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border-color)]"}`}
                        >
                          <Link to={`/products/edit/${product.id}`} className="relative block aspect-[4/3] bg-[var(--bg-secondary)]">
                            {img ? (
                              <img src={img} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-[var(--text-secondary)]" />
                              </div>
                            )}
                            {!product.isActive && (
                              <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Inactive</span>
                            )}
                          </Link>
                          <div className="flex flex-1 flex-col gap-3 p-3">
                            <Link to={`/products/edit/${product.id}`} className="line-clamp-1 text-sm font-semibold text-[var(--text-primary)] hover:underline" title={product.name}>
                              {product.name}
                            </Link>
                            <ListingMeta product={product} />
                            <ListingStats product={product} />
                          </div>
                          <div className="flex items-center justify-between border-t border-[var(--border-color)] px-3 py-2">
                            <Checkbox checked={selected} onCheckedChange={() => toggleSelect(product.id)} />
                            <button
                              type="button"
                              title={product.featured ? "Featured" : "Mark as featured"}
                              onClick={() => handleToggleFeatured(product.id, !!product.featured)}
                              className="rounded-full p-1 hover:bg-[var(--bg-secondary)]"
                            >
                              <Star className={`h-4 w-4 ${product.featured ? "fill-amber-400 text-amber-400" : "text-[var(--text-secondary)]"}`} />
                            </button>
                            <GearMenu product={product} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="divide-y divide-[var(--border-color)] overflow-hidden">
                    {productsList.map((product) => {
                      const img = getListingImage(product);
                      const selected = selectedIds.includes(product.id);
                      return (
                        <div key={product.id} className={`flex items-center gap-4 p-3 ${selected ? "bg-[var(--accent)]/5" : "hover:bg-[var(--bg-secondary)]"}`}>
                          <Checkbox checked={selected} onCheckedChange={() => toggleSelect(product.id)} />
                          <Link to={`/products/edit/${product.id}`} className="h-16 w-20 flex-shrink-0 overflow-hidden rounded bg-[var(--bg-secondary)]">
                            {img ? <img src={img} alt={product.name} className="h-full w-full object-cover" loading="lazy" /> : null}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link to={`/products/edit/${product.id}`} className="block truncate text-sm font-semibold text-[var(--text-primary)] hover:underline">
                              {product.name}
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-x-4">
                              <ListingMeta product={product} />
                            </div>
                          </div>
                          <div className="hidden w-40 md:block">
                            <ListingStats product={product} />
                          </div>
                          <Badge className={product.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}>
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <button type="button" onClick={() => handleToggleFeatured(product.id, !!product.featured)} className="rounded-full p-1 hover:bg-[var(--bg-secondary)]">
                            <Star className={`h-4 w-4 ${product.featured ? "fill-amber-400 text-amber-400" : "text-[var(--text-secondary)]"}`} />
                          </button>
                          <GearMenu product={product} />
                        </div>
                      );
                    })}
                  </Card>
                )}
              </SafeRender>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" className="rounded-full" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-[var(--text-secondary)]">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" className="rounded-full" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="grid w-full flex-shrink-0 grid-cols-2 gap-4 lg:block lg:w-60 lg:space-y-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Grid view"
              onClick={() => setViewMode("grid")}
              className={`rounded-full border p-2 ${viewMode === "grid" ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-card)]" : "border-[var(--border-color)] text-[var(--text-primary)]"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="List view"
              onClick={() => setViewMode("list")}
              className={`rounded-full border p-2 ${viewMode === "list" ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-card)]" : "border-[var(--border-color)] text-[var(--text-primary)]"}`}
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Sort</Label>
            <select
              className="w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="createdAt:desc">Newest first</option>
              <option value="createdAt:asc">Oldest first</option>
              <option value="updatedAt:desc">Recently updated</option>
              <option value="name:asc">Title: A–Z</option>
              <option value="name:desc">Title: Z–A</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Listing status</Label>
            {statusOptions.map((opt) => (
              <label key={opt.key} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]">
                <input
                  type="radio"
                  name="listing-status"
                  checked={status === opt.key}
                  onChange={() => {
                    setStatus(opt.key);
                    setCurrentPage(1);
                  }}
                  className="h-4 w-4 accent-[var(--text-primary)]"
                />
                {opt.label} <span className="text-[var(--text-secondary)]">{opt.count}</span>
              </label>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Category</Label>
            <select
              className="w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All</option>
              {hierarchicalCategories.map((c) => renderCategoryOption(c))}
            </select>
          </div>

          {(selectedCategory || searchQuery || status !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                setSelectedCategory("");
                setSearchQuery("");
                setStatus("all");
                setCurrentPage(1);
              }}
            >
              <X className="mr-1 h-3 w-3" /> Clear filters
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
