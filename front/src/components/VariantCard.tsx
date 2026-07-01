import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  Plus,
  Image as ImageIcon,
  Edit,
  Layers,
  ChevronLeft,
  ChevronRight,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { products, moq, pricingSlabs } from "@/api/adminService";
import { useLanguage } from "@/context/LanguageContext";


interface ImageData {
  url: string;
  id?: string;
  isPrimary?: boolean;
  order?: number;
  file?: File;
  tempId?: string;
  isNew?: boolean;
}

interface VariantData {
  id?: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
  salePrice?: string;
  images?: ImageData[];
  attributeValueIds?: string[];
  attributes?: Array<{
    attribute: string;
    value: string;
    attributeId: string;
    attributeValueId: string;
  }>;
  quantity?: number;
  isActive?: boolean;
  removedImageIds?: string[]; // Track removed image IDs
  moq?: {
    isActive: boolean;
    minQuantity: number;
  };
  // Shipping dimensions for Shiprocket
  shippingLength?: number;
  shippingBreadth?: number;
  shippingHeight?: number;
  shippingWeight?: number;
  pricingSlabs?: PricingSlabData[];
  videoUrl?: string | null;
  videoFile?: File | null;
  videoRemoved?: boolean;
}

interface PricingSlabData {
  id?: string;
  minQty: number;
  maxQty?: number | null;
  price: number;
}

interface VariantCardProps {
  variant: VariantData;
  index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  onImagesChange: (index: number, images: ImageData[]) => void;
  isEditMode?: boolean;
  shiprocketEnabled?: boolean;
  attributeValuesMap?: Record<string, any[]>;
}

