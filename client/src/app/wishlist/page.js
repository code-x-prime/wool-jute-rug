"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/components/client-only";
import { DynamicIcon } from "@/components/dynamic-icon";
import { fetchApi, formatCurrency } from "@/lib/utils";
import Image from "next/image";
import { Eye, Heart, Star } from "lucide-react";
import ProductQuickView from "@/components/ProductQuickView";

// Helper function to format image URLs correctly
const getImageUrl = (image) => {
  if (!image) return "/placeholder.png";
  if (image.startsWith("http")) return image;
  return `https://desirediv-storage.blr1.digitaloceanspaces.com/${image}`;
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loadingItems ? (
          <div className="bg-white rounded-lg shadow p-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <DynamicIcon
              name="Heart"
              className="h-16 w-16 mx-auto text-gray-400 mb-4"
            />
            <h2 className="text-xl font-semibold mb-2">
              Your Wishlist is Empty
            </h2>
            <p className="text-gray-600 mb-6">
              Save your favorite items to your wishlist for easy access later.
            </p>
            <Link href="/products">
              <Button>Explore Products</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {wishlistItems.map((product) => (
              <div
                key={product.id}
                className="bg-white overflow-hidden transition-all hover:shadow-lg shadow-md rounded-sm group h-full"
              >
                <Link href={`/products/${product.slug}`}>
                  <div className="relative h-64 w-full  overflow-hidden">
                    <Image
                      src={getImageUrl(product.image || product.images?.[0])}
                      alt={product.name}
                      fill
                      className="object-contain px-4 transition-transform group-hover:scale-100 scale-95"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />

                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 backdrop-blur-[2px] flex justify-center py-3 translate-y-full group-hover:translate-y-0 transition-transform">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:text-white hover:bg-primary/80 rounded-full p-2"
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
                        <Heart className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </Link>

                <div className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="flex text-yellow-400">
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
                    <span className="text-xs text-gray-500 ml-2">
                      ({product.reviewCount || 0})
                    </span>
                  </div>

                  <Link
                    href={`/products/${product.slug}`}
                    className="hover:text-primary"
                  >
                    <h3 className="font-medium uppercase mb-2 line-clamp-2 text-sm">
                      {product.name}
                    </h3>
                  </Link>

                  {(product.price != null || product.regularPrice != null) && (
                    <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                      <span className="font-bold text-gray-900">
                        {formatCurrency(product.price ?? product.regularPrice)}
                      </span>
                      {product.hasSale && product.regularPrice > product.price && (
                        <span className="text-gray-400 line-through text-sm">
                          {formatCurrency(product.regularPrice)}
                        </span>
                      )}
                    </div>
                  )}

                  {product.variants && product.variants.length > 1 && (
                    <span className="text-xs text-gray-500 block mb-3">
                      {product.variants.length} variants
                    </span>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                    onClick={() => removeFromWishlist(product.id)}
                  >
                    Remove from Wishlist
                  </Button>
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
