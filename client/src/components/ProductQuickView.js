"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { fetchApi, formatCurrency, stripInlineStyles } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Star,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";
import { useAddVariantToCart } from "@/lib/cart-utils";

// Helper function to format image URLs correctly
const getImageUrl = (image) => {
  if (!image) return "/placeholder.png";
  if (image.startsWith("http")) return image;
  return `https://desirediv-storage.blr1.digitaloceanspaces.com/${image}`;
};

export default function ProductQuickView({ product, open, onOpenChange }) {
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({}); // For other attributes
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [effectivePriceInfo, setEffectivePriceInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [success, setSuccess] = useState(false);
  const { addVariantToCart } = useAddVariantToCart();
  const [productDetails, setProductDetails] = useState(null);
  const [imgSrc, setImgSrc] = useState("");
  const [availableCombinations, setAvailableCombinations] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [priceVisibilitySettings, setPriceVisibilitySettings] = useState(null);
  const { isAuthenticated } = useAuth();

  // Reset states when product changes or dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedColor(null);
      setSelectedSize(null);
      setSelectedAttributes({});
      setSelectedVariant(null);
      setQuantity(1);
      setError(null);
      setSuccess(false);
      setProductDetails(null);
      setImgSrc("");
      setAvailableCombinations([]);
      setInitialLoading(true);
      return;
    }

    if (product) {
      setImgSrc(product.image || "/placeholder.png");
    }
  }, [product, open]);

  // Fetch price visibility settings
  useEffect(() => {
    const fetchPriceVisibilitySettings = async () => {
      try {
        const response = await fetchApi("/public/price-visibility-settings");
        if (response?.data) {
          setPriceVisibilitySettings(response.data);
        }
      } catch (error) {
        console.error("Error fetching price visibility settings:", error);
      }
    };

    fetchPriceVisibilitySettings();
  }, []);

  // Note: Order maps are no longer needed with dynamic attributes system
  // Attributes are now handled through the product's attributeOptions

  // Fetch product details when product changes
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!product || !open) {
        setProductDetails(null);
        return;
      }

      setLoading(true);
      setInitialLoading(true);
      setError(null);

      try {
        const response = await fetchApi(`/public/products/${product.slug}`);

        if (response?.data?.product) {
          const productData = response.data.product;

          // Extract colorOptions and sizeOptions from attributeOptions
          if (
            productData.attributeOptions &&
            Array.isArray(productData.attributeOptions)
          ) {
            const colorAttr = productData.attributeOptions.find(
              (attr) => attr.name === "Color"
            );
            const sizeAttr = productData.attributeOptions.find(
              (attr) => attr.name === "Size"
            );

            if (colorAttr && colorAttr.values) {
              productData.colorOptions = colorAttr.values.map((val) => ({
                id: val.id,
                name: val.value,
                hexCode: val.hexCode || null,
                image: val.image || null,
              }));
            }

            if (sizeAttr && sizeAttr.values) {
              productData.sizeOptions = sizeAttr.values.map((val) => ({
                id: val.id,
                name: val.value,
                display: val.value,
              }));
            }
          }

          setProductDetails(productData);

          // Set initial image
          if (productData.images && productData.images.length > 0) {
            const firstImage =
              productData.images.find((img) => img.isPrimary) ||
              productData.images[0];
            setImgSrc(getImageUrl(firstImage.url) || "/placeholder.png");
          } else if (productData.image) {
            setImgSrc(getImageUrl(productData.image) || "/placeholder.png");
          }

          // Extract all available combinations from variants using attributes
          if (productData.variants && productData.variants.length > 0) {
            const combinations = productData.variants
              .filter(
                (v) =>
                  v.isActive !== false &&
                  (v.quantity > 0 || v.quantity === undefined)
              )
              .map((variant) => {
                // Extract all attributes dynamically - store as attributeId -> attributeValueId mapping
                const attributeMap = {};
                let colorId = null;
                let sizeId = null;

                if (variant.attributes && Array.isArray(variant.attributes)) {
                  variant.attributes.forEach((attr) => {
                    // Find attributeId from attributeOptions
                    const attrOption = productData.attributeOptions?.find(
                      (opt) => opt.name === attr.attribute
                    );
                    if (attrOption) {
                      attributeMap[attrOption.id] = attr.attributeValueId;
                    }

                    // Also store Color and Size separately for backward compatibility
                    if (attr.attribute === "Color") {
                      colorId = attr.attributeValueId;
                    } else if (attr.attribute === "Size") {
                      sizeId = attr.attributeValueId;
                    }
                  });
                }

                // Fallback to legacy colorId/sizeId for backward compatibility
                if (!colorId)
                  colorId = variant.colorId || variant.color?.id || null;
                if (!sizeId)
                  sizeId = variant.sizeId || variant.size?.id || null;

                // Ensure price is a number
                const price =
                  typeof variant.price === "string"
                    ? parseFloat(variant.price)
                    : variant.price;
                const salePrice = variant.salePrice
                  ? typeof variant.salePrice === "string"
                    ? parseFloat(variant.salePrice)
                    : variant.salePrice
                  : null;

                return {
                  colorId,
                  sizeId,
                  attributeMap, // Store all attributes
                  variant: {
                    ...variant,
                    price,
                    salePrice,
                  },
                };
              });

            setAvailableCombinations(combinations);

            // Set default selections - prioritize color then size
            if (productData.colorOptions?.length > 0) {
              const firstColor = productData.colorOptions[0];
              setSelectedColor(firstColor);

              // Find matching variant for first color
              const matchingVariant = combinations.find(
                (combo) => combo.colorId === firstColor.id
              );

              if (matchingVariant && productData.sizeOptions?.length > 0) {
                const matchingSize = productData.sizeOptions.find(
                  (size) => size.id === matchingVariant.sizeId
                );

                if (matchingSize) {
                  setSelectedSize(matchingSize);
                  setSelectedVariant(matchingVariant.variant);
                } else if (productData.sizeOptions.length > 0) {
                  // If no exact match, try to find any available size for this color
                  const availableSizes = combinations
                    .filter((c) => c.colorId === firstColor.id)
                    .map((c) => c.sizeId);

                  const firstAvailableSize = productData.sizeOptions.find(
                    (size) => availableSizes.includes(size.id)
                  );

                  if (firstAvailableSize) {
                    setSelectedSize(firstAvailableSize);
                    const variantMatch = combinations.find(
                      (c) =>
                        c.colorId === firstColor.id &&
                        c.sizeId === firstAvailableSize.id
                    );
                    if (variantMatch) {
                      setSelectedVariant(variantMatch.variant);
                    }
                  }
                }
              } else if (matchingVariant) {
                // No sizes, just set the variant
                setSelectedVariant(matchingVariant.variant);
              }
            } else if (
              productData.sizeOptions?.length > 0 &&
              combinations.length > 0
            ) {
              // No colors, but has sizes - select first available size
              // Sizes are already sorted by order in productData.sizeOptions
              const firstSize = productData.sizeOptions[0];
              setSelectedSize(firstSize);
              const matchingVariant = combinations.find(
                (combo) => combo.sizeId === firstSize.id
              );
              if (matchingVariant) {
                setSelectedVariant(matchingVariant.variant);
                const moq = matchingVariant.variant.moq || 1;
                setQuantity(moq);
                const priceInfo = getEffectivePrice(matchingVariant.variant, moq);
                setEffectivePriceInfo(priceInfo);
              } else {
                // Fallback: find any variant with this size
                const variantMatch = productData.variants.find(
                  (v) =>
                    (v.size?.id === firstSize.id ||
                      v.sizeId === firstSize.id) &&
                    v.isActive
                );
                if (variantMatch) {
                  setSelectedVariant(variantMatch);
                  const moq = variantMatch.moq || 1;
                  setQuantity(moq);
                }
              }
            } else if (productData.variants.length > 0) {
              // Just set first available variant
              const firstAvailableVariant =
                productData.variants.find(
                  (v) =>
                    v.isActive !== false &&
                    (v.stock > 0 || v.quantity > 0 || v.quantity === undefined)
                ) || productData.variants[0];
              setSelectedVariant(firstAvailableVariant);
              const moq = firstAvailableVariant.moq || 1;
              setQuantity(moq);
              const priceInfo = getEffectivePrice(firstAvailableVariant, moq);
              setEffectivePriceInfo(priceInfo);
            }
          }
        } else {
          setError("Product details not available");
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
        setError(err?.message || "Failed to load product details");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };

    fetchProductDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.slug, product?.id, open]);

  // Get available sizes for a specific color
  const getAvailableSizesForColor = (colorId) => {
    if (!colorId) {
      // If no color, return all available sizes
      return availableCombinations
        .filter((combo) => combo.sizeId)
        .map((combo) => combo.sizeId)
        .filter((id, index, self) => self.indexOf(id) === index);
    }
    return availableCombinations
      .filter((combo) => combo.colorId === colorId && combo.sizeId)
      .map((combo) => combo.sizeId)
      .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates
  };

  // Get available colors for a specific size
  const getAvailableColorsForSize = (sizeId) => {
    if (!sizeId) return [];
    return availableCombinations
      .filter((combo) => combo.sizeId === sizeId && combo.colorId)
      .map((combo) => combo.colorId)
      .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates
  };

  // Handle color change
  const handleColorChange = (color) => {
    setSelectedColor(color);
    const availableSizeIds = getAvailableSizesForColor(color.id);

    if (
      productDetails?.sizeOptions?.length > 0 &&
      availableSizeIds.length > 0
    ) {
      if (selectedSize && availableSizeIds.includes(selectedSize.id)) {
        const matchingVariant = availableCombinations.find(
          (combo) =>
            combo.colorId === color.id && combo.sizeId === selectedSize.id
        );
        if (matchingVariant) {
          setSelectedVariant(matchingVariant.variant);
        }
      } else {
        const firstAvailableSize = productDetails.sizeOptions.find((size) =>
          availableSizeIds.includes(size.id)
        );
        if (firstAvailableSize) {
          setSelectedSize(firstAvailableSize);
          const matchingVariant = availableCombinations.find(
            (combo) =>
              combo.colorId === color.id &&
              combo.sizeId === firstAvailableSize.id
          );
          if (matchingVariant) {
            setSelectedVariant(matchingVariant.variant);
          }
        }
      }
    } else {
      setSelectedSize(null);
      setSelectedVariant(null);
    }
  };

  // Handle size change
  const handleSizeChange = (size) => {
    setSelectedSize(size);

    if (productDetails?.colorOptions?.length > 0) {
      const availableColorIds = getAvailableColorsForSize(size.id);
      if (selectedColor && availableColorIds.includes(selectedColor.id)) {
        const matchingVariant = availableCombinations.find(
          (combo) =>
            combo.sizeId === size.id && combo.colorId === selectedColor.id
        );
        if (matchingVariant) {
          setSelectedVariant(matchingVariant.variant);
        }
      } else {
        const firstAvailableColor = productDetails.colorOptions.find((color) =>
          availableColorIds.includes(color.id)
        );
        if (firstAvailableColor) {
          setSelectedColor(firstAvailableColor);
          const matchingVariant = availableCombinations.find(
            (combo) =>
              combo.sizeId === size.id &&
              combo.colorId === firstAvailableColor.id
          );
          if (matchingVariant) {
            setSelectedVariant(matchingVariant.variant);
            const moq = matchingVariant.variant.moq || 1;
            const newQty = quantity < moq ? moq : quantity;
            if (quantity < moq) setQuantity(newQty);
            const priceInfo = getEffectivePrice(matchingVariant.variant, newQty);
            setEffectivePriceInfo(priceInfo);
          }
        }
      }
    } else {
      const matchingVariant = availableCombinations.find(
        (combo) => combo.sizeId === size.id
      );
      if (matchingVariant) {
        setSelectedVariant(matchingVariant.variant);
        const moq = matchingVariant.variant.moq || 1;
        if (quantity < moq) setQuantity(moq);
      }
    }
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    setAddingToCart(true);
    setError(null);
    setSuccess(false);

    let variantToAdd = selectedVariant;

    if (!variantToAdd && productDetails?.variants?.length > 0) {
      variantToAdd = productDetails.variants[0];
    }

    if (!variantToAdd) {
      setError("No product variant available");
      setAddingToCart(false);
      return;
    }

    try {
      const result = await addVariantToCart(
        variantToAdd,
        quantity,
        productDetails?.name || product?.name
      );
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else {
        setError("Failed to add to cart. Please try again.");
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
      setError("Failed to add to cart. Please try again.");
    } finally {
      setAddingToCart(false);
    }
  };

  // Helper to parse price (handle Decimal types from API)
  const parsePrice = (price) => {
    if (!price) return 0;
    if (typeof price === "number") return price;
    if (typeof price === "string") return parseFloat(price) || 0;
    return 0;
  };

  // Calculate effective price based on quantity and pricing slabs
  const getEffectivePrice = (variant, qty) => {
    if (!variant) return null;

    const baseSalePrice = parsePrice(variant.salePrice);
    const basePrice = parsePrice(variant.price);
    const originalPrice = baseSalePrice > 0 && baseSalePrice < basePrice ? baseSalePrice : basePrice;

    // Check pricing slabs
    if (variant.pricingSlabs && variant.pricingSlabs.length > 0) {
      // Sort slabs by minQty descending to find the best match
      const sortedSlabs = [...variant.pricingSlabs].sort((a, b) => b.minQty - a.minQty);

      for (const slab of sortedSlabs) {
        if (qty >= slab.minQty && (slab.maxQty === null || qty <= slab.maxQty)) {
          return {
            price: slab.price,
            originalPrice: originalPrice,
            source: 'SLAB',
            slab: slab
          };
        }
      }
    }

    // Return default price
    return {
      price: originalPrice,
      originalPrice: originalPrice,
      source: 'DEFAULT',
      slab: null
    };
  };

  // Get price data - single source of truth
  const getPriceData = () => {
    if (initialLoading || loading) {
      return { loading: true };
    }

    // Priority 1: Selected variant with quantity-based pricing
    if (selectedVariant) {
      // Use cached price info or calculate fresh
      const priceInfo = effectivePriceInfo || getEffectivePrice(selectedVariant, quantity);

      if (priceInfo) {
        const baseSalePrice = parsePrice(selectedVariant.salePrice);
        const basePrice = parsePrice(selectedVariant.price);
        const originalBasePrice = baseSalePrice > 0 && baseSalePrice < basePrice ? basePrice : baseSalePrice || basePrice;

        return {
          currentPrice: priceInfo.price,
          originalPrice: priceInfo.source === 'SLAB' && priceInfo.originalPrice > priceInfo.price
            ? priceInfo.originalPrice
            : (baseSalePrice > 0 && baseSalePrice < basePrice ? basePrice : null),
          loading: false,
          isSlabPrice: priceInfo.source === 'SLAB',
        };
      }

      // Fallback to original logic
      const salePrice = parsePrice(selectedVariant.salePrice);
      const price = parsePrice(selectedVariant.price);
      return {
        currentPrice: salePrice > 0 && salePrice < price ? salePrice : price,
        originalPrice: salePrice > 0 && salePrice < price ? price : null,
        loading: false,
        isSlabPrice: false,
      };
    }

    // Priority 2: Product details from API
    if (productDetails) {
      const basePrice = parsePrice(productDetails.basePrice);
      const regularPrice = parsePrice(productDetails.regularPrice);
      const hasSale =
        productDetails.hasSale && basePrice > 0 && regularPrice > basePrice;
      return {
        currentPrice: basePrice,
        originalPrice: hasSale ? regularPrice : null,
        loading: false,
      };
    }

    // Priority 3: Fallback to product prop
    if (product) {
      const basePrice = parsePrice(product.basePrice);
      const regularPrice = parsePrice(product.regularPrice);
      const hasSale =
        product.hasSale && basePrice > 0 && regularPrice > basePrice;
      return {
        currentPrice: basePrice,
        originalPrice: hasSale ? regularPrice : null,
        loading: false,
      };
    }

    return { loading: false, currentPrice: 0, originalPrice: null };
  };

  // Format price display - single display
  const getPriceDisplay = () => {
    // Check price visibility settings
    if (priceVisibilitySettings?.hidePricesForGuests && !isAuthenticated) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-gray-400">
            Login to view price
          </span>
          <p className="text-sm text-gray-500">Please log in to see pricing information</p>
        </div>
      );
    }

    // If settings are still loading, hide prices to prevent flash
    if (priceVisibilitySettings === null) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-gray-400">
            Login to view price
          </span>
          <p className="text-sm text-gray-500">Please log in to see pricing information</p>
        </div>
      );
    }

    const priceData = getPriceData();

    if (priceData.loading) {
      return <div className="h-8 w-32 bg-gray-200 animate-pulse rounded"></div>;
    }

    if (
      priceData.originalPrice &&
      priceData.originalPrice > priceData.currentPrice
    ) {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold text-[#136C5B]">
              {formatCurrency(priceData.currentPrice)}
            </span>
            <span className="text-lg text-gray-500 line-through">
              {formatCurrency(priceData.originalPrice)}
            </span>
          </div>
          {priceData.isSlabPrice && (
            <p className="text-xs text-green-600 font-medium">
              Bulk pricing applied for {quantity} units
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <span className="text-2xl font-bold text-[#136C5B]">
          {formatCurrency(priceData.currentPrice || 0)}
        </span>
        {priceData.isSlabPrice && (
          <p className="text-xs text-green-600 font-medium">
            Bulk pricing applied for {quantity} units
          </p>
        )}
      </div>
    );
  };

  // Get all product images - using useMemo to avoid recalculating
  const allImages = useMemo(() => {
    if (!product) return [];

    const displayProduct = productDetails || product;
    const images = [];

    // Priority 1: Selected variant images
    if (selectedVariant?.images?.length > 0) {
      selectedVariant.images
        .sort((a, b) => {
          // Sort by isPrimary first, then by order
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return (a.order || 0) - (b.order || 0);
        })
        .forEach((img) => {
          const url = getImageUrl(img.url);
          if (url && !images.includes(url)) images.push(url);
        });
    }

    // Priority 2: Product images
    if (displayProduct?.images?.length > 0) {
      displayProduct.images
        .sort((a, b) => {
          // Sort by isPrimary first, then by order
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return (a.order || 0) - (b.order || 0);
        })
        .forEach((img) => {
          const url = getImageUrl(img.url);
          if (url && !images.includes(url)) images.push(url);
        });
    }

    // Priority 3: Variant images from other variants
    if (displayProduct?.variants?.length > 0 && images.length === 0) {
      for (const variant of displayProduct.variants) {
        if (variant.images?.length > 0) {
          variant.images
            .sort((a, b) => {
              if (a.isPrimary && !b.isPrimary) return -1;
              if (!a.isPrimary && b.isPrimary) return 1;
              return (a.order || 0) - (b.order || 0);
            })
            .forEach((img) => {
              const url = getImageUrl(img.url);
              if (url && !images.includes(url)) images.push(url);
            });
          break; // Just get images from first variant with images
        }
      }
    }

    // Priority 4: Fallback images
    if (images.length === 0) {
      if (displayProduct?.image) {
        const url = getImageUrl(displayProduct.image);
        if (url) images.push(url);
      } else if (imgSrc) {
        images.push(imgSrc);
      } else {
        images.push("/placeholder.png");
      }
    }

    return images; // Already deduplicated
  }, [productDetails, selectedVariant, product, imgSrc]);

  // Reset image index when variant or product changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedVariant?.id, productDetails?.id, product?.id]);

  if (!product) return null;

  const displayProduct = productDetails || product;

  // Calculate discount percentage - using single source of truth
  const getDiscountPercentage = () => {
    const priceData = getPriceData();

    if (
      priceData.loading ||
      !priceData.originalPrice ||
      !priceData.currentPrice
    ) {
      return null;
    }

    if (priceData.originalPrice > priceData.currentPrice) {
      return Math.round(
        ((priceData.originalPrice - priceData.currentPrice) /
          priceData.originalPrice) *
        100
      );
    }

    return null;
  };

  const discountPercentage = getDiscountPercentage();
  const priceData = getPriceData();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-w-[95vw] max-h-[95vh] overflow-hidden p-0 gap-0">
        {loading && !productDetails ? (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-[#136C5B] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full max-h-[95vh]">
            {/* Left Side - Image Gallery */}
            <div className="relative bg-gray-50 flex flex-row  h-[400px] lg:h-auto">
              {/* Thumbnail Gallery */}
              {allImages.length > 1 && (
                <div className="hidden lg:flex flex-col gap-2 p-4 overflow-y-auto">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${currentImageIndex === idx
                        ? "border-[#136C5B] shadow-md"
                        : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <Image
                        src={img}
                        alt={`${displayProduct.name} - Image ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Main Image */}
              <div className="relative flex-1 flex items-center justify-center bg-white">
                <div className="relative w-full h-full min-h-[400px] ">
                  <Image
                    src={allImages[currentImageIndex] || "/placeholder.png"}
                    alt={displayProduct.name}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />

                  {/* Navigation Arrows */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setCurrentImageIndex((prev) =>
                            prev === 0 ? allImages.length - 1 : prev - 1
                          )
                        }
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-gray-200 flex items-center justify-center shadow-lg transition-colors z-10"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-700" />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentImageIndex((prev) =>
                            prev === allImages.length - 1 ? 0 : prev + 1
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-gray-200 flex items-center justify-center shadow-lg transition-colors z-10"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-700" />
                      </button>
                    </>
                  )}

                  {/* Discount Badge */}
                  {discountPercentage && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                      {discountPercentage}% OFF
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side - Product Details */}
            <div className="flex flex-col p-6 lg:p-8 overflow-y-auto bg-white">
              {/* Success Message */}
              {success && (
                <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Item added to cart successfully
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {error}
                </div>
              )}

              {/* Product Name */}
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 uppercase tracking-tight">
                {displayProduct.name}
              </h2>

              {/* Price Section */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                  {getPriceDisplay()}
                  {discountPercentage && discountPercentage > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {discountPercentage}% OFF
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  Inclusive of all taxes
                </p>
              </div>

              {/* Rating */}
              {displayProduct.avgRating > 0 && (
                <div className="flex items-center mb-4">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${star <= Math.round(displayProduct.avgRating || 0)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 ml-2">
                    ({displayProduct.reviewCount || 0} reviews)
                  </span>
                </div>
              )}

              {/* Description */}
              <div
                className="text-gray-600 text-sm mb-4 line-clamp-3 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: stripInlineStyles(displayProduct.description || "No description available") }}
              />

              {/* Color Selection */}
              {productDetails?.colorOptions &&
                productDetails.colorOptions.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      SELECT COLOR
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {productDetails.colorOptions.map((color) => {
                        const availableSizeIds = getAvailableSizesForColor(
                          color.id
                        );
                        const isAvailable = availableSizeIds.length > 0;
                        const isSelected = selectedColor?.id === color.id;

                        return (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => handleColorChange(color)}
                            disabled={!isAvailable}
                            className={`flex flex-col items-center gap-2 transition-all ${!isAvailable
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                              }`}
                          >
                            <div
                              className={`w-12 h-12 rounded-full border-2 transition-all ${isSelected
                                ? "border-[#136C5B] shadow-lg scale-110"
                                : "border-gray-300 hover:border-gray-400"
                                }`}
                              style={{
                                backgroundColor: color.hexCode || "#ccc",
                              }}
                            />
                            <span
                              className={`text-xs font-medium ${isSelected ? "text-[#136C5B]" : "text-gray-700"
                                }`}
                            >
                              {color.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Size Selection */}
              {productDetails?.sizeOptions &&
                productDetails.sizeOptions.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      SELECT SIZE
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {productDetails.sizeOptions.map((size) => {
                        // Check if size is available
                        // If colors exist, check combination with selected color
                        // If no colors, check if size exists in any variant
                        const isAvailable = selectedColor
                          ? availableCombinations.some(
                            (combo) =>
                              combo.colorId === selectedColor.id &&
                              combo.sizeId === size.id
                          )
                          : availableCombinations.some(
                            (combo) => combo.sizeId === size.id
                          );
                        const isSelected = selectedSize?.id === size.id;

                        return (
                          <button
                            key={size.id}
                            type="button"
                            onClick={() => handleSizeChange(size)}
                            disabled={!isAvailable}
                            className={`w-12 h-12 rounded-full border-2 text-sm font-semibold transition-all ${isSelected
                              ? "border-[#136C5B] bg-[#136C5B] text-white shadow-md"
                              : isAvailable
                                ? "border-gray-300 text-gray-700 hover:border-gray-400 bg-white"
                                : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                              }`}
                          >
                            {size.display || size.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Other Attributes (dynamic) - Excluding Color and Size */}
              {productDetails?.attributeOptions &&
                productDetails.attributeOptions
                  .filter(
                    (attr) =>
                      attr.name !== "Color" &&
                      attr.name !== "Size" &&
                      attr.values &&
                      attr.values.length > 0
                  )
                  .map((attribute) => {
                    // Check if this attribute value is available based on current selections
                    const checkAvailability = (attrValueId) => {
                      return availableCombinations.some((combo) => {
                        // Check if this combination matches current selections + this attribute value
                        const matchesColor =
                          !selectedColor || combo.colorId === selectedColor.id;
                        const matchesSize =
                          !selectedSize || combo.sizeId === selectedSize.id;
                        const matchesThisAttr =
                          combo.attributeMap?.[attribute.id] === attrValueId;
                        // Check other selected attributes
                        const matchesOtherAttrs = Object.keys(
                          selectedAttributes
                        ).every((attrId) => {
                          if (attrId === attribute.id) return true; // Skip current attribute
                          return (
                            combo.attributeMap?.[attrId] ===
                            selectedAttributes[attrId]
                          );
                        });
                        return (
                          matchesColor &&
                          matchesSize &&
                          matchesThisAttr &&
                          matchesOtherAttrs
                        );
                      });
                    };

                    const handleAttributeChange = (attrValueId, value) => {
                      setSelectedAttributes((prev) => ({
                        ...prev,
                        [attribute.id]: attrValueId,
                      }));

                      // Find matching variant with new attribute selection
                      const matchingVariant = availableCombinations.find(
                        (combo) => {
                          const matchesColor =
                            !selectedColor ||
                            combo.colorId === selectedColor.id;
                          const matchesSize =
                            !selectedSize || combo.sizeId === selectedSize.id;
                          const matchesThisAttr =
                            combo.attributeMap?.[attribute.id] === attrValueId;
                          const matchesOtherAttrs = Object.keys({
                            ...selectedAttributes,
                            [attribute.id]: attrValueId,
                          }).every((attrId) => {
                            return (
                              combo.attributeMap?.[attrId] ===
                              (attrId === attribute.id
                                ? attrValueId
                                : selectedAttributes[attrId])
                            );
                          });
                          return (
                            matchesColor &&
                            matchesSize &&
                            matchesThisAttr &&
                            matchesOtherAttrs
                          );
                        }
                      );

                      if (matchingVariant) {
                        setSelectedVariant(matchingVariant.variant);
                      }
                    };

                    return (
                      <div key={attribute.id} className="mb-4">
                        <label className="block text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                          SELECT {attribute.name.toUpperCase()}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {attribute.values.map((attrValue) => {
                            const isAvailable = checkAvailability(attrValue.id);
                            const isSelected =
                              selectedAttributes[attribute.id] === attrValue.id;

                            return (
                              <button
                                key={attrValue.id}
                                type="button"
                                onClick={() =>
                                  handleAttributeChange(
                                    attrValue.id,
                                    attrValue.value
                                  )
                                }
                                disabled={!isAvailable}
                                className={`px-4 py-2 rounded-md border-2 text-sm font-semibold transition-all ${isSelected
                                  ? "border-[#136C5B] bg-[#136C5B] text-white shadow-md"
                                  : isAvailable
                                    ? "border-gray-300 text-gray-700 hover:border-gray-400 bg-white"
                                    : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                                  }`}
                              >
                                {attrValue.value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

              {/* MOQ Display */}
              {selectedVariant && selectedVariant.moq && selectedVariant.moq > 1 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">
                        Minimum Order Quantity: {selectedVariant.moq} units
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        You need to order at least {selectedVariant.moq} units of this product
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Slabs Table */}
              {selectedVariant && selectedVariant.pricingSlabs && selectedVariant.pricingSlabs.length > 0 && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Bulk Pricing</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Quantity</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Price per unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVariant.pricingSlabs.map((slab, idx) => (
                          <tr key={idx} className="border-b border-gray-200">
                            <td className="py-2 px-3 text-gray-700">
                              {slab.minQty} {slab.maxQty ? `- ${slab.maxQty}` : "+"} units
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-[#136C5B]">
                              {formatCurrency(slab.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Stock Availability */}
              {selectedVariant && (
                <div className="mb-4">
                  <span
                    className={`text-sm font-medium ${(selectedVariant.stock > 0 || selectedVariant.quantity > 0)
                      ? "text-green-600"
                      : "text-red-600"
                      }`}
                  >
                    {(selectedVariant.stock > 0 || selectedVariant.quantity > 0)
                      ? `✓ In Stock (${selectedVariant.stock || selectedVariant.quantity} available)`
                      : "✗ Out of Stock"}
                  </span>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">
                  Quantity
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    className="p-2 border rounded-l-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      const effectiveMOQ = selectedVariant?.moq || 1;
                      if (quantity > effectiveMOQ) {
                        const newQty = quantity - 1;
                        setQuantity(newQty);
                        if (selectedVariant) {
                          const priceInfo = getEffectivePrice(selectedVariant, newQty);
                          setEffectivePriceInfo(priceInfo);
                        }
                      }
                    }}
                    disabled={
                      quantity <= (selectedVariant?.moq || 1) || addingToCart
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 border-t border-b min-w-[3rem] text-center font-medium">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="p-2 border rounded-r-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      const availableStock = selectedVariant?.stock || selectedVariant?.quantity || 0;
                      if (availableStock > 0 && quantity < availableStock) {
                        const newQty = quantity + 1;
                        setQuantity(newQty);
                        if (selectedVariant) {
                          const priceInfo = getEffectivePrice(selectedVariant, newQty);
                          setEffectivePriceInfo(priceInfo);
                        }
                      }
                    }}
                    disabled={
                      (selectedVariant &&
                        (selectedVariant.stock > 0 || selectedVariant.quantity > 0) &&
                        quantity >= (selectedVariant.stock || selectedVariant.quantity)) ||
                      addingToCart
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid md:grid-cols-2 gap-3 mt-auto pt-2">
                <Button
                  onClick={handleAddToCart}
                  className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold text-sm uppercase tracking-wide rounded-none"
                  disabled={
                    loading ||
                    addingToCart ||
                    (!selectedVariant &&
                      (!productDetails?.variants ||
                        productDetails.variants.length === 0)) ||
                    (selectedVariant && (selectedVariant.stock < 1 && selectedVariant.quantity < 1))
                  }
                >
                  {addingToCart ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      ADD TO BAG
                    </>
                  )}
                </Button>

                <Link href={`/products/${displayProduct.slug}`}>
                  <Button className="w-full py-4 bg-[#136C5B] hover:bg-[#0f5a4a] text-white font-semibold text-sm uppercase tracking-wide rounded-none">
                    BUY NOW
                  </Button>
                </Link>
              </div>
              <Link
                href={`/products/${displayProduct.slug}`}
                className="text-center text-sm text-[#136C5B] hover:underline font-medium mt-4"
              >
                PRODUCT DETAILS
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
