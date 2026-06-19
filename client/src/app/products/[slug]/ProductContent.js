"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchApi, formatCurrency, stripInlineStyles } from "@/lib/utils";
import { IconTruckDelivery, IconShoppingBag, IconPalette, IconTag } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Star,
  Minus,
  Plus,
  AlertCircle,
  ShoppingCart,
  Heart,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import ReviewSection from "./ReviewSection";
import { useAddVariantToCart } from "@/lib/cart-utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { parseWashingCare, getIconByName } from "./WashingCareIcons";

function WashingCareList({ raw }) {
  const rows = parseWashingCare(raw);
  if (!rows.length) return null;
  return (
    <div className="pb-6 pt-2 space-y-4">
      {rows.map((row, i) => {
        const icon = row.iconName ? getIconByName(row.iconName) : null;
        const IconSvg = icon ? icon.svg : null;
        return (
          <div key={i} className="flex items-center gap-4">
            {IconSvg ? (
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full border border-gray-300 text-gray-700">
                <IconSvg width={28} height={28} />
              </div>
            ) : (
              <div className="flex-shrink-0 w-12 h-12" />
            )}
            <span className="text-sm text-gray-700 leading-snug">{row.text}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ProductContent({ slug }) {
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [effectivePriceInfo, setEffectivePriceInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("description");
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [availableCombinations, setAvailableCombinations] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [priceVisibilitySettings, setPriceVisibilitySettings] = useState(null);

  const { addVariantToCart } = useAddVariantToCart();

  // Note: Attribute ordering is handled by the backend
  // No need to fetch separate order maps for attributes

  // Fetch product details
  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      setInitialLoading(true);
      try {
        const response = await fetchApi(`/public/products/${slug}`);
        const productData = response.data.product;

        // Attribute options are already sorted by the backend
        // No additional sorting needed

        setProduct(productData);
        setRelatedProducts(response.data.relatedProducts || []);

        // Set main image
        if (productData.images && productData.images.length > 0) {
          setMainImage(productData.images[0]);
        }

        // Extract all available combinations from variants
        if (productData.variants && productData.variants.length > 0) {
          const combinations = productData.variants
            .filter((v) => v.isActive && (v.stock > 0 || v.quantity > 0))
            .map((variant) => ({
              attributeValueIds: variant.attributes
                ? variant.attributes.map((a) => a.attributeValueId)
                : [],
              variant: variant,
            }));

          setAvailableCombinations(combinations);

          // Set default attributes if available
          if (productData.attributeOptions && productData.attributeOptions.length > 0) {
            const defaultSelections = {};

            // Select first value for each attribute
            productData.attributeOptions.forEach((attr) => {
              if (attr.values && attr.values.length > 0) {
                defaultSelections[attr.id] = attr.values[0].id;
              }
            });

            setSelectedAttributes(defaultSelections);

            // Find matching variant with these attribute values
            const matchingVariant = combinations.find((combo) => {
              const comboIds = combo.attributeValueIds.sort().join(",");
              const selectedIds = Object.values(defaultSelections).sort().join(",");
              return comboIds === selectedIds;
            });

            if (matchingVariant) {
              setSelectedVariant(matchingVariant.variant);
              // Set initial quantity to MOQ if available
              const moq = matchingVariant.variant.moq || 1;
              setQuantity(moq);
              const priceInfo = getEffectivePrice(matchingVariant.variant, moq);
              setEffectivePriceInfo(priceInfo);
            } else if (productData.variants.length > 0) {
              // Fallback: just pick the first variant
              setSelectedVariant(productData.variants[0]);
              const moq = productData.variants[0].moq || 1;
              setQuantity(moq);
              const priceInfo = getEffectivePrice(productData.variants[0], moq);
              setEffectivePriceInfo(priceInfo);
            }
          } else if (productData.variants.length > 0) {
            // Fallback: just pick the first variant
            setSelectedVariant(productData.variants[0]);
            const moq = productData.variants[0].moq || 1;
            setQuantity(moq);
            const priceInfo = getEffectivePrice(productData.variants[0], moq);
            setEffectivePriceInfo(priceInfo);
          }
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };

    if (slug) {
      fetchProductDetails();
    }
  }, [slug]);

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

  // Handle attribute value change
  const handleAttributeChange = (attributeId, attributeValueId) => {
    const newSelections = { ...selectedAttributes, [attributeId]: attributeValueId };
    setSelectedAttributes(newSelections);

    // Find matching variant with all selected attribute values
    const selectedValueIds = Object.values(newSelections).sort();
    const matchingVariant = availableCombinations.find((combo) => {
      const comboIds = combo.attributeValueIds.sort();
      return comboIds.length === selectedValueIds.length &&
        comboIds.every((id, idx) => id === selectedValueIds[idx]);
    });

    if (matchingVariant) {
      setSelectedVariant(matchingVariant.variant);
      // Update quantity to match MOQ if needed
      const moq = matchingVariant.variant.moq || 1;
      const newQty = quantity < moq ? moq : quantity;
      if (quantity < moq) {
        setQuantity(newQty);
      }
      const priceInfo = getEffectivePrice(matchingVariant.variant, newQty);
      setEffectivePriceInfo(priceInfo);
    } else {
      setSelectedVariant(null);
      setEffectivePriceInfo(null);
    }
  };

  // Get available values for an attribute based on other selections
  const getAvailableValuesForAttribute = (attributeId) => {
    if (!product?.attributeOptions) return [];

    const attribute = product.attributeOptions.find((attr) => attr.id === attributeId);
    if (!attribute || !attribute.values) return [];

    // Filter values that exist in at least one variant with current selections
    const otherSelections = { ...selectedAttributes };
    delete otherSelections[attributeId];

    const availableValueIds = new Set();
    availableCombinations.forEach((combo) => {
      // Check if this combination matches all other selected attributes
      const comboValueIds = combo.attributeValueIds;
      const otherSelectedIds = Object.values(otherSelections);

      const matchesOtherSelections = otherSelectedIds.length === 0 ||
        otherSelectedIds.every((id) => comboValueIds.includes(id));

      if (matchesOtherSelections) {
        // Add all value IDs from this combo that belong to this attribute
        combo.variant.attributes?.forEach((attr) => {
          if (attr.attributeId === attributeId) {
            availableValueIds.add(attr.attributeValueId);
          }
        });
      }
    });

    return attribute.values.filter((val) => availableValueIds.has(val.id));
  };

  // Check if product is in wishlist
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!isAuthenticated || !product) return;

      try {
        const response = await fetchApi("/users/wishlist", {
          credentials: "include",
        });

        const wishlistItems = response.data.wishlistItems || [];
        const inWishlist = wishlistItems.some(
          (item) => item.productId === product.id
        );
        setIsInWishlist(inWishlist);
      } catch (error) {
        console.error("Failed to check wishlist status:", error);
      }
    };

    checkWishlistStatus();
  }, [isAuthenticated, product]);

  // Handle quantity change
  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;

    // Get effective MOQ (minimum order quantity)
    const effectiveMOQ = selectedVariant?.moq || 1;

    // Don't allow quantity below MOQ
    if (newQuantity < effectiveMOQ) return;

    // Don't allow quantity above available stock
    const availableStock = selectedVariant?.stock || selectedVariant?.quantity || 0;
    if (availableStock > 0 && newQuantity > availableStock) return;

    setQuantity(newQuantity);

    // Update effective price when quantity changes
    if (selectedVariant) {
      const priceInfo = getEffectivePrice(selectedVariant, newQuantity);
      setEffectivePriceInfo(priceInfo);
    }
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!selectedVariant) {
      // If no variant is selected but product has variants, use the first one
      if (product?.variants && product.variants.length > 0) {
        setIsAddingToCart(true);
        setCartSuccess(false);

        try {
          const result = await addVariantToCart(
            product.variants[0],
            quantity,
            product.name
          );
          if (result.success) {
            setCartSuccess(true);
            // Clear success message after 3 seconds
            setTimeout(() => {
              setCartSuccess(false);
            }, 3000);
          }
        } catch (err) {
          console.error("Error adding to cart:", err);
        } finally {
          setIsAddingToCart(false);
        }
      }
      return;
    }

    setIsAddingToCart(true);
    setCartSuccess(false);

    try {
      const result = await addVariantToCart(
        selectedVariant,
        quantity,
        product.name
      );
      if (result.success) {
        setCartSuccess(true);
        // Clear success message after 3 seconds
        setTimeout(() => {
          setCartSuccess(false);
        }, 3000);
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Handle buy now - add to cart and redirect to checkout
  const handleBuyNow = async () => {
    const variantToUse = selectedVariant || (product?.variants && product.variants.length > 0 ? product.variants[0] : null);

    if (!variantToUse) {
      return;
    }

    setIsAddingToCart(true);

    try {
      const result = await addVariantToCart(
        variantToUse,
        quantity,
        product.name
      );
      if (result.success) {
        // Redirect to checkout
        router.push("/checkout");
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Collect images to show based on variant priority
  const getImagesToShow = useCallback(() => {
    if (selectedVariant?.images?.length > 0) return selectedVariant.images;
    if (product?.images?.length > 0) return product.images;
    const v = product?.variants?.find((vv) => vv.images?.length > 0);
    return v ? v.images : [];
  }, [selectedVariant, product]);

  const openLightbox = useCallback((index) => {
    setLightboxIndex(index);
    setZoomLevel(1);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setZoomLevel(1);
  }, []);

  // Keyboard navigation for lightbox — defined after getImagesToShow
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e) => {
      const images = getImagesToShow();
      if (e.key === "Escape") { setLightboxOpen(false); setZoomLevel(1); }
      if (e.key === "ArrowRight") { setLightboxIndex((i) => (i + 1) % images.length); setZoomLevel(1); }
      if (e.key === "ArrowLeft") { setLightboxIndex((i) => (i - 1 + images.length) % images.length); setZoomLevel(1); }
      if (e.key === "+" || e.key === "=") setZoomLevel((z) => Math.min(4, z + 0.5));
      if (e.key === "-") setZoomLevel((z) => Math.max(1, z - 0.5));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, getImagesToShow]);

  const renderImages = () => {
    const imagesToShow = getImagesToShow();

    if (imagesToShow.length === 0) {
      return (
        <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
          <Image src="/images/product-placeholder.png" alt={product?.name || "Product"} fill className="object-contain" priority />
        </div>
      );
    }

    const primaryImage = imagesToShow.find((img) => img.isPrimary) || imagesToShow[0];
    const currentMainImage = mainImage && imagesToShow.some((img) => img.url === mainImage.url) ? mainImage : primaryImage;
    const currentIndex = imagesToShow.findIndex((img) => img.url === currentMainImage?.url);

    return (
      <>
        <div className="flex flex-col-reverse lg:flex-row gap-4 h-full">
          {/* Thumbnails */}
          {imagesToShow.length > 1 && (
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto no-scrollbar lg:w-[72px] shrink-0 lg:max-h-[700px] pb-2 lg:pb-0">
              {imagesToShow.map((image, index) => (
                <div
                  key={index}
                  className={`relative aspect-[3/4] w-16 lg:w-full shrink-0 bg-gray-50 cursor-pointer transition-all ${currentMainImage?.url === image.url ? "ring-1 ring-black opacity-100" : "opacity-40 hover:opacity-100"}`}
                  onClick={() => setMainImage(image)}
                >
                  <Image src={getImageUrl(image.url)} alt={`${product.name} - ${index + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Main Image — touch/swipe + click to open lightbox */}
          <div
            className="relative aspect-[4/5] lg:h-[700px] w-full bg-[#f6f5f3] flex-1 group overflow-hidden cursor-zoom-in"
            style={{ touchAction: "pan-y" }}
            onClick={(e) => {
              if (e.currentTarget.__swiped) {
                e.currentTarget.__swiped = false;
                return;
              }
              openLightbox(currentIndex >= 0 ? currentIndex : 0);
            }}
            onTouchStart={(e) => {
              // Record touch start X
              if (e.touches && e.touches[0]) {
                e.currentTarget.__touchStartX = e.touches[0].clientX;
              }
            }}
            onTouchEnd={(e) => {
              const startX = e.currentTarget.__touchStartX;
              if (startX == null) return;
              const endX = e.changedTouches?.[0]?.clientX ?? startX;
              const delta = startX - endX;
              if (Math.abs(delta) > 50) {
                // Swipe detected — prevent click/lightbox
                e.currentTarget.__swiped = true;
                e.stopPropagation();
                if (delta > 0) {
                  // Swipe left → next image
                  const next = (currentIndex + 1) % imagesToShow.length;
                  setMainImage(imagesToShow[next]);
                } else {
                  // Swipe right → previous image
                  const prev = (currentIndex - 1 + imagesToShow.length) % imagesToShow.length;
                  setMainImage(imagesToShow[prev]);
                }
              }
              e.currentTarget.__touchStartX = null;
            }}
          >
            <Image
              src={getImageUrl(currentMainImage?.url)}
              alt={product?.name || "Product"}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority
            />
            {/* Zoom hint */}
            <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow">
              <ZoomIn className="h-4 w-4 text-gray-700" />
            </div>
            {/* Arrow navigation on main image */}
            {imagesToShow.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  onClick={(e) => { e.stopPropagation(); const prev = (currentIndex - 1 + imagesToShow.length) % imagesToShow.length; setMainImage(imagesToShow[prev]); }}
                >
                  <ChevronLeft className="h-4 w-4 text-gray-700" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  onClick={(e) => { e.stopPropagation(); const next = (currentIndex + 1) % imagesToShow.length; setMainImage(imagesToShow[next]); }}
                >
                  <ChevronRight className="h-4 w-4 text-gray-700" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Lightbox */}
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close */}
            <button className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10" onClick={closeLightbox}>
              <X className="h-7 w-7" />
            </button>

            {/* Counter */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
              {lightboxIndex + 1} / {imagesToShow.length}
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <button onClick={(e) => { e.stopPropagation(); setZoomLevel((z) => Math.max(1, z - 0.5)); }} className="text-white/80 hover:text-white">
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-white/60 text-xs w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={(e) => { e.stopPropagation(); setZoomLevel((z) => Math.min(4, z + 0.5)); }} className="text-white/80 hover:text-white">
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>

            {/* Prev arrow */}
            {imagesToShow.length > 1 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + imagesToShow.length) % imagesToShow.length); setZoomLevel(1); }}
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
            )}

            {/* Next arrow */}
            {imagesToShow.length > 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % imagesToShow.length); setZoomLevel(1); }}
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            )}

            {/* Main lightbox image */}
            <div
              className="relative overflow-auto flex items-center justify-center"
              style={{ width: "min(90vw, 900px)", height: "min(90vh, 900px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getImageUrl(imagesToShow[lightboxIndex]?.url)}
                alt={`${product?.name} - ${lightboxIndex + 1}`}
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "center center",
                  transition: "transform 0.2s ease",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  cursor: zoomLevel > 1 ? "move" : "zoom-in",
                }}
                onClick={() => setZoomLevel((z) => z >= 3 ? 1 : z + 0.5)}
              />
            </div>

            {/* Thumbnail strip */}
            {imagesToShow.length > 1 && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[80vw] pb-1">
                {imagesToShow.map((img, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); setZoomLevel(1); }}
                    className={`relative w-12 h-12 shrink-0 overflow-hidden transition-all ${i === lightboxIndex ? "ring-2 ring-white opacity-100" : "opacity-40 hover:opacity-80"}`}
                  >
                    <img src={getImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  // Get image URL helper
  const getImageUrl = (image) => {
    if (!image) return "/images/product-placeholder.png";
    if (image.startsWith("http")) return image;
    return `https://desirediv-storage.blr1.cdn.digitaloceanspaces.com/${image}`;
  };

  // Calculate discount percentage
  const calculateDiscount = (regularPrice, salePrice) => {
    if (!regularPrice || !salePrice || regularPrice <= salePrice) return 0;
    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
  };

  // Calculate effective price based on quantity and pricing slabs (and flash sale)
  const getEffectivePrice = (variant, qty) => {
    if (!variant) return null;

    // Use flash sale price if product is in active flash sale
    const hasFlashSale = variant.flashSalePrice != null;
    const baseSalePrice = variant.salePrice
      ? (typeof variant.salePrice === 'string' ? parseFloat(variant.salePrice) : variant.salePrice)
      : null;
    const basePrice = variant.price
      ? (typeof variant.price === 'string' ? parseFloat(variant.price) : variant.price)
      : 0;
    const originalPrice = hasFlashSale
      ? (typeof variant.flashSaleOriginalPrice === 'string' ? parseFloat(variant.flashSaleOriginalPrice) : variant.flashSaleOriginalPrice)
      : baseSalePrice || basePrice;
    const displayBasePrice = hasFlashSale
      ? (typeof variant.flashSalePrice === 'string' ? parseFloat(variant.flashSalePrice) : variant.flashSalePrice)
      : baseSalePrice || basePrice;

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

    // Return default price (with flash sale if applied)
    return {
      price: displayBasePrice,
      originalPrice: originalPrice,
      source: 'DEFAULT',
      slab: null
    };
  };

  // Format price display
  const getPriceDisplay = () => {
    // Show loading state while initial data is being fetched
    if (initialLoading) {
      return <div className="h-8 w-32 bg-gray-200 animate-pulse rounded"></div>;
    }

    // If price visibility settings are still loading, hide prices
    if (priceVisibilitySettings === null) {
      return (
        <div className="space-y-2">
          <span className="text-3xl md:text-4xl font-bold text-gray-400">
            Login to view price
          </span>
          <p className="text-sm text-gray-500">Please log in to see pricing information</p>
        </div>
      );
    }

    // If we have a selected variant, use its price with quantity-based pricing
    if (selectedVariant) {
      // Use cached price info or calculate fresh
      const priceInfo = effectivePriceInfo || getEffectivePrice(selectedVariant, quantity);

      if (!priceInfo) {
        return (
          <div className="space-y-2">
            <span className="text-3xl md:text-4xl font-bold text-gray-400">
              Price not available
            </span>
          </div>
        );
      }

      const effectivePrice = priceInfo.price;
      const originalPrice = priceInfo.originalPrice;
      const isSlabPrice = priceInfo.source === 'SLAB';

      // Calculate discount
      const discount = originalPrice > effectivePrice
        ? calculateDiscount(originalPrice, effectivePrice)
        : 0;

      // Check price visibility settings
      if (priceVisibilitySettings?.hidePricesForGuests && !isAuthenticated) {
        return (
          <div className="space-y-2">
            <span className="text-3xl md:text-4xl font-bold text-gray-400">
              Login to view price
            </span>
            <p className="text-sm text-gray-500">Please log in to see pricing information</p>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl md:text-4xl font-bold text-primary">
              {formatCurrency(effectivePrice)}
            </span>
            {originalPrice > effectivePrice && (
              <>
                <span className="text-xl md:text-2xl text-gray-500 line-through">
                  {formatCurrency(originalPrice)}
                </span>
                {discount > 0 && (
                  <span className="bg-red-500 text-white text-xs md:text-sm font-bold px-2 md:px-3 py-1 rounded">
                    {discount}% OFF
                  </span>
                )}
              </>
            )}
          </div>
          {isSlabPrice && quantity > 1 && (
            <p className="text-xs text-green-600 font-medium">
              Bulk pricing applied for {quantity} units
            </p>
          )}
          <p className="text-xs text-gray-500">Inclusive of all taxes</p>
        </div>
      );
    }

    // Fallback to product base price if no variant is selected
    if (product) {
      const basePrice = product.basePrice || 0;
      const regularPrice = product.regularPrice || 0;

      if (product.hasSale && basePrice > 0 && regularPrice > basePrice) {
        const discount = calculateDiscount(regularPrice, basePrice);

        // Check price visibility settings
        if (priceVisibilitySettings?.hidePricesForGuests && !isAuthenticated) {
          return (
            <div className="space-y-2">
              <span className="text-3xl md:text-4xl font-bold text-gray-400">
                Login to view price
              </span>
              <p className="text-sm text-gray-500">Please log in to see pricing information</p>
            </div>
          );
        }

        return (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl md:text-4xl font-bold text-primary">
                {formatCurrency(basePrice)}
              </span>
              <span className="text-xl md:text-2xl text-gray-500 line-through">
                {formatCurrency(regularPrice)}
              </span>
              {discount > 0 && (
                <span className="bg-red-500 text-white text-xs md:text-sm font-bold px-2 md:px-3 py-1 rounded">
                  {discount}% OFF
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">Inclusive of all taxes</p>
          </div>
        );
      }

      if (basePrice > 0) {
        // Check price visibility settings
        if (priceVisibilitySettings?.hidePricesForGuests && !isAuthenticated) {
          return (
            <div className="space-y-2">
              <span className="text-3xl md:text-4xl font-bold text-gray-400">
                Login to view price
              </span>
              <p className="text-sm text-gray-500">Please log in to see pricing information</p>
            </div>
          );
        }

        return (
          <div className="space-y-2">
            <span className="text-3xl md:text-4xl font-bold text-primary">
              {formatCurrency(basePrice)}
            </span>
            <p className="text-xs text-gray-500">Inclusive of all taxes</p>
          </div>
        );
      }
    }

    // Final fallback - show placeholder
    return (
      <div className="space-y-2">
        <span className="text-3xl md:text-4xl font-bold text-gray-400">
          Price not available
        </span>
      </div>
    );
  };

  // Handle add to wishlist
  const handleAddToWishlist = async () => {
    if (!isAuthenticated) {
      router.push(`/auth?redirect=/products/${slug}`);
      return;
    }

    setIsAddingToWishlist(true);

    try {
      if (isInWishlist) {
        // Get wishlist to find the item ID
        const wishlistResponse = await fetchApi("/users/wishlist", {
          credentials: "include",
        });

        const wishlistItem = wishlistResponse.data.wishlistItems.find(
          (item) => item.productId === product.id
        );

        if (wishlistItem) {
          await fetchApi(`/users/wishlist/${wishlistItem.id}`, {
            method: "DELETE",
            credentials: "include",
          });

          setIsInWishlist(false);
        }
      } else {
        // Add to wishlist
        await fetchApi("/users/wishlist", {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ productId: product.id }),
        });

        setIsInWishlist(true);
      }
    } catch (error) {
      console.error("Error updating wishlist:", error);
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  // Display loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="text-gray-600 text-lg">Loading product details...</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 p-6 rounded-lg shadow-sm border border-red-200 flex flex-col items-center text-center">
          <AlertCircle className="text-red-500 h-12 w-12 mb-4" />
          <h2 className="text-2xl font-semibold text-red-700 mb-2">
            Error Loading Product
          </h2>
          <p className="text-red-600 mb-6">{error}</p>
          <Link href="/products">
            <Button className="px-6">
              <ChevronRight className="mr-2 h-4 w-4" /> Browse Other Products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // If product not found
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 p-6 rounded-lg shadow-sm border border-yellow-200 flex flex-col items-center text-center">
          <AlertCircle className="text-yellow-500 h-12 w-12 mb-4" />
          <h2 className="text-2xl font-semibold text-yellow-700 mb-2">
            Product Not Found
          </h2>
          <p className="text-yellow-600 mb-6">
            The product you are looking for does not exist or has been removed.
          </p>
          <Link href="/products">
            <Button className="px-6">
              <ChevronRight className="mr-2 h-4 w-4" /> Browse Products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Updated render code for the product image carousel
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center text-xs sm:text-sm mb-6 md:mb-8 flex-wrap">
        <Link href="/" className="text-gray-500 hover:text-black transition-colors uppercase tracking-widest text-[10px] font-semibold">
          HOME
        </Link>
        <span className="mx-2 text-gray-300">/</span>
        <Link href="/products" className="text-gray-500 hover:text-black transition-colors uppercase tracking-widest text-[10px] font-semibold">
          PRODUCTS
        </Link>
        {(product?.category || product?.categories?.[0]?.category) && (
          <>
            <span className="mx-2 text-gray-300">/</span>
            <Link
              href={`/category/${product.category?.slug || product.categories[0]?.category?.slug
                }`}
              className="text-gray-500 hover:text-black transition-colors uppercase tracking-widest text-[10px] font-semibold"
            >
              {product.category?.name || product.categories[0]?.category?.name}
            </Link>
          </>
        )}
        <span className="mx-2 text-gray-300">/</span>
        <span className="text-black font-semibold uppercase tracking-widest text-[10px] truncate max-w-[200px] sm:max-w-none">{product?.name}</span>
      </div>

      {/* Product Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Images */}
        <div className="w-full">
          {loading ? (
            <div className="aspect-square w-full bg-gray-100 rounded-lg animate-pulse"></div>
          ) : error ? (
            <div className="aspect-square w-full bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center p-6">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          ) : (
            renderImages()
          )}
        </div>

        {/* Right Column - Product Details */}
        <div className="flex flex-col lg:pl-10">
          {/* Brand name (show plain text regardless of shape) */}
          {product.brand && (
            <Link
              href={`/brand/${product.brand.slug}`}
              className="text-gray-500 uppercase tracking-widest text-[10px] font-semibold mb-3 hover:text-black"
            >
              {product.brand?.name ?? product.brand ?? product.brandName ?? ""}
            </Link>
          )}

          {/* Product name */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-normal mb-4 font-serif text-[#3D1C02]">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center mb-6">
            <div className="flex text-yellow-500 mr-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4"
                  fill={
                    i < Math.round(product.avgRating || 0)
                      ? "currentColor"
                      : "none"
                  }
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {product.avgRating
                ? `${product.avgRating} (${product.reviewCount} reviews)`
                : "No reviews yet"}
            </span>
          </div>

          {/* Price */}
          <div className="mb-8">{getPriceDisplay()}</div>

          {/* Short Description */}
          {product.shortDescription && (
            <div className="mb-8">
              <p className="text-gray-700">
                {product.shortDescription ||
                  product.description?.substring(0, 150)}
                {product.description?.length > 150 &&
                  !product.shortDescription &&
                  "..."}
              </p>
            </div>
          )}

          {/* Dynamic Attribute Selection */}
          {product.attributeOptions && product.attributeOptions.length > 0 && (
            <div className="space-y-0 mb-8">
              {product.attributeOptions.map((attribute) => {
                const availableValues = getAvailableValuesForAttribute(attribute.id);
                const selectedValueId = selectedAttributes[attribute.id];

                return (
                  <div key={attribute.id} className="py-6 border-t border-gray-200">
                    <h3 className="text-xs font-semibold mb-4 text-gray-900 uppercase tracking-widest">
                      {attribute.name}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {availableValues.length > 0 ? (
                        availableValues.map((value) => {
                          const isSelected = selectedValueId === value.id;
                          const isAvailable = true; // Values are already filtered

                          return (
                            <button
                              key={value.id}
                              className={`px-6 py-3 border text-sm font-medium transition-all ${isSelected
                                ? "border-black bg-black text-white"
                                : isAvailable
                                  ? "border-gray-300 hover:border-black text-gray-700 bg-white"
                                  : "border-gray-200 text-gray-400 cursor-not-allowed"
                                }`}
                              onClick={() => isAvailable && handleAttributeChange(attribute.id, value.id)}
                              disabled={!isAvailable}
                              title={value.value}
                            >
                              {value.value}
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-500">
                          No {attribute.name.toLowerCase()} options available
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Success/Error Messages */}
          {cartSuccess && (
            <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-md flex items-center border border-green-200">
              <CheckCircle className="h-4 w-4 mr-2" />
              Item successfully added to your cart!
            </div>
          )}

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
                        <td className="py-2 px-3 text-right font-medium text-primary">
                          {formatCurrency(slab.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stock Status */}
          <div className="mb-4 max-w-[150px] flex px-2 py-1">
            {selectedVariant && (selectedVariant.stock > 0 || selectedVariant.quantity > 0) && (
              <div className="p-2 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                In Stock
              </div>
            )}
            {selectedVariant && (selectedVariant.stock === 0 || selectedVariant.quantity === 0) && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                Out of stock
              </div>
            )}
          </div>

          {/* Quantity Selector */}
          <div className="mb-8 pt-6 border-t border-gray-200">
            <h3 className="text-xs font-semibold mb-4 text-gray-900 uppercase tracking-widest">Quantity</h3>
            <div className="flex items-center border border-gray-300 w-32 h-12">
              <button
                className="flex-1 h-full flex justify-center items-center hover:bg-gray-50 transition-colors disabled:opacity-50 text-gray-500"
                onClick={() => handleQuantityChange(-1)}
                disabled={
                  quantity <= (selectedVariant?.moq || 1) || isAddingToCart
                }
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="flex-1 text-center font-medium text-gray-900">
                {quantity}
              </span>
              <button
                className="flex-1 h-full flex justify-center items-center hover:bg-gray-50 transition-colors disabled:opacity-50 text-gray-500"
                onClick={() => handleQuantityChange(1)}
                disabled={
                  (selectedVariant &&
                    (selectedVariant.stock > 0 || selectedVariant.quantity > 0) &&
                    quantity >= (selectedVariant.stock || selectedVariant.quantity)) ||
                  isAddingToCart
                }
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <Button
              className="flex-1 flex items-center justify-center gap-2 py-7 text-sm bg-black hover:bg-gray-900 text-white rounded-none font-semibold uppercase tracking-widest transition-all"
              size="lg"
              onClick={handleAddToCart}
              disabled={
                isAddingToCart ||
                (selectedVariant && selectedVariant.quantity < 1) ||
                (!selectedVariant &&
                  (!product?.variants ||
                    product.variants.length === 0 ||
                    product.variants[0].quantity < 1))
              }
            >
              {isAddingToCart ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adding...
                </>
              ) : (
                <>
                  ADD TO CART
                </>
              )}
            </Button>


            <Button
              variant="outline"
              className={`rounded-none h-auto py-2 px-4 border border-gray-300 transition-all ${isInWishlist
                ? "text-red-600 border-red-600 hover:bg-red-50"
                : "hover:border-black hover:text-black "
                }`}
              onClick={handleAddToWishlist}
              disabled={isAddingToWishlist}
            >
              <Heart
                className={`h-6 w-6 text-black ${isInWishlist ? "fill-current text-red-600" : ""}`}
              />
            </Button>
          </div>

          {/* Handcrafted Product Disclaimer */}
          <div className="mb-6 p-4 border border-[#e5e0da] bg-[#FDFBF7] text-gray-700 text-xs leading-relaxed font-roboto">
            <p className="font-semibold text-[10px] uppercase tracking-wider text-[#3D1C02] mb-1.5 font-jost flex items-center gap-1.5">
              <AlertCircle size={12} className="text-[#C9A84C]" /> Handcrafted Product Notice
            </p>
            Every Wool Jute Rug Co. rug is individually handcrafted. Slight variations in color, size, texture, weave and pattern are natural characteristics of handmade rugs and enhance their uniqueness and authenticity. These variations are not defects and are not eligible for return or refund.
          </div>

          {/* Product Metadata */}
          <div className="border-t border-gray-200 pt-5 space-y-3 text-sm">
            {selectedVariant && selectedVariant.sku && (
              <div className="flex">
                <span className="font-medium w-32 text-gray-700">SKU:</span>
                <span className="text-gray-600">{selectedVariant.sku}</span>
              </div>
            )}

            {product.category && (
              <div className="flex">
                <span className="font-medium w-32 text-gray-700">
                  Category:
                </span>
                <Link
                  href={`/category/${product.category?.slug}`}
                  className="text-primary hover:underline"
                >
                  {product.category?.name}
                </Link>
              </div>
            )}

            {/* Subcategory — show only if there's at least one assigned subcategory */}
            {product.subCategories && product.subCategories.length > 0 && product.subCategories.some(sc => sc?.subCategory?.name || sc?.name || sc) && (
              <div className="flex flex-wrap gap-y-1">
                <span className="font-medium w-32 text-gray-700">Sub-Category:</span>
                <div className="flex flex-wrap gap-1">
                  {product.subCategories.map((sc, idx) => {
                    const name = sc?.subCategory?.name || sc?.name || sc;
                    const slug = sc?.subCategory?.slug || sc?.slug || "";
                    return slug ? (
                      <Link
                        key={idx}
                        href={`/products?category=${product.category?.slug || ""}&subcategory=${slug}`}
                        className="text-primary hover:underline"
                      >
                        {name}{idx < product.subCategories.length - 1 ? "," : ""}
                      </Link>
                    ) : (
                      <span key={idx} className="text-gray-600">{name}{idx < product.subCategories.length - 1 ? ", " : ""}</span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fallback: categories array — show only if at least one category has a subCategory */}
            {!product.subCategories && product.categories && product.categories.some((c) => c.subCategory) && (
              <div className="flex flex-wrap gap-y-1">
                <span className="font-medium w-32 text-gray-700">Sub-Category:</span>
                <div className="flex flex-wrap gap-1">
                  {product.categories
                    .filter((c) => c.subCategory)
                    .map((c, idx, arr) => {
                      const name = c.subCategory?.name;
                      const slug = c.subCategory?.slug;
                      return slug ? (
                        <Link
                          key={idx}
                          href={`/products?category=${product.category?.slug || ""}&subcategory=${slug}`}
                          className="text-primary hover:underline"
                        >
                          {name}{idx < arr.length - 1 ? "," : ""}
                        </Link>
                      ) : (
                        <span key={idx} className="text-gray-600">{name}{idx < arr.length - 1 ? ", " : ""}</span>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Status badges: Ready to Ship / Accept Orders / Customizable */}
          {(product.readyToShip || product.acceptOrders || product.isCustomizable) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {product.readyToShip && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                  <IconTruckDelivery size={15} stroke={1.8} />
                  Ready to Ship
                </span>
              )}
              {product.acceptOrders && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                  <IconShoppingBag size={15} stroke={1.8} />
                  Possible Orders
                </span>
              )}
              {product.isCustomizable && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
                  <IconPalette size={15} stroke={1.8} />
                  Customizable
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <IconTag size={14} className="text-gray-400 flex-shrink-0" />
              {product.tags.map((tag) => (
                <span key={tag} className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Product Accordions */}
          <div className="mt-8">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="product-details">
                <AccordionTrigger className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-900 py-6">Product Details</AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm max-w-none text-gray-600 pb-6 pt-2 text-sm leading-relaxed">
                    <div dangerouslySetInnerHTML={{ __html: stripInlineStyles(product.description || "") }} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {product.washingAndCare && (
                <AccordionItem value="washing-care">
                  <AccordionTrigger className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-900 py-6">Washing & Care</AccordionTrigger>
                  <AccordionContent>
                    <WashingCareList raw={product.washingAndCare} />
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem value="shipping">
                <AccordionTrigger className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-900 py-6">Shipping & Returns</AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm max-w-none text-gray-600 pb-6 pt-2 text-sm leading-relaxed">
                    {product.shippingAndReturns
                      ? <div dangerouslySetInnerHTML={{ __html: stripInlineStyles(product.shippingAndReturns) }} />
                      : <p>3-5 business days (standard shipping)<br />Free shipping on all orders above ₹999<br />30 days return window from the date of delivery.</p>
                    }
                  </div>
                </AccordionContent>
              </AccordionItem>

              {product.aboutThisDesign && (
                <AccordionItem value="about-design">
                  <AccordionTrigger className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-900 py-6">About This Design</AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm max-w-none text-gray-600 pb-6 pt-2 text-sm leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: stripInlineStyles(product.aboutThisDesign) }} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

            </Accordion>
          </div>
        </div>
      </div>

      {/* Reviews — full width below product detail */}
      <div className="mt-16 pt-12 border-t border-gray-200">
        <ReviewSection product={product} />
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="mt-16 pt-12 border-t border-gray-200">
          <div className="text-center mb-10">
            <p className="text-xs tracking-[0.3em] uppercase mb-2 font-medium" style={{ color: "#C9A84C" }}>Discover More</p>
            <h2 className="text-2xl md:text-3xl font-light tracking-widest uppercase" style={{ color: "#3D1C02" }}>
              Similar Products
            </h2>
            <div className="w-12 h-px mx-auto mt-4" style={{ backgroundColor: "#C9A84C" }} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.map((product) => {
              // Get image from lowest weight variant, or fallback
              const getRelatedProductImage = (product) => {
                if (product.variants && product.variants.length > 0) {
                  let selectedVariant = product.variants.reduce((min, v) => {
                    if (!v.weight || typeof v.weight.value !== "number")
                      return min;
                    if (
                      !min ||
                      (min.weight && v.weight.value < min.weight.value)
                    )
                      return v;
                    return min;
                  }, null);
                  if (!selectedVariant) selectedVariant = product.variants[0];
                  if (
                    selectedVariant.images &&
                    selectedVariant.images.length > 0
                  ) {
                    const primaryImg = selectedVariant.images.find(
                      (img) => img.isPrimary
                    );
                    if (primaryImg && primaryImg.url)
                      return getImageUrl(primaryImg.url);
                    if (selectedVariant.images[0].url)
                      return getImageUrl(selectedVariant.images[0].url);
                  }
                }
                if (product.image) return getImageUrl(product.image);
                return "/product-placeholder.png";
              };
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group block bg-white overflow-hidden"
                >
                  <div className="relative aspect-square w-full bg-[#F7F5F2] overflow-hidden">
                    <Image
                      src={getRelatedProductImage(product)}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    {product.hasSale && (
                      <span className="absolute top-3 left-3 text-white text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1" style={{ backgroundColor: "#3D1C02" }}>
                        Sale
                      </span>
                    )}
                  </div>

                  <div className="pt-3 pb-4">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-1.5 group-hover:underline underline-offset-2 transition-all">
                      {product.name}
                    </h3>
                    {product.avgRating > 0 && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <div className="flex text-[#FFA41C]">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-3 w-3" fill={i < Math.round(product.avgRating || 0) ? "currentColor" : "none"} />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">({product.reviewCount || 0})</span>
                      </div>
                    )}
                    <div>
                      {product.hasSale ? (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#136C5B]">{formatCurrency(product.basePrice)}</span>
                          <span className="text-gray-400 line-through text-sm">{formatCurrency(product.regularPrice)}</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-900">{formatCurrency(product.basePrice)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
