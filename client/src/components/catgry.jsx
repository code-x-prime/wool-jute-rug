"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

import { fetchApi } from "@/lib/utils";

const CategoriesCarousel = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [api, setApi] = useState(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchApi("/public/categories");

        if (response.success && response.data?.categories) {
          setCategories(response.data.categories);
        } else {
          setError(response.message || "Failed to fetch categories");
        }
      } catch (err) {
        console.error("Error loading categories:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch categories"
        );
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  // Carousel navigation
  useEffect(() => {
    if (!api) return;

    const updateButtons = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };

    api.on("select", updateButtons);
    updateButtons();

    return () => api.off("select", updateButtons);
  }, [api]);

  // Category Card Component
  const CategoryCard = ({ category, index }) => {
    const isOffers =
      category.name?.toLowerCase().includes("offer") ||
      category.slug === "offers";

    const getImageUrl = (image) => {
      if (!image) return "/placeholder.png";
      if (image.startsWith("http")) return image;
      return `https://desirediv-storage.blr1.digitaloceanspaces.com/${image}`;
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.03 }}
        viewport={{ once: true }}
        className="flex flex-col items-center group cursor-pointer"
      >
        <motion.div
          className="relative bg-white rounded-2xl p-3 mb-2 w-[90px] h-[90px] sm:w-[110px] sm:h-[110px] md:w-[120px] md:h-[120px] flex items-center justify-center shadow-sm group-hover:shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 group-hover:border-[#136C5B]/30"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          {isOffers ? (
            <div className="relative w-full h-full">
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white text-2xl sm:text-3xl font-bold">
                  %
                </span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-gray-50 to-white rounded-xl flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-[#136C5B]/5 group-hover:to-white transition-all duration-300">
              <Image
                src={getImageUrl(category.image)}
                alt={category.name || "Category"}
                width={200}
                height={200}
                className="object-contain w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />
            </div>
          )}
        </motion.div>
        <div className="text-center px-1 mt-1 max-w-[90px] sm:max-w-[110px] md:max-w-[120px]">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-800 group-hover:text-[#136C5B] transition-colors duration-300 leading-tight line-clamp-2">
            {category.name}
          </h3>
        </div>
      </motion.div>
    );
  };

  // Skeleton Loader
  const SkeletonLoader = () => (
    <div className="flex justify-center gap-4 md:gap-6 overflow-x-auto pb-4">
      {[...Array(8)].map((_, index) => (
        <div
          key={index}
          className="flex flex-col items-center animate-pulse flex-shrink-0"
        >
          <div className="bg-gray-200 rounded-2xl w-[90px] h-[90px] sm:w-[110px] sm:h-[110px] md:w-[120px] md:h-[120px] mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-16 sm:w-20 md:w-24"></div>
        </div>
      ))}
    </div>
  );

  // Retry function
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Re-trigger the useEffect
    window.location.reload();
  };

  if (loading) {
    return (
      <section className="py-3 md:py-5 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4">
          <SkeletonLoader />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-3 md:py-5 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center py-8">
            <p className="text-red-500 mb-4 text-sm">Error: {error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-[#136C5B] text-white rounded-lg hover:bg-[#0f5a4a] transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  const needsCarousel = categories.length > 8;

  return (
    <section className="py-3 md:py-5 bg-white border-b border-gray-100">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="relative">
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: false,
              skipSnaps: false,
              dragFree: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4 flex gap-3 md:gap-6">
              {categories.map((category, index) => (
                <CarouselItem
                  key={category.id}
                  className="pl-2 md:pl-4 basis-[90px] sm:basis-[110px] md:basis-[120px] flex-shrink-0"
                >
                  <Link href={`/category/${category.slug}`} className="block">
                    <CategoryCard category={category} index={index} />
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>

            {needsCarousel && (
              <>
                <CarouselPrevious
                  className={`absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 bg-white border-2 border-gray-200 shadow-lg hover:bg-[#136C5B] hover:border-[#136C5B] hidden md:flex hover:text-white transition-all duration-300 w-10 h-10 p-0 text-gray-600 z-10 ${!canScrollPrev
                    ? "opacity-0 pointer-events-none"
                    : "opacity-100"
                    }`}
                />
                <CarouselNext
                  className={`absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 bg-white border-2 border-gray-200 shadow-lg hover:bg-[#136C5B] hover:border-[#136C5B] hidden md:flex hover:text-white transition-all duration-300 w-10 h-10 p-0 text-gray-600 z-10 ${!canScrollNext
                    ? "opacity-0 pointer-events-none"
                    : "opacity-100"
                    }`}
                />
              </>
            )}
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default CategoriesCarousel;
