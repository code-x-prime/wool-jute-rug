"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { fetchApi, formatCurrency } from "@/lib/utils";
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
  Share2,
} from "lucide-react";
import { useAddVariantToCart } from "@/lib/cart-utils";
import AddonSvgIcon from "@/components/AddonSvgIcon";
import { toast } from "sonner";

// Helper function to format image URLs correctly
const getImageUrl = (image) => {
  if (!image) return "/placeholder.png";
  if (image.startsWith("http")) return image;
  return `https://desirediv-storage.blr1.digitaloceanspaces.com/${image}`;
};

export default function ProductQuickView({ product, open, onOpenChange }) {
  const [selectedAttributes, setSelectedAttributes] = useState({});
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
  const [addonServices, setAddonServices] = useState([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const { isAuthenticated } = useAuth();

  // Reset states when product changes or dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedAttributes({});
      setSelectedVariant(null);
      setQuantity(1);
      setError(null);
      setSuccess(false);
      setProductDetails(null);
      setImgSrc("");
      setAvailableCombinations([]);
      setInitialLoading(true);
      setAddonServices([]);
      setSelectedAddonIds([]);
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

          setProductDetails(productData);

          // Fetch addon services for this product
          if (productData.id) {
            fetchApi(`/public/products/${productData.id}/addons`)
              .then((r) => setAddonServices(r?.data?.data?.addons || []))
              .catch(() => {});
          }

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
                // Build attributeId -> attributeValueId map
                const attributeMap = {};
                if (variant.attributes && Array.isArray(variant.attributes)) {
                  variant.attributes.forEach((attr) => {
                    const attrOption = productData.attributeOptions?.find(
                      (opt) => opt.name === attr.attribute
                    );
                    if (attrOption) {
                      attributeMap[attrOption.id] = attr.attributeValueId;
                    }
                  });
                }
                return {
                  attributeMap,
                  variant: {
                    ...variant,
                    price: typeof variant.price === "string" ? parseFloat(variant.price) : variant.price,
                    salePrice: variant.salePrice
                      ? typeof variant.salePrice === "string" ? parseFloat(variant.salePrice) : variant.salePrice
                      : null,
                  },
                };
              });

            setAvailableCombinations(combinations);

            // Auto-select first available variant + build default selectedAttributes
            if (combinations.length > 0) {
              const first = combinations[0];
              setSelectedAttributes(first.attributeMap);
              setSelectedVariant(first.variant);
              const moq = first.variant.moq || 1;
              setQuantity(moq);
              const priceInfo = getEffectivePrice(first.variant, moq);
              setEffectivePriceInfo(priceInfo);
            } else if (productData.variants.length > 0) {
              setSelectedVariant(productData.variants[0]);
              const moq = productData.variants[0].moq || 1;
              setQuantity(moq);
              setEffectivePriceInfo(getEffectivePrice(productData.variants[0], moq));
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

  // Handle attribute value selection (unified for all attributes)
  const handleAttributeSelect = (attrId, valueId) => {
    const newAttrs = { ...selectedAttributes, [attrId]: valueId };
    setSelectedAttributes(newAttrs);

    // Find variant that matches ALL selected attributes
    const match = availableCombinations.find((combo) =>
      Object.entries(newAttrs).every(([aid, vid]) => combo.attributeMap[aid] === vid)
    );
    if (match) {
      setSelectedVariant(match.variant);
      const moq = match.variant.moq || 1;
      const newQty = quantity < moq ? moq : quantity;
      if (quantity < moq) setQuantity(newQty);
      setEffectivePriceInfo(getEffectivePrice(match.variant, newQty));
    }
  };

  // Check if an attribute value is available given other current selections
  const isAttrValueAvailable = (attrId, valueId) => {
    const testAttrs = { ...selectedAttributes, [attrId]: valueId };
    return availableCombinations.some((combo) =>
      Object.entries(testAttrs).every(([aid, vid]) =>
        combo.attributeMap[aid] === undefined || combo.attributeMap[aid] === vid
      )
    );
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
        productDetails?.name || product?.name,
        selectedAddonIds
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
            <span className="text-2xl font-bold text-[#3D1C02]">
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
        <span className="text-2xl font-bold text-[#3D1C02]">
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-w-[95vw] max-h-[95vh] overflow-hidden p-0 gap-0">
        {loading && !productDetails ? (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full max-h-[95vh]">
            {/* Left Side - Image Gallery */}
            <div className="relative bg-gray-50 flex flex-row h-[300px] sm:h-[380px] lg:h-auto">
              {/* Thumbnail Gallery */}
              {allImages.length > 1 && (
                <div className="hidden lg:flex flex-col gap-2 p-4 overflow-y-auto">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === idx
                        ? "border-[#3D1C02] shadow-md"
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
              <h2 className="text-xl md:text-2xl font-semibold text-[#3D1C02] mb-4 uppercase tracking-tight leading-snug">
                {displayProduct.name}
              </h2>

              {/* Price Section */}
              <div className="mb-4">
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
                <div className="flex items-center mb-3">
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

              {/* Unified Attribute Selection */}
              {productDetails?.attributeOptions?.length > 0 && productDetails.attributeOptions.map((attribute) => {
                if (!attribute.values || attribute.values.length === 0) return null;
                return (
                  <div key={attribute.id} className="mb-3">
                    <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-widest">
                      {attribute.name}
                      {selectedAttributes[attribute.id] && (() => {
                        const sel = attribute.values.find(v => v.id === selectedAttributes[attribute.id]);
                        return sel ? <span className="ml-2 font-normal text-gray-700 normal-case tracking-normal">{sel.value}</span> : null;
                      })()}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {attribute.values.map((val) => {
                        const isSelected = selectedAttributes[attribute.id] === val.id;
                        const isAvailable = isAttrValueAvailable(attribute.id, val.id);
                        if (val.image) {
                          return (
                            <button key={val.id} type="button"
                              onClick={() => handleAttributeSelect(attribute.id, val.id)}
                              disabled={!isAvailable}
                              title={val.value}
                              className={`relative flex flex-col items-center gap-1 transition-all ${!isAvailable ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              <div className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${isSelected ? "border-[#3D1C02] ring-2 ring-[#3D1C02] ring-offset-1" : "border-gray-200 hover:border-[#3D1C02]"}`}>
                                <img src={val.image} alt={val.value} className="w-full h-full object-cover" />
                              </div>
                              <span className={`text-[10px] font-medium leading-none max-w-[56px] truncate text-center ${isSelected ? "text-[#3D1C02]" : "text-gray-500"}`}>{val.value}</span>
                              {isSelected && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#3D1C02] rounded-full flex items-center justify-center"><svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></span>}
                            </button>
                          );
                        }
                        if (val.hexCode) {
                          return (
                            <button key={val.id} type="button"
                              onClick={() => handleAttributeSelect(attribute.id, val.id)}
                              disabled={!isAvailable}
                              title={val.value}
                              className={`relative flex flex-col items-center gap-1 transition-all ${!isAvailable ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              <div className={`w-8 h-8 rounded-full border-2 transition-all ${isSelected ? "border-[#3D1C02] shadow-md scale-110" : "border-gray-300 hover:border-gray-400"}`}
                                style={{ backgroundColor: val.hexCode }} />
                              <span className={`text-[10px] font-medium leading-none max-w-[48px] truncate text-center ${isSelected ? "text-[#3D1C02]" : "text-gray-500"}`}>{val.value}</span>
                              {isSelected && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#3D1C02] rounded-full flex items-center justify-center"><svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></span>}
                            </button>
                          );
                        }
                        return (
                          <button key={val.id} type="button"
                            onClick={() => handleAttributeSelect(attribute.id, val.id)}
                            disabled={!isAvailable}
                            className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${isSelected
                              ? "border-[#3D1C02] bg-[#3D1C02] text-white shadow-sm"
                              : isAvailable
                                ? "border-gray-300 text-gray-700 hover:border-[#3D1C02]/60 bg-white"
                                : "border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed"}`}
                          >
                            {val.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}


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
                            <td className="py-2 px-3 text-right font-medium text-[#3D1C02]">
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

              {/* Add-on Services */}
              {addonServices.length > 0 && (
                <div className="mb-4 border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                    Add-on Services
                  </p>
                  <div className="space-y-1.5">
                    {addonServices.map((addon) => {
                      const isSelected = selectedAddonIds.includes(addon.id);
                      return (
                        <label
                          key={addon.id}
                          className={`flex items-center gap-2.5 px-3 py-2.5 border cursor-pointer transition-all ${isSelected ? "border-[#3D1C02] bg-[#3D1C02]/5" : "border-gray-200 hover:border-[#3D1C02]/40"}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              setSelectedAddonIds((prev) =>
                                isSelected ? prev.filter((id) => id !== addon.id) : [...prev, addon.id]
                              )
                            }
                            className="h-3.5 w-3.5 accent-[#3D1C02] flex-shrink-0"
                          />
                          <AddonSvgIcon icon={addon.icon} size={16} className="text-gray-700" />
                          <span className="flex-1 text-xs font-medium text-gray-900 truncate">{addon.name}</span>
                          <span className="text-xs font-semibold text-[#3D1C02] flex-shrink-0">
                            +{typeof addon.price === "number"
                              ? `₹${addon.price.toLocaleString("en-IN")}`
                              : `₹${parseFloat(addon.price).toLocaleString("en-IN")}`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    Quantity
                  </label>
                  {selectedVariant?.moq > 1 && (
                    <span className="text-xs text-[#3D1C02] font-medium">
                      Min. order: {selectedVariant.moq} units
                    </span>
                  )}
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    className="p-2 border border-gray-200 rounded-l-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      const moq = selectedVariant?.moq || 1;
                      if (quantity > moq) {
                        const newQty = quantity - 1;
                        setQuantity(newQty);
                        if (selectedVariant) setEffectivePriceInfo(getEffectivePrice(selectedVariant, newQty));
                      }
                    }}
                    disabled={quantity <= (selectedVariant?.moq || 1) || addingToCart}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 border-t border-b border-gray-200 min-w-[3rem] text-center font-medium text-[#3D1C02]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="p-2 border border-gray-200 rounded-r-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      const stock = selectedVariant?.stock || selectedVariant?.quantity;
                      // If stock is 0 or undefined, treat as unlimited (not tracked)
                      if (!stock || quantity < stock) {
                        const newQty = quantity + 1;
                        setQuantity(newQty);
                        if (selectedVariant) setEffectivePriceInfo(getEffectivePrice(selectedVariant, newQty));
                      }
                    }}
                    disabled={
                      addingToCart ||
                      (selectedVariant &&
                        (selectedVariant.stock > 0 || selectedVariant.quantity > 0) &&
                        quantity >= (selectedVariant.stock || selectedVariant.quantity))
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-auto pt-2">
                <Button
                  onClick={handleAddToCart}
                  className="flex-1 py-4 bg-white border-2 border-[#3D1C02] hover:bg-[#3D1C02] hover:text-white text-[#3D1C02] font-semibold text-sm uppercase tracking-wide rounded-none transition-colors"
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
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      ADD TO CART
                    </>
                  )}
                </Button>

                <Link href={`/products/${displayProduct.slug}`} className="flex-1">
                  <Button className="w-full py-4 bg-[#3D1C02] hover:bg-[#3D1C02]/90 text-white font-semibold text-sm uppercase tracking-wide rounded-none">
                    VIEW PRODUCT
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  className="py-4 px-4 border border-gray-300 hover:border-[#3D1C02] hover:text-[#3D1C02] rounded-none transition-colors"
                  title="Share product"
                  onClick={async () => {
                    const url = `${window.location.origin}/products/${displayProduct.slug}`;
                    if (navigator.share) {
                      try { await navigator.share({ title: displayProduct.name, url }); } catch (_) {}
                    } else {
                      await navigator.clipboard.writeText(url);
                      toast.success("Link copied!");
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
