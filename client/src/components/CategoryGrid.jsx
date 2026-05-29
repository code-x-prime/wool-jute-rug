"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchApi } from "@/lib/utils";

const getImageUrl = (image) => {
  if (!image) return "/placeholder.png";
  if (image.startsWith("http")) return image;
  return `https://desirediv-storage.blr1.digitaloceanspaces.com/${image}`;
};

const CategoryCard = ({ category }) => {
  return (
    <div className="flex flex-col items-center group cursor-pointer w-full">
      <div className="relative w-full aspect-[4/5] mb-4 overflow-hidden bg-[#f9f9f9] flex items-center justify-center transition-all duration-300 shadow-sm group-hover:shadow-md">
        <Image
          src={getImageUrl(category.image)}
          alt={category.name || "Category"}
          fill
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 16vw"
        />
      </div>
      <div className="text-center px-1">
        <h3 className="text-sm md:text-[15px] font-jost text-[#1a1a1a] pb-1 border-b border-transparent group-hover:border-[#1a1a1a] transition-all duration-300 inline-block tracking-wide">
          {category.name}
        </h3>
      </div>
    </div>
  );
};

const SkeletonLoader = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8">
    {[...Array(5)].map((_, index) => (
      <div
        key={index}
        className="flex flex-col items-center animate-pulse w-full"
      >
        <div className="bg-gray-200 w-full aspect-[4/5] mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
      </div>
    ))}
  </div>
);

const CategoryGrid = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchApi("/public/categories");
        if (response.success && response.data?.categories) {
          // Exclude offers or non-rug categories if needed, or just take first 5
          const cats = response.data.categories;
          setCategories(cats);
        } else {
          setError(response.message || "Failed to fetch categories");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch categories"
        );
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    window.location.reload();
  };

  if (loading) {
    return (
      <section className="py-12 md:py-16 bg-white">
        <div className="container max-w-[1400px] mx-auto px-6">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl font-jost text-[#1a1a1a] mb-2 tracking-wide">
              Categories
            </h2>
          </div>
          <SkeletonLoader />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12 md:py-16 bg-white">
        <div className="container max-w-[1400px] mx-auto px-6">
          <div className="text-center py-12">
            <p className="text-red-500 mb-4 font-roboto">Error: {error}</p>
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-[#3D1C02] text-white rounded font-jost hover:bg-[#2a1200] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <section className="py-12 md:py-16 bg-white">
        <div className="container max-w-[1400px] mx-auto px-6">
          <div className="text-center py-12">
            <p className="text-gray-500 font-roboto">
              No categories available at the moment
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container max-w-[1400px] mx-auto px-6">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-2xl md:text-3xl font-jost text-[#1a1a1a] tracking-wide">
            Categories
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8">
          {categories.slice(0, 5).map((category, index) => (
            <Link
              href={`/products?category=${category.slug}`}
              key={category.id || index}
              className="block"
            >
              <CategoryCard category={category} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
