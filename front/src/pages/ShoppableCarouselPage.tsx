import { useState, useEffect } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { shoppableCarousel, products } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HiVideoCamera,
  HiPlus,
  HiPencil,
  HiTrash,
  HiPlay,
} from "react-icons/hi";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const VIDEO_MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface CarouselItem {
  id: string;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  textOverlay: string | null;
  viewCount: number;
  productId: string | null;
  displayOrder: number;
  product?: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    price: number;
    originalPrice: number;
  } | null;
}

export default function ShoppableCarouselPage() {
  const [carousel, setCarousel] = useState<{ autoScroll: boolean; isActive: boolean } | null>(null);
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<CarouselItem | null>(null);
  const [productsList, setProductsList] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [formData, setFormData] = useState({
    mediaType: "UPLOAD" as "UPLOAD" | "YOUTUBE" | "INSTAGRAM",
    youtubeUrl: "",
    instagramUrl: "",
    textOverlay: "",
    productId: "",
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCarousel = async () => {
    try {
      setLoading(true);
      const res = await shoppableCarousel.getCarousel();
      if (res.data.success) {
        setCarousel(res.data.data?.carousel || null);
        setItems(res.data.data?.items || []);
      }
    } catch (e: unknown) {
      toast.error("Failed to load carousel");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await products.getProducts({ limit: 500 });
      if (res.data.success && res.data.data?.products) {
        setProductsList(
          res.data.data.products.map((p: { id: string; name: string; slug: string }) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
          }))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCarousel();
    fetchProducts();
  }, []);

  const handleSaveSettings = async (autoScroll: boolean) => {
    try {
      await shoppableCarousel.updateCarousel({ autoScroll });
      setCarousel((c) => (c ? { ...c, autoScroll } : { autoScroll, isActive: true }));
      toast.success("Settings saved");
    } catch (e: unknown) {
      toast.error("Failed to save");
    }
  };

  const mediaDropzone = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "video/*": [".mp4", ".webm"],
    },
    maxSize: VIDEO_MAX_SIZE,
    multiple: false,
    onDrop: (accepted, rejected) => {
      if (rejected.length) {
        const err = rejected[0]?.errors?.[0];
        if (err?.code === "file-too-large") {
          toast.error("Video must be under 10MB");
        } else {
          toast.error(err?.message || "Invalid file");
        }
        return;
      }
      if (accepted[0]) {
        setMediaFile(accepted[0]);
        setMediaPreview(URL.createObjectURL(accepted[0]));
      }
    },
  });



  const resetForm = () => {
    setFormData({
      mediaType: "UPLOAD",
      youtubeUrl: "",
      instagramUrl: "",
      textOverlay: "",
      productId: "",
    });
    setMediaFile(null);
    setMediaPreview(null);
    setThumbnailFile(null);
    setEditingItem(null);
    setShowAddDialog(false);
  };

  const handleAddItem = async () => {
    const { mediaType, youtubeUrl, instagramUrl, textOverlay, productId } = formData;
    if (mediaType === "UPLOAD" && !mediaFile) {
      toast.error("Please upload media");
      return;
    }
    if (mediaType === "YOUTUBE" && !youtubeUrl.trim()) {
      toast.error("Please enter YouTube URL");
      return;
    }
    if (mediaType === "INSTAGRAM" && !instagramUrl.trim()) {
      toast.error("Please enter Instagram URL");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("mediaType", mediaType);
      fd.append("textOverlay", textOverlay);
      fd.append("productId", (productId && productId !== "__none__") ? productId : "");
      if (mediaType === "UPLOAD" && mediaFile) fd.append("media", mediaFile);
      if (thumbnailFile) fd.append("thumbnail", thumbnailFile);
      if (mediaType === "YOUTUBE") fd.append("youtubeUrl", youtubeUrl.trim());
      if (mediaType === "INSTAGRAM") fd.append("instagramUrl", instagramUrl.trim());

      const res = await shoppableCarousel.createItem(fd);
      if (res.data.success && res.data.data?.item) {
        setItems((prev) => [...prev, res.data.data.item]);
        toast.success("Item added");
        resetForm();
      }
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    const { mediaType, youtubeUrl, instagramUrl, textOverlay, productId } = formData;

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("mediaType", mediaType);
      fd.append("textOverlay", textOverlay);
      fd.append("productId", (productId && productId !== "__none__") ? productId : "");
      if (mediaType === "UPLOAD" && mediaFile) fd.append("media", mediaFile);
      if (thumbnailFile) fd.append("thumbnail", thumbnailFile);
      if (mediaType === "YOUTUBE") fd.append("youtubeUrl", youtubeUrl.trim());
      if (mediaType === "INSTAGRAM") fd.append("instagramUrl", instagramUrl.trim());

      const res = await shoppableCarousel.updateItem(editingItem.id, fd);
      if (res.data.success && res.data.data?.item) {
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? res.data.data.item : i)));
        toast.success("Updated");
        resetForm();
      }
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item: CarouselItem) => {
    setEditingItem(item);
    setFormData({
      mediaType: item.mediaType as "UPLOAD" | "YOUTUBE" | "INSTAGRAM",
      youtubeUrl: item.mediaType === "YOUTUBE" ? (item.mediaUrl || "") : "",
      instagramUrl: item.mediaType === "INSTAGRAM" ? (item.mediaUrl || "") : "",
      textOverlay: item.textOverlay || "",
      productId: item.productId || "",
    });
    setMediaPreview(item.mediaUrl || null);
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await shoppableCarousel.deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Deleted");
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(items, oldIdx, newIdx);
    setItems(reordered);
    try {
      await shoppableCarousel.reorderItems(reordered.map((i) => i.id));
      toast.success("Order updated");
    } catch (e) {
      toast.error("Failed to reorder");
      setItems(items);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <HiVideoCamera className="h-8 w-8" />
          Shoppable Video Carousel
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Manage media cards with product links for the home page carousel
        </p>
      </div>

      <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={carousel?.autoScroll ?? true}
                onCheckedChange={handleSaveSettings}
              />
              <Label>Auto-scroll</Label>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Carousel Items ({items.length})</CardTitle>
          <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
            <HiPlus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div
              className="border-2 border-dashed border-[var(--border-color)] rounded-lg p-12 text-center text-[var(--text-secondary)]"
              onClick={() => setShowAddDialog(true)}
            >
              <HiVideoCamera className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No items yet. Click to add your first item.</p>
            </div>
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      onEdit={() => openEdit(item)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={(o) => { if (!o) resetForm(); setShowAddDialog(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Media Type</Label>
              <Select
                value={formData.mediaType}
                onValueChange={(v) => setFormData((f) => ({ ...f, mediaType: v as typeof f.mediaType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPLOAD">Image / Video Upload</SelectItem>
                  <SelectItem value="YOUTUBE">YouTube Link</SelectItem>
                  <SelectItem value="INSTAGRAM">Instagram Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.mediaType === "UPLOAD" && (
              <div>
                <Label>Media (max 10MB for video)</Label>
                <div
                  {...mediaDropzone.getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer",
                    mediaDropzone.isDragActive ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border-color)]"
                  )}
                >
                  <input {...mediaDropzone.getInputProps()} />
                  {mediaPreview ? (
                    <div className="relative inline-block">
                      {mediaFile?.type.startsWith("video/") ? (
                        <video src={mediaPreview} className="max-h-48 rounded" controls />
                      ) : (
                        <img src={mediaPreview} alt="Preview" className="max-h-48 rounded" />
                      )}
                    </div>
                  ) : editingItem?.mediaUrl ? (
                    <div className="relative inline-block">
                      {editingItem.mediaType === "UPLOAD" && editingItem.mediaUrl?.match(/\.(mp4|webm)/i) ? (
                        <video src={editingItem.mediaUrl} className="max-h-48 rounded" controls />
                      ) : (
                        <img src={editingItem.mediaUrl} alt="Current" className="max-h-48 rounded" />
                      )}
                    </div>
                  ) : (
                    <p className="text-[var(--text-secondary)]">Drop image or video here (video max 10MB)</p>
                  )}
                </div>
              </div>
            )}

            {formData.mediaType === "YOUTUBE" && (
              <div>
                <Label>YouTube URL</Label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData((f) => ({ ...f, youtubeUrl: e.target.value }))}
                />
              </div>
            )}

            {formData.mediaType === "INSTAGRAM" && (
              <div>
                <Label>Instagram URL</Label>
                <Input
                  placeholder="https://www.instagram.com/p/..."
                  value={formData.instagramUrl}
                  onChange={(e) => setFormData((f) => ({ ...f, instagramUrl: e.target.value }))}
                />
              </div>
            )}

            <div>
              <Label>Product (optional)</Label>
              <Select
                value={formData.productId || "__none__"}
                onValueChange={(v) => setFormData((f) => ({ ...f, productId: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {productsList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Text Overlay (optional)</Label>
              <Input
                placeholder="e.g. Let's unbox it"
                value={formData.textOverlay}
                onChange={(e) => setFormData((f) => ({ ...f, textOverlay: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowAddDialog(false); }}>
              Cancel
            </Button>
            <Button
              onClick={editingItem ? handleUpdateItem : handleAddItem}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingItem ? "Update" : "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableItem({
  item,
  onEdit,
  onDelete,
}: {
  item: CarouselItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]",
        isDragging && "opacity-50"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <HiPlay className="h-5 w-5" />
      </div>
      <div className="w-16 h-20 rounded overflow-hidden bg-[var(--bg-secondary)] flex-shrink-0 flex items-center justify-center">
        {item.mediaType === "UPLOAD" && item.mediaUrl ? (
          item.mediaUrl.match(/\.(mp4|webm)/i) ? (
            <video src={item.mediaUrl} className="w-full h-full object-cover" muted />
          ) : (
            <img src={item.mediaUrl} alt="" className="w-full h-full object-cover" />
          )
        ) : item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <HiVideoCamera className="h-6 w-6 text-[var(--text-secondary)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.product?.name || "No product"}</p>
        <p className="text-sm text-[var(--text-secondary)]">{item.mediaType} • {item.viewCount} views</p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <HiPencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-[var(--destructive)]">
          <HiTrash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
