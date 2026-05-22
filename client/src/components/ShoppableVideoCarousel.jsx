"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchApi, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Eye, Play } from "lucide-react";

// Parse YouTube URL and return embed URL
function getYouTubeEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  const shortsMatch = u.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  const shortMatch = u.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const watchMatch = u.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  if (u.includes("youtube.com/embed/")) return u;
  return null;
}

// Parse Instagram URL and return embed URL (reel or post)
function getInstagramEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  const reelMatch = u.match(/instagram\.com\/reel\/([a-zA-Z0-9_-]+)/);
  if (reelMatch) return `https://www.instagram.com/reel/${reelMatch[1]}/embed`;
  const pMatch = u.match(/instagram\.com\/p\/([a-zA-Z0-9_-]+)/);
  if (pMatch) return `https://www.instagram.com/p/${pMatch[1]}/embed`;
  return null;
}
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

// Skeleton loader for carousel
const CarouselSkeleton = () => (
  <div className="w-full overflow-hidden py-6">
    <div className="flex gap-4 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[280px] animate-pulse"
        >
          <div className="aspect-[9/16] bg-gray-200 rounded-xl" />
          <div className="mt-3 flex gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function ShoppableVideoCarousel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [api, setApi] = useState(null);
  const [priceVisibilitySettings, setPriceVisibilitySettings] = useState(null);
  const { isAuthenticated } = useAuth();
  const autoScrollRef = useRef(null);

  // Fetch price visibility settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetchApi("/public/price-visibility-settings");
        if (response?.success && response?.data) {
          setPriceVisibilitySettings(response.data);
        } else {
          setPriceVisibilitySettings({ hidePricesForGuests: false });
        }
      } catch (err) {
        setPriceVisibilitySettings({ hidePricesForGuests: false });
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchCarousel = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchApi("/public/shoppable-carousel", {
          credentials: "include",
        });

        if (response?.success && response?.data) {
          const { carousel, items } = response.data;
          if (carousel && items?.length > 0) {
            setData({ carousel, items });
          } else {
            setData(null);
          }
        } else {
          setData(null);
        }
      } catch (err) {
        console.error("Shoppable carousel fetch error:", err);
        setError(err?.message || "Failed to load");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCarousel();
  }, []);

  // Auto-scroll when enabled
  useEffect(() => {
    if (!data?.carousel?.autoScroll || !data?.items?.length || !api) return;

    autoScrollRef.current = setInterval(() => {
      if (api) api.scrollNext();
    }, 5000);

    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [data?.carousel?.autoScroll, data?.items?.length, api]);

  if (loading) {
    return (
      <section className="py-6 md:py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">
            Shoppable Video
          </h2>
          <CarouselSkeleton />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-6 md:py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-8 rounded-lg bg-red-50 border border-red-100">
            <p className="text-red-600">Unable to load shoppable videos. Please try again later.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!data || !data.items?.length) {
    return null;
  }

  const { carousel, items } = data;

  return (
    <section className="py-6 md:py-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">
          Shoppable Video
        </h2>

        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: true,
            dragFree: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {items.map((item) => (
              <CarouselItem
                key={item.id}
                className="pl-4 basis-[280px] md:basis-[300px] flex-shrink-0"
              >
                <div className="rounded-xl overflow-hidden bg-white shadow-md border border-gray-100">
                  {/* Media section - 9:16 portrait */}
                  <div className="relative aspect-[9/16] bg-gray-900 overflow-hidden">
                    {item.mediaType === "UPLOAD" && item.mediaUrl ? (
                      item.mediaUrl.match(/\.(mp4|webm)/i) ? (
                        <video
                          src={item.mediaUrl}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <img
                          src={item.mediaUrl}
                          alt={item.product?.name || "Product"}
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : item.mediaType === "YOUTUBE" && item.mediaUrl ? (
                      (() => {
                        const embedUrl = getYouTubeEmbedUrl(item.mediaUrl);
                        return embedUrl ? (
                          <iframe
                            src={embedUrl}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="YouTube"
                          />
                        ) : (
                          <a
                            href={item.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-full flex items-center justify-center bg-red-600 text-white hover:bg-red-700"
                          >
                            Watch on YouTube
                          </a>
                        );
                      })()
                    ) : item.mediaType === "INSTAGRAM" && item.mediaUrl ? (
                      (() => {
                        const embedUrl = getInstagramEmbedUrl(item.mediaUrl);
                        return embedUrl ? (
                          <iframe
                            src={embedUrl}
                            className="w-full h-full min-h-[400px]"
                            allow="encrypted-media"
                            allowFullScreen
                            title="Instagram"
                          />
                        ) : (
                          <a
                            href={item.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                          >
                            <span>View on Instagram</span>
                          </a>
                        );
                      })()
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No media
                      </div>
                    )}

                    {/* View count overlay */}
                    {item.viewCount > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 text-white text-xs">
                        <Eye className="h-3 w-3" />
                        {item.viewCount >= 1000
                          ? `${(item.viewCount / 1000).toFixed(1)}k`
                          : item.viewCount}
                      </div>
                    )}

                    {/* Play button overlay (for video) */}
                    {item.mediaType === "UPLOAD" && item.mediaUrl?.match(/\.(mp4|webm)/i) && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="h-6 w-6 text-gray-900 fill-gray-900 ml-1" />
                        </div>
                      </div>
                    )}

                    {/* Text overlay */}
                    {item.textOverlay && (
                      <div className="absolute bottom-4 left-4 right-4 text-white text-sm font-medium drop-shadow-lg">
                        {item.textOverlay}
                      </div>
                    )}
                  </div>

                  {/* Product info bar */}
                  <div className="p-3 flex items-center gap-3">
                    {item.product ? (
                      <>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {item.product.name}
                          </p>
                          <div className="flex items-center gap-2 text-sm">
                            {priceVisibilitySettings?.hidePricesForGuests && !isAuthenticated ? (
                              <span className="font-semibold text-gray-400">
                                Login to view price
                              </span>
                            ) : (
                              <>
                                <span className="font-bold text-gray-900">
                                  {formatCurrency(item.product.price)}
                                </span>
                                {item.product.originalPrice > item.product.price && (
                                  <>
                                    <span className="text-gray-400 line-through">
                                      {formatCurrency(item.product.originalPrice)}
                                    </span>
                                    <span className="text-green-600 font-medium">
                                      {Math.round(
                                        (1 - item.product.price / item.product.originalPrice) * 100
                                      )}
                                      % OFF
                                    </span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <Link
                          href={item.product.slug ? `/products/${item.product.slug}` : "/products"}
                        >
                          <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium">
                            View
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <div className="flex-1 text-gray-500 text-sm">
                        No product linked
                      </div>
                    )}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg border border-gray-200" />
          <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg border border-gray-200" />
        </Carousel>
      </div>
    </section>
  );
}
