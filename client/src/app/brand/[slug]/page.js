"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

import { toast } from "sonner";
import CategoriesCarousel from "@/components/catgry";
import ProducCard from "@/components/ProducCard";

function ProductCardSkeleton() {
  return (
    <div className="bg-white overflow-hidden shadow-md rounded-sm animate-pulse">
      <div className="h-64 w-full bg-gray-200"></div>
      <div className="p-4">
        <div className="flex justify-center mb-2">
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-3/4 mx-auto bg-gray-200 rounded mb-4"></div>
        <div className="flex justify-center">
          <div className="h-6 w-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function BrandPage({ params }) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const router = useRouter();
  const sortParam = searchParams.get("sort") || "createdAt";
  const orderParam = searchParams.get("order") || "desc";

  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    sort: sortParam,
    order: orderParam,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    pages: 0,
  });

  const updateURL = (newFilters) => {
    const params = new URLSearchParams();
    if (newFilters.sort !== "createdAt" || newFilters.order !== "desc") {
      params.set("sort", newFilters.sort);
      params.set("order", newFilters.order);
    }
    const newURL = params.toString()
      ? `?${params.toString()}`
      : window.location.pathname;
    router.push(newURL, { scroll: false });
  };

  // Fetch brand products with filters
  useEffect(() => {
    const fetchBrandProducts = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("page", pagination.page);
        queryParams.append("limit", pagination.limit);
        const validSortFields = ["createdAt", "updatedAt", "name", "featured"];
        let sortField = filters.sort;
        if (!validSortFields.includes(sortField)) {
          sortField = "createdAt";
        }
        queryParams.append("sort", sortField);
        queryParams.append("order", filters.order);
        const res = await fetchApi(
          `/public/brand/${slug}?${queryParams.toString()}`
        );
        setBrand(res.data.brand);
        setProducts(res.data.brand.products || []);
        setPagination(res.data.pagination || {});
      } catch (err) {
        setBrand(null);
        setProducts([]);
        setPagination({ page: 1, limit: 15, total: 0, pages: 0 });
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBrandProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, filters, pagination.page, pagination.limit]);

  useEffect(() => {
    if (error) {
      toast.error(`Error loading products. Please try again.`);
    }
  }, [error]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pagination.page]);

  const handleSortChange = (e) => {
    const value = e.target.value;
    switch (value) {
      case "newest":
        setFilters((prev) => ({ ...prev, sort: "createdAt", order: "desc" }));
        updateURL({ ...filters, sort: "createdAt", order: "desc" });
        break;
      case "oldest":
        setFilters((prev) => ({ ...prev, sort: "createdAt", order: "asc" }));
        updateURL({ ...filters, sort: "createdAt", order: "asc" });
        break;
      case "price-low":
        setFilters((prev) => ({ ...prev, sort: "createdAt", order: "asc" }));
        updateURL({ ...filters, sort: "createdAt", order: "asc" });
        break;
      case "price-high":
        setFilters((prev) => ({ ...prev, sort: "createdAt", order: "desc" }));
        updateURL({ ...filters, sort: "createdAt", order: "desc" });
        break;
      case "name-asc":
        setFilters((prev) => ({ ...prev, sort: "name", order: "asc" }));
        updateURL({ ...filters, sort: "name", order: "asc" });
        break;
      case "name-desc":
        setFilters((prev) => ({ ...prev, sort: "name", order: "desc" }));
        updateURL({ ...filters, sort: "name", order: "desc" });
        break;
      default:
        break;
    }
  };

  const scrollToTop = () => {
    const mainContent = document.getElementById("products-main");
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
    scrollToTop();
  };

  if (loading && products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CategoriesCarousel />
      <div id="products-main" className="mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Products Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 w-full">
            {/* Display product count and sort options */}
            <div className="flex justify-between md:justify-end mb-6 items-center w-full col-span-full">
              <div className="text-sm">
                {loading && !products.length ? (
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <>
                    Showing{" "}
                    <span className="font-semibold">{products.length}</span> of{" "}
                    <span className="font-semibold">
                      {pagination.total || 0}
                    </span>{" "}
                    products
                  </>
                )}
              </div>

              {loading && (
                <div className="text-sm text-gray-500 flex items-center ml-auto mr-4">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating...
                </div>
              )}

              <div className="inline-flex items-center border rounded-md overflow-hidden bg-white">
                <span className="px-3 py-2 text-sm">SORT BY</span>
                <select
                  id="sort"
                  name="sort"
                  className="border-l px-3 py-2 focus:outline-none"
                  onChange={handleSortChange}
                  disabled={loading}
                  value={
                    filters.sort === "createdAt" && filters.order === "desc"
                      ? "newest"
                      : filters.sort === "createdAt" && filters.order === "asc"
                      ? "oldest"
                      : filters.sort === "name" && filters.order === "asc"
                      ? "name-asc"
                      : filters.sort === "name" && filters.order === "desc"
                      ? "name-desc"
                      : "newest"
                  }
                >
                  <option value="newest">Featured</option>
                  <option value="price-low">Price, low to high</option>
                  <option value="price-high">Price, high to low</option>
                  <option value="name-asc">Alphabetically, A-Z</option>
                  <option value="name-desc">Alphabetically, Z-A</option>
                  <option value="oldest">Date, old to new</option>
                </select>
              </div>
            </div>

            {/* Products Grid with Loading State */}
            {loading && products.length === 0 ? (
              [...Array(pagination.limit || 12)].map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))
            ) : products.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center border col-span-full">
                <div className="text-gray-400 mb-4">
                  <AlertCircle className="h-12 w-12 mx-auto" />
                </div>
                <h2 className="text-xl font-semibold mb-3">
                  No products found
                </h2>
                <p className="text-gray-600 mb-6">
                  Try adjusting your sort option.
                </p>
              </div>
            ) : (
              products.map((product) => (
                <ProducCard key={product.id} product={product} />
              ))
            )}

            {/* Restore original pagination UI */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center mt-10 mb-4">
                <div className="inline-flex items-center rounded-md overflow-hidden border divide-x">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                    className="rounded-none border-0 hover:bg-gray-100"
                  >
                    <ChevronUp className="h-4 w-4 rotate-90" />
                  </Button>
                  {[...Array(pagination.pages)].map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === pagination.pages ||
                      (page >= pagination.page - 1 &&
                        page <= pagination.page + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          disabled={loading}
                          className={`px-3 py-2 text-sm ${
                            pagination.page === page
                              ? "bg-primary text-white"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    }
                    if (
                      (page === 2 && pagination.page > 3) ||
                      (page === pagination.pages - 1 &&
                        pagination.page < pagination.pages - 2)
                    ) {
                      return (
                        <span key={page} className="px-3 py-2">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages || loading}
                    className="rounded-none border-0 hover:bg-gray-100"
                  >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
