import {
  useState,
  useEffect,
  useCallback,
  Fragment,
  useRef,
  useMemo,
} from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import {
  products,
  categories,
  attributes,
  subCategories,
  moq,
} from "@/api/adminService";
import api from "@/api/api";
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
  Star,
  X,
  MoreVertical,
  Info,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";
import { Badge } from "@/components/ui/badge";
import { v4 as uuidv4 } from "uuid";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { DeleteProductDialog } from "@/components/DeleteProductDialog";
import VariantCard from "@/components/VariantCard";
import { useDebounce } from "@/utils/debounce";
import JoditEditor from "jodit-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { brands as brandsApi, categories as categoriesApi, attributes as attributesApi, attributeValues as attributeValuesApi } from "@/api/adminService";

import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { WASHING_CARE_ICONS, parseWashingCare } from "@/components/WashingCareIcons";

function useCategories() {
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const response = await categories.getCategories();

        if (response.data.success) {
          setCategoriesData(response.data.data?.categories || []);
        } else {
          setError(response.data.message || "Failed to fetch categories");
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setError("An error occurred while fetching categories");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Re-fetch when quick-create triggers event
  useEffect(() => {
    const handler = () => {
      categories.getCategories().then((r) => {
        if (r.data.success) setCategoriesData(r.data.data?.categories || []);
      }).catch(() => {});
    };
    window.addEventListener("refetch-categories", handler);
    return () => window.removeEventListener("refetch-categories", handler);
  }, []);

  return { categories: categoriesData, isLoading, error };
}

// Export ProductForm for reuse in other components
export function ProductForm({
  mode,
  productId,
}: {
  mode: "create" | "edit";
  productId?: string;
}) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(mode === "edit");
  const [attributesList, setAttributesList] = useState<any[]>([]);
  const [attributeValuesMap, setAttributeValuesMap] = useState<
    Record<string, any[]>
  >({});
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string[]>
  >({});
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [hasVariants, setHasVariants] = useState(false);

  // ── Inline quick-create state ──────────────────────────────────────────────
  const [showQuickBrand, setShowQuickBrand] = useState(false);
  const [quickBrandName, setQuickBrandName] = useState("");
  const [quickBrandFile, setQuickBrandFile] = useState<File | null>(null);
  const [quickBrandLoading, setQuickBrandLoading] = useState(false);

  const [showQuickCategory, setShowQuickCategory] = useState(false);
  const [quickCatName, setQuickCatName] = useState("");
  const [quickCatLoading, setQuickCatLoading] = useState(false);

  const [showQuickAttr, setShowQuickAttr] = useState(false);
  const [quickAttrName, setQuickAttrName] = useState("");
  const [quickAttrType, setQuickAttrType] = useState("select");
  const [quickAttrValues, setQuickAttrValues] = useState<string[]>([""]);
  const [quickAttrLoading, setQuickAttrLoading] = useState(false);

  // Per-attribute inline add-value state: attrId → {open, value, hexCode, loading}
  const [inlineAddValue, setInlineAddValue] = useState<Record<string, { open: boolean; value: string; hexCode: string; loading: boolean }>>({});
  const [product, setProduct] = useState({
    name: "",
    description: "",
    categoryId: "",
    categoryIds: [] as string[],
    primaryCategoryId: "",
    subCategoryIds: [] as string[],
    sku: "",
    price: "",
    salePrice: "",
    quantity: 0,
    featured: false,
    ourProduct: false,
    productType: [] as string[],
    isActive: true,
    // SEO fields
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    tags: [] as string[],
    // Dynamic accordion fields
    washingAndCare: "",
    shippingAndReturns: "",
    aboutThisDesign: "",
    designStory: "",
    // single brand association
    brandId: "",
    topBrandIds: [] as string[],
    newBrandIds: [] as string[],
    hotBrandIds: [] as string[],
    // Shipping dimensions for Shiprocket (for products without variants)
    shippingLength: "",
    shippingBreadth: "",
    shippingHeight: "",
    shippingWeight: "",
  });

  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);

  // Video state (optional)
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoRemoved, setVideoRemoved] = useState(false);

  // State for variants
  const [variants, setVariants] = useState<any[]>([]);

  // MOQ State
  const [productMOQ, setProductMOQ] = useState({
    isActive: false,
    minQuantity: 1,
  });

  // Shiprocket enabled state
  const [shiprocketEnabled, setShiprocketEnabled] = useState(false);

  // Add state to track selected categories
  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);
  const [subCategoriesMap, setSubCategoriesMap] = useState<
    Record<string, any[]>
  >({});
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>(
    []
  );

  // Get categories data using the useCategories hook
  const { categories, isLoading: categoriesLoading } = useCategories();

  // Fetch Shiprocket settings to check if enabled
  useEffect(() => {
    const fetchShiprocketSettings = async () => {
      try {
        const response = await api.get("/api/admin/shiprocket/settings");
        if (response.data.success) {
          setShiprocketEnabled(response.data.data?.settings?.isEnabled || false);
        }
      } catch (error) {
        // Shiprocket not configured, keep disabled
        console.error("Error fetching shiprocket settings:", error);
        setShiprocketEnabled(false);
      }
    };
    fetchShiprocketSettings();
  }, []);

  // Jodit Editor reference and local state
  const editorRef = useRef<any>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const hasInitializedEditor = useRef(false);

  // Memoize editor config to prevent re-renders when other state changes
  const editorConfig = useMemo(
    () => ({
      height: 400,
      placeholder:
        "Enter product description. Use the toolbar to format text, add tables, colors, and more.",
      toolbar: true,
      toolbarButtonSize: "middle" as const,
      toolbarAdaptive: false,
      showCharsCounter: true,
      showWordsCounter: true,
      showXPathInStatusbar: false,
      askBeforePasteHTML: false,
      askBeforePasteFromWord: false,
      defaultActionOnPaste: "insert_as_html" as const,
      buttons: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "|",
        "superscript",
        "subscript",
        "|",
        "align",
        "|",
        "ul",
        "ol",
        "|",
        "outdent",
        "indent",
        "|",
        "font",
        "fontsize",
        "brush",
        "paragraph",
        "|",
        "image",
        "link",
        "|",
        "undo",
        "redo",
        "|",
        "hr",
        "eraser",
        "copyformat",
        "|",
        "fullsize",
        "selectall",
        "print",
        "|",
        "source",
        "|",
        "table",
        "|",
        "find",
        "|",
        "symbol",
        "|",
        "about",
      ],
      removeButtons: [],
      zIndex: 0,
      readonly: false,
      activeButtonsInReadOnly: ["source", "fullsize"],
      toolbarSticky: false,
      toolbarStickyOffset: 0,
      showPlaceholder: true,
      language: "en",
      direction: "ltr" as const,
      tabIndex: -1,
      useSearch: true,
      spellcheck: true,
      enter: "p" as const,
      enterBlock: "div" as const,
      defaultMode: 1,
      useSplitMode: false,
      colorPickerDefaultTab: "background" as const,
      imageDefaultWidth: 300,
      theme: theme === "dark" ? "dark" : "default",
    }),
    [theme]
  );

  // Fetch sub-categories when categories change
  useEffect(() => {
    const fetchSubCategories = async () => {
      if (product.categoryIds.length === 0) return;

      const subCategoriesData: Record<string, any[]> = {};
      for (const categoryId of product.categoryIds) {
        try {
          const response =
            await subCategories.getSubCategoriesByCategory(categoryId);
          if (response.data?.success) {
            subCategoriesData[categoryId] =
              response.data.data?.subCategories || [];
          }
        } catch (error) {
          console.error(
            `Error fetching sub-categories for category ${categoryId}:`,
            error
          );
        }
      }
      setSubCategoriesMap(subCategoriesData);
    };

    fetchSubCategories();
  }, [product.categoryIds]);

  // Sync editorContent with product.description ONLY when product first loads in edit mode
  // This prevents cursor jumping during typing
  useEffect(() => {
    if (
      mode === "edit" &&
      product.description &&
      !hasInitializedEditor.current
    ) {
      setEditorContent(product.description);
      hasInitializedEditor.current = true;
    }
    if (mode === "create") {
      hasInitializedEditor.current = false;
    }
  }, [mode, product.description]);

  // Define a proper interface for image previews
  interface ImagePreview {
    url: string;
    id?: string;
    isPrimary?: boolean;
    file?: File; // For new images - enables reorder + FormData
  }

  // Handle image drop for upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log(
      `📸 Files dropped/selected: ${acceptedFiles.length}`,
      acceptedFiles
    );

    if (acceptedFiles.length === 0) {
      toast.error("No valid files selected");
      return;
    }

    // Validate files
    const validFiles = acceptedFiles.filter((file) => {
      const isValidType = file.type.startsWith("image/");
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB

      if (!isValidType) {
        toast.error(`${file.name} is not a valid image file`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name} is too large. Maximum size is 10MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    // Create local previews with file reference for reorder + FormData
    const newPreviews: ImagePreview[] = validFiles.map((file) => ({
      url: URL.createObjectURL(file),
      isPrimary: false,
      file,
    }));

    setImagePreviews((prev) => {
      const combined = [...prev, ...newPreviews];
      if (prev.length === 0 && newPreviews.length > 0) {
        combined[0].isPrimary = true;
      }
      return combined;
    });

    toast.success(`${validFiles.length} image(s) added successfully`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/gif": [],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach((file) => {
        const errors = file.errors.map((e) => e.message).join(", ");
        toast.error(`${file.file.name}: ${errors}`);
      });
    },
  });

  // Video dropzone (optional, max 10MB)
  const onVideoDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
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
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setVideoRemoved(false); // User added new video, don't remove on server
    toast.success("Video added");
  }, []);

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps, isDragActive: isVideoDragActive } = useDropzone({
    onDrop: onVideoDrop,
    accept: { "video/mp4": [], "video/webm": [] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    onDropRejected: (rejected) => {
      rejected.forEach((r) => {
        const msg = r.errors.map((e) => e.message).join(", ");
        toast.error(`${r.file.name}: ${msg}`);
      });
    },
  });

  const removeVideo = useCallback(() => {
    if (videoFile && videoPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoRemoved(true);
  }, [videoFile, videoPreviewUrl]);

  // Product image reorder (drag and drop)
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);

  const handleProductImageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedImageIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleProductImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverImageIndex(index);
  };

  const handleProductImageDragLeave = () => setDragOverImageIndex(null);

  const handleProductImageDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverImageIndex(null);
    if (draggedImageIndex === null || draggedImageIndex === dropIndex) {
      setDraggedImageIndex(null);
      return;
    }
    const newPreviews = [...imagePreviews];
    const [dragged] = newPreviews.splice(draggedImageIndex, 1);
    newPreviews.splice(dropIndex, 0, dragged);
    setImagePreviews(newPreviews);
    setDraggedImageIndex(null);

    // If edit mode with existing images (all have id), persist order to server
    const allHaveId = newPreviews.every((p) => p.id);
    if (mode === "edit" && productId && allHaveId) {
      try {
        const imageOrders = newPreviews.map((p, i) => ({
          imageId: p.id!,
          order: i,
        }));
        await products.reorderProductImages(productId, imageOrders);
        toast.success("Images reordered");
      } catch (err) {
        console.error("Failed to reorder product images:", err);
        toast.error("Failed to save image order");
      }
    }
  };

  // Remove image from preview and files
  const removeImage = (index: number) => {
    // If there's an ID, it's an existing image from the server
    const imageToRemove = imagePreviews[index];

    if (imageToRemove.id) {
      // Check if this is the only image
      if (imagePreviews.length === 1) {
        toast.error(
          "Cannot delete the only image. Products must have at least one image."
        );
        return;
      }

      // This is an existing image, delete from server
      products
        .deleteImage(imageToRemove.id)
        .then(() => {
          toast.success("Image deleted successfully");
          setImagePreviews((prev) => prev.filter((_, i) => i !== index));
        })
        .catch((error) => {
          console.error("Error deleting image:", error);
          if (error.response?.data?.message) {
            toast.error(error.response.data.message);
          } else {
            toast.error("Failed to delete image");
          }
        });
    } else {
      // This is a local preview only
      // Revoke the object URL to avoid memory leaks
      URL.revokeObjectURL(imagePreviews[index].url);

      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Set an image as primary
  const setPrimaryImage = (index: number) => {
    // Update image previews with the new primary image
    setImagePreviews((prev) => {
      const updated = prev.map((preview, i) => ({
        ...preview,
        isPrimary: i === index,
      }));
      return updated;
    });
  };

  // Fetch attributes and their values
  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const response = await attributes.getAttributes();
        if (response.data.success) {
          const attrs = response.data.data?.attributes || [];
          setAttributesList(attrs);

          // Fetch values for each attribute
          const valuesMap: Record<string, any[]> = {};
          for (const attr of attrs) {
            try {
              const valuesResponse = await attributes.getAttributeValues(
                attr.id
              );
              if (valuesResponse.data.success) {
                valuesMap[attr.id] = valuesResponse.data.data?.values || [];
              }
            } catch (error) {
              console.error(
                `Error fetching values for attribute ${attr.id}:`,
                error
              );
            }
          }
          setAttributeValuesMap(valuesMap);
        }
      } catch (error) {
        console.error("Error fetching attributes:", error);
        toast.error("Failed to load attributes");
      }
    };

    fetchAttributes();
  }, []);

  // Fetch brands for selection
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await import("@/api/adminService").then((m) =>
          m.brands.getBrands()
        );
        const raw = res.data.data?.brands || res.data.data || [];
        setBrandsList(Array.isArray(raw) ? raw : []);
      } catch (err) {
        console.error("Failed to load brands for product form", err);
      }
    };

    fetchBrands();
  }, []);

  // ── Quick-create handlers ──────────────────────────────────────────────────

  const handleQuickCreateBrand = async () => {
    if (!quickBrandName.trim() || !quickBrandFile) {
      toast.error("Brand name and logo required");
      return;
    }
    setQuickBrandLoading(true);
    try {
      const res = await brandsApi.createBrand({ name: quickBrandName.trim(), image: quickBrandFile });
      const newBrand = res.data.data?.brand || res.data.data;
      setBrandsList((prev) => [...prev, newBrand]);
      setProduct((prev) => ({ ...prev, brandId: newBrand.id }));
      setShowQuickBrand(false);
      setQuickBrandName("");
      setQuickBrandFile(null);
      toast.success(`Brand "${newBrand.name}" created`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create brand");
    } finally {
      setQuickBrandLoading(false);
    }
  };

  const handleQuickCreateCategory = async () => {
    if (!quickCatName.trim()) { toast.error("Category name required"); return; }
    setQuickCatLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", quickCatName.trim());
      const res = await categoriesApi.createCategory(fd);
      const newCat = res.data.data?.category || res.data.data;
      // Re-fetch categories list to update CategorySelector
      try {
        const catRes = await categoriesApi.getCategories();
        const cats = catRes.data.data?.categories || catRes.data.data || [];
        // categories state is from useCategories hook — trigger re-fetch by dispatching custom event
        window.dispatchEvent(new CustomEvent("refetch-categories"));
      } catch {}
      setShowQuickCategory(false);
      setQuickCatName("");
      toast.success(`Category "${newCat.name}" created — select it below`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create category");
    } finally {
      setQuickCatLoading(false);
    }
  };

  const handleQuickCreateAttribute = async () => {
    if (!quickAttrName.trim()) { toast.error("Attribute name required"); return; }
    setQuickAttrLoading(true);
    try {
      const res = await attributesApi.createAttribute({ name: quickAttrName.trim(), inputType: quickAttrType });
      const newAttr = res.data.data?.attribute || res.data.data;
      // Add values
      const valuesToAdd = quickAttrValues.filter((v) => v.trim());
      const addedValues: any[] = [];
      for (const val of valuesToAdd) {
        try {
          const vRes = await attributeValuesApi.createAttributeValue(newAttr.id, { value: val.trim() });
          const v = vRes.data.data?.value || vRes.data.data;
          if (v) addedValues.push(v);
        } catch {}
      }
      setAttributesList((prev) => [...prev, newAttr]);
      setAttributeValuesMap((prev) => ({ ...prev, [newAttr.id]: addedValues }));
      setShowQuickAttr(false);
      setQuickAttrName("");
      setQuickAttrType("select");
      setQuickAttrValues([""]);
      toast.success(`Attribute "${newAttr.name}" created with ${addedValues.length} values`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create attribute");
    } finally {
      setQuickAttrLoading(false);
    }
  };

  const handleInlineAddValue = async (attrId: string) => {
    const s = inlineAddValue[attrId];
    if (!s?.value?.trim()) { toast.error("Value required"); return; }
    setInlineAddValue((prev) => ({ ...prev, [attrId]: { ...prev[attrId], loading: true } }));
    try {
      const res = await attributeValuesApi.createAttributeValue(attrId, {
        value: s.value.trim(),
        hexCode: s.hexCode || undefined,
      });
      const newVal = res.data.data?.value || res.data.data;
      setAttributeValuesMap((prev) => ({ ...prev, [attrId]: [...(prev[attrId] || []), newVal] }));
      setInlineAddValue((prev) => ({ ...prev, [attrId]: { open: false, value: "", hexCode: "", loading: false } }));
      toast.success(`Value "${s.value.trim()}" added`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add value");
      setInlineAddValue((prev) => ({ ...prev, [attrId]: { ...prev[attrId], loading: false } }));
    }
  };

  // Fetch product details if in edit mode
  useEffect(() => {
    if (mode === "edit" && productId) {
      const fetchProductDetails = async () => {
        try {
          setFormLoading(true);
          const response = await products.getProductById(productId);

          if (response.data.success) {
            const productData = response.data.data?.product || {};

            // Get categories from the product
            const productCategories = productData.categories || [];
            const primaryCategory =
              productData.primaryCategory ||
              (productCategories.length > 0 ? productCategories[0] : null);

            // Set product data
            const existingSubCategoryIds =
              productData.subCategories?.map((sc: any) => sc.id) || [];

            // Initialize selected sub-categories with existing ones when editing
            setSelectedSubCategories(existingSubCategoryIds);

            // Set editor content for edit mode
            const existingDescription = productData.description || "";
            setEditorContent(existingDescription);

            setProduct({
              name: productData.name || "",
              description: productData.description || "",
              // Prefill brandId if available
              brandId: productData.brand?.id || productData.brandId || "",
              categoryId: primaryCategory?.id || "",
              categoryIds: productCategories.map((c: any) => c.id),
              primaryCategoryId: primaryCategory?.id || "",
              subCategoryIds: existingSubCategoryIds,
              sku:
                productData.variants?.length === 1 &&
                  (!productData.variants[0].attributes ||
                    productData.variants[0].attributes.length === 0)
                  ? productData.variants[0].sku
                  : "",
              price:
                productData.variants?.length === 1 &&
                  (!productData.variants[0].attributes ||
                    productData.variants[0].attributes.length === 0)
                  ? productData.variants[0].price.toString()
                  : "",
              salePrice:
                productData.variants?.length === 1 &&
                  (!productData.variants[0].attributes ||
                    productData.variants[0].attributes.length === 0) &&
                  productData.variants[0].salePrice
                  ? productData.variants[0].salePrice.toString()
                  : "",
              quantity:
                productData.variants?.length === 1 &&
                  !productData.variants[0].colorId &&
                  !productData.variants[0].sizeId
                  ? productData.variants[0].quantity
                  : 0,
              featured: productData.featured || false,
              ourProduct: productData.ourProduct || false,
              productType: Array.isArray(productData.productType)
                ? productData.productType
                : typeof productData.productType === "string"
                  ? (() => {
                    try {
                      const parsed = JSON.parse(productData.productType);
                      return Array.isArray(parsed) ? parsed : [];
                    } catch {
                      return [];
                    }
                  })()
                  : [],
              isActive:
                productData.isActive !== undefined
                  ? productData.isActive
                  : true,
              // SEO fields
              metaTitle: productData.metaTitle || "",
              metaDescription: productData.metaDescription || "",
              keywords: productData.keywords || "",
              tags: productData.tags || [],
              topBrandIds: productData.topBrandIds || [],
              newBrandIds: productData.newBrandIds || [],
              hotBrandIds: productData.hotBrandIds || [],
              // Dynamic accordion fields
              washingAndCare: productData.washingAndCare || "",
              shippingAndReturns: productData.shippingAndReturns || "",
              aboutThisDesign: productData.aboutThisDesign || "",
              designStory: productData.designStory || "",
              // Shipping dimensions (from first variant if no variants)
              shippingLength: productData.variants?.[0]?.shippingLength?.toString() || "",
              shippingBreadth: productData.variants?.[0]?.shippingBreadth?.toString() || "",
              shippingHeight: productData.variants?.[0]?.shippingHeight?.toString() || "",
              shippingWeight: productData.variants?.[0]?.shippingWeight?.toString() || "",
            });

            // Set selected categories (for radio buttons, not checkboxes)
            setSelectedCategories(productCategories);

            // Setup image previews (sorted by order)
            if (productData.images && productData.images.length > 0) {
              const sorted = [...productData.images].sort(
                (a: any, b: any) => (a.order ?? 999) - (b.order ?? 999)
              );
              setImagePreviews(
                sorted.map((img: any) => ({
                  url: img.url,
                  id: img.id,
                  isPrimary: img.isPrimary || false,
                }))
              );
            }

            // Setup video preview if product has video
            if (productData.videoUrl) {
              setVideoPreviewUrl(productData.videoUrl);
              setVideoRemoved(false);
            }

            if (productData.variants && productData.variants.length > 0) {
              const hasRealVariants =
                productData.variants.length > 1 ||
                (productData.variants.length === 1 &&
                  productData.variants[0].attributes?.length > 0);

              setHasVariants(hasRealVariants);

              if (hasRealVariants) {
                // Map the backend variants to the format expected by the form
                const formattedVariants = productData.variants.map(
                  (variant: any) => ({
                    id: variant.id,
                    attributeValueIds: variant.attributes
                      ? variant.attributes.map((a: any) => a.attributeValueId)
                      : [],
                    attributes: variant.attributes || [],
                    sku: variant.sku || "",
                    price: variant.price ? variant.price.toString() : "0.00",
                    salePrice: variant.salePrice
                      ? variant.salePrice.toString()
                      : "",
                    quantity: variant.quantity || 0,
                    isActive:
                      variant.isActive !== undefined ? variant.isActive : true,
                    images: Array.isArray(variant.images)
                      ? [...variant.images]
                          .sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999))
                          .map((img: any) => ({
                            url: img.url,
                            id: img.id,
                            isPrimary: img.isPrimary || false,
                            isNew: false,
                            order: img.order,
                          }))
                      : [],
                  })
                );

                setVariants(formattedVariants);

                // Set selected attributes based on existing variants
                const selectedAttrs: Record<string, string[]> = {};

                productData.variants.forEach((variant: any) => {
                  // Handle attributes for variant selection
                  if (variant.attributes) {
                    variant.attributes.forEach((attr: any) => {
                      if (!selectedAttrs[attr.attributeId]) {
                        selectedAttrs[attr.attributeId] = [];
                      }
                      if (
                        !selectedAttrs[attr.attributeId].includes(
                          attr.attributeValueId
                        )
                      ) {
                        selectedAttrs[attr.attributeId].push(
                          attr.attributeValueId
                        );
                      }
                    });
                  }
                });

                setSelectedAttributes(selectedAttrs);
              }
            }
          } else {
            toast.error(
              response.data.message || "Failed to fetch product details"
            );
          }
        } catch (error) {
          console.error("Error fetching product:", error);
          toast.error("An error occurred while fetching product data");
        } finally {
          setFormLoading(false);
        }
      };

      fetchProductDetails();

      // Fetch Product MOQ
      if (mode === "edit" && productId) {
        moq.getProductMOQ(productId)
          .then((response) => {
            if (response.data.success && response.data.data) {
              setProductMOQ({
                isActive: response.data.data.isActive,
                minQuantity: response.data.data.minQuantity,
              });
            }
          })
          .catch(() => {
            // MOQ not set, that's okay
          });
      }
    }
  }, [mode, productId]);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setProduct((prev) => ({ ...prev, [name]: checked }));
    } else {
      setProduct((prev) => {
        const updated: any = { ...prev, [name]: value };
        // Auto-fill metaTitle from product name if metaTitle is empty
        if (name === "name" && (!prev.metaTitle || prev.metaTitle === prev.name)) {
          updated.metaTitle = value;
        }
        return updated;
      });
    }
  };

  // Handle attribute value selection
  const handleAttributeValueToggle = (attributeId: string, valueId: string) => {
    setSelectedAttributes((prev) => {
      const currentValues = prev[attributeId] || [];
      const newValues = currentValues.includes(valueId)
        ? currentValues.filter((id) => id !== valueId)
        : [...currentValues, valueId];
      return { ...prev, [attributeId]: newValues };
    });
  };

  // Generate variants based on selected attribute values
  const generateVariants = () => {
    // Check if at least one attribute has selected values
    const hasSelectedValues = Object.values(selectedAttributes).some(
      (values) => values.length > 0
    );

    if (!hasSelectedValues) {
      toast.error(
        "Please select at least one attribute value to generate variants"
      );
      return;
    }

    // Generate all combinations of selected attribute values
    const attributeIds = Object.keys(selectedAttributes).filter(
      (attrId) => selectedAttributes[attrId].length > 0
    );

    // Create arrays of selected values for each attribute
    const valueArrays = attributeIds.map((attrId) =>
      selectedAttributes[attrId].map((valueId) => {
        const attr = attributesList.find((a) => a.id === attrId);
        const value = attributeValuesMap[attrId]?.find((v) => v.id === valueId);
        return { attributeId: attrId, attribute: attr, valueId, value };
      })
    );

    // Generate cartesian product of all value combinations
    const combinations = valueArrays.reduce((acc, curr) => {
      if (acc.length === 0) return curr.map((v) => [v]);
      const result: any[][] = [];
      acc.forEach((accItem) => {
        curr.forEach((currItem) => {
          result.push([...accItem, currItem]);
        });
      });
      return result;
    }, [] as any[][]);

    // Generate variants from combinations
    const newVariants: any[] = [];

    combinations.forEach((combination) => {
      const attributeValueIds = combination.map((c) => c.valueId);
      const attributeNames = combination.map(
        (c) => `${c.attribute?.name}: ${c.value?.value}`
      );
      const variantName = attributeNames.join(", ");

      // Check for duplicate (same attributeValueIds combination)
      const isDuplicate = variants.some((v) => {
        const existingIds = (v.attributeValueIds || []).sort().join(",");
        const newIds = attributeValueIds.sort().join(",");
        return existingIds === newIds;
      });

      if (isDuplicate) {
        return;
      }

      const skuBase = product.sku || "";
      const skuSuffix = combination
        .map((c) => c.value?.value?.substring(0, 3).toUpperCase() || "")
        .join("-");
      const variantSku = skuSuffix ? `${skuBase}-${skuSuffix}` : skuBase;

      newVariants.push({
        id: uuidv4(),
        name: variantName,
        attributeValueIds,
        attributes: combination.map((c) => ({
          attribute: c.attribute?.name,
          value: c.value?.value,
          attributeId: c.attributeId,
          attributeValueId: c.valueId,
        })),
        sku: variantSku,
        price: product.price || "",
        salePrice: product.salePrice || "",
        quantity: product.quantity || 0,
        isActive: true,
        images: [],
      });
    });

    if (newVariants.length === 0) {
      toast.error(
        "No new variants generated. All selected combinations already exist.",
        {
          position: "top-center",
        }
      );
      return;
    }

    setVariants((prev) => [...prev, ...newVariants]);
    toast.success(`${newVariants.length} new variant(s) generated!`, {
      position: "top-center",
    });
  };

  // Handle variant images change (used by VariantCard)
  const handleVariantImagesChange = (variantIndex: number, images: any[]) => {
    setVariants((prev) =>
      prev.map((variant, i) =>
        i === variantIndex ? { ...variant, images } : variant
      )
    );
  };

  // Update variant by index (used by VariantCard)
  const updateVariantByIndex = (
    variantIndex: number,
    field: string,
    value: any
  ) => {
    setVariants((prev) =>
      prev.map((variant, i) =>
        i === variantIndex ? { ...variant, [field]: value } : variant
      )
    );
  };

  // Remove variant by index (used by VariantCard)
  const removeVariantByIndex = (variantIndex: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== variantIndex));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate product name
    if (!product.name || product.name.trim() === "") {
      toast.error("Please provide a valid product name");
      setIsLoading(false);
      return;
    }

    // Validate category selection
    if (!product.categoryIds || product.categoryIds.length === 0) {
      toast.error("Please select at least one category");
      setIsLoading(false);
      return;
    }

    // Validate variants for variant products
    if (hasVariants && (!variants || variants.length === 0)) {
      toast.error("Please add at least one variant for this product");
      setIsLoading(false);
      return;
    }

    try {
      // Create FormData object for API submission
      const formData = new FormData();

      // Add basic product information
      formData.append("name", product.name);
      // Use editorContent if available, otherwise use product.description
      // Get the latest content - prioritize editorContent as it's the most up-to-date
      let finalDescription = "";

      // First try editorContent (most recent)
      if (editorContent && editorContent.trim()) {
        finalDescription = editorContent.trim();
      }
      // Fallback to product.description
      else if (product.description && product.description.trim()) {
        finalDescription = product.description.trim();
      }

      // Try to get from editor ref as last resort
      if (!finalDescription && editorRef.current) {
        try {
          const editorValue =
            (editorRef.current as any).value ||
            (editorRef.current as any).getEditorValue?.();
          if (
            editorValue &&
            typeof editorValue === "string" &&
            editorValue.trim()
          ) {
            finalDescription = editorValue.trim();
          }
        } catch (e) {
          console.warn("Could not get editor value from ref", e);
        }
      }

      formData.append("description", finalDescription);
      formData.append("featured", String(product.featured));
      formData.append("ourProduct", String(product.ourProduct));
      formData.append("productType", JSON.stringify(product.productType));
      formData.append("isActive", String(product.isActive));
      formData.append("hasVariants", String(hasVariants));
      // Add SEO fields
      formData.append("metaTitle", product.metaTitle || "");
      // Auto-generate meta description from description if not provided
      let metaDesc = product.metaDescription || "";
      if (!metaDesc || metaDesc.trim() === "") {
        // Strip HTML tags and create plain text version
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = product.description || "";
        const plainText = tempDiv.textContent || tempDiv.innerText || "";
        metaDesc = plainText.replace(/\s+/g, " ").trim().substring(0, 160);
        if (plainText.length > 160) {
          metaDesc += "...";
        }
      }
      formData.append("metaDescription", metaDesc);
      formData.append("keywords", product.keywords || "");
      if (product.tags && product.tags.length > 0) {
        formData.append("tags", JSON.stringify(product.tags));
      }

      formData.append("washingAndCare", product.washingAndCare || "");
      formData.append("shippingAndReturns", product.shippingAndReturns || "");
      formData.append("aboutThisDesign", product.aboutThisDesign || "");
      formData.append("designStory", product.designStory || "");

      // Add categories information
      if (product.categoryIds && product.categoryIds.length > 0) {
        formData.append("categoryIds", JSON.stringify(product.categoryIds));
        if (product.primaryCategoryId) {
          formData.append("primaryCategoryId", product.primaryCategoryId);
        }
      }
      // Add sub-categories information
      if (selectedSubCategories.length > 0) {
        formData.append(
          "subCategoryIds",
          JSON.stringify(selectedSubCategories)
        );
      }

      // Add simple product data if no variants
      if (!hasVariants) {
        // Add simple product data
        formData.append("price", String(product.price || 0));
        // Explicitly check for salePrice and handle it correctly
        if (product.salePrice) {
          formData.append("salePrice", String(product.salePrice));
        }
        formData.append("quantity", String(product.quantity || 0));

        // Add shipping dimensions for simple product
        if (shiprocketEnabled) {
          if (product.shippingLength) formData.append("shippingLength", product.shippingLength);
          if (product.shippingBreadth) formData.append("shippingBreadth", product.shippingBreadth);
          if (product.shippingHeight) formData.append("shippingHeight", product.shippingHeight);
          if (product.shippingWeight) formData.append("shippingWeight", product.shippingWeight);
        }

        // Ensure pricing slabs for simple products are sent if state variable exists
        try {
          // We check if pricingSlabs state exists in scope (it might be defined but not visible in snippet)
          // If not found, we skip it (assuming feature not fully implemented for simple products yet)
          // But we MUST send MOQ settings
        } catch (e) {
          console.error("Error adding pricing slabs to form data:", e);
        }
      }

      // Add Product Level MOQ Settings
      // This applies to Simple Products directly, and as product-level fallback for Variable Products
      if (productMOQ) {
        formData.append("moqSettings", JSON.stringify(productMOQ));
      }

      // Add variants if product has variants
      if (hasVariants && variants.length > 0) {
        // Ensure all required fields are in each variant
        const processedVariants = variants.map((variant) => {
          return {
            id: variant.id,
            attributeValueIds: variant.attributeValueIds || [],
            sku: variant.sku || "",
            price: String(variant.price || 0),
            salePrice: variant.salePrice ? String(variant.salePrice) : "",
            quantity: String(variant.quantity || 0),
            isActive: variant.isActive !== undefined ? variant.isActive : true,
            removedImageIds: variant.removedImageIds || [], // Include removed image IDs for cleanup

            // Include Shipping, MOQ, and Pricing Slabs
            shippingLength: variant.shippingLength,
            shippingBreadth: variant.shippingBreadth,
            shippingHeight: variant.shippingHeight,
            shippingWeight: variant.shippingWeight,
            moq: variant.moq,
            pricingSlabs: variant.pricingSlabs
          };
        });

        formData.append("variants", JSON.stringify(processedVariants));
      }

      // Add images (only for non-variant products)
      const hasNewImages = imagePreviews.some((p) => p.file);
      const allImagesAreNew = imagePreviews.length > 0 && imagePreviews.every((p) => p.file);
      if (!hasVariants && hasNewImages) {
        console.log(
          `📸 Submitting ${imagePreviews.filter((p) => p.file).length} images for simple product`
        );

        // When editing and all images are new (user replaced all), tell backend to replace
        if (mode === "edit" && productId && allImagesAreNew) {
          formData.append("replaceAllImages", "true");
        }

        // Add primary image index (index in full imagePreviews array)
        const primaryIndex = imagePreviews.findIndex(
          (img) => img.isPrimary === true
        );
        if (primaryIndex >= 0) {
          formData.append("primaryImageIndex", String(primaryIndex));
          console.log(`📸 Primary image index: ${primaryIndex}`);
        } else {
          formData.append("primaryImageIndex", "0");
          console.log(`📸 Default primary image index: 0`);
        }

        // Append each image file in display order
        imagePreviews.forEach((preview, idx) => {
          if (preview.file) {
            formData.append("images", preview.file);
            console.log(
              `📸 Added image ${idx + 1}: ${preview.file.name} (${preview.file.size} bytes)`
            );
          }
        });

        // Also log the FormData contents
        console.log(
          `📸 FormData contents:`,
          Object.fromEntries(formData.entries())
        );
      } else if (hasVariants) {
        console.log(
          `📸 Skipping product images for variant product - will use variant-specific images`
        );
      }

      // Add video if provided (optional)
      if (videoFile) {
        formData.append("video", videoFile);
      }
      if (mode === "edit" && videoRemoved) {
        formData.append("removeVideo", "true");
      }

      // Add topBrandIds, newBrandIds, hotBrandIds to formData
      // Include single brand association if set
      if ((product as any).brandId) {
        formData.append("brandId", (product as any).brandId);
      }
      formData.append("topBrandIds", JSON.stringify(product.topBrandIds || []));
      formData.append("newBrandIds", JSON.stringify(product.newBrandIds || []));
      formData.append("hotBrandIds", JSON.stringify(product.hotBrandIds || []));

      let response;
      let savedProductId = productId;
      if (mode === "create") {
        response = await products.createProduct(formData as any);
        if (response.data.success) {
          savedProductId = response.data.data?.product?.id;
        }
      } else {
        response = await products.updateProduct(productId!, formData as any);
      }

      if (response.data.success) {
        // If product creation/update was successful and we have variant images, upload them
        if (hasVariants && response.data.data?.product?.variants) {
          const productVariants = response.data.data.product.variants;
          console.log(
            `📸 Processing variant images for ${productVariants.length} variants`
          );

          const uploadPromises = [];

          // Match variants by their temporary IDs or color/size combination
          for (let i = 0; i < variants.length; i++) {
            const localVariant = variants[i];

            // In create mode: match by index
            // In edit mode: match by ID or create new mapping for newly generated variants
            let serverVariant;

            if (mode === "create") {
              serverVariant = productVariants[i]; // Match by index since they're created in same order
            } else {
              // Edit mode: find matching variant by ID or create new one
              const isNewVariant =
                localVariant.id && localVariant.id.includes("-"); // UUID format

              if (isNewVariant) {
                // This is a newly generated variant, find it in the updated product variants
                // Match by color/size combination
                serverVariant = productVariants.find(
                  (sv: any) =>
                    sv.colorId === localVariant.colorId &&
                    sv.sizeId === localVariant.sizeId
                );
              } else {
                // This is an existing variant, find by ID
                serverVariant = productVariants.find(
                  (sv: any) => sv.id === localVariant.id
                );
              }
            }

            if (localVariant && localVariant.images && serverVariant) {
              // Filter only new images that need to be uploaded
              const newImages = localVariant.images.filter(
                (img: any) => img.isNew && img.file
              );

              if (newImages.length > 0) {
                console.log(
                  `📸 Found ${newImages.length} new images for variant ${serverVariant.id} (${localVariant.color?.name || "N/A"} - ${localVariant.size?.name || "N/A"}) [Mode: ${mode}]`
                );

                // Upload each new image for this variant
                for (let j = 0; j < newImages.length; j++) {
                  const imageData = newImages[j];

                  // FIXED: Send undefined for non-explicitly-marked images to let backend decide
                  // Only send true/false when explicitly set, otherwise let backend handle it
                  const isPrimary =
                    imageData.isPrimary === true ? true : undefined;

                  console.log(`📸 Upload decision for image ${j + 1}:`, {
                    imageDataIsPrimary: imageData.isPrimary,
                    finalIsPrimary: isPrimary,
                    note: "undefined = let backend decide, true = force primary",
                  });

                  const uploadPromise = products
                    .uploadVariantImage(
                      serverVariant.id,
                      imageData.file,
                      isPrimary
                    )
                    .then(() => {
                      console.log(
                        `📸 Uploaded image ${j + 1}/${newImages.length} for variant ${serverVariant.id} (isPrimary: ${isPrimary})`
                      );
                    })
                    .catch((error) => {
                      console.error(
                        `❌ Failed to upload image ${j + 1} for variant ${serverVariant.id}:`,
                        error
                      );
                      throw error;
                    });

                  uploadPromises.push(uploadPromise);
                }
              }
            }
          }

          // Wait for all uploads to complete
          if (uploadPromises.length > 0) {
            try {
              await Promise.all(uploadPromises);
              toast.success(
                `Successfully uploaded ${uploadPromises.length} variant image(s)`
              );
            } catch (error) {
              console.error("Some variant image uploads failed:", error);
              toast.error("Failed to upload some variant images");
            }
          }

          // Save Variant MOQ settings
          if (response.data.data?.product?.variants) {
            const productVariants = response.data.data.product.variants;
            for (let i = 0; i < variants.length; i++) {
              const localVariant = variants[i];
              if (localVariant.moq) {
                // Find matching server variant
                let serverVariant;
                if (mode === "create") {
                  serverVariant = productVariants[i];
                } else {
                  serverVariant = productVariants.find(
                    (sv: any) => sv.id === localVariant.id
                  );
                }

                if (serverVariant && serverVariant.id) {
                  try {
                    if (localVariant.moq.isActive) {
                      await moq.setVariantMOQ(serverVariant.id, {
                        minQuantity: localVariant.moq.minQuantity,
                        isActive: true,
                      });
                    } else {
                      await moq.deleteVariantMOQ(serverVariant.id);
                    }
                  } catch (error: any) {
                    console.error(`Error saving MOQ for variant ${serverVariant.id}:`, error);
                  }
                }
              }
            }
          }
        }

        // Save Product MOQ
        if (savedProductId) {
          try {
            if (productMOQ.isActive) {
              await moq.setProductMOQ(savedProductId, {
                minQuantity: productMOQ.minQuantity,
                isActive: true,
              });
            } else {
              // Delete MOQ if disabled
              await moq.deleteProductMOQ(savedProductId);
            }
          } catch (error: any) {
            console.error("Error saving MOQ:", error);
            // Don't fail the whole operation if MOQ save fails
            toast.error("Product saved but MOQ settings failed to update");
          }
        }

        toast.success(
          mode === "create"
            ? "Product created successfully"
            : "Product updated successfully"
        );
        navigate("/products");
      } else {
        toast.error(response.data.message || "Failed to save product");
      }
    } catch (error: any) {
      console.error("Error saving product:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to save product";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to handle hasVariants toggle
  const handleVariantsToggle = (value: boolean) => {
    setHasVariants(value);

    // If toggling to simple product and we have variants, clear them
    if (!value && variants.length > 0) {
      if (
        window.confirm(
          "Switching to simple product will remove all your variant configurations. Continue?"
        )
      ) {
        setVariants([]);
        setSelectedAttributes({});
      } else {
        setHasVariants(true);
      }
    }
  };

  // Handle category selection from CategorySelector
  const handleSelectCategory = (categoryId: string) => {
    // Check if the category is already selected
    const isSelected = product.categoryIds.includes(categoryId);

    // Get parent-child relationships
    const parentChildMap = new Map();
    const childParentMap = new Map();

    categories.forEach((category) => {
      if (category.children && category.children.length > 0) {
        parentChildMap.set(
          category.id,
          category.children.map((child: any) => child.id)
        );
      }
      if (category.parentId) {
        childParentMap.set(category.id, category.parentId);
      }
    });

    // Helper functions
    const isParent = (id: string) => parentChildMap.has(id);
    const isChild = (id: string) => childParentMap.has(id);
    const getParentId = (id: string) => childParentMap.get(id);
    const getChildrenIds = (id: string) => parentChildMap.get(id) || [];

    let newSelectedCategoryIds: string[] = [...product.categoryIds];

    if (isSelected) {
      // If selected, remove it from the array
      newSelectedCategoryIds = newSelectedCategoryIds.filter(
        (id) => id !== categoryId
      );

      // If this is a parent, also remove all its children
      if (isParent(categoryId)) {
        const childrenIds = getChildrenIds(categoryId);
        newSelectedCategoryIds = newSelectedCategoryIds.filter(
          (id) => !childrenIds.includes(id)
        );
      }
    } else {
      // If not selected, add it to the array
      newSelectedCategoryIds.push(categoryId);

      // If this is a child, also select its parent if not already selected
      if (isChild(categoryId)) {
        const parentId = getParentId(categoryId);
        if (parentId && !newSelectedCategoryIds.includes(parentId)) {
          newSelectedCategoryIds.push(parentId);
        }
      }
    }

    // Update primary category if needed
    if (product.primaryCategoryId === categoryId && isSelected) {
      // If removing the primary category, set a new primary if possible
      if (newSelectedCategoryIds.length > 0) {
        setProduct((prev) => ({
          ...prev,
          primaryCategoryId: newSelectedCategoryIds[0],
        }));
      } else {
        // If no categories left, clear primary category
        setProduct((prev) => ({
          ...prev,
          primaryCategoryId: "", // Use empty string instead of null
        }));
      }
    } else if (
      !product.primaryCategoryId &&
      newSelectedCategoryIds.length > 0
    ) {
      // If this is the first category, set it as primary
      setProduct((prev) => ({
        ...prev,
        primaryCategoryId: newSelectedCategoryIds[0],
      }));
    }

    // Update the product with new category IDs
    setProduct((prev) => ({
      ...prev,
      categoryIds: newSelectedCategoryIds,
    }));
  };

  // Handle setting primary category
  const handleSetPrimaryCategory = (categoryId: string) => {
    // Update product with new primary category
    setProduct((prev) => ({
      ...prev,
      primaryCategoryId: categoryId,
    }));

    // Also update selectedCategories to reflect the primary category change
    setSelectedCategories((prev) =>
      prev.map((category) => ({
        ...category,
        isPrimary: category.id === categoryId,
      }))
    );
  };

  useEffect(() => {
    // Auto-generate SKU when not using variants
    if (
      !hasVariants &&
      product.name &&
      product.price &&
      categories.length > 0 &&
      product.categoryIds.length > 0
    ) {
      const categoryName =
        categories.find((c) => c.id === product.categoryIds[0])?.name || "";
      // Create SKU from first 3 chars of name + price + first 3 chars of category
      const namePart = product.name
        .replace(/\s+/g, "")
        .substring(0, 3)
        .toUpperCase();
      const pricePart = Math.floor(parseFloat(product.price)).toString();
      const categoryPart = categoryName
        .replace(/\s+/g, "")
        .substring(0, 3)
        .toUpperCase();

      const generatedSku = `${namePart}${pricePart}${categoryPart}`;

      setProduct((prev) => ({
        ...prev,
        sku: generatedSku,
      }));
    }
  }, [
    hasVariants,
    product.name,
    product.price,
    product.categoryIds,
    categories,
  ]);

  // ... inside ProductForm, after brands state:
  // const [brands, setBrands] = useState<{ label: string; value: string }[]>([]); // Removed unused brands state

  // useEffect(() => {
  //   async function fetchBrands() {
  //     try {
  //       const res = await import("@/api/adminService").then((m) =>
  //         m.brands.getBrands()
  //       );
  //       const brandOptions = (res.data.data.brands || []).map((b: any) => ({
  //         label: b.name,
  //         value: b.id,
  //       }));
  //       setBrands(brandOptions);
  //     } catch (e) {
  //       // ignore
  //     }
  //   }
  //   fetchBrands();
  // }, []);

  if (formLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
          <p className="mt-4 text-lg text-[var(--text-secondary)]">
            {mode === "edit" ? "Loading product..." : "Preparing form..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/products">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {mode === "create"
              ? t("products.add_new")
              : `${t("products.edit_product")}: ${product.name}`}
          </h1>
        </div>
      </div>

      <Card className="overflow-hidden bg-[var(--bg-card)] border-[var(--border-color)]">
        <form onSubmit={handleSubmit} className="space-y-8 p-6">
          {/* Basic Information */}
          <div className="space-y-4 rounded-lg border border-[var(--border-color)] p-4 bg-[var(--bg-secondary)]">
            <h2 className="text-xl font-semibold border-b border-[var(--border-color)] pb-2 text-[var(--text-primary)]">
              {t("products.form.sections.basic_info")}
            </h2>

            <div className="space-y-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[var(--text-primary)]">{t("products.form.labels.name")} *</Label>
                <Input
                  id="name"
                  name="name"
                  value={product.name}
                  onChange={handleChange}
                  placeholder={t("products.form.placeholders.enter_name")}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="categories">{t("products.form.labels.category")} *</Label>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowQuickCategory(true)}>
                    <Plus className="h-3 w-3" /> New Category
                  </Button>
                </div>
                <CategorySelector
                  selectedCategoryIds={product.categoryIds}
                  onSelectCategory={handleSelectCategory}
                  primaryCategoryId={product.primaryCategoryId}
                  onSetPrimaryCategory={handleSetPrimaryCategory}
                  categories={categories}
                  isLoading={categoriesLoading}
                />
              </div>

              {/* Primary Category Selection - only show if multiple categories selected */}
              {product.categoryIds.length > 1 && (
                <div className="space-y-2">
                  <Label>{t("products.form.categories.primary_category")} *</Label>
                  <div className="space-y-2 rounded-md border border-[var(--border-color)] p-3 bg-[var(--bg-card)]">
                    {selectedCategories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="radio"
                          id={`primary-${category.id}`}
                          name="primaryCategory"
                          value={category.id}
                          checked={product.primaryCategoryId === category.id}
                          onChange={() => handleSetPrimaryCategory(category.id)}
                          className="h-4 w-4 rounded-full border-[var(--border-color)]"
                        />
                        <label
                          htmlFor={`primary-${category.id}`}
                          className="text-sm text-[var(--text-primary)]"
                        >
                          {category.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    The primary category determines where the product appears in
                    main listings
                  </p>
                </div>
              )}

              {/* Sub-Categories Selection */}
              {product.categoryIds.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="subCategories">
                    {t("products.form.categories.sub_categories_optional")}
                  </Label>
                  <p className="text-xs text-[var(--text-secondary)] mb-2">
                    {t("products.form.categories.select_sub_categories_hint")}
                  </p>
                  <div className="space-y-3 rounded-md border border-[var(--border-color)] p-4 bg-[var(--bg-secondary)]">
                    {product.categoryIds.map((categoryId) => {
                      const category = categories.find(
                        (c) => c.id === categoryId
                      );
                      const subCats = subCategoriesMap[categoryId] || [];
                      if (subCats.length === 0) return null;

                      return (
                        <div
                          key={categoryId}
                          className="space-y-2 p-3 bg-[var(--bg-card)] rounded-md border border-[var(--border-color)]"
                        >
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {category?.name || "Category"} {t("products.form.categories.sub_categories_label")}:
                          </p>
                          <div className="flex flex-wrap gap-3 mt-2">
                            {subCats.map((subCat: any) => (
                              <label
                                key={subCat.id}
                                className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-[var(--bg-secondary)] transition-colors border border-transparent hover:border-[var(--accent)]/20 text-[var(--text-primary)]"
                              >
                                <Checkbox
                                  checked={selectedSubCategories.includes(
                                    subCat.id
                                  )}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedSubCategories([
                                        ...selectedSubCategories,
                                        subCat.id,
                                      ]);
                                    } else {
                                      setSelectedSubCategories(
                                        selectedSubCategories.filter(
                                          (id) => id !== subCat.id
                                        )
                                      );
                                    }
                                  }}
                                />
                                <span className="text-sm font-medium text-[var(--text-primary)]">
                                  {subCat.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {Object.values(subCategoriesMap).flat().length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-sm text-[var(--text-secondary)]">
                          {t("products.form.categories.no_sub_categories")}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          You can create sub-categories from the{" "}
                          <Link
                            to="/categories"
                            className="text-primary hover:underline"
                          >
                            Categories page
                          </Link>
                          .
                        </p>
                      </div>
                    )}
                    {selectedSubCategories.length > 0 && (
                      <div className="mt-4 p-3 bg-[var(--accent)]/10 rounded-md border border-[var(--accent)]/20">
                        <p className="text-sm font-medium mb-2 text-[var(--text-primary)]">
                          {t("products.form.categories.selected_sub_categories")} (
                          {selectedSubCategories.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedSubCategories.map((subCatId) => {
                            // Find the sub-category name
                            let subCatName = "";
                            for (const subCats of Object.values(
                              subCategoriesMap
                            )) {
                              const found = subCats.find(
                                (sc: any) => sc.id === subCatId
                              );
                              if (found) {
                                subCatName = found.name;
                                break;
                              }
                            }
                            return (
                              <Badge
                                key={subCatId}
                                variant="default"
                                className="text-xs"
                              >
                                {subCatName || subCatId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description" className="text-[var(--text-primary)]">{t("products.form.labels.description")}</Label>
                <div className="border border-[var(--border-color)] rounded-md overflow-hidden [&_.jodit-container]:!bg-[var(--input-bg)] [&_.jodit-wysiwyg]:!bg-[var(--input-bg)] [&_.jodit-wysiwyg]:!text-[var(--input-text)] [&_.jodit-status-bar]:!bg-[var(--bg-secondary)] [&_.jodit-status-bar]:!text-[var(--text-secondary)] [&_.jodit-toolbar__box]:!bg-[var(--bg-secondary)] [&_.jodit-toolbar__box]:!border-[var(--border-color)]">
                  <JoditEditor
                    ref={editorRef}
                    value={editorContent}
                    config={editorConfig}
                    onBlur={(content: string) => {
                      // Only update if content actually changed
                      if (content !== editorContent) {
                        setEditorContent(content);
                        setProduct((prev) => ({
                          ...prev,
                          description: content,
                        }));
                      }

                      // Auto-generate meta description if not provided
                      if (
                        !product.metaDescription ||
                        product.metaDescription.trim() === ""
                      ) {
                        // Strip HTML tags and create plain text version
                        const tempDiv = document.createElement("div");
                        tempDiv.innerHTML = content;
                        const plainText =
                          tempDiv.textContent || tempDiv.innerText || "";
                        const metaDesc = plainText
                          .replace(/\s+/g, " ")
                          .trim()
                          .substring(0, 160);
                        if (plainText.length > 160) {
                          setProduct((prev) => ({
                            ...prev,
                            metaDescription: metaDesc + "...",
                          }));
                        } else if (metaDesc) {
                          setProduct((prev) => ({
                            ...prev,
                            metaDescription: metaDesc,
                          }));
                        }
                      }
                    }}
                    onChange={(content: string) => {
                      // Only update product.description for form submission
                      // DON'T update editorContent here to prevent cursor jumping
                      // editorContent is only updated on initial load and onBlur
                      setProduct((prev) => ({ ...prev, description: content }));
                    }}
                  />
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Use the toolbar to format your description. Supports rich text
                  formatting, tables, colors, images, links, and much more.
                </p>
              </div>

              {/* Brand selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="brandId" className="text-[var(--text-primary)]">{t("products.form.labels.brand_optional")}</Label>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowQuickBrand(true)}>
                    <Plus className="h-3 w-3" /> New Brand
                  </Button>
                </div>
                <select
                  id="brandId"
                  name="brandId"
                  value={(product as any).brandId || ""}
                  onChange={(e) =>
                    setProduct((prev) => ({ ...prev, brandId: e.target.value }))
                  }
                  className="rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm w-full text-[var(--input-text)]"
                >
                  <option value="">{t("products.form.placeholders.select_brand")}</option>
                  {brandsList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-secondary)]">
                  Optional - associate this product with a brand
                </p>
              </div>

              <div className="flex items-center gap-2 p-1">
                <Label className="text-base text-[var(--text-primary)]">{t("products.form.labels.has_variants")}</Label>
                <Checkbox
                  checked={hasVariants}
                  onCheckedChange={handleVariantsToggle}
                  className="h-6 w-6 border-[var(--border-color)] cursor-pointer"
                />
              </div>

              {/* Product Settings */}
              <div className="space-y-4 rounded-lg border p-4 bg-[var(--bg-secondary)]">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t("products.form.settings.product_settings")}</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isActive"
                      name="isActive"
                      checked={product.isActive}
                      onCheckedChange={(checked) =>
                        setProduct((prev) => ({ ...prev, isActive: !!checked }))
                      }
                    />
                    <Label htmlFor="isActive" className="text-[var(--text-primary)]">{t("products.form.labels.active")}</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="ourProduct"
                      name="ourProduct"
                      checked={product.ourProduct}
                      onCheckedChange={(checked) =>
                        setProduct((prev) => ({
                          ...prev,
                          ourProduct: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="ourProduct" className="text-[var(--text-primary)]">
                      {t("products.form.labels.our_product")}
                    </Label>
                  </div>
                </div>

                {/* Product Type Selection */}
                <div className="space-y-2">
                  <Label>{t("products.form.settings.product_type")}</Label>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t("products.form.settings.select_type_hint")}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { key: "featured", label: t("products.form.settings.types.featured"), icon: "⭐" },
                      { key: "bestseller", label: t("products.form.settings.types.bestseller"), icon: "📈" },
                      { key: "trending", label: t("products.form.settings.types.trending"), icon: "🔥" },
                      { key: "new", label: t("products.form.settings.types.new"), icon: "🆕" },
                    ].map((type) => (
                      <div key={type.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`productType-${type.key}`}
                          checked={
                            Array.isArray(product.productType) &&
                            product.productType.includes(type.key)
                          }
                          onCheckedChange={(checked) => {
                            setProduct((prev) => ({
                              ...prev,
                              productType: checked
                                ? [...prev.productType, type.key]
                                : prev.productType.filter(
                                  (t) => t !== type.key
                                ),
                            }));
                          }}
                          className="h-6 w-6 border-[var(--border-color)] cursor-pointer"
                        />
                        <Label
                          htmlFor={`productType-${type.key}`}
                          className="flex items-center gap-1 cursor-pointer"
                        >
                          <span>{type.icon}</span>
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {!hasVariants && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">{t("products.form.labels.stock_quantity")} *</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="0"
                      value={product.quantity}
                      onChange={handleChange}
                      placeholder="0"
                      required
                    />
                  </div>
                </>
              )}

              <div className="grid gap-2">
                <Label htmlFor="sku">
                  {!hasVariants
                    ? t("products.form.placeholders.sku_auto")
                    : "Base SKU (Auto-generated)"}
                </Label>
                <Input
                  id="sku"
                  name="sku"
                  value={product.sku}
                  onChange={handleChange}
                  placeholder={t("products.form.placeholders.sku_auto_hint")}
                  readOnly
                  className="bg-[var(--bg-secondary)]"
                />
              </div>

              {!hasVariants && (
                <div className="grid gap-2">
                  <Label htmlFor="price">{t("products.form.labels.price")} *</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)]">
                      ₹
                    </span>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      value={product.price}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="pl-8"
                      required
                    />
                  </div>
                </div>
              )}
              {!hasVariants && (
                <div className="grid gap-2">
                  <Label htmlFor="salePrice">{t("products.form.labels.sale_price_optional")}</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)]">
                      ₹
                    </span>
                    <Input
                      id="salePrice"
                      name="salePrice"
                      type="number"
                      min="0"
                      value={product.salePrice}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="pl-8"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Additional Information (Dynamic Sections)</h3>
              <div className="space-y-4">
                {/* Washing & Care — structured icon + text rows */}
                <div className="space-y-2">
                  <Label>Washing & Care</Label>
                  <WashingCareEditor
                    value={product.washingAndCare}
                    onChange={(val) => setProduct((prev) => ({ ...prev, washingAndCare: val }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippingAndReturns">Shipping & Returns</Label>
                  <div className="border border-[var(--border-color)] rounded-md overflow-hidden [&_.jodit-container]:!bg-[var(--input-bg)] [&_.jodit-wysiwyg]:!bg-[var(--input-bg)] [&_.jodit-wysiwyg]:!text-[var(--input-text)] [&_.jodit-status-bar]:!bg-[var(--bg-secondary)] [&_.jodit-status-bar]:!text-[var(--text-secondary)] [&_.jodit-toolbar__box]:!bg-[var(--bg-secondary)] [&_.jodit-toolbar__box]:!border-[var(--border-color)]">
                    <JoditEditor
                      value={product.shippingAndReturns}
                      config={editorConfig}
                      onBlur={(content: string) => {
                        setProduct((prev) => ({ ...prev, shippingAndReturns: content }));
                      }}
                      onChange={() => {}}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aboutThisDesign">About This Design</Label>
                  <div className="border border-[var(--border-color)] rounded-md overflow-hidden [&_.jodit-container]:!bg-[var(--input-bg)] [&_.jodit-wysiwyg]:!bg-[var(--input-bg)] [&_.jodit-wysiwyg]:!text-[var(--input-text)] [&_.jodit-status-bar]:!bg-[var(--bg-secondary)] [&_.jodit-status-bar]:!text-[var(--text-secondary)] [&_.jodit-toolbar__box]:!bg-[var(--bg-secondary)] [&_.jodit-toolbar__box]:!border-[var(--border-color)]">
                    <JoditEditor
                      value={product.aboutThisDesign}
                      config={editorConfig}
                      onBlur={(content: string) => {
                        setProduct((prev) => ({ ...prev, aboutThisDesign: content }));
                      }}
                      onChange={() => {}}
                    />
                  </div>
                </div>
              </div>
            </Card>

          {/* Product Images - Dropzone - Only show when variants are NOT enabled */}
          {!hasVariants && (
            <div className="space-y-4 rounded-lg border p-4 bg-[var(--bg-secondary)]">
              <h2 className="text-xl font-semibold border-b pb-2">
                Product Images
              </h2>
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{t("products.form.media.upload_title")}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t("products.form.media.drag_drop_hint")}
                  </p>
                </div>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-md p-8 cursor-pointer transition-colors text-center bg-[var(--bg-card)] ${isDragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-[var(--border-color)] hover:border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                    }`}
                >
                  <input {...getInputProps()} />
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 text-[var(--text-secondary)]" />
                  {isDragActive ? (
                    <p className="text-blue-600 font-medium">
                      {t("products.form.media.drop_here")}
                      {t("products.form.media.drop_text")}
                    </p>
                  ) : (
                    <>
                      <p className="text-[var(--text-secondary)]">
                        {t("products.form.media.drop_multiple_images")}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {t("products.form.media.upload_hint")}
                      </p>
                    </>
                  )}
                </div>

                {/* Fallback file input */}
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        const files = Array.from(e.target.files);
                        onDrop(files);
                        // Clear the input so the same file can be selected again
                        e.target.value = "";
                      }
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t("products.form.media.alternative_input_hint")}
                  </p>
                </div>

                {/* Manual File Input as Fallback */}
              </div>

              {/* Image previews */}
              {imagePreviews.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-[var(--text-primary)]">{t("products.form.sections.product_images")}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">Drag to reorder</span>
                      <Badge variant="outline" className="text-xs">
                        {imagePreviews.length} {t("products.form.media.image")}
                        {imagePreviews.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={preview.id || preview.url}
                        draggable
                        onDragStart={(e) => handleProductImageDragStart(e, index)}
                        onDragOver={(e) => handleProductImageDragOver(e, index)}
                        onDragLeave={handleProductImageDragLeave}
                        onDrop={(e) => handleProductImageDrop(e, index)}
                        className={`relative group cursor-move transition-all ${
                          draggedImageIndex === index ? "opacity-50 scale-95" : ""
                        } ${
                          dragOverImageIndex === index && draggedImageIndex !== index
                            ? "ring-2 ring-primary ring-offset-2"
                            : ""
                        }`}
                      >
                        <div
                          className={`relative h-32 rounded-md overflow-hidden border-2 ${preview.isPrimary ? "border-primary" : "border-[var(--border-color)]"}`}
                        >
                          <img
                            src={preview.url}
                            alt={`Product preview ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                          {preview.isPrimary && (
                            <span className="absolute top-2 left-2 bg-primary text-white text-xs py-1 px-2 rounded-full">
                              {t("products.form.media.primary_image")}
                            </span>
                          )}
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1">
                          {!preview.isPrimary && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 bg-[var(--bg-card)] hover:bg-primary hover:text-white"
                              onClick={() => setPrimaryImage(index)}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 bg-[var(--bg-card)] hover:bg-destructive hover:text-white"
                            onClick={() => removeImage(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Product Video - Optional (max 10MB) */}
          <div className="space-y-4 rounded-lg border p-4 bg-[var(--bg-secondary)]">
            <h2 className="text-xl font-semibold border-b pb-2">
              Product Video (Optional)
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Add a product video (MP4 or WebM, max 10MB). Same storage as product images.
            </p>
            {videoPreviewUrl ? (
              <div className="relative inline-block">
                <video
                  src={videoPreviewUrl}
                  controls
                  className="max-h-48 rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removeVideo}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                {...getVideoRootProps()}
                className={`border-2 border-dashed rounded-md p-6 cursor-pointer transition-colors text-center bg-[var(--bg-card)] ${
                  isVideoDragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-[var(--border-color)] hover:border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                <input {...getVideoInputProps()} />
                <Video className="h-10 w-10 mx-auto mb-2 text-[var(--text-secondary)]" />
                <p className="text-sm text-[var(--text-secondary)]">
                  {isVideoDragActive ? "Drop video here..." : "Drop video or click to upload"}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  MP4 or WebM, max 10MB
                </p>
              </div>
            )}
          </div>

          {/* SEO Section */}
          <div className="space-y-4 rounded-lg border p-4 bg-[var(--bg-secondary)]">
            <h2 className="text-xl font-semibold border-b pb-2">
              {t("products.form.sections.seo_information")}
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">{t("products.form.seo.title_label")}</Label>
                <Input
                  id="metaTitle"
                  name="metaTitle"
                  value={product.metaTitle}
                  onChange={handleChange}
                  placeholder={t("products.form.seo.title_placeholder")}
                />
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("products.form.seo.title_hint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">{t("products.form.seo.description_label")}</Label>
                <Textarea
                  id="metaDescription"
                  name="metaDescription"
                  value={product.metaDescription}
                  onChange={handleChange}
                  placeholder={t("products.form.seo.description_placeholder")}
                  rows={3}
                />
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("products.form.seo.description_hint")}
                </p>
                <div className="text-xs text-[var(--text-secondary)]">
                  {t("products.form.seo.current_length")}: {product.metaDescription?.length || 0} / 160
                  {t("products.form.seo.characters")}
                  {product.metaDescription &&
                    product.metaDescription.length > 160 && (
                      <span className="text-destructive ml-2">⚠️ {t("products.form.seo.too_long")}</span>
                    )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">{t("products.form.seo.keywords_label")}</Label>
                <Input
                  id="keywords"
                  name="keywords"
                  value={product.keywords}
                  onChange={handleChange}
                  placeholder={t("products.form.seo.keywords_placeholder")}
                />
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("products.form.seo.keywords_hint")}
                </p>
              </div>
            </div>
          </div>

          {/* Variants Configuration */}
          {hasVariants && (
            <div className="space-y-4 rounded-lg border p-4 bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-xl font-semibold">
                  {t("products.form.sections.variants_configuration")}
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {t("products.form.variants.using_variant_images")}
                </Badge>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-700">
                  <strong>✓ {t("products.form.variants.variant_mode")}:</strong> {t("products.form.variants.variant_mode_hint")}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--text-secondary)]">Select attribute values for variants</span>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowQuickAttr(true)}>
                    <Plus className="h-3 w-3" /> New Attribute
                  </Button>
                </div>
                <div className="space-y-4">
                  {attributesList.length === 0 ? (
                    <div className="rounded-md border p-4 bg-yellow-50">
                      <p className="text-sm text-yellow-700">
                        No attributes yet.{" "}
                        <button type="button" className="underline font-medium" onClick={() => setShowQuickAttr(true)}>
                          Create one now
                        </button>
                        {" "}or go to the{" "}
                        <Link to="/attributes" className="underline font-medium">Attributes page</Link>.
                      </p>
                    </div>
                  ) : (
                    attributesList.map((attribute) => {
                      const iav = inlineAddValue[attribute.id] || { open: false, value: "", hexCode: "", loading: false };
                      const isColor = attribute.name?.toLowerCase().includes("color");
                      return (
                      <div key={attribute.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>
                            {attribute.name} <span className="text-[var(--text-secondary)] font-normal text-xs">({attribute.inputType})</span>
                          </Label>
                          <Button type="button" size="sm" variant="ghost" className="h-6 text-xs gap-1 text-[var(--accent)]"
                            onClick={() => setInlineAddValue((prev) => ({ ...prev, [attribute.id]: { open: !iav.open, value: "", hexCode: "", loading: false } }))}>
                            <Plus className="h-3 w-3" /> Add Value
                          </Button>
                        </div>
                        {iav.open && (
                          <div className="flex items-center gap-2 p-2 rounded-md border border-dashed border-[var(--accent)]/40 bg-[var(--bg-secondary)]">
                            <Input
                              placeholder="Value name"
                              value={iav.value}
                              onChange={(e) => setInlineAddValue((prev) => ({ ...prev, [attribute.id]: { ...prev[attribute.id], value: e.target.value } }))}
                              className="h-7 text-xs flex-1"
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInlineAddValue(attribute.id); } }}
                            />
                            {isColor && (
                              <input type="color" title="Pick color"
                                value={iav.hexCode || "#000000"}
                                onChange={(e) => setInlineAddValue((prev) => ({ ...prev, [attribute.id]: { ...prev[attribute.id], hexCode: e.target.value } }))}
                                className="h-7 w-7 rounded cursor-pointer border border-[var(--border-color)]"
                              />
                            )}
                            <Button type="button" size="sm" className="h-7 text-xs" disabled={iav.loading}
                              onClick={() => handleInlineAddValue(attribute.id)}>
                              {iav.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0"
                              onClick={() => setInlineAddValue((prev) => ({ ...prev, [attribute.id]: { open: false, value: "", hexCode: "", loading: false } }))}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <div className="space-y-2 rounded-md border p-3 max-h-40 overflow-y-auto bg-[var(--bg-card)]">
                          {attributeValuesMap[attribute.id]?.length > 0 ? (
                            attributeValuesMap[attribute.id].map(
                              (value: any) => (
                                <div
                                  key={value.id}
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    type="checkbox"
                                    id={`attr-${attribute.id}-value-${value.id}`}
                                    checked={
                                      selectedAttributes[
                                        attribute.id
                                      ]?.includes(value.id) || false
                                    }
                                    onChange={() =>
                                      handleAttributeValueToggle(
                                        attribute.id,
                                        value.id
                                      )
                                    }
                                    className="h-6 w-6 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                                  />
                                  {value.hexCode && (
                                    <span className="inline-block h-4 w-4 rounded-full border border-gray-300 flex-shrink-0" style={{ background: value.hexCode }} />
                                  )}
                                  <Label
                                    htmlFor={`attr-${attribute.id}-value-${value.id}`}
                                    className="text-sm font-normal cursor-pointer text-[var(--text-primary)]"
                                  >
                                    {value.value}
                                  </Label>
                                </div>
                              )
                            )
                          ) : (
                            <p className="text-sm text-gray-500">
                              No values yet.{" "}
                              <button type="button" className="underline text-[var(--accent)]"
                                onClick={() => setInlineAddValue((prev) => ({ ...prev, [attribute.id]: { open: true, value: "", hexCode: "", loading: false } }))}>
                                Add first value
                              </button>
                            </p>
                          )}
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>

                <Button
                  type="button"
                  onClick={generateVariants}
                  disabled={
                    !Object.values(selectedAttributes).some(
                      (values) => values.length > 0
                    ) || isLoading
                  }
                  className="w-full"
                >
                  {t("products.form.variants.generate_variants_button")}
                </Button>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>{t("products.form.variants.variants_label")}</Label>
                    <Badge variant="outline" className="ml-2">
                      {variants.length} {t("products.form.variants.variants_count")}
                    </Badge>
                  </div>

                  {variants.length > 0 ? (
                    <div className="space-y-4">
                      {variants.map((variant, variantIndex) => (
                        <VariantCard
                          key={variant.id || `variant-${variantIndex}`}
                          variant={variant}
                          index={variantIndex}
                          onUpdate={updateVariantByIndex}
                          onRemove={removeVariantByIndex}
                          onImagesChange={handleVariantImagesChange}
                          isEditMode={mode === "edit"}
                          shiprocketEnabled={shiprocketEnabled}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 border rounded-md bg-[var(--bg-card)]">
                      <p className="text-sm text-gray-500">
                        {t("products.form.variants.no_variants_yet")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MOQ Settings Section */}
          <div className="space-y-4 rounded-lg border p-4 bg-[var(--bg-secondary)]">
            <h2 className="text-xl font-semibold border-b pb-2">
              {t("products.form.sections.moq_settings")}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-[var(--bg-card)]">
                <div className="space-y-0.5">
                  <Label htmlFor="product-moq-enabled" className="text-base font-medium">
                    {t("products.form.moq.enable_moq_label")}
                  </Label>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t("products.form.moq.enable_moq_hint")}
                  </p>
                </div>
                <Switch
                  id="product-moq-enabled"
                  checked={productMOQ.isActive}
                  onCheckedChange={(checked) =>
                    setProductMOQ({ ...productMOQ, isActive: checked })
                  }
                />
              </div>

              {productMOQ.isActive && (
                <div className="space-y-2">
                  <Label htmlFor="product-min-quantity">
                    {t("products.form.moq.minimum_quantity_label")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="product-min-quantity"
                    type="number"
                    min="1"
                    value={productMOQ.minQuantity}
                    onChange={(e) =>
                      setProductMOQ({
                        ...productMOQ,
                        minQuantity: parseInt(e.target.value) || 1,
                      })
                    }
                    placeholder={t("products.form.moq.minimum_quantity_placeholder")}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t("products.form.moq.minimum_quantity_hint")}
                  </p>
                </div>
              )}

              <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">
                    {t("products.form.moq.moq_priority_title")}
                  </p>
                  <p className="text-sm text-blue-800">
                    {t("products.form.moq.moq_priority_hint")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Dimensions Section - Only show when Shiprocket is enabled and no variants */}
          {shiprocketEnabled && !hasVariants && (
            <div className="space-y-4 rounded-lg border p-4 bg-[var(--bg-secondary)]">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">
                  {t("products.form.shipping.title")}
                </h2>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                  {t("common.optional") || "Optional"}
                </Badge>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {t("products.form.shipping.description")}
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping-length">{t("products.form.shipping.length_label")}</Label>
                  <Input
                    id="shipping-length"
                    type="number"
                    min="0"
                    step="0.1"
                    value={product.shippingLength || ""}
                    onChange={(e) => setProduct({ ...product, shippingLength: e.target.value })}
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-breadth">{t("products.form.shipping.breadth_label")}</Label>
                  <Input
                    id="shipping-breadth"
                    type="number"
                    min="0"
                    step="0.1"
                    value={product.shippingBreadth || ""}
                    onChange={(e) => setProduct({ ...product, shippingBreadth: e.target.value })}
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-height">{t("products.form.shipping.height_label")}</Label>
                  <Input
                    id="shipping-height"
                    type="number"
                    min="0"
                    step="0.1"
                    value={product.shippingHeight || ""}
                    onChange={(e) => setProduct({ ...product, shippingHeight: e.target.value })}
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-weight">{t("products.form.shipping.weight_label")}</Label>
                  <Input
                    id="shipping-weight"
                    type="number"
                    min="0"
                    step="0.01"
                    value={product.shippingWeight || ""}
                    onChange={(e) => setProduct({ ...product, shippingWeight: e.target.value })}
                    placeholder="e.g. 0.5"
                  />
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {t("products.form.shipping.optional_hint")}
              </p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/products")}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "create" ? t("common.creating") : t("common.updating")}
                </>
              ) : mode === "create" ? (
                t("products.form.add_product_button")
              ) : (
                t("products.form.update_product_button")
              )}
            </Button>
          </div>
        </form>

        {/* ── Quick Create: Brand ─────────────────────────────────────────────── */}
        <Dialog open={showQuickBrand} onOpenChange={setShowQuickBrand}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Brand</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Brand Name *</Label>
                <Input placeholder="e.g. Wool & Jute" value={quickBrandName}
                  onChange={(e) => setQuickBrandName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleQuickCreateBrand(); } }}
                />
              </div>
              <div className="space-y-1">
                <Label>Logo / Image *</Label>
                <input type="file" accept="image/*" className="block w-full text-sm"
                  onChange={(e) => setQuickBrandFile(e.target.files?.[0] || null)} />
                {quickBrandFile && (
                  <img src={URL.createObjectURL(quickBrandFile)} alt="preview" className="mt-2 h-16 w-16 rounded object-cover border" />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuickBrand(false)}>Cancel</Button>
              <Button onClick={handleQuickCreateBrand} disabled={quickBrandLoading}>
                {quickBrandLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Brand"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Quick Create: Category ──────────────────────────────────────────── */}
        <Dialog open={showQuickCategory} onOpenChange={setShowQuickCategory}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Category Name *</Label>
                <Input placeholder="e.g. Hand-knotted Rugs" value={quickCatName}
                  onChange={(e) => setQuickCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleQuickCreateCategory(); } }}
                />
              </div>
              <p className="text-xs text-[var(--text-secondary)]">Category will be created and appear in the selector below. Select it after creation.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuickCategory(false)}>Cancel</Button>
              <Button onClick={handleQuickCreateCategory} disabled={quickCatLoading}>
                {quickCatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Quick Create: Attribute + Values ────────────────────────────────── */}
        <Dialog open={showQuickAttr} onOpenChange={setShowQuickAttr}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Attribute</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Attribute Name *</Label>
                  <Input placeholder="e.g. Color, Size, Material" value={quickAttrName}
                    onChange={(e) => setQuickAttrName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Input Type</Label>
                  <select value={quickAttrType} onChange={(e) => setQuickAttrType(e.target.value)}
                    className="rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm w-full">
                    <option value="select">Select</option>
                    <option value="multiselect">Multi-select</option>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Values (optional — add now or later)</Label>
                  <Button type="button" size="sm" variant="ghost" className="h-6 text-xs gap-1"
                    onClick={() => setQuickAttrValues((prev) => [...prev, ""])}>
                    <Plus className="h-3 w-3" /> Add row
                  </Button>
                </div>
                {quickAttrValues.map((val, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input placeholder={`Value ${idx + 1}`} value={val}
                      onChange={(e) => setQuickAttrValues((prev) => prev.map((v, i) => i === idx ? e.target.value : v))}
                      className="h-8 text-sm flex-1" />
                    {quickAttrValues.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0"
                        onClick={() => setQuickAttrValues((prev) => prev.filter((_, i) => i !== idx))}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuickAttr(false)}>Cancel</Button>
              <Button onClick={handleQuickCreateAttribute} disabled={quickAttrLoading}>
                {quickAttrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Attribute"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </Card>
    </div>
  );
}

// CategorySelector component
const CategorySelector = ({
  selectedCategoryIds,
  onSelectCategory,
  primaryCategoryId,
  onSetPrimaryCategory,
  categories,
  isLoading,
}: {
  selectedCategoryIds: string[];
  onSelectCategory: (categoryId: string) => void;
  primaryCategoryId: string | null;
  onSetPrimaryCategory: (categoryId: string) => void;
  categories: any[];
  isLoading: boolean;
}) => {
  const { t } = useLanguage();
  if (isLoading) {
    return <div className="text-sm text-gray-500">{t("products.form.categories.loading")}</div>;
  }

  if (!categories || categories.length === 0) {
    return <div className="text-sm text-gray-500">{t("products.form.categories.no_categories")}</div>;
  }

  // Create a map of parent-child relationships for quick access
  const parentChildMap = new Map();
  categories.forEach((category) => {
    if (category.children && category.children.length > 0) {
      parentChildMap.set(
        category.id,
        category.children.map((child: any) => child.id)
      );
    }
  });

  // Create a map of child-parent relationships for quick access
  const childParentMap = new Map();
  categories.forEach((category) => {
    if (category.parentId) {
      childParentMap.set(category.id, category.parentId);
    }
  });

  // Ensure we have a primary category if we have selected categories
  const ensuredPrimaryId =
    primaryCategoryId ||
    (selectedCategoryIds.length > 0 ? selectedCategoryIds[0] : null);

  // Helper functions
  const isParent = (categoryId: string) => parentChildMap.has(categoryId);
  const isChild = (categoryId: string) => childParentMap.has(categoryId);
  const getParentId = (categoryId: string) => childParentMap.get(categoryId);
  const getChildrenIds = (categoryId: string) =>
    parentChildMap.get(categoryId) || [];

  // Handle selection with parent-child logic
  const handleCategorySelect = (categoryId: string) => {
    let newSelectionIds = [...selectedCategoryIds];
    const isCurrentlySelected = newSelectionIds.includes(categoryId);

    if (isCurrentlySelected) {
      // If deselecting, remove this category
      newSelectionIds = newSelectionIds.filter(
        (id: string) => id !== categoryId
      );

      // If this is a parent, also remove all its children
      if (isParent(categoryId)) {
        const childrenIds = getChildrenIds(categoryId);
        newSelectionIds = newSelectionIds.filter(
          (id: string) => !childrenIds.includes(id)
        );
      }
    } else {
      // If selecting, add this category
      newSelectionIds.push(categoryId);

      // If this is a child, also select its parent if not already selected
      if (isChild(categoryId)) {
        const parentId = getParentId(categoryId);
        if (parentId && !newSelectionIds.includes(parentId)) {
          newSelectionIds.push(parentId);
        }
      }
    }

    // Update primary category if needed
    let newPrimaryId = ensuredPrimaryId;
    if (isCurrentlySelected && categoryId === ensuredPrimaryId) {
      // If deselecting the primary category, choose a new one
      newPrimaryId = newSelectionIds.length > 0 ? newSelectionIds[0] : null;
      if (newPrimaryId) {
        onSetPrimaryCategory(newPrimaryId);
      }
    } else if (!ensuredPrimaryId && newSelectionIds.length > 0) {
      // If no primary category exists yet, set the first selected one
      newPrimaryId = newSelectionIds[0];
      onSetPrimaryCategory(newPrimaryId);
    }

    // Call parent's handler with new selection
    onSelectCategory(categoryId);
  };

  // Filter only parent categories (those without parentId)
  const parentCategories = categories.filter((category) => !category.parentId);

  // Render a category and its children recursively
  const renderCategory = (category: any) => {
    const categoryId = category._id || category.id;
    const isSelected = selectedCategoryIds.includes(categoryId);
    const isPrimary = ensuredPrimaryId === categoryId;

    // Find children of this category
    const childCategories = categories.filter((c) => c.parentId === categoryId);

    return (
      <div key={categoryId} className="category-group">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`cat-${categoryId}`}
              checked={isSelected}
              onChange={() => handleCategorySelect(categoryId)}
              className="mr-2 h-6 w-6 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
            />
            <label
              htmlFor={`cat-${categoryId}`}
              className="text-sm font-medium cursor-pointer"
            >
              {category.name}
            </label>
          </div>

          {isSelected && selectedCategoryIds.length > 1 && (
            <button
              type="button"
              onClick={() => {
                onSetPrimaryCategory(categoryId);
              }}
              className={`text-xs px-2 py-1 rounded-full ${isPrimary
                ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--border-color)]"
                }`}
            >
              {isPrimary ? t("products.form.categories.primary") : t("products.form.categories.set_as_primary")}
            </button>
          )}
        </div>

        {/* Render children with indentation */}
        {childCategories.length > 0 && (
          <div className="pl-6 border-l-2 border-[var(--border-color)] ml-1.5 mt-1">
            {childCategories.map((child) => {
              const childId = child._id || child.id;
              const isChildSelected = selectedCategoryIds.includes(childId);
              const isChildPrimary = ensuredPrimaryId === childId;

              return (
                <div
                  key={childId}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center">
                    <span className="mr-2 text-xs text-[var(--text-secondary)]">
                      ↳
                    </span>
                    <input
                      type="checkbox"
                      id={`cat-${childId}`}
                      checked={isChildSelected}
                      onChange={() => handleCategorySelect(childId)}
                      className="mr-2 h-6 w-6 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                    />
                    <label
                      htmlFor={`cat-${childId}`}
                      className="text-sm cursor-pointer text-[var(--text-primary)]"
                    >
                      {child.name}
                    </label>
                  </div>

                  {isChildSelected && selectedCategoryIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        onSetPrimaryCategory(childId);
                      }}
                      className={`text-xs px-2 py-1 rounded-full ${isChildPrimary
                        ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                        : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--border-color)]"
                        }`}
                    >
                      {isChildPrimary ? "Primary" : "Set as Primary"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2 border rounded-md p-3 max-h-60 overflow-y-auto bg-[var(--bg-card)]">
      <div className="font-medium text-sm mb-1 text-[var(--text-primary)]">
        Select categories (multiple allowed):
      </div>
      <div className="space-y-2">
        {parentCategories.map((category) => renderCategory(category))}
      </div>
    </div>
  );
};

function WashingCareEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [rows, setRows] = useState<Array<{ iconName: string; text: string }>>(
    () => parseWashingCare(value) || [{ iconName: "", text: "" }]
  );
  const [iconPickerOpen, setIconPickerOpen] = useState<number | null>(null);

  const commit = (updated: Array<{ iconName: string; text: string }>) => {
    setRows(updated);
    onChange(JSON.stringify(updated));
  };

  const addRow = () => commit([...rows, { iconName: "", text: "" }]);

  const removeRow = (i: number) => {
    const updated = rows.filter((_, idx) => idx !== i);
    commit(updated.length ? updated : [{ iconName: "", text: "" }]);
  };

  const updateRow = (i: number, field: "iconName" | "text", val: string) => {
    const updated = rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
    commit(updated);
  };

  return (
    <div className="border border-[var(--border-color)] rounded-lg">
      {/* Icon picker overlay — rendered outside table to avoid overflow clipping */}
      {iconPickerOpen !== null && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIconPickerOpen(null)}
        />
      )}
      <table className="w-full text-sm">
        <thead className="bg-[var(--bg-secondary)]">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)] w-20">Icon</th>
            <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)]">Care Instruction Text</th>
            <th className="px-3 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const icon = WASHING_CARE_ICONS.find((ic) => ic.name === row.iconName);
            return (
              <tr key={i} className="border-t border-[var(--border-color)]">
                <td className="px-3 py-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIconPickerOpen(iconPickerOpen === i ? null : i)}
                      className="flex flex-col items-center justify-center w-14 h-14 border border-[var(--border-color)] rounded-md bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] transition-colors gap-1"
                      title="Click to pick icon"
                    >
                      {icon ? (
                        (() => { const IconSvg = icon.svg; return <IconSvg width={26} height={26} className="text-[var(--text-primary)]" />; })()
                      ) : (
                        <span className="text-[var(--text-secondary)] text-[10px] leading-tight text-center">click<br/>icon</span>
                      )}
                    </button>
                    {iconPickerOpen === i && (
                      <div
                        className="absolute z-50 top-16 left-0 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl p-4"
                        style={{ width: 380, minWidth: 380 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Select Icon</p>
                        <div className="grid grid-cols-4 gap-3">
                          <button
                            type="button"
                            onClick={() => { updateRow(i, "iconName", ""); setIconPickerOpen(null); }}
                            className={`flex flex-col items-center justify-center gap-1 h-16 border-2 border-dashed rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors ${row.iconName === "" ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border-color)]"}`}
                          >
                            <span className="text-lg">∅</span>
                            <span className="text-[10px]">None</span>
                          </button>
                          {WASHING_CARE_ICONS.map((ic) => {
                            const IcSvg = ic.svg;
                            return (
                              <button
                                key={ic.name}
                                type="button"
                                onClick={() => { updateRow(i, "iconName", ic.name); setIconPickerOpen(null); }}
                                className={`flex flex-col items-center justify-center gap-1 h-16 border-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors px-1 ${row.iconName === ic.name ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border-color)]"}`}
                              >
                                <IcSvg width={24} height={24} className="text-[var(--text-primary)] flex-shrink-0" />
                                <span className="text-[9px] text-[var(--text-secondary)] leading-tight text-center line-clamp-2">{ic.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.text}
                    onChange={(e) => updateRow(i, "text", e.target.value)}
                    placeholder="e.g. Do Not Brush Or Scrub The Rug."
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-destructive hover:opacity-70 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-3 w-3 mr-1" /> Add Row
        </Button>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNewProduct = location.pathname.includes("/new");
  const isEditProduct = !!id;

  // Show appropriate content based on route
  if (isNewProduct) {
    return <ProductForm mode="create" />;
  }

  if (isEditProduct) {
    return <ProductForm mode="edit" productId={id} />;
  }

  return <ProductsList />;
}

// Product List Component
function ProductsList() {
  const { t } = useLanguage();
  const [productsList, setProductsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  // States for delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForceDeleteDialogOpen, setIsForceDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const params = {
          page: currentPage,
          limit: 10,
          ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
          ...(selectedCategory && { category: selectedCategory }),
        };

        const response = await products.getProducts(params);

        if (response.data.success) {
          const products = response.data.data?.products || [];

          setProductsList(products);
          setTotalPages(response.data.data?.pagination?.pages || 1);
        } else {
          setError(response.data.message || "Failed to fetch products");
        }
      } catch (error: any) {
        console.error("Error fetching products:", error);
        setError("Failed to load products. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, debouncedSearchQuery, selectedCategory]);

  // Fetch categories for filter
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categories.getCategories();

        if (response.data.success) {
          setCategoriesList(response.data.data?.categories || []);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Get base price and sale price for a product
  const getProductPrices = (product: any) => {
    if (!product.variants || product.variants.length === 0) {
      return { basePrice: "0", regularPrice: "0", hasSale: false };
    }

    // For products with variants, show the lowest price
    if (product.hasVariants && product.variants.length > 1) {
      // Find the lowest regular price and its corresponding sale price
      const lowestPriceVariant = product.variants.reduce(
        (lowest: any, current: any) => {
          const currentPrice = Number(current.price);
          const lowestPrice = Number(lowest.price);
          return currentPrice < lowestPrice ? current : lowest;
        },
        product.variants[0]
      );

      return {
        basePrice: lowestPriceVariant.salePrice || lowestPriceVariant.price,
        regularPrice: lowestPriceVariant.salePrice
          ? lowestPriceVariant.price
          : null,
        hasSale: !!lowestPriceVariant.salePrice,
      };
    }

    // For simple products
    const variant = product.variants[0];
    return {
      basePrice: variant.salePrice || variant.price,
      regularPrice: variant.salePrice ? variant.price : null,
      hasSale: !!variant.salePrice,
    };
  };

  // Organize categories into a hierarchical structure
  const organizeCategories = () => {
    // Create parent categories
    const parentCategories = categoriesList
      .filter((category) => !category.parentId)
      .map((parent) => ({
        ...parent,
        children: categoriesList.filter(
          (child) => child.parentId === parent.id
        ),
      }));

    return parentCategories;
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  // Handle product deletion
  const handleDeleteProduct = async (
    productId: string,
    force: boolean = false
  ) => {
    setDeletingProduct(true);

    try {
      const response = await products.deleteProduct(productId, force);

      if (response.data.success) {
        // Check if the message indicates the product has orders and cannot be deleted
        if (
          !force &&
          response.data.message?.includes("has associated orders") &&
          response.data.message?.includes("cannot be deleted")
        ) {
          // Show force delete dialog
          setProductToDelete(productId);
          setIsForceDeleteDialogOpen(true);
        }
        // If message indicates product is just marked inactive
        else if (
          response.data.message?.includes("cannot be deleted") &&
          response.data.message?.includes("marked as inactive")
        ) {
          toast.success("Product marked as inactive");

          // Update product status in the list
          setProductsList((prevProducts) =>
            prevProducts.map((product) =>
              product.id === productId
                ? { ...product, isActive: false }
                : product
            )
          );

          // Close dialogs if open
          setIsDeleteDialogOpen(false);
          setIsForceDeleteDialogOpen(false);
        } else {
          toast.success("Product deleted successfully");
          // Remove from product list
          setProductsList((prevProducts) =>
            prevProducts.filter((product) => product.id !== productId)
          );

          // Close dialogs if open
          setIsDeleteDialogOpen(false);
          setIsForceDeleteDialogOpen(false);
        }
      } else {
        toast.error(response.data.message || "Failed to delete product");
      }
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error(
        error.message || "An error occurred while deleting the product"
      );
    } finally {
      setDeletingProduct(false);
    }
  };

  // Handle marking product as inactive instead of deleting
  const handleMarkAsInactive = async (productId: string) => {
    try {
      const formData = new FormData();
      formData.append("isActive", "false");

      const response = await products.updateProduct(productId, formData as any);

      if (response.data.success) {
        toast.success("Product marked as inactive successfully");

        // Update product status in the list
        setProductsList((prevProducts) =>
          prevProducts.map((product) =>
            product.id === productId ? { ...product, isActive: false } : product
          )
        );

        // Close force delete dialog
        setIsForceDeleteDialogOpen(false);
      } else {
        toast.error(
          response.data.message || "Failed to mark product as inactive"
        );
      }
    } catch (error: any) {
      console.error("Error marking product as inactive:", error);
      toast.error(
        error.message ||
        "An error occurred while marking the product as inactive"
      );
    }
  };

  // Function to open delete dialog
  const openDeleteDialog = (productId: string) => {
    setProductToDelete(productId);
    setIsDeleteDialogOpen(true);
  };

  // Handle product status toggle (active/inactive)
  const handleToggleProductStatus = async (
    productId: string,
    currentStatus: boolean
  ) => {
    try {
      const formData = new FormData();
      formData.append("isActive", (!currentStatus).toString());

      const response = await products.updateProduct(productId, formData as any);

      if (response.data.success) {
        toast.success(
          `Product ${currentStatus ? "deactivated" : "activated"} successfully`
        );

        // Update product status in the list
        setProductsList((prevProducts) =>
          prevProducts.map((product) =>
            product.id === productId
              ? { ...product, isActive: !currentStatus }
              : product
          )
        );
      } else {
        toast.error(
          response.data.message ||
          `Failed to ${currentStatus ? "deactivate" : "activate"} product`
        );
      }
    } catch (error: any) {
      console.error(
        `Error ${currentStatus ? "deactivating" : "activating"} product:`,
        error
      );
      toast.error(
        error.message ||
        `An error occurred while ${currentStatus ? "deactivating" : "activating"} the product`
      );
    }
  };

  // Render option for a category with proper indentation
  const renderCategoryOption = (category: any, level = 0) => {
    return (
      <Fragment key={category.id}>
        <option value={category.id}>
          {level > 0 ? "↳ ".repeat(level) : ""}
          {category.name}
        </option>
        {category.children &&
          category.children.map((child: any) =>
            renderCategoryOption(child, level + 1)
          )}
      </Fragment>
    );
  };

  // Loading state
  if (isLoading && productsList.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
          <p className="mt-4 text-base text-[var(--text-secondary)]">Loading products...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && productsList.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--destructive)]/10 mb-4">
          <AlertTriangle className="h-8 w-8 text-[var(--destructive)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1.5">
          Something went wrong
        </h2>
        <p className="text-center text-[var(--text-secondary)] mb-6">{error}</p>
        <Button
          variant="outline"
          className="border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10"
          onClick={() => {
            setError(null);
            setCurrentPage(1);
            setIsLoading(true);
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Organize categories hierarchically
  const hierarchicalCategories = organizeCategories();

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Dialog */}
      <DeleteProductDialog
        open={isDeleteDialogOpen}
        setOpen={setIsDeleteDialogOpen}
        title={t("products.details.dialogs.delete_title")}
        description={t("products.details.dialogs.delete_desc")}
        onConfirm={() => {
          if (productToDelete) {
            handleDeleteProduct(productToDelete, false);
          }
        }}
        loading={deletingProduct}
        confirmText={t("products.details.actions.delete")}
      />

      {/* Force Delete Confirmation Dialog */}
      <DeleteProductDialog
        open={isForceDeleteDialogOpen}
        setOpen={setIsForceDeleteDialogOpen}
        title={t("products.details.dialogs.force_delete_title")}
        description={t("products.details.dialogs.force_delete_desc")}
        onConfirm={() => {
          if (productToDelete) {
            handleDeleteProduct(productToDelete, true);
          }
        }}
        loading={deletingProduct}
        confirmText={t("products.details.actions.delete")}
        isDestructive={true}
        secondaryAction={{
          text: t("products.details.dialogs.mark_inactive"),
          onClick: () => {
            if (productToDelete) {
              handleMarkAsInactive(productToDelete);
            }
          },
        }}
      />

      {/* Premium Page Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
              {t("products.title")}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1.5">
              {t("products.form.sections.basic_desc")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
              <Input
                type="search"
                placeholder={t("products.list.search_placeholder")}
                className="pl-9 rounded-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch(e)}
              />
            </div>
            <Button
              asChild
            >
              <Link to="/products/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("products.add_new")}
              </Link>
            </Button>
          </div>
        </div>
        <div className="h-px bg-[var(--border-color)]" />
      </div>

      {/* Premium Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full px-4 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <select
          className="flex-1 min-w-[150px] rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">{t("products.list.all_categories")}</option>
          {hierarchicalCategories.map((category) =>
            renderCategoryOption(category)
          )}
        </select>
        <select
          className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none"
          value=""
          onChange={() => { }}
        >
          <option value="">{t("products.list.all_status")}</option>
          <option value="active">{t("products.list.status.active")}</option>
          <option value="draft">{t("products.list.status.inactive")}</option>
        </select>
        {(selectedCategory || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            onClick={() => {
              setSelectedCategory("");
              setSearchQuery("");
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Premium Products List - Card-Table Hybrid */}
      {isLoading && productsList.length > 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-secondary)]/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        </div>
      )}

      {productsList.length === 0 ? (
        <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-secondary)] mb-4">
              <Package className="h-8 w-8 text-[var(--text-secondary)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1.5">
              {t("products.list.table.no_products")}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
              {t("products.list.table.empty_desc")}
            </p>
            <Button
              asChild
            >
              <Link to="/products/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("products.add_new")}
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl overflow-hidden">
          <div className="divide-y divide-[var(--border-color)]">
            <SafeRender>
              {productsList.map((product) => {
                const { basePrice, regularPrice, hasSale } =
                  getProductPrices(product);
                // Get image with fallback logic
                let productImage = null;

                // Priority 1: Product images
                if (product.images && product.images.length > 0) {
                  productImage =
                    product.images.find((img: any) => img.isPrimary) ||
                    product.images[0];
                }
                // Priority 2: Any variant images
                else if (product.variants && product.variants.length > 0) {
                  const variantWithImages = product.variants.find(
                    (variant: any) =>
                      variant.images && variant.images.length > 0
                  );
                  if (variantWithImages) {
                    productImage =
                      variantWithImages.images.find(
                        (img: any) => img.isPrimary
                      ) || variantWithImages.images[0];
                  }
                }

                // Get stock count - check both stock and quantity fields
                const totalStock = product.variants?.reduce(
                  (sum: number, variant: any) => sum + (variant.stock || variant.quantity || 0),
                  0
                ) || 0;

                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {productImage ? (
                        <img
                          src={productImage.url}
                          alt={product.name}
                          className="h-14 w-14 rounded-lg object-cover border border-[var(--border-color)]"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                          <Package className="h-6 w-6 text-[var(--text-secondary)]" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-[var(--text-primary)] text-base truncate">
                              {product.name}
                            </h3>
                            {product.ourProduct && (
                              <Badge className="bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30 text-xs">
                                {t("products.list.status.our_product")}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Category - Hidden on mobile */}
                            <div className="hidden md:flex items-center gap-1.5 flex-wrap">
                              {product.categories &&
                                product.categories.length > 0 ? (
                                product.categories
                                  .slice(0, 2)
                                  .map((category: any) => (
                                    <span
                                      key={category.id}
                                      className="text-xs text-[var(--text-secondary)]"
                                    >
                                      {category.name}
                                    </span>
                                  ))
                              ) : (
                                <span className="text-xs text-[var(--text-secondary)]">
                                  Uncategorized
                                </span>
                              )}
                            </div>
                            {product.hasVariants && (
                              <span className="text-xs text-[var(--text-secondary)]">
                                {product.variants.length} variants
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          {hasSale ? (
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-[var(--text-primary)]">
                                ₹{basePrice}
                              </span>
                              <span className="text-xs line-through text-[var(--text-secondary)]">
                                ₹{regularPrice}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-[var(--text-primary)]">
                              ₹{basePrice}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status & Stock - Hidden on mobile */}
                    <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <Badge
                          className={
                            product.isActive
                              ? "bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/30 text-xs"
                              : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] text-xs"
                          }
                        >
                          {product.isActive ? "Active" : "Draft"}
                        </Badge>
                        {totalStock === 0 && (
                          <Badge className="bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/30 text-xs mt-1 block">
                            Out of stock
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-[var(--bg-secondary)]"
                          >
                            <MoreVertical className="h-4 w-4 text-[var(--text-primary)]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[var(--bg-card)] border-[var(--border-color)] shadow-lg"
                        >
                          <DropdownMenuItem
                            className="text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                            asChild
                          >
                            <Link to={`/products/${product.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                            onClick={() =>
                              handleToggleProductStatus(
                                product.id,
                                product.isActive
                              )
                            }
                          >
                            {product.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-[var(--border-color)]" />
                          <DropdownMenuItem
                            className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                            onClick={() => openDeleteDialog(product.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </SafeRender>
          </div>

          {/* Premium Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border-color)] px-6 py-4 bg-[var(--bg-secondary)]">
              <div className="text-sm text-[var(--text-secondary)]">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[var(--border-color)] hover:bg-[var(--bg-card)]"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[var(--border-color)] hover:bg-[var(--bg-card)]"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

        </Card>

      )}
    </div>
  );
}
