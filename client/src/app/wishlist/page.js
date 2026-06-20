"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/components/client-only";
import { fetchApi, formatCurrency } from "@/lib/utils";
import Image from "next/image";
import { Eye, Heart, Star } from "lucide-react";
import ProductQuickView from "@/components/ProductQuickView";

// Helper function to format image URLs correctly
const getImageUrl = (image) => {
  if (!image) return "/placeholder.png";
  if (image.startsWith("http")) return image;
  const base = process.env.NEXT_PUBLIC_STORAGE_URL || "https://desirediv-storage.blr1.digitaloceanspaces.com";
  return `${base}/${image}`;
};

export default function WishlistPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [wishlistItems, setWishlistItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [error, setError] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth?redirect=/wishlist");
    }
  }, [isAuthenticated, loading, router]);

  // Fetch wishlist items
  useEffect(() => {
    const fetchWishlist = async () => {
      if (!isAuthenticated) return;

      setLoadingItems(true);
      setError("");

      try {
        const response = await fetchApi("/users/wishlist", {
          credentials: "include",
        });

        setWishlistItems(response.data.wishlistItems || []);
      } catch (error) {
        console.error("Failed to fetch wishlist:", error);
        setError("Failed to load your wishlist. Please try again later.");
      } finally {
        setLoadingItems(false);
      }
    };

    fetchWishlist();
  }, [isAuthenticated]);

  // Remove item from wishlist
  const removeFromWishlist = async (wishlistItemId) => {
    try {
      await fetchApi(`/users/wishlist/${wishlistItemId}`, {
        method: "DELETE",
        credentials: "include",
      });

      // Remove the item from state
      setWishlistItems((current) =>
        current.filter((item) => item.id !== wishlistItemId)
      );
    } catch (error) {
      console.error("Failed to remove item from wishlist:", error);
      setError("Failed to remove item. Please try again.");
    }
  };

  const handleQuickView = (product) => {
    setQuickViewProduct(product);
    setQuickViewOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C9A84C]"></div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="container mx-auto py-10 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-wide text-[#3D1C02]">My Wishlist</h1>
          <div className="h-0.5 w-12 bg-[#C9A84C] mt-2" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {loadingItems ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C9A84C]"></div>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <Heart className="h-14 w-14 mx-auto text-[#C9A84C]/30 mb-4 stroke-[1.5]" />
            <h2 className="text-lg font-light tracking-wide text-[#3D1C02] mb-2">
              Your Wishlist is Empty
            </h2>
            <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
              Save your favorite pieces to your wishlist for easy access later.
            </p>
            <Link href="/products">
              <Button
                variant="outline"
                className="border border-[#3D1C02] text-[#3D1C02] bg-transparent hover:bg-[#3D1C02] hover:text-white transition-colors rounded-lg px-8 text-sm font-medium tracking-wide"
              >
                Explore Collection
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {wishlistItems.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group h-full flex flex-col"
              >
                <Link href={`/products/${product.slug}`}>
                  <div className="relative h-56 w-full overflow-hidden bg-gray-50">
                    <Image
                      src={getImageUrl(product.image || product.images?.[0])}
                      alt={product.name}
                      fill
                      className="object-contain px-4 transition-transform group-hover:scale-105 scale-100"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />

                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 backdrop-blur-[2px] flex justify-center py-3 translate-y-full group-hover:translate-y-0 transition-transform">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:text-white hover:bg-[#C9A84C]/80 rounded-full p-2"
                        onClick={(e) => {
                          e.preventDefault();
                          handleQuickView(product);
                        }}
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:text-white hover:bg-red-500/80 rounded-full p-2 mx-2"
                        onClick={(e) => {
                          e.preventDefault();
                          removeFromWishlist(product.id);
                        }}
                      >
                        <Heart className="h-5 w-5 fill-current" />
                      </Button>
                    </div>
                  </div>
                </Link>

                <div className="p-4 text-center flex flex-col flex-1">
                  <div className="flex items-center justify-center mb-2">
                    <div className="flex text-[#C9A84C]">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-3.5 w-3.5"
                          fill={
                            i < Math.round(product.avgRating || 0)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 ml-1.5">
                      ({product.reviewCount || 0})
                    </span>
                  </div>

                  <Link
                    href={`/products/${product.slug}`}
                    className="hover:text-[#C9A84C] transition-colors"
                  >
                    <h3 className="text-sm font-medium text-[#3D1C02] line-clamp-2 mb-2 leading-snug">
                      {product.name}
                    </h3>
                  </Link>

                  {(product.price != null || product.regularPrice != null) && (
                    <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                      <span className="font-semibold text-[#3D1C02] text-sm">
                        {formatCurrency(product.price ?? product.regularPrice)}
                      </span>
                      {product.hasSale && product.regularPrice > product.price && (
                        <span className="text-gray-400 line-through text-xs">
                          {formatCurrency(product.regularPrice)}
                        </span>
                      )}
                    </div>
                  )}

                  {product.variants && product.variants.length > 1 && (
                    <span className="text-xs text-gray-400 block mb-3">
                      {product.variants.length} variants
                    </span>
                  )}

                  <div className="mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors rounded-lg"
                      onClick={() => removeFromWishlist(product.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Quick View Dialog */}
        <ProductQuickView
          product={quickViewProduct}
          open={quickViewOpen}
          onOpenChange={setQuickViewOpen}
        />
      </div>
    </ClientOnly>
  );
}