export default function VariantCard({
  variant,
  index,
  onUpdate,
  onRemove,
  onImagesChange,
  isEditMode = false,
  shiprocketEnabled = false,
  attributeValuesMap = {},
}: VariantCardProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true); // Default expanded so user can see images
  const [isUploading, setIsUploading] = useState(false);
  const [variantMOQ, setVariantMOQ] = useState({
    isActive: variant.moq?.isActive || false,
    minQuantity: variant.moq?.minQuantity || 1,
  });

  // Pricing slabs state
  const [variantSlabs, setVariantSlabs] = useState<PricingSlabData[]>(variant.pricingSlabs || []);
  const [showSlabForm, setShowSlabForm] = useState(false);
  const [editingSlab, setEditingSlab] = useState<PricingSlabData | null>(null);
  const [slabForm, setSlabForm] = useState({ minQty: 1, maxQty: "", price: "" });
  const [slabLoading, setSlabLoading] = useState(false);

  // Fetch MOQ when variant has ID (edit mode)
  useEffect(() => {
    if (isEditMode && variant.id && !variant.id.startsWith("temp-")) {
      moq.getVariantMOQ(variant.id)
        .then((response: any) => {
          if (response.data.success && response.data.data) {
            const moqData = {
              isActive: response.data.data.isActive,
              minQuantity: response.data.data.minQuantity,
            };
            setVariantMOQ(moqData);
            // Only update parent once when fetching
            onUpdate(index, "moq", moqData);
          }
        })
        .catch(() => {
          // MOQ not set, that's okay
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant.id, isEditMode, index]);

  // Fetch pricing slabs when variant has ID (edit mode)
  useEffect(() => {
    if (isEditMode && variant.id && !variant.id.startsWith("temp-")) {
      pricingSlabs.getVariantSlabs(variant.id)
        .then((response: any) => {
          if (response.data.success && response.data.data) {
            const slabs = response.data.data.map((s: any) => ({
              id: s.id,
              minQty: s.minQty,
              maxQty: s.maxQty,
              price: s.price,
            }));
            setVariantSlabs(slabs);
            onUpdate(index, "pricingSlabs", slabs);
          }
        })
        .catch(() => {
          // No slabs set, that's okay
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant.id, isEditMode]);


  const handleInputChange = (field: string, value: string) => {
    onUpdate(index, field, value);
  };

  // Check if variant has a real ID (saved to database)
  const hasRealVariantId = variant.id && !variant.id.startsWith("temp-") && !variant.id.includes("-");

  // Handle adding a new pricing slab
  const handleAddSlab = async () => {
    if (!slabForm.price || parseFloat(slabForm.price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    if (slabForm.minQty < 1) {
      toast.error("Minimum quantity must be at least 1");
      return;
    }

    setSlabLoading(true);
    const newSlab: PricingSlabData = {
      minQty: slabForm.minQty,
      maxQty: slabForm.maxQty ? parseInt(slabForm.maxQty) : null,
      price: parseFloat(slabForm.price),
    };

    try {
      if (hasRealVariantId) {
        // Save to database directly
        const response = await pricingSlabs.create({
          variantId: variant.id,
          minQty: newSlab.minQty,
          maxQty: newSlab.maxQty,
          price: newSlab.price,
        });
        if (response.data.success) {
          newSlab.id = response.data.data.id;
          toast.success(t("variant_card.pricing_slabs.slab_added"));
        }
      } else {
        // For new variants, just store locally (will be saved when product is created)
        newSlab.id = `temp-slab-${Date.now()}`;
      }

      const updatedSlabs = [...variantSlabs, newSlab];
      setVariantSlabs(updatedSlabs);
      onUpdate(index, "pricingSlabs", updatedSlabs);
      setSlabForm({ minQty: 1, maxQty: "", price: "" });
      setShowSlabForm(false);
    } catch (error) {
      toast.error(t("variant_card.pricing_slabs.slab_error"));
      console.error("Error adding slab:", error);
    } finally {
      setSlabLoading(false);
    }
  };

  // Handle updating an existing slab
  const handleUpdateSlab = async () => {
    if (!editingSlab) return;

    if (!slabForm.price || parseFloat(slabForm.price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setSlabLoading(true);
    try {
      const updatedSlab: PricingSlabData = {
        ...editingSlab,
        minQty: slabForm.minQty,
        maxQty: slabForm.maxQty ? parseInt(slabForm.maxQty) : null,
        price: parseFloat(slabForm.price),
      };

      if (hasRealVariantId && editingSlab.id && !editingSlab.id.startsWith("temp-")) {
        await pricingSlabs.update(editingSlab.id, {
          minQty: updatedSlab.minQty,
          maxQty: updatedSlab.maxQty,
          price: updatedSlab.price,
        });
        toast.success(t("variant_card.pricing_slabs.slab_updated"));
      }

      const updatedSlabs = variantSlabs.map(s =>
        s.id === editingSlab.id ? updatedSlab : s
      );
      setVariantSlabs(updatedSlabs);
      onUpdate(index, "pricingSlabs", updatedSlabs);
      setEditingSlab(null);
      setSlabForm({ minQty: 1, maxQty: "", price: "" });
      setShowSlabForm(false);
    } catch (error) {
      toast.error(t("variant_card.pricing_slabs.slab_error"));
      console.error("Error updating slab:", error);
    } finally {
      setSlabLoading(false);
    }
  };

  // Handle deleting a slab
  const handleDeleteSlab = async (slab: PricingSlabData) => {
    if (!confirm(t("variant_card.pricing_slabs.confirm_delete"))) return;

    setSlabLoading(true);
    try {
      if (hasRealVariantId && slab.id && !slab.id.startsWith("temp-")) {
        await pricingSlabs.delete(slab.id);
        toast.success(t("variant_card.pricing_slabs.slab_deleted"));
      }

      const updatedSlabs = variantSlabs.filter(s => s.id !== slab.id);
      setVariantSlabs(updatedSlabs);
      onUpdate(index, "pricingSlabs", updatedSlabs);
    } catch (error) {
      toast.error(t("variant_card.pricing_slabs.slab_error"));
      console.error("Error deleting slab:", error);
    } finally {
      setSlabLoading(false);
    }
  };

  // Open edit form for a slab
  const openEditSlab = (slab: PricingSlabData) => {
    setEditingSlab(slab);
    setSlabForm({
      minQty: slab.minQty,
      maxQty: slab.maxQty?.toString() || "",
      price: slab.price.toString(),
    });
    setShowSlabForm(true);
  };

  // Get current images safely, sorted by order
  const rawImages = Array.isArray(variant.images) ? variant.images : [];
  const currentImages = [...rawImages].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999)
  );
  const variantSlots: (ImageData | null)[] = Array(5).fill(null);
  currentImages.slice(0, 5).forEach((img, idx) => {
    variantSlots[idx] = img;
  });
  const hasImages = currentImages.length > 0;
  const maxImages = 5;

  // Collect attribute value images as suggestions (when variant has no images yet)
  const suggestedAttrImages: { url: string; label: string }[] = [];
  if (!hasImages && variant.attributes && variant.attributes.length > 0) {
    for (const attr of variant.attributes) {
      const allValues: any[] = attributeValuesMap[attr.attributeId] || [];
      const matchedValue = allValues.find((v: any) => v.id === attr.attributeValueId);
      if (matchedValue?.image) {
        suggestedAttrImages.push({ url: matchedValue.image, label: `${attr.attribute}: ${attr.value}` });
      }
    }
  }

  const handleUseSuggestedImage = (imgUrl: string) => {
    const tempId = `temp-suggested-${Date.now()}-${index}`;
    const newImage: ImageData = {
      url: imgUrl,
      tempId,
      isPrimary: currentImages.length === 0,
      order: currentImages.length,
      isNew: true,
    };
    onImagesChange(index, [...currentImages, newImage]);
    toast.success("Image added from attribute value. Upload your own to replace.");
  };

  // Handle variant video upload
  const handleVariantVideoChange = async (file: File) => {
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ["video/mp4", "video/webm"];
    if (file.size > maxSize) {
      toast.error("Video must be 10MB or less");
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only MP4 and WebM videos are supported");
      return;
    }

    const isRealVariantId =
      variant.id &&
      typeof variant.id === "string" &&
      !variant.id.includes("-") &&
      variant.id.length > 10;

    if (isEditMode && isRealVariantId) {
      setIsUploading(true);
      try {
        const response = await products.uploadVariantVideo(variant.id!, file);
        if (response.data.success) {
          onUpdate(index, "videoUrl", response.data.data.videoUrl);
          onUpdate(index, "videoFile", null);
          onUpdate(index, "videoRemoved", false);
          toast.success("Variant video uploaded successfully");
        }
      } catch (err: any) {
        console.error("Error uploading variant video:", err);
        toast.error(err.response?.data?.message || "Failed to upload variant video");
      } finally {
        setIsUploading(false);
      }
    } else {
      // Local preview mode
      onUpdate(index, "videoFile", file);
      onUpdate(index, "videoUrl", URL.createObjectURL(file));
      onUpdate(index, "videoRemoved", false);
      toast.success("Video added to variant locally");
    }
  };

  // Remove variant video
  const removeVariantVideo = async () => {
    const isRealVariantId =
      variant.id &&
      typeof variant.id === "string" &&
      !variant.id.includes("-") &&
      variant.id.length > 10;

    if (variant.videoFile && variant.videoUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(variant.videoUrl);
    }

    if (isEditMode && isRealVariantId) {
      setIsUploading(true);
      try {
        const response = await products.deleteVariantVideo(variant.id!);
        if (response.data.success) {
          onUpdate(index, "videoUrl", null);
          onUpdate(index, "videoFile", null);
          onUpdate(index, "videoRemoved", true);
          toast.success("Variant video deleted successfully");
        }
      } catch (err: any) {
        console.error("Error deleting variant video:", err);
        toast.error(err.response?.data?.message || "Failed to delete variant video");
      } finally {
        setIsUploading(false);
      }
    } else {
      onUpdate(index, "videoUrl", null);
      onUpdate(index, "videoFile", null);
      onUpdate(index, "videoRemoved", true);
      toast.success("Video removed from variant");
    }
  };

  // Handle single file upload for a specific slot in variant
  const handleVariantSlotFileChange = async (slotIndex: number, file: File) => {
    if (!file) return;

    const isValidType = file.type.startsWith("image/");
    const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB

    if (!isValidType) {
      toast.error(`${file.name} is not a valid image file`);
      return;
    }
    if (!isValidSize) {
      toast.error(`${file.name} is too large. Maximum size is 10MB`);
      return;
    }

    setIsUploading(true);
    try {
      const isRealVariantId =
        variant.id &&
        typeof variant.id === "string" &&
        !variant.id.includes("-") &&
        variant.id.length > 10;

      const isPrimary = slotIndex === 0 || variantSlots.every((s) => s === null);

      if (isEditMode && isRealVariantId) {
        const response = await products.uploadVariantImage(
          variant.id!,
          file,
          isPrimary
        );

        if (response.data.success) {
          const uploadedImage = response.data.data?.image;
          if (uploadedImage) {
            const newImg: ImageData = {
              url: uploadedImage.url,
              id: uploadedImage.id,
              isPrimary: uploadedImage.isPrimary,
              order: uploadedImage.order || slotIndex,
              isNew: false,
            };
            const updatedSlots = [...variantSlots];
            updatedSlots[slotIndex] = newImg;

            const activeImages = updatedSlots.filter((img): img is ImageData => img !== null);
            onImagesChange(index, activeImages);
            toast.success("Image uploaded successfully");
          }
        }
      } else {
        const tempId = `temp-${Date.now()}-${index}-${slotIndex}-${Math.random()}`;
        const blobUrl = URL.createObjectURL(file);
        const newImg: ImageData = {
          url: blobUrl,
          file,
          tempId,
          isPrimary,
          order: slotIndex,
          isNew: true,
        };

        const updatedSlots = [...variantSlots];
        updatedSlots[slotIndex] = newImg;

        const activeImages = updatedSlots.filter((img): img is ImageData => img !== null);
        activeImages.forEach((img, idx) => {
          img.isPrimary = idx === 0;
          img.order = idx;
        });

        onImagesChange(index, activeImages);
        toast.success("Image added");
      }
    } catch (error) {
      console.error("Failed to upload variant image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  // Remove variant image from slot and pack remaining left
  const removeVariantImageAt = async (slotIndex: number) => {
    const imageToRemove = variantSlots[slotIndex];
    if (!imageToRemove) return;

    const activeCount = variantSlots.filter((s) => s !== null).length;
    if (activeCount === 1) {
      toast.error(
        "Cannot remove the only image. Variants must have at least one image."
      );
      return;
    }

    try {
      const isRealVariantId =
        variant.id &&
        typeof variant.id === "string" &&
        variant.id.length >= 30 &&
        !variant.id.startsWith("new-") &&
        !variant.id.startsWith("temp-") &&
        !variant.id.startsWith("field");

      if (imageToRemove.id && isEditMode && isRealVariantId) {
        setIsUploading(true);
        const response = await products.deleteVariantImage(imageToRemove.id);
        setIsUploading(false);

        if (response.data.success) {
          const updatedSlots = [...variantSlots];
          updatedSlots[slotIndex] = null;

          const filtered = updatedSlots.filter((s): s is ImageData => s !== null);
          const reordered = filtered.map((img, i) => ({
            ...img,
            order: i,
            isPrimary: i === 0,
          }));

          if (imageToRemove.isPrimary && reordered.length > 0 && reordered[0].id) {
            try {
              await products.setVariantImageAsPrimary(reordered[0].id);
            } catch (err) {
              console.error("Error setting primary variant image:", err);
            }
          }

          onImagesChange(index, reordered);
          toast.success("Image deleted successfully");
        } else {
          toast.error("Failed to delete image");
        }
      } else {
        if (imageToRemove.url && imageToRemove.url.startsWith("blob:")) {
          URL.revokeObjectURL(imageToRemove.url);
        }

        if (imageToRemove.id && !imageToRemove.isNew) {
          const currentRemovedIds = variant.removedImageIds || [];
          const updatedRemovedIds = [...currentRemovedIds, imageToRemove.id];
          onUpdate(index, "removedImageIds", updatedRemovedIds);
        }

        const updatedSlots = [...variantSlots];
        updatedSlots[slotIndex] = null;

        const filtered = updatedSlots.filter((s): s is ImageData => s !== null);
        const reordered = filtered.map((img, i) => ({
          ...img,
          order: i,
          isPrimary: i === 0,
        }));

        onImagesChange(index, reordered);
        toast.success("Image removed");
      }
    } catch (error) {
      console.error("Error removing variant image:", error);
      toast.error("Failed to remove image");
      setIsUploading(false);
    }
  };

  // Move variant image left/right to reorder
  const moveVariantImage = async (slotIndex: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? slotIndex - 1 : slotIndex + 1;
    if (targetIndex < 0 || targetIndex >= 5) return;
    if (!variantSlots[slotIndex] || !variantSlots[targetIndex]) return;

    const updatedSlots = [...variantSlots];
    const temp = updatedSlots[slotIndex];
    updatedSlots[slotIndex] = updatedSlots[targetIndex];
    updatedSlots[targetIndex] = temp;

    const activeImages = updatedSlots.filter((img): img is ImageData => img !== null);
    const reordered = activeImages.map((img, idx) => ({
      ...img,
      order: idx,
      isPrimary: idx === 0,
    }));

    onImagesChange(index, reordered);

    const isRealVariantId =
      variant.id &&
      typeof variant.id === "string" &&
      variant.id.length >= 30 &&
      !variant.id.startsWith("new-") &&
      !variant.id.startsWith("temp-") &&
      !variant.id.startsWith("field");

    if (isEditMode && isRealVariantId) {
      try {
        const imageOrders = reordered
          .filter((img) => img.id)
          .map((img, i) => ({
            imageId: img.id!,
            order: i,
          }));

        if (imageOrders.length > 0) {
          await products.reorderVariantImages(variant.id!, imageOrders);
          toast.success("Images reordered");
        }
      } catch (error) {
        console.error("Error reordering variant images:", error);
      }
    } else {
      toast.success("Images reordered");
    }
  };

  // Generate variant display name
  const getVariantDisplayName = () => {
    const parts = [];
    if (variant.attributes && variant.attributes.length > 0) {
      const attrStrings = variant.attributes.map(
        (attr: any) => `${attr.attribute}: ${attr.value}`
      );
      parts.push(...attrStrings);
    }
    return parts.length > 0 ? parts.join(" - ") : `Variant ${index + 1}`;
  };

  return (
    <Card className="p-4 border-l-4 border-l-blue-500 bg-[var(--bg-card)] border-[var(--border-color)] flex flex-col gap-4">
      {/* Variant Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              #{index + 1}
            </Badge>
            <h4 className="font-semibold text-lg text-[var(--text-primary)]">{getVariantDisplayName()}</h4>
            {hasImages && (
              <Badge variant="secondary" className="text-xs">
                {currentImages.length} image
                {currentImages.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            SKU: {variant.sku || "Auto-generated"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="cursor-pointer bg-[var(--bg-secondary)] p-2 rounded-md hover:bg-[var(--bg-sidebar-hover)]"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Collapsed Preview */}
      {!isExpanded && hasImages && (
        <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0">
          {currentImages.slice(0, 4).map((image, imageIndex) => (
            <div
              key={image.id || image.tempId || imageIndex}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${image.isPrimary
                ? "border-green-500 ring-1 ring-green-200"
                : "border-[var(--border-color)]"
                }`}
            >
              <div className="w-full h-full bg-[var(--bg-secondary)] flex items-center justify-center">
                {image.url ? (
                  <img
                    src={image.url}
                    alt={`Preview ${imageIndex + 1}`}
                    className="w-full h-full object-cover"
                    onLoad={() => {
                      console.log(`✅ Preview image loaded: ${image.url}`);
                    }}
                    onError={(e) => {
                      console.error(`❌ Preview image failed: ${image.url}`);
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="flex items-center justify-center h-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                          </div>
                        `;
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
              {image.isPrimary && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-1 rounded-bl">
                  P
                </div>
              )}
            </div>
          ))}
          {currentImages.length > 4 && (
            <div className="flex-shrink-0 w-16 h-16 bg-[var(--bg-secondary)] rounded-lg flex items-center justify-center text-xs text-[var(--text-secondary)]">
              +{currentImages.length - 4}
            </div>
          )}
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-4 flex-1">
          {/* Variant Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`sku-${index}`} className="text-xs text-[var(--text-primary)]">
                SKU
              </Label>
              <Input
                id={`sku-${index}`}
                value={variant.sku}
                onChange={(e) => handleInputChange("sku", e.target.value)}
                className="h-8"
                readOnly
                placeholder="Auto-generated"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`quantity-${index}`} className="text-xs text-[var(--text-primary)]">
                Stock
              </Label>
              <Input
                id={`quantity-${index}`}
                type="number"
                min="0"
                value={variant.quantity || ""}
                onChange={(e) => handleInputChange("quantity", e.target.value)}
                className="h-8"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`price-${index}`} className="text-xs text-[var(--text-primary)]">
                Price (₹)
              </Label>
              <Input
                id={`price-${index}`}
                type="number"
                min="0"

                value={variant.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                className="h-8"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`salePrice-${index}`} className="text-xs text-[var(--text-primary)]">
                Sale Price (₹)
              </Label>
              <Input
                id={`salePrice-${index}`}
                type="number"
                min="0"

                value={variant.salePrice || ""}
                onChange={(e) => handleInputChange("salePrice", e.target.value)}
                className="h-8"
                placeholder="Optional"
              />
            </div>

            {/* MOQ Settings */}
            <div className="space-y-2 border-t border-[var(--border-color)] pt-3 mt-3">
              <div className="flex items-center justify-between p-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-xs font-medium text-[var(--text-primary)]">
                    {t("variant_card.moq.enable")}
                  </Label>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t("variant_card.moq.override_desc")}
                  </p>
                </div>
                <Switch
                  checked={variantMOQ.isActive}
                  onCheckedChange={(checked: boolean) => {
                    const updatedMOQ = { ...variantMOQ, isActive: checked };
                    setVariantMOQ(updatedMOQ);
                    onUpdate(index, "moq", updatedMOQ);
                  }}
                />
              </div>

              {variantMOQ.isActive && (
                <div className="space-y-1">
                  <Label htmlFor={`moq-${index}`} className="text-xs text-[var(--text-primary)]">
                    {t("variant_card.moq.min_quantity")}
                  </Label>
                  <Input
                    id={`moq-${index}`}
                    type="number"
                    min="1"
                    value={variantMOQ.minQuantity}
                    onChange={(e) => {
                      const updatedMOQ = {
                        ...variantMOQ,
                        minQuantity: parseInt(e.target.value) || 1,
                      };
                      setVariantMOQ(updatedMOQ);
                      onUpdate(index, "moq", updatedMOQ);
                    }}
                    className="h-8"
                    placeholder={t("variant_card.moq.placeholder")}
                  />
                </div>
              )}
            </div>

            {/* Pricing Slabs Section */}
            <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-600" />
                  <Label className="text-sm font-medium text-[var(--text-primary)]">{t("variant_card.pricing_slabs.title")}</Label>
                </div>
                {!showSlabForm && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingSlab(null);
                      setSlabForm({ minQty: 1, maxQty: "", price: "" });
                      setShowSlabForm(true);
                    }}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t("variant_card.pricing_slabs.add")}
                  </Button>
                )}
              </div>

              {/* Existing Slabs List */}
              {variantSlabs.length > 0 ? (
                <div className="space-y-2">
                  {variantSlabs.map((slab, slabIndex) => (
                    <div
                      key={slab.id || slabIndex}
                      className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] text-sm"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-[var(--text-primary)]">
                          {slab.minQty}-{slab.maxQty || "∞"} {t("variant_card.pricing_slabs.pieces")}
                        </span>
                        <span className="font-medium text-green-600">₹{slab.price}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSlab(slab)}
                          className="h-6 w-6 p-0"
                          disabled={slabLoading}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSlab(slab)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          disabled={slabLoading}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !showSlabForm && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t("variant_card.pricing_slabs.no_slabs")}
                  </p>
                )
              )}

              {/* Add/Edit Slab Form */}
              {showSlabForm && (
                <div className="p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-[var(--text-primary)]">{t("variant_card.pricing_slabs.min_qty")}</Label>
                      <Input
                        type="number"
                        min="1"
                        value={slabForm.minQty}
                        onChange={(e) => setSlabForm({ ...slabForm, minQty: parseInt(e.target.value) || 1 })}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[var(--text-primary)]">{t("variant_card.pricing_slabs.max_qty")}</Label>
                      <Input
                        type="number"
                        min="1"
                        value={slabForm.maxQty}
                        onChange={(e) => setSlabForm({ ...slabForm, maxQty: e.target.value })}
                        className="h-8"
                        placeholder={t("variant_card.pricing_slabs.unlimited")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[var(--text-primary)]">{t("variant_card.pricing_slabs.price")}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={slabForm.price}
                        onChange={(e) => setSlabForm({ ...slabForm, price: e.target.value })}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowSlabForm(false);
                        setEditingSlab(null);
                        setSlabForm({ minQty: 1, maxQty: "", price: "" });
                      }}
                      className="h-7"
                      disabled={slabLoading}
                    >
                      {t("variant_card.pricing_slabs.cancel")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={editingSlab ? handleUpdateSlab : handleAddSlab}
                      className="h-7"
                      disabled={slabLoading}
                    >
                      {slabLoading ? "..." : t("variant_card.pricing_slabs.save")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Dimensions Section - Only show when Shiprocket is enabled */}
          {shiprocketEnabled && (
            <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-[var(--text-primary)]">{t("variant_card.shipping.title")}</Label>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                  {t("variant_card.shipping.optional")}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor={`shippingLength-${index}`} className="text-xs text-[var(--text-primary)]">
                    {t("variant_card.shipping.length")}
                  </Label>
                  <Input
                    id={`shippingLength-${index}`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={variant.shippingLength || ""}
                    onChange={(e) => handleInputChange("shippingLength", e.target.value)}
                    className="h-8"
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`shippingBreadth-${index}`} className="text-xs text-[var(--text-primary)]">
                    {t("variant_card.shipping.breadth")}
                  </Label>
                  <Input
                    id={`shippingBreadth-${index}`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={variant.shippingBreadth || ""}
                    onChange={(e) => handleInputChange("shippingBreadth", e.target.value)}
                    className="h-8"
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`shippingHeight-${index}`} className="text-xs text-[var(--text-primary)]">
                    {t("variant_card.shipping.height")}
                  </Label>
                  <Input
                    id={`shippingHeight-${index}`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={variant.shippingHeight || ""}
                    onChange={(e) => handleInputChange("shippingHeight", e.target.value)}
                    className="h-8"
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`shippingWeight-${index}`} className="text-xs text-[var(--text-primary)]">
                    {t("variant_card.shipping.weight")}
                  </Label>
                  <Input
                    id={`shippingWeight-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={variant.shippingWeight || ""}
                    onChange={(e) => handleInputChange("shippingWeight", e.target.value)}
                    className="h-8"
                    placeholder="e.g. 0.5"
                  />
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {t("variant_card.shipping.hint")}
              </p>
            </div>
          )}

          {/* Image Management Section */}
          <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-[var(--text-primary)]">{t("variant_card.images.title")}</Label>
              <Badge variant="outline" className="text-xs">
                {currentImages.length}/{maxImages}
              </Badge>
            </div>

            {/* Suggested images from attribute values */}
            {suggestedAttrImages.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-700 mb-2">Suggested from attribute values — click to use:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedAttrImages.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleUseSuggestedImage(s.url)}
                      className="flex flex-col items-center gap-1 group"
                      title={`Use image from "${s.label}"`}
                    >
                      <div className="relative w-14 h-14 rounded-md overflow-hidden border-2 border-amber-300 group-hover:border-amber-500 transition-colors">
                        <img src={s.url} alt={s.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <Plus className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
                        </div>
                      </div>
                      <span className="text-[10px] text-amber-600 max-w-[56px] truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 6 Sequential Boxes (5 images + 1 video) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {variantSlots.map((preview, i) => {
                const isSlotPrimary = i === 0;
                if (preview) {
                  return (
                    <div
                      key={preview.id || preview.tempId || `variant-slot-${i}`}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all aspect-square bg-[var(--bg-card)] ${preview.isPrimary
                          ? "border-green-500 ring-2 ring-green-200 shadow-md"
                          : "border-[var(--border-color)]"
                        }`}
                    >
                      {/* Image */}
                      <img
                        src={preview.url}
                        alt={`Slot ${i + 1}`}
                        className="h-full w-full object-cover"
                      />

                      {/* Top Overlay Badges */}
                      <div className="absolute top-2 left-2 flex gap-1">
                        {preview.isPrimary && (
                          <span className="bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                            PRIMARY
                          </span>
                        )}
                        {preview.isNew && (
                          <span className="bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                            NEW
                          </span>
                        )}
                      </div>

                      {/* Delete Button (Top Right) */}
                      <button
                        type="button"
                        onClick={() => removeVariantImageAt(i)}
                        className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-sm"
                        title="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                      {/* Order Controls Overlay (Bottom) */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1.5 flex items-center justify-between text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-medium ml-1">Slot {i + 1}</span>
                        <div className="flex gap-1">
                          {i > 0 && (
                            <button
                              type="button"
                              onClick={() => moveVariantImage(i, "left")}
                              className="p-1 bg-white/20 hover:bg-white/40 rounded transition-colors"
                              title="Move Left"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {i < 4 && variantSlots[i + 1] !== null && (
                            <button
                              type="button"
                              onClick={() => moveVariantImage(i, "right")}
                              className="p-1 bg-white/20 hover:bg-white/40 rounded transition-colors"
                              title="Move Right"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <label
                      key={`empty-variant-slot-${i}`}
                      className="relative flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)] hover:border-primary/50 hover:bg-[var(--bg-secondary)] rounded-lg cursor-pointer transition-all aspect-square bg-[var(--bg-card)] text-center p-2 group"
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleVariantSlotFileChange(i, e.target.files[0]);
                          }
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center space-y-1 text-[var(--text-secondary)] group-hover:text-primary transition-colors">
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Plus className="h-5 w-5" />
                        )}
                        <span className="text-[10px] font-semibold">Image {i + 1}</span>
                        {isSlotPrimary && (
                          <span className="text-[8px] text-green-500 font-bold bg-green-50 px-1 rounded">
                            (Primary)
                          </span>
                        )}
                      </div>
                    </label>
                  );
                }
              })}

              {/* 6th Slot - Video (Optional) */}
              {variant.videoUrl ? (
                <div
                  className="relative group rounded-lg overflow-hidden border-2 border-[var(--border-color)] transition-all aspect-square bg-[var(--bg-card)]"
                >
                  {/* Video Player */}
                  <video
                    src={variant.videoUrl}
                    className="h-full w-full object-cover"
                    controls
                  />

                  {/* Delete Button (Top Right) */}
                  <button
                    type="button"
                    onClick={removeVariantVideo}
                    className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-sm z-10"
                    title="Remove video"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  {/* Overlay Label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1.5 flex items-center justify-between text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-medium ml-1">Variant Video</span>
                  </div>
                </div>
              ) : (
                <label
                  className="relative flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)] hover:border-primary/50 hover:bg-[var(--bg-secondary)] rounded-lg cursor-pointer transition-all aspect-square bg-[var(--bg-card)] text-center p-2 group"
                >
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleVariantVideoChange(e.target.files[0]);
                      }
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center space-y-1 text-[var(--text-secondary)] group-hover:text-primary transition-colors">
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Video className="h-5 w-5" />
                    )}
                    <span className="text-[10px] font-semibold">Add Video</span>
                    <span className="text-[8px] text-[var(--text-secondary)]">
                      MP4/WebM • Max 10MB
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
