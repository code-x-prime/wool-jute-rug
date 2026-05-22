"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

import { fetchApi } from "@/lib/utils";

const VerticalCategoriesCarousel = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [api, setApi] = useState(null);

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

  // Category Card Component
  const CategoryCard = ({ category, index }) => {
    const isOffers =
      category.name?.toLowerCase().includes("offer") ||
      category.slug === "offers";

    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.03 }}
        viewport={{ once: true }}
        className="flex items-start group cursor-pointer flex-col justify-center"
      >
        <motion.div
          className="relative bg-white rounded-xl p-1 mb-2 w-[64px] h-[64px] sm:w-[70px] sm:h-[70px] flex items-center justify-center  shadow group-hover:shadow-md border border-gray-100 overflow-hidden transition-all duration-200"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          {isOffers ? (
            <div className="relative">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow">
                <span className="text-white text-lg sm:text-xl font-bold">
                  %
                </span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">!</span>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full overflow-hidden bg-gray-50 flex items-center justify-center">
              <Image
                src={category.image || "/placeholder.png"}
                alt={category.name || "Category"}
                width={200}
                height={200}
                className="object-contain w-10 h-10 sm:w-14 sm:h-14"
                loading="lazy"
              />
            </div>
          )}
        </motion.div>
        <div className="ml-3 flex-1">
          <h3 className="text-[10px] sm:text-xs font-medium text-gray-700 group-hover:text-blue-600 transition-colors duration-200 leading-tight">
            {category.name}
          </h3>
        </div>
      </motion.div>
    );
  };

  // Skeleton Loader
  const SkeletonLoader = () => (
    <div className="flex flex-col gap-3">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="flex items-center animate-pulse">
          <div className="bg-gray-200 rounded-xl w-[64px] h-[64px] sm:w-[70px] sm:h-[70px]"></div>
          <div className="ml-3 flex-1">
            <div className="h-3 bg-gray-200 rounded w-20 sm:w-24 mb-1"></div>
            <div className="h-2 bg-gray-200 rounded w-16 sm:w-20"></div>
          </div>
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
      <div className="w-min bg-white rounded-lg shadow-sm border border-gray-100 p-1">
        <SkeletonLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-min bg-white rounded-lg shadow-sm border border-gray-100 p-1">
        <div className="text-center py-8">
          <p className="text-red-500 mb-4 text-sm">Error: {error}</p>
          <button
            onClick={handleRetry}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="w-min bg-white rounded-lg shadow-sm border border-gray-100 p-1">
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No categories available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-min bg-white rounded-lg shadow-sm border border-gray-100 p-1">
      <div className="relative">
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: false,
            skipSnaps: false,
            dragFree: true,
            direction: "vertical",
          }}
          orientation="vertical"
          className="w-min"
        >
          <CarouselContent className="-mt-1 flex flex-col gap-2 h-[70vh]">
            {categories.map((category, index) => (
              <CarouselItem
                key={category.id}
                className="pt-1 basis-auto flex-shrink-0"
              >
                <Link href={`/category/${category.slug}`} className="block">
                  <CategoryCard category={category} index={index} />
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
};

export default VerticalCategoriesCarousel;
