import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { menus, categories } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  ImageIcon,
  Link2,
  Layers,
  ArrowRight,
  Eye,
  Settings,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function NavigationPage() {
  const [navbarItems, setNavbarItems] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  // Dialog states
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [isColDialogOpen, setIsColDialogOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<any | null>(null);
  const [activeItemForCol, setActiveItemForCol] = useState<any | null>(null);

  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<any | null>(null);
  const [activeColForLink, setActiveColForLink] = useState<any | null>(null);

  // Form states
  const [itemForm, setItemForm] = useState({
    label: "",
    slug: "",
    order: "0",
    isActive: true,
    layout: "SIMPLE",
    bannerTitle: "",
    bannerSubtitle: "",
    bannerLink: "",
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [colForm, setColForm] = useState({
    title: "",
    order: "0",
    categoryId: "",
  });

  const [linkForm, setLinkForm] = useState({
    label: "",
    url: "",
    badge: "",
    order: "0",
  });
  const [linkImageFile, setLinkImageFile] = useState<File | null>(null);
  const [linkImagePreview, setLinkImagePreview] = useState<string | null>(null);

  // Expanded navbar item tracker
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Fetch Navbar Items and Categories
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [menuRes, catRes] = await Promise.all([
        menus.getNavbarItems(),
        categories.getCategories(),
      ]);

      if (menuRes.data.success) {
        setNavbarItems(menuRes.data.data?.navbarItems || []);
      } else {
        setError(menuRes.data.message || "Failed to load menus");
      }

      if (catRes.data.success) {
        setCategoriesList(catRes.data.data?.categories || []);
      }
    } catch (err: any) {
      console.error("Error loading navigation data:", err);
      setError("Failed to load navigation data. Please verify your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // ----------------------------------------------------
  // ITEM HANDLERS
  // ----------------------------------------------------
  const openItemDialog = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        label: item.label || "",
        slug: item.slug || "",
        order: String(item.order || 0),
        isActive: item.isActive ?? true,
        layout: item.layout || "SIMPLE",
        bannerTitle: item.bannerTitle || "",
        bannerSubtitle: item.bannerSubtitle || "",
        bannerLink: item.bannerLink || "",
      });
      setBannerPreview(item.bannerImage || null);
    } else {
      setEditingItem(null);
      setItemForm({
        label: "",
        slug: "",
        order: "0",
        isActive: true,
        layout: "SIMPLE",
        bannerTitle: "",
        bannerSubtitle: "",
        bannerLink: "",
      });
      setBannerPreview(null);
    }
    setBannerFile(null);
    setIsItemDialogOpen(true);
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.label.trim()) {
      toast.error("Label is required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("label", itemForm.label);
      formData.append("slug", itemForm.slug);
      formData.append("order", itemForm.order);
      formData.append("isActive", String(itemForm.isActive));
      formData.append("layout", itemForm.layout);
      formData.append("bannerTitle", itemForm.bannerTitle);
      formData.append("bannerSubtitle", itemForm.bannerSubtitle);
      formData.append("bannerLink", itemForm.bannerLink);
      if (bannerFile) {
        formData.append("bannerImage", bannerFile);
      }

      let res;
      if (editingItem) {
        res = await menus.updateNavbarItem(editingItem.id, formData);
      } else {
        res = await menus.createNavbarItem(formData);
      }

      if (res.data.success) {
        toast.success(editingItem ? "Menu item updated" : "Menu item created");
        setIsItemDialogOpen(false);
        fetchData();
      } else {
        toast.error(res.data.message || "Failed to save menu item");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error saving menu item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item and all its columns/links?")) return;
    try {
      const res = await menus.deleteNavbarItem(id);
      if (res.data.success) {
        toast.success("Menu item deleted");
        fetchData();
      } else {
        toast.error(res.data.message || "Failed to delete");
      }
    } catch (err: any) {
      toast.error("Error deleting menu item");
    }
  };

  // ----------------------------------------------------
  // COLUMN HANDLERS
  // ----------------------------------------------------
  const openColDialog = (navbarItem: any, col?: any) => {
    setActiveItemForCol(navbarItem);
    if (col) {
      setEditingCol(col);
      setColForm({
        title: col.title || "",
        order: String(col.order || 0),
        categoryId: col.categoryId || "",
      });
    } else {
      setEditingCol(null);
      setColForm({
        title: "",
        order: "0",
        categoryId: "",
      });
    }
    setIsColDialogOpen(true);
  };

  const handleColSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colForm.title.trim()) {
      toast.error("Column title is required");
      return;
    }

    try {
      let res;
      const data = {
        title: colForm.title,
        order: parseInt(colForm.order) || 0,
        categoryId: colForm.categoryId || undefined,
      };

      if (editingCol) {
        res = await menus.updateColumn(activeItemForCol.id, editingCol.id, data);
      } else {
        res = await menus.createColumn(activeItemForCol.id, data);
      }

      if (res.data.success) {
        toast.success(editingCol ? "Column updated" : "Column created");
        setIsColDialogOpen(false);
        fetchData();
      } else {
        toast.error(res.data.message || "Failed to save column");
      }
    } catch (err: any) {
      toast.error("Error saving column");
    }
  };

  const handleDeleteCol = async (navbarItemId: string, colId: string) => {
    if (!confirm("Are you sure you want to delete this column and all its links?")) return;
    try {
      const res = await menus.deleteColumn(navbarItemId, colId);
      if (res.data.success) {
        toast.success("Column deleted");
        fetchData();
      } else {
        toast.error(res.data.message || "Failed to delete");
      }
    } catch (err: any) {
      toast.error("Error deleting column");
    }
  };

  // ----------------------------------------------------
  // LINK HANDLERS
  // ----------------------------------------------------
  const openLinkDialog = (column: any, link?: any) => {
    setActiveColForLink(column);
    if (link) {
      setEditingLink(link);
      setLinkForm({
        label: link.label || "",
        url: link.url || "",
        badge: link.badge || "",
        order: String(link.order || 0),
      });
      setLinkImagePreview(link.image || null);
    } else {
      setEditingLink(null);
      setLinkForm({
        label: "",
        url: "",
        badge: "",
        order: "0",
      });
      setLinkImagePreview(null);
    }
    setLinkImageFile(null);
    setIsLinkDialogOpen(true);
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkForm.label.trim() || !linkForm.url.trim()) {
      toast.error("Label and URL are required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("label", linkForm.label);
      formData.append("url", linkForm.url);
      formData.append("badge", linkForm.badge);
      formData.append("order", linkForm.order);
      if (linkImageFile) {
        formData.append("image", linkImageFile);
      }

      let res;
      if (editingLink) {
        res = await menus.updateLink(activeColForLink.id, editingLink.id, formData);
      } else {
        res = await menus.createLink(activeColForLink.id, formData);
      }

      if (res.data.success) {
        toast.success(editingLink ? "Link updated" : "Link created");
        setIsLinkDialogOpen(false);
        fetchData();
      } else {
        toast.error(res.data.message || "Failed to save link");
      }
    } catch (err: any) {
      toast.error("Error saving link");
    }
  };

  const handleDeleteLink = async (colId: string, linkId: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;
    try {
      const res = await menus.deleteLink(colId, linkId);
      if (res.data.success) {
        toast.success("Link deleted");
        fetchData();
      } else {
        toast.error(res.data.message || "Failed to delete");
      }
    } catch (err: any) {
      toast.error("Error deleting link");
    }
  };

  // ----------------------------------------------------
  // FILE UTILS
  // ----------------------------------------------------
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleLinkImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLinkImageFile(file);
      setLinkImagePreview(URL.createObjectURL(file));
    }
  };

  if (isLoading && navbarItems.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
          <p className="mt-4 text-base text-[var(--text-secondary)]">Loading menu configuration...</p>
        </div>
      </div>
    );
  }

  if (error && navbarItems.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--destructive)]/10 mb-4">
          <AlertTriangle className="h-8 w-8 text-[var(--destructive)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1.5">Connection Error</h2>
        <p className="text-center text-[var(--text-secondary)] mb-6">{error}</p>
        <Button variant="outline" onClick={fetchData}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">Navigation Menu</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1.5">
              Customize top-level tabs, mega menu drop-down layouts, sub-columns, and direct product links.
            </p>
          </div>
          <Button onClick={() => openItemDialog()} className="h-10">
            <Plus className="mr-2 h-4 w-4" /> Add Navbar Item
          </Button>
        </div>
        <div className="h-px bg-[var(--border-color)]" />
      </div>

      {/* Navbar Items List */}
      <div className="space-y-4">
        {navbarItems.length === 0 ? (
          <Card className="border-[var(--border-color)] bg-[var(--bg-card)] text-center py-16 rounded-xl">
            <Layers className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <CardTitle className="text-lg">No Navbar Items Yet</CardTitle>
            <p className="text-sm text-gray-400 max-w-sm mx-auto mt-1 mb-6">
              Create your first top-level navbar item (e.g. SHOP, STYLE, PROJECTS) to configure navigation.
            </p>
            <Button onClick={() => openItemDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Create First Item
            </Button>
          </Card>
        ) : (
          navbarItems.map((item) => {
            const isExpanded = expandedItems[item.id];
            return (
              <Card key={item.id} className="border-[var(--border-color)] bg-[var(--bg-card)] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-gray-300 dark:hover:border-zinc-700 transition-colors">
                <CardHeader className="p-5 flex flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleExpand(item.id)}>
                    <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                      <Layers className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-[var(--text-primary)]">{item.label}</h3>
                        <span className="text-[10px] px-2 py-0.5 font-bold uppercase rounded bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400">
                          {item.layout}
                        </span>
                        {!item.isActive && (
                          <span className="text-[10px] px-2 py-0.5 font-bold uppercase rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Order: {item.order} &bull; {item.slug ? `Link: ${item.slug}` : "Mega Menu Dropdown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => openItemDialog(item)} title="Edit Item settings">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-red-50 text-red-600" onClick={() => handleDeleteItem(item.id)} title="Delete Item">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => toggleExpand(item.id)}>
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                  </div>
                </CardHeader>

                {/* Sub-menu customization panel */}
                {isExpanded && (
                  <CardContent className="p-6 bg-gray-50/50 dark:bg-zinc-900/10 border-t border-[var(--border-color)]">
                    {/* Columns section header */}
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-sm tracking-wide text-gray-500 uppercase">
                        {item.layout === "SHOP_TABS" ? "Category Column Assignments" : "Navigation Columns"}
                      </h4>
                      <Button variant="outline" size="sm" onClick={() => openColDialog(item)} className="h-8">
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add Column
                      </Button>
                    </div>

                    {/* Columns grid */}
                    {(!item.columns || item.columns.length === 0) ? (
                      <div className="text-center py-8 bg-white dark:bg-zinc-900/40 border border-dashed rounded-lg">
                        <p className="text-sm text-gray-400 mb-1">No columns configured for this mega menu.</p>
                        {item.layout === "SHOP_TABS" && (
                          <p className="text-xs text-gray-400 max-w-sm mx-auto">
                            Default categories and subcategories will be displayed dynamically as fallback columns.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {item.columns.map((col: any) => (
                          <div key={col.id} className="bg-white dark:bg-zinc-950 border border-[var(--border-color)] p-4 rounded-xl flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-3 border-b pb-2 mb-3">
                                <div>
                                  <h5 className="font-semibold text-sm text-[var(--text-primary)]">{col.title}</h5>
                                  <div className="text-[10px] text-gray-400 mt-0.5">
                                    Order: {col.order}
                                    {col.category && ` &bull; Tab: ${col.category.name}`}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => openColDialog(item, col)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteCol(item.id, col.id)} className="p-1 text-red-400 hover:text-red-600">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Column links list */}
                              <div className="space-y-1.5 min-h-[40px]">
                                {(!col.links || col.links.length === 0) ? (
                                  <div className="text-center py-4 text-xs text-gray-400 font-medium">
                                    No links in this column.
                                  </div>
                                ) : (
                                  col.links.map((lnk: any) => (
                                    <div key={lnk.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-zinc-900/50 group border border-transparent hover:border-gray-200 dark:hover:border-zinc-800">
                                      <div className="flex items-center gap-2 min-w-0">
                                        {lnk.image ? (
                                          <img src={lnk.image} alt={lnk.label} className="h-6 w-6 rounded object-cover" />
                                        ) : (
                                          <Link2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                        )}
                                        <div className="truncate text-xs font-medium text-[var(--text-primary)]">
                                          {lnk.label}
                                          {lnk.badge && (
                                            <span className="ml-1 text-[8px] bg-amber-100 text-amber-700 font-bold px-1 rounded">
                                              {lnk.badge}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex opacity-0 group-hover:opacity-100 gap-1 transition-opacity">
                                        <button onClick={() => openLinkDialog(col, lnk)} className="p-0.5 text-gray-400 hover:text-gray-600">
                                          <Edit className="h-3 w-3" />
                                        </button>
                                        <button onClick={() => handleDeleteLink(col.id, lnk.id)} className="p-0.5 text-red-400 hover:text-red-600">
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            <Button variant="ghost" size="sm" onClick={() => openLinkDialog(col)} className="mt-4 w-full h-8 text-xs border border-dashed rounded-lg">
                              <Plus className="mr-1 h-3 w-3" /> Add Link
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* ── NAVBAR ITEM DIALOG ── */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleItemSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Navbar Item" : "Create Navbar Item"}</DialogTitle>
              <DialogDescription>Configure details, layout, and banners for this navbar navigation item.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="label">Display Label</Label>
                <Input id="label" value={itemForm.label} onChange={(e) => setItemForm({ ...itemForm, label: e.target.value })} placeholder="e.g. SHOP, STYLE, TRADE" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug">Direct Slug/URL (Optional)</Label>
                <Input id="slug" value={itemForm.slug} onChange={(e) => setItemForm({ ...itemForm, slug: e.target.value })} placeholder="e.g. /custom-rugs" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="order">Display Order</Label>
                <Input id="order" type="number" value={itemForm.order} onChange={(e) => setItemForm({ ...itemForm, order: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="layout">Mega Menu Layout Template</Label>
                <select id="layout" value={itemForm.layout} onChange={(e) => setItemForm({ ...itemForm, layout: e.target.value })} className="w-full h-9 rounded-md border border-[var(--border-color)] bg-background px-3 py-1 text-sm outline-none">
                  <option value="SIMPLE">SIMPLE (Single dropdown or direct link)</option>
                  <option value="SHOP_TABS">SHOP_TABS (Left category tabs, right dynamic columns)</option>
                  <option value="COLUMNS_WITH_BANNER">COLUMNS_WITH_BANNER (Columns + Right promo banner)</option>
                  <option value="IMAGE_GRID">IMAGE_GRID (Projects style image grid cards)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="isActive" checked={itemForm.isActive} onChange={(e) => setItemForm({ ...itemForm, isActive: e.target.checked })} className="h-4 w-4 rounded border-gray-300 accent-brown" />
                <Label htmlFor="isActive">Active/Visible on client</Label>
              </div>
            </div>

            {/* Layout-specific Banner customizer */}
            {itemForm.layout === "COLUMNS_WITH_BANNER" && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-sm">Right Banner Configuration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Banner Promotional Image</Label>
                    <div className="flex items-center gap-4">
                      {bannerPreview ? (
                        <img src={bannerPreview} alt="Banner Preview" className="h-16 w-28 rounded object-cover border border-zinc-200" />
                      ) : (
                        <div className="flex h-16 w-28 items-center justify-center rounded border border-dashed border-zinc-200">
                          <ImageIcon className="h-6 w-6 text-zinc-300" />
                        </div>
                      )}
                      <div className="flex-1">
                        <Input type="file" accept="image/*" onChange={handleBannerChange} className="cursor-pointer" />
                        <span className="text-[10px] text-zinc-400 mt-1 block">Recommend resolution: 400x500px, max 5MB.</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bannerTitle">Banner Title Label</Label>
                    <Input id="bannerTitle" value={itemForm.bannerTitle} onChange={(e) => setItemForm({ ...itemForm, bannerTitle: e.target.value })} placeholder="e.g. Trendsetting Bestsellers" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bannerSubtitle">Banner Button Label</Label>
                    <Input id="bannerSubtitle" value={itemForm.bannerSubtitle} onChange={(e) => setItemForm({ ...itemForm, bannerSubtitle: e.target.value })} placeholder="e.g. SHOP NOW" />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="bannerLink">Banner Destination Link</Label>
                    <Input id="bannerLink" value={itemForm.bannerLink} onChange={(e) => setItemForm({ ...itemForm, bannerLink: e.target.value })} placeholder="e.g. /products?style=trendsetting" />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsItemDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Navbar Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── COLUMN DIALOG ── */}
      <Dialog open={isColDialogOpen} onOpenChange={setIsColDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleColSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingCol ? "Edit Column" : "Add Column"}</DialogTitle>
              <DialogDescription>
                Columns group link folders together. For {activeItemForCol?.label} tab dropdown.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="colTitle">Column Title</Label>
                <Input id="colTitle" value={colForm.title} onChange={(e) => setColForm({ ...colForm, title: e.target.value })} placeholder="e.g. SIZE, COLORS, DESIGNERS" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="colOrder">Order</Label>
                <Input id="colOrder" type="number" value={colForm.order} onChange={(e) => setColForm({ ...colForm, order: e.target.value })} />
              </div>

              {activeItemForCol?.layout === "SHOP_TABS" && (
                <div className="space-y-1.5">
                  <Label htmlFor="colCategory">Associate with Category Tab</Label>
                  <select id="colCategory" value={colForm.categoryId} onChange={(e) => setColForm({ ...colForm, categoryId: e.target.value })} className="w-full h-9 rounded-md border border-[var(--border-color)] bg-background px-3 py-1 text-sm outline-none">
                    <option value="">-- Select Category Tab --</option>
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    This column will be displayed when the selected category tab is hovered on the left.
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsColDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Column</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── LINK DIALOG ── */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleLinkSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingLink ? "Edit Navigation Link" : "Add Navigation Link"}</DialogTitle>
              <DialogDescription>Configure details for the link in Column: {activeColForLink?.title}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="linkLabel">Link Label / Text</Label>
                <Input id="linkLabel" value={linkForm.label} onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })} placeholder="e.g. 2x3 Ft, Blue, Kengo Kuma" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="linkUrl">Link Destination URL</Label>
                <Input id="linkUrl" value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="e.g. /products?category=rugs&size=2x3-ft" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="linkBadge">Badge Label (Optional)</Label>
                  <Input id="linkBadge" value={linkForm.badge} onChange={(e) => setLinkForm({ ...linkForm, badge: e.target.value })} placeholder="e.g. NEW, HOT" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="linkOrder">Order</Label>
                  <Input id="linkOrder" type="number" value={linkForm.order} onChange={(e) => setLinkForm({ ...linkForm, order: e.target.value })} />
                </div>
              </div>

              {/* Image upload for GRID and Swatches */}
              <div className="space-y-1.5 border-t pt-4">
                <Label>Thumbnail Image (Optional)</Label>
                <div className="flex items-center gap-4">
                  {linkImagePreview ? (
                    <img src={linkImagePreview} alt="Link Preview" className="h-12 w-12 rounded object-cover border border-zinc-200" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-zinc-200">
                      <ImageIcon className="h-5 w-5 text-zinc-300" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input type="file" accept="image/*" onChange={handleLinkImageChange} className="cursor-pointer" />
                    <span className="text-[9px] text-zinc-400 mt-1 block">Mainly required for projects and grid items.</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Link</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
