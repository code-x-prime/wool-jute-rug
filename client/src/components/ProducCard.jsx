"use client";

import { formatCurrency, fetchApi } from "@/lib/utils";
import { Eye, Heart, Share2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProductQuickView from "./ProductQuickView";

// Helper function to format image URLs correctly
const getImageUrl = (image) => {
  if (!image) return "/placeholder.png";
  if (image.startsWith("http")) return image;
  return `https://desirediv-storage.blr1.digitaloceanspaces.com/${image}`;
};

// Helper function to calculate discount percentage
const calculateDiscountPercentage = (regularPrice, salePrice) => {
  if (!regularPrice || !salePrice || regularPrice <= salePrice) return 0;
  return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
};

const ProductCard = ({ product }) => {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [wishlistItems, setWishlistItems] = useState({});
  const [isAddingToWishlist, setIsAddingToWishlist] = useState({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [priceVisibilitySettings, setPriceVisibilitySettings] = useState(null);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const productLink = product.variantId ? `/products/${product.slug}?variant=${product.variantId}` : `/products/${product.slug}`;

  // Fetch wishlist status for this product
  useEffect(() => {
    const fetchWishlistStatus = async () => {
      if (!isAuthenticated || typeof window === "undefined") return;

      try {
        const response = await fetchApi("/users/wishlist", {
          credentials: "include",
        });
        const items =
          response.data?.wishlistItems?.reduce((acc, item) => {
            acc[item.productId] = true;
            return acc;
          }, {}) || {};
        setWishlistItems(items);
      } catch (error) {
        console.error("Error fetching wishlist:", error);
      }
    };

    fetchWishlistStatus();
  }, [isAuthenticated]);

  // Fetch price visibility settings
  useEffect(() => {
    const fetchPriceVisibilitySettings = async () => {
      try {
        const response = await fetchApi("/public/price-visibility-settings");
        if (response.success) {
          setPriceVisibilitySettings(response.data);
        }
      } catch (error) {
        console.error("Error fetching price visibility settings:", error);
        // Default to showing prices if API fails
        setPriceVisibilitySettings({ hidePricesForGuests: false });
      }
    };

    fetchPriceVisibilitySettings();
  }, []);

  const handleQuickView = (product) => {
    setQuickViewProduct(product);
    setQuickViewOpen(true);
  };

  const handleShare = async (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${productLink}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  const handleAddToWishlist = async (product, e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push(`/auth?redirect=${encodeURIComponent(productLink)}`);
      return;
    }

    const actualProductId = product.productId || product.id;

    setIsAddingToWishlist((prev) => ({ ...prev, [actualProductId]: true }));

    try {
      if (wishlistItems[actualProductId]) {
        // Get wishlist to find the item ID
        const wishlistResponse = await fetchApi("/users/wishlist", {
          credentials: "include",
        });

        const wishlistItem = wishlistResponse.data?.wishlistItems?.find(
          (item) => item.productId === actualProductId
        );

        if (wishlistItem) {
          await fetchApi(`/users/wishlist/${wishlistItem.id}`, {
            method: "DELETE",
            credentials: "include",
          });

          setWishlistItems((prev) => ({ ...prev, [actualProductId]: false }));
          toast.success("Removed from wishlist");
        }
      } else {
        // Add to wishlist
        await fetchApi("/users/wishlist", {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ productId: actualProductId }),
        });

        setWishlistItems((prev) => ({ ...prev, [actualProductId]: true }));
        toast.success("Added to wishlist");
      }
    } catch (error) {
      console.error("Error updating wishlist:", error);
      toast.error("Failed to update wishlist");
    } finally {
      setIsAddingToWishlist((prev) => ({ ...prev, [actualProductId]: false }));
    }
  };

  const getAllProductImages = useMemo(() => {
    const images = [];
    const imageUrls = new Set();

    // If this is a specific variant card, prioritize that variant's images first
    if (product.variantId && product.variants) {
      const currentVariant = product.variants.find((v) => v.id === product.variantId);
      if (currentVariant && currentVariant.images && currentVariant.images.length > 0) {
        currentVariant.images.forEach((img) => {
          const url = img?.url || img;
          if (url) {
            const imageUrl = getImageUrl(url);
            if (imageUrl && !imageUrls.has(imageUrl)) {
              imageUrls.add(imageUrl);
              images.push(imageUrl);
            }
          }
        });
      }
    }

    // Fallback: If no variant-specific images found (or not a variant card), use standard behavior
    if (images.length === 0) {
      if (
        product.variants &&
        Array.isArray(product.variants) &&
        product.variants.length > 0
      ) {
        product.variants.forEach((variant) => {
          if (
            variant.images &&
            Array.isArray(variant.images) &&
            variant.images.length > 0
          ) {
            variant.images.forEach((img) => {
              const url = img?.url || img;
              if (url) {
                const imageUrl = getImageUrl(url);
                if (imageUrl && !imageUrls.has(imageUrl)) {
                  imageUrls.add(imageUrl);
                  images.push(imageUrl);
                }
              }
            });
          }
        });
      }
    }

    // Priority 2: Get product images array
    if (
      product.images &&
      Array.isArray(product.images) &&
      product.images.length > 0
    ) {
      product.images.forEach((img) => {
        const url = img?.url || img;
        if (url) {
          const imageUrl = getImageUrl(url);
          if (imageUrl && !imageUrls.has(imageUrl)) {
            imageUrls.add(imageUrl);
            images.push(imageUrl);
          }
        }
      });
    }

    // Priority 3: Fallback to product.image (string)
    if (images.length === 0 && product.image) {
      const imageUrl = getImageUrl(product.image);
      if (imageUrl && !imageUrls.has(imageUrl)) {
        imageUrls.add(imageUrl);
        images.push(imageUrl);
      }
    }

    // Final fallback
    if (images.length === 0) {
      images.push("/placeholder.png");
    }

    return images;
  }, [product]);

  // Auto-rotate images on hover
  useEffect(() => {
    if (!isHovered || getAllProductImages.length <= 1) {
      setCurrentImageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => {
        return (prev + 1) % getAllProductImages.length;
      });
    }, 2500); // Change image every 2.5 seconds for smooth transition

    return () => clearInterval(interval);
  }, [isHovered, getAllProductImages.length]);

  // Reset to first image when hover ends
  useEffect(() => {
    if (!isHovered) {
      setCurrentImageIndex(0);
    }
  }, [isHovered]);

  // Get variant info - extract from attributes dynamically
  const getVariantInfo = () => {
    let selectedVariant = null;
    if (product.variants && product.variants.length > 0) {
      selectedVariant = product.variants[0];
    }
    if (!selectedVariant) return null;

    // Extract color and size from attributes
    let color = null;
    let size = null;
    let hexCode = null;

    if (
      selectedVariant.attributes &&
      Array.isArray(selectedVariant.attributes)
    ) {
      selectedVariant.attributes.forEach((attr) => {
        if (attr.attribute === "Color") {
          color = attr.value;
          // Try to get hexCode from attributeOptions if available
          if (product.attributeOptions) {
            const colorAttr = product.attributeOptions.find(
              (a) => a.name === "Color"
            );
            if (colorAttr && colorAttr.values) {
              const colorValue = colorAttr.values.find(
                (v) => v.id === attr.attributeValueId
              );
              if (colorValue) {
                hexCode = colorValue.hexCode || null;
              }
            }
          }
        } else if (attr.attribute === "Size") {
          size = attr.value;
        }
      });
    }

    // Fallback to legacy color/size for backward compatibility
    if (!color) color = selectedVariant.color?.name;
    if (!size) size = selectedVariant.size?.name;
    if (!hexCode) hexCode = selectedVariant.color?.hexCode;

    return { color, size, hexCode };
  };

  const variantInfo = getVariantInfo();

  // Get price - Universal handler for all API formats
  // Products page API: { basePrice (salePrice||price), regularPrice (price), hasSale }
  // Product sections API: { price (regular), salePrice (sale), hasSale }
  // Flash sales API: { basePrice (regular), salePrice (calculated sale) }
  // Wishlist/Cart API: { price, salePrice, hasSale }

  // Parse all possible price fields (handle strings and numbers)
  const parsePrice = (value) => {
    if (value === null || value === undefined) return null;
    if (value === 0) return 0;
    const parsed = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(parsed) ? null : parsed;
  };

  const basePriceField = parsePrice(product.basePrice);
  const regularPriceField = parsePrice(product.regularPrice);
  const priceField = parsePrice(product.price);
  const salePriceField = parsePrice(product.salePrice);

  // Determine if product is on sale
  let hasSale = false;

  if (product.hasSale !== undefined && product.hasSale !== null) {
    // Use explicit hasSale flag if provided
    hasSale = Boolean(product.hasSale);
  } else {
    // Auto-detect sale: salePrice exists and is less than regular price
    if (salePriceField !== null && salePriceField > 0) {
      if (regularPriceField && salePriceField < regularPriceField) {
        hasSale = true;
      } else if (priceField && salePriceField < priceField) {
        hasSale = true;
      } else if (
        basePriceField &&
        regularPriceField &&
        salePriceField < regularPriceField
      ) {
        hasSale = true;
      }
    }
  }

  // Determine original price (for strikethrough) and current display price
  let originalPrice = null;
  let currentPrice = 0;

  // Products page API format: { basePrice, regularPrice, hasSale }
  // - basePrice = salePrice || price (display price)
  // - regularPrice = price (original price)
  if (basePriceField !== null && regularPriceField !== null) {
    // Products page format detected
    if (hasSale && basePriceField < regularPriceField) {
      // On sale: basePrice is sale price, regularPrice is original
      currentPrice = basePriceField;
      originalPrice = regularPriceField;
    } else {
      // Not on sale: basePrice is the regular price
      currentPrice = basePriceField;
    }
  }
  // Product sections/Flash sales API format: { price, salePrice } or { basePrice, salePrice }
  else if (
    salePriceField !== null &&
    (priceField !== null || basePriceField !== null)
  ) {
    // Product sections format or Flash sales format
    if (hasSale && salePriceField) {
      currentPrice = salePriceField;
      // Find original price
      if (priceField && priceField > salePriceField) {
        originalPrice = priceField;
      } else if (basePriceField && basePriceField > salePriceField) {
        originalPrice = basePriceField;
      } else if (regularPriceField && regularPriceField > salePriceField) {
        originalPrice = regularPriceField;
      }
    } else {
      // Not on sale
      currentPrice = priceField || basePriceField || regularPriceField || 0;
    }
  }
  // Fallback: use available price fields
  else {
    if (hasSale && salePriceField) {
      currentPrice = salePriceField;
      originalPrice = regularPriceField || priceField || basePriceField || null;
    } else {
      currentPrice =
        basePriceField ||
        regularPriceField ||
        priceField ||
        salePriceField ||
        0;
    }
  }

  // Ensure we have a valid price (at least 0)
  if (
    currentPrice === null ||
    currentPrice === undefined ||
    isNaN(currentPrice)
  ) {
    currentPrice = 0;
  }

  const discountPercent =
    hasSale && originalPrice && currentPrice
      ? calculateDiscountPercentage(originalPrice, currentPrice)
      : 0;

  return (
    <div
      key={product.id}
      className="bg-white overflow-hidden transition-all duration-300 group"
    >
      <Link href={productLink}>
        <div
          className="relative aspect-[3/4] w-full overflow-hidden bg-gray-50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative w-full h-full">
            {getAllProductImages.map((img, idx) => (
              <Image
                key={idx}
                src={img}
                alt={`${product.name} - Image ${idx + 1}`}
                fill
                className={`object-cover transition-all duration-500 ${idx === currentImageIndex
                  ? "opacity-100 scale-100 group-hover:scale-105"
                  : "opacity-0 scale-95 absolute"
                  }`}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
            ))}
          </div>

          {/* "New" Badge - Top Left */}
          {/* We'll assume product is new for the design, or use a field if available */}
          <div className="absolute top-2 left-2 md:top-3 md:left-3 z-10">
            <div
              className="text-white text-[10px] md:text-xs font-medium px-3 md:px-4 py-1 rounded-full shadow-sm"
              style={{ backgroundColor: "#b58c85" }} // Brownish pink from the screenshot
            >
              New
            </div>
          </div>

          {/* Sale and Discount badges - Below New tag */}
          {hasSale && originalPrice && currentPrice < originalPrice && (
            <div className="absolute top-10 left-2 md:top-12 md:left-3 z-10 flex flex-col gap-1">
              <div className="bg-red-500 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 uppercase tracking-wide shadow-sm">
                Sale
              </div>
              {discountPercent > 0 && (
                <div className="bg-pink-500 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 shadow-sm">
                  {discountPercent}% OFF
                </div>
              )}
            </div>
          )}

          {/* Image indicators - clickable dots to navigate carousel */}
          {getAllProductImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {getAllProductImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === currentImageIndex
                    ? "bg-primary w-6"
                    : "bg-white/70 w-1.5 hover:bg-white/90"
                    }`}
                  title={`View image ${idx + 1}`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Action icons - Top Right */}
          <div className="absolute top-2 right-2 md:top-3 md:right-3 z-30 flex flex-col gap-1.5">
            <button
              className={`hover:text-red-500 p-1 transition-colors ${wishlistItems[product.productId || product.id] ? "text-red-500" : "text-gray-400"}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToWishlist(product, e); }}
              disabled={isAddingToWishlist[product.productId || product.id]}
              title={wishlistItems[product.productId || product.id] ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                className={`h-5 w-5 md:h-6 md:w-6 ${wishlistItems[product.productId || product.id] ? "fill-current" : ""}`}
                strokeWidth={1.5}
              />
            </button>
            <button
              className="text-gray-400 hover:text-gray-700 p-1 transition-colors"
              onClick={(e) => handleShare(product, e)}
              title="Share product"
            >
              <Share2 className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Quick View Button - Bottom on Hover */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleQuickView(product);
              }}
              className="bg-white/90 hover:bg-white text-gray-800 text-[10px] md:text-xs font-medium px-4 py-1.5 shadow-sm backdrop-blur-sm transition-colors whitespace-nowrap border border-gray-200 flex items-center gap-1.5"
            >
              <Eye className="h-3 w-3" />
              Quick View
            </button>
          </div>
        </div>
      </Link>

      {/* Card Content - Centered */}
      <div className="p-4 flex flex-col items-center text-center">
        <Link
          href={productLink}
          className="block group-hover:text-black w-full"
        >
          {/* Category or Main Title */}
          <h3 className="font-jost text-sm font-medium mb-1 uppercase tracking-widest text-gray-900 line-clamp-1">
            {product.category?.name || "PAINTINGS"}
          </h3>

          {/* Subtitle / Product Name */}
          <p className="font-jost text-xs text-gray-500 mb-2 line-clamp-2 px-2">
            {product.name}
          </p>

          {/* Show color and size from variants */}
          {variantInfo && (variantInfo.color || variantInfo.size) && (
            <div className="font-jost text-xs text-gray-500 mb-2 flex items-center justify-center gap-1">
              {variantInfo.color && <span>{variantInfo.color}</span>}
              {variantInfo.color && variantInfo.size && <span>•</span>}
              {variantInfo.size && <span>{variantInfo.size}</span>}
            </div>
          )}
        </Link>

        {/* Price Display Logic */}
        <div className="font-jost flex items-center justify-center gap-2 mt-1">
          {priceVisibilitySettings?.hidePricesForGuests && !isAuthenticated ? (
            <span className="font-semibold text-xs text-gray-400">
              Login to view price
            </span>
          ) : priceVisibilitySettings === null ? (
            <span className="font-semibold text-xs text-gray-400">
              Login to view price
            </span>
          ) : hasSale && originalPrice && currentPrice < originalPrice ? (
            <>
              <span className="font-semibold text-sm md:text-base text-gray-900">
                {formatCurrency(currentPrice)}
              </span>
              <span className="text-gray-400 line-through text-xs md:text-sm">
                {formatCurrency(originalPrice)}
              </span>
            </>
          ) : (
            <span className="font-semibold text-sm md:text-base text-gray-900 tracking-wide">
              {formatCurrency(currentPrice)}
            </span>
          )}
        </div>
      </div>

      {/* Quick View Dialog */}
      <ProductQuickView
        product={quickViewProduct}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
      />
    </div >
  );
};

export default ProductCard;
