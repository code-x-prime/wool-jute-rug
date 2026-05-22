"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchApi } from "@/lib/utils";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Package } from "lucide-react";
import CategoriesCarousel from "@/components/catgry";

// Simplified Category Card Component
const CategoryCard = ({ category, index }) => {
  // Function to get image URL
  const getImageUrl = (image) => {
    if (!image) return "/placeholder.png";
    if (image.startsWith("http")) return image;
    return `https://desirediv-storage.blr1.digitaloceanspaces.com/${image}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group"
    >
      <Link href={`/category/${category.slug}`}>
        <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full">
          {/* Image container */}
          <div className="relative h-48 w-full overflow-hidden">
            <Image
              src={
                category.image
                  ? getImageUrl(category.image)
                  : "/placeholder.png"
              }
              alt={category.name}
              fill
              className="object-contain transition-transform duration-300 group-hover:scale-105 px-4"
            />

            {/* Simple product count badge */}
            <div className="absolute top-3 right-3 bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
              {category._count?.products || 0}
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 group-hover:text-primary transition-colors">
              {category.name}
            </h3>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {category.description ||
                "Explore premium supplements in this category"}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {category._count?.products || 0} products
              </span>

              <div className="flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all">
                <span>View All</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

// Simple Loading Skeleton
const CategoryCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
      <div className="h-48 w-full bg-gray-200"></div>
      <div className="p-5">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
        <div className="flex justify-between items-center">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  );
};

// Simple Stats Section
const StatsSection = ({ categories }) => {
  const totalProducts = categories.reduce(
    (sum, cat) => sum + (cat._count?.products || 0),
    0
  );

  return (
    <div className="mt-12 bg-white rounded-xl p-8 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div>
          <div className="text-2xl font-bold text-primary mb-1">
            {categories.length}
          </div>
          <div className="text-sm text-gray-600">Categories</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-primary mb-1">
            {totalProducts}
          </div>
          <div className="text-sm text-gray-600">Products</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-primary mb-1">100%</div>
          <div className="text-sm text-gray-600">Quality</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-primary mb-1">24/7</div>
          <div className="text-sm text-gray-600">Support</div>
        </div>
      </div>
    </div>
  );
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await fetchApi("/public/categories");
        setCategories(response.data.categories || []);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setError(err.message || "Failed to load categories");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 ">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-r from-primary to-primary/80 overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />

        {/* Simple background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-white rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center text-white px-4 mx-auto max-w-7xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Our Categories
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            Discover premium fitness supplements for every goal
          </p>
        </div>
      </section>

      {/* Desktop Categories Carousel */}
      <div className="hidden md:flex mx-auto max-w-7xl">
        <CategoriesCarousel />
      </div>

      {/* Breadcrumb */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center text-sm">
          <Link
            href="/"
            className="text-gray-500 hover:text-primary transition-colors"
          >
            Home
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-primary font-medium">Categories</span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-auto max-w-7xl px-4 mb-8">
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start">
            <AlertCircle className="text-red-500 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-800 mb-1">
                Error Loading Categories
              </h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <CategoryCardSkeleton key={index} />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Categories Found
            </h2>
            <p className="text-gray-600 mb-6">
              We&apos;re adding new categories soon. Check back later!
            </p>
            <Link href="/products">
              <button className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Browse All Products
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {categories.map((category, index) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  index={index}
                />
              ))}
            </div>

            {/* Stats Section */}
            {!loading && categories.length > 0 && (
              <StatsSection categories={categories} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
